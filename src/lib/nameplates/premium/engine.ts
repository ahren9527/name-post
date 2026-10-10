/**
 * Premium nameplate engine — interprets the declarative specs in ./spec.ts.
 *
 * Pipeline per person:  layout → (plate layers · ornaments · type) → motion.
 *  - layout produces rectangles in a left-anchored local space; right-side
 *    plates are drawn through a horizontal flip for shapes, while text is
 *    re-positioned (never mirrored) so it always reads correctly.
 *  - every channel (plate, ornaments, name, en, each title line, tag) has
 *    its own eased progress, giving mask reveals, line growth and the
 *    name → title stagger; exits run reversed and ~30% faster.
 *  - legibility comes from the backing plate; text gets at most a soft
 *    drop shadow (or the legacy outline when the user explicitly asks).
 */
import { packTitle } from "../text";
import {
  BASE_H,
  BASE_W,
  totalDuration,
  type ClipLayer,
  type Person,
  type RenderConfig,
} from "../types";
import {
  TEMPLATE_BY_ID,
  isPremiumId,
  type ColorRef,
  type Fill,
  type Ornament,
  type PlateLayer,
  type PremiumEase,
  type Region,
  type TemplateSpec,
} from "./spec";

export function isPremiumStyle(style: string): boolean {
  return isPremiumId(style);
}

/* ------------------------------------------------------------------ colour */

type RGBA = [number, number, number, number];

function parseColor(c: string): RGBA {
  const s = c.trim();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return [255, 255, 255, 1];
    return [r, g, b, a];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0] ?? 255, p[1] ?? 255, p[2] ?? 255, p[3] ?? 1];
  }
  return [255, 255, 255, 1];
}

function css([r, g, b, a]: RGBA, mul = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.max(0, Math.min(1, a * mul)).toFixed(3)})`;
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3]];
}

const WHITE: RGBA = [255, 255, 255, 1];
const BLACK: RGBA = [0, 0, 0, 1];

interface Pal {
  name: RGBA;
  title: RGBA;
  accent: RGBA;
  band: RGBA;
  en: RGBA;
}

function paletteOf(cfg: RenderConfig): Pal {
  const accent = parseColor(cfg.accentColor || "#CFAA66");
  return {
    name: parseColor(cfg.nameColor || "#ffffff"),
    title: parseColor(cfg.titleColor || "#eeeeee"),
    accent,
    band: parseColor(cfg.bandColor || "rgba(14,30,58,0.94)"),
    en: accent,
  };
}

function resolveRGBA(ref: ColorRef, pal: Pal): RGBA {
  switch (ref) {
    case "$name":
      return pal.name;
    case "$title":
      return pal.title;
    case "$accent":
    case "$gold":
      return pal.accent;
    case "$band":
      return pal.band;
    case "$en":
      return pal.en;
    default:
      return parseColor(ref);
  }
}

/** Matte metallic stops derived from the accent (≈ #E6CB8F → #B8893E for gold). */
function goldStops(pal: Pal): [RGBA, RGBA, RGBA] {
  const a = pal.accent;
  return [mix(a, WHITE, 0.3), a, mix(a, BLACK, 0.16)];
}

/**
 * Paint style for a colour ref over a box. `$gold` becomes a diagonal
 * metallic gradient; `fade` fades the far end (t=1) to transparent.
 */
function paint(
  ctx: CanvasRenderingContext2D,
  ref: ColorRef,
  pal: Pal,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alpha = 1,
  fade = false,
): string | CanvasGradient {
  if (ref === "$gold") {
    const [l, m, d] = goldStops(pal);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, css(l, alpha));
    g.addColorStop(0.5, css(m, alpha * (fade ? 0.85 : 1)));
    g.addColorStop(1, css(fade ? d : mix(m, l, 0.4), fade ? 0 : alpha));
    return g;
  }
  const c = resolveRGBA(ref, pal);
  if (!fade) return css(c, alpha);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, css(c, alpha));
  g.addColorStop(0.55, css(c, alpha * 0.85));
  g.addColorStop(1, css(c, 0));
  return g;
}

function fillStyleOf(
  ctx: CanvasRenderingContext2D,
  fill: Fill,
  pal: Pal,
  r: Rect,
): string | CanvasGradient {
  if (fill.kind === "solid") return css(resolveRGBA(fill.color, pal), fill.alpha ?? 1);
  const vertical = fill.axis === "y";
  const g = vertical
    ? ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h)
    : ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y);
  for (const [t, ref, a] of fill.stops) {
    const c = ref === "$gold" ? goldStops(pal)[1] : resolveRGBA(ref, pal);
    g.addColorStop(Math.max(0, Math.min(1, t)), css(c, a ?? 1));
  }
  return g;
}

/* ------------------------------------------------------------------ easing */

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const easeExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
const easeQuint = (t: number) => 1 - Math.pow(1 - clamp(t), 5);
const easeBack = (t: number) => {
  const x = clamp(t);
  const c1 = 1.25;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInCubic = (t: number) => Math.pow(clamp(t), 3);

export function easeByName(kind: string): (t: number) => number {
  switch (kind) {
    case "expo":
      return easeExpo;
    case "quint":
      return easeQuint;
    case "back":
      return easeBack;
    case "linear":
      return (t) => clamp(t);
    case "snap":
      return (t) => easeExpo(easeCubic(t));
    default:
      return easeCubic;
  }
}

function easeFor(cfg: RenderConfig, base: PremiumEase) {
  return easeByName(cfg.ease === "smooth" ? base : cfg.ease);
}

/* ------------------------------------------------------------------ fonts */

export const EN_FONTS = {
  sans: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
  serif: '"Cormorant Garamond", "Times New Roman", serif',
  cond: '"Barlow Condensed", "Arial Narrow", sans-serif',
} as const;

function font(weight: number, size: number, family: string, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${size.toFixed(2)}px ${family}`;
}

/** Family part of a canvas font shorthand. */
function famOf(fontStr: string) {
  const i = fontStr.indexOf("px ");
  return i >= 0 ? fontStr.slice(i + 3) : "sans-serif";
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, track: number) {
  let w = 0;
  let n = 0;
  for (const ch of text) {
    w += ctx.measureText(ch).width;
    n += 1;
  }
  return w + Math.max(0, n - 1) * track;
}

function fillTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  track: number,
  stroke = false,
) {
  let cx = x;
  for (const ch of text) {
    if (stroke) ctx.strokeText(ch, cx, y);
    else ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
}

/* ------------------------------------------------------------------ layout */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type TextKind = "name" | "en" | "title" | "tag";

interface TextItem {
  kind: TextKind;
  index: number;
  text: string;
  /** left of the text in local (left-anchored) space */
  x: number;
  /** baseline (horizontal) / column top (vertical) */
  y: number;
  w: number;
  size: number;
  font: string;
  track: number;
  fill: ColorRef;
  alpha: number;
  /** mirror group: the item keeps its offset inside this span when flipped */
  gx: number;
  gw: number;
  /** box used for masks/gradients, local space */
  box: Rect;
  mode: "h" | "v" | "rot" | "center";
  /** vertical advance per glyph */
  adv?: number;
}

interface Laid {
  spec: TemplateSpec;
  person: Person;
  w: number;
  h: number;
  vertical: boolean;
  regions: Partial<Record<Region, Rect>>;
  texts: TextItem[];
  /** span of the text block, used by rules */
  textX0: number;
  textX1: number;
  nameX0: number;
  nameX1: number;
  ruleY?: number;
  /** vertical layouts: x of the separating rule and its extent */
  ruleX?: number;
  ruleY0?: number;
  ruleY1?: number;
  divider?: { x: number; y0: number; y1: number };
  seal?: { x: number; y: number; s: number; ch: string };
  dot?: { x: number; y: number; r: number };
}

function nameU(cfg: RenderConfig) {
  return cfg.scale * Math.max(cfg.textSize, 0.4);
}

function titleU(cfg: RenderConfig) {
  return cfg.scale * Math.max(cfg.titleSize ?? 1, 0.35);
}

/** Title lines; a list separator left dangling at a line break is dropped. */
function titlesOf(p: Person): string[] {
  const lines = packTitle(p.title, p.titleLines ?? 1);
  return lines.map((l, i) => (i < lines.length - 1 ? l.replace(/[、，,;；]\s*$/, "") : l));
}

function surnameOf(name: string) {
  const ch = [...name.trim()].find((c) => !/[\s·•.．・]/.test(c));
  return ch ?? "";
}

interface Sizes {
  N: number;
  T: number;
  E: number;
  nameFont: string;
  titleFont: string;
  enFont: string;
  nameTrack: number;
  titleTrack: number;
  enTrack: number;
}

function sizesOf(spec: TemplateSpec, cfg: RenderConfig, person: Person): Sizes {
  const t = spec.type;
  const N = t.name * nameU(cfg);
  const T = t.title * titleU(cfg);
  const E = t.en * (titleU(cfg) * 0.5 + nameU(cfg) * 0.5);
  const len = [...person.name.trim()].length;
  const nameTrackEm = len <= 2 ? t.nameTracking + 0.22 : len <= 3 ? t.nameTracking : len <= 4 ? t.nameTracking * 0.6 : 0.01;
  return {
    N,
    T,
    E,
    nameFont: font(t.nameWeight, N, cfg.nameFont, t.italic),
    titleFont: font(t.titleWeight, T, cfg.titleFont, t.italic),
    enFont: font(t.enWeight, E, EN_FONTS[t.enFont], t.italic && t.enFont !== "serif"),
    nameTrack: N * nameTrackEm,
    titleTrack: T * t.titleTracking,
    enTrack: E * t.enTracking,
  };
}

function item(
  ctx: CanvasRenderingContext2D,
  kind: TextKind,
  index: number,
  text: string,
  fontStr: string,
  size: number,
  track: number,
  fill: ColorRef,
  alpha: number,
): TextItem {
  ctx.font = fontStr;
  const w = measureTracked(ctx, text, track);
  return {
    kind,
    index,
    text,
    x: 0,
    y: 0,
    w,
    size,
    font: fontStr,
    track,
    fill,
    alpha,
    gx: 0,
    gw: w,
    box: { x: 0, y: 0, w, h: size },
    mode: "h",
  };
}

/** Position a horizontal item: x left, baseline from box top. Latin caps sit tighter. */
function place(it: TextItem, x: number, top: number, latin = false) {
  const h = latin ? it.size * 0.74 : it.size;
  it.x = x;
  it.y = top + (latin ? it.size * 0.72 : it.size * 0.88);
  it.gx = x;
  it.gw = it.w;
  it.box = { x, y: top, w: it.w, h };
}

function layoutStack(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const { N, T, E } = s;
  const titles = titlesOf(p);
  const en = (p.en ?? "").trim().toUpperCase();
  const tag = (p.tag ?? "").trim();
  const texts: TextItem[] = [];

  let leadW = 0;
  if (L.lead === "seal") leadW = N * 1.12 + N * 0.34;
  else if (L.lead === "dot") leadW = N * 0.3 + N * 0.32;
  const padX = L.padX * N;
  const x0 = padX + leadW;
  let y = L.padY * N;
  let contentW = 0;

  if (tag && L.tag === "above") {
    const it = item(ctx, "tag", 0, tag, font(600, T * 0.78, famOf(s.titleFont)), T * 0.78, T * 0.12, t.tagFill ?? "$accent", 1);
    place(it, x0, y);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += it.size + T * 0.4;
  }
  if (en && L.en === "above") {
    const it = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.9);
    place(it, x0, y, true);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += E * 0.74 + E * 0.75;
  }

  const nameTop = y;
  const nm = item(ctx, "name", 0, p.name.trim(), s.nameFont, N, s.nameTrack, t.nameFill, 1);
  place(nm, x0, nameTop);
  texts.push(nm);
  let lineW = nm.w;
  if (en && L.en === "inline") {
    const it = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.92);
    const ex = x0 + nm.w + N * 0.36;
    it.x = ex;
    it.y = nm.y - N * 0.05;
    it.box = { x: ex, y: it.y - E * 0.72, w: it.w, h: E * 0.74 };
    texts.push(it);
    lineW = nm.w + N * 0.36 + it.w;
    it.gx = x0;
    it.gw = lineW;
  }
  nm.gx = x0;
  nm.gw = lineW;
  contentW = Math.max(contentW, lineW);
  y += N;

  const gap = L.gap * N;
  const ruleY = y + gap * 0.52;
  y += gap;
  titles.forEach((line, i) => {
    const it = item(ctx, "title", i, line, s.titleFont, T, s.titleTrack, t.titleFill, t.titleAlpha);
    place(it, x0, y);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += i < titles.length - 1 ? T * L.titleLineHeight : T;
  });
  if (!titles.length) y -= gap * 0.35;

  if (en && L.en === "below") {
    y += T * 0.5;
    const it = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.9);
    place(it, x0, y, true);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += E * 0.74;
  }
  if (tag && L.tag === "below") {
    y += T * 0.55;
    const it = item(ctx, "tag", 0, tag, font(600, T * 0.8, famOf(s.titleFont)), T * 0.8, T * 0.1, t.tagFill ?? "$accent", 1);
    place(it, x0, y);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += it.size;
  }
  y += L.padY * N;

  const w = Math.max(x0 + contentW + padX + L.tail * N, (L.minWidth ?? 0) * N);
  const laid: Laid = {
    spec,
    person: p,
    w,
    h: y,
    vertical: false,
    regions: { plate: { x: 0, y: 0, w, h: y } },
    texts,
    textX0: x0,
    textX1: x0 + contentW,
    nameX0: x0,
    nameX1: x0 + nm.w,
    ruleY,
  };
  if (L.lead === "seal") {
    const sz = N * 1.12;
    laid.seal = { x: padX + sz / 2, y: nameTop + N * 0.47, s: sz, ch: surnameOf(p.name) };
  } else if (L.lead === "dot") {
    const r = N * 0.15;
    laid.dot = { x: padX + r, y: nameTop + N * 0.47, r };
  }
  return laid;
}

function layoutInline(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const { N, T, E } = s;
  const titles = titlesOf(p);
  const en = (p.en ?? "").trim().toUpperCase();
  const texts: TextItem[] = [];
  const padX = L.padX * N;
  const padY = L.padY * N;
  const x0 = padX;

  const nm = item(ctx, "name", 0, p.name.trim(), s.nameFont, N, s.nameTrack, t.nameFill, 1);
  const dividerX = x0 + nm.w + N * 0.48;
  const colX = dividerX + N * 0.48;

  const col: TextItem[] = [];
  let colH = 0;
  let enIt: TextItem | null = null;
  if (en) {
    enIt = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.95);
    colH += E * 0.74 + E * 0.62;
  }
  titles.forEach((line, i) => {
    col.push(item(ctx, "title", i, line, s.titleFont, T, s.titleTrack, t.titleFill, t.titleAlpha));
    colH += i < titles.length - 1 ? T * L.titleLineHeight : T;
  });
  const contentH = Math.max(N, colH);
  const nameTop = padY + (contentH - N) / 2;
  place(nm, x0, nameTop);
  texts.push(nm);
  let cy = padY + (contentH - colH) / 2;
  let colW = 0;
  if (enIt) {
    place(enIt, colX, cy, true);
    texts.push(enIt);
    colW = Math.max(colW, enIt.w);
    cy += E * 0.74 + E * 0.62;
  }
  col.forEach((it, i) => {
    place(it, colX, cy);
    texts.push(it);
    colW = Math.max(colW, it.w);
    cy += i < col.length - 1 ? T * L.titleLineHeight : T;
  });
  const hasCol = col.length > 0 || !!enIt;
  const w = hasCol ? colX + colW + padX + L.tail * N : x0 + nm.w + padX;
  const h = contentH + padY * 2;
  const span = Math.max(N * 0.9, colH);
  return {
    spec,
    person: p,
    w,
    h,
    vertical: false,
    regions: { plate: { x: 0, y: 0, w, h } },
    texts,
    textX0: x0,
    textX1: hasCol ? colX + colW : x0 + nm.w,
    nameX0: x0,
    nameX1: x0 + nm.w,
    ruleY: h - padY * 0.5,
    divider: hasCol ? { x: dividerX, y0: padY + (contentH - span) / 2, y1: padY + (contentH + span) / 2 } : undefined,
  };
}

function layoutTiers(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const { N, T, E } = s;
  const k = L.skew ?? 0;
  const titles = titlesOf(p);
  const en = (p.en ?? "").trim().toUpperCase();
  const tag = (p.tag ?? "").trim();
  const texts: TextItem[] = [];

  const row1H = N * 1.62;
  const padY2 = T * 0.5;
  const row2H = titles.length ? padY2 * 2 + T + (titles.length - 1) * T * L.titleLineHeight : 0;
  const H = row1H + row2H;
  const gap = k ? N * 0.12 : 0;

  const nm = item(ctx, "name", 0, p.name.trim(), s.nameFont, N, s.nameTrack, t.nameFill, 1);
  let enIt: TextItem | null = null;
  if (en) enIt = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 1);
  const lineW = nm.w + (enIt ? N * 0.34 + enIt.w : 0);

  // lead slot
  let leadW = 0;
  let leadItem: TextItem | null = null;
  const regions: Partial<Record<Region, Rect>> = {};
  if (L.lead === "number") {
    const numSize = H * 0.54;
    leadW = H * 0.92 + k * H;
    if (tag) {
      leadItem = item(ctx, "tag", 0, tag, font(700, numSize, EN_FONTS.cond, true), numSize, 0, t.tagFill ?? "#ffffff", 1);
    }
    regions.lead = { x: 0, y: 0, w: leadW, h: H || row1H };
  } else if (L.lead === "tag") {
    if (tag) {
      leadItem = item(ctx, "tag", 0, tag, font(700, T * 0.95, famOf(s.titleFont)), T * 0.95, T * 0.08, t.tagFill ?? "#ffffff", 1);
      leadW = leadItem.w + T * 1.1;
    } else {
      leadW = N * 0.14;
    }
    regions.lead = { x: 0, y: 0, w: leadW, h: row1H };
  }

  const padX = L.padX * N;
  // continuous slanted edge: row1 sits k*row2H right of row2
  const row2X = L.lead === "number" ? leadW - k * H + gap : leadW;
  const row1X = row2X + k * row2H;
  const row1W = padX * 2 + lineW + k * row1H;
  regions.name = { x: row1X, y: 0, w: row1W, h: row1H };
  const nameX = row1X + padX + k * row1H * 0.5;
  place(nm, nameX, (row1H - N) / 2 + N * 0.02);
  nm.gx = nameX;
  nm.gw = lineW;
  texts.push(nm);
  if (enIt) {
    const ex = nameX + nm.w + N * 0.34;
    enIt.x = ex;
    enIt.y = nm.y - N * 0.04;
    enIt.box = { x: ex, y: enIt.y - E * 0.72, w: enIt.w, h: E * 0.74 };
    enIt.gx = nameX;
    enIt.gw = lineW;
    texts.push(enIt);
  }

  let titleW = 0;
  const titleX = row2X + T * 0.62 + k * row2H * 0.5;
  titles.forEach((line, i) => {
    const it = item(ctx, "title", i, line, s.titleFont, T, s.titleTrack, t.titleFill, t.titleAlpha);
    place(it, titleX, row1H + padY2 + i * T * L.titleLineHeight);
    texts.push(it);
    titleW = Math.max(titleW, it.w);
  });
  if (titles.length) {
    regions.title = { x: row2X, y: row1H, w: T * 1.24 + titleW + k * row2H, h: row2H };
  }

  if (leadItem && regions.lead) {
    const r = regions.lead;
    const isNum = L.lead === "number";
    // italic digits lean right; nudge so the glyph's optical centre sits mid-block
    const cx = r.x + r.w / 2 - (isNum ? leadItem.size * 0.05 : 0);
    leadItem.x = cx - leadItem.w / 2;
    leadItem.y = isNum ? r.y + r.h / 2 + leadItem.size * 0.36 : r.y + r.h / 2 + leadItem.size * 0.36;
    leadItem.gx = leadItem.x;
    leadItem.gw = leadItem.w;
    leadItem.box = { x: r.x, y: r.y, w: r.w, h: r.h };
    leadItem.mode = "center";
    texts.push(leadItem);
  }

  const right = Math.max(row1X + row1W, regions.title ? regions.title.x + regions.title.w : 0, leadW);
  regions.plate = { x: 0, y: 0, w: right, h: H };
  return {
    spec,
    person: p,
    w: right,
    h: H,
    vertical: false,
    regions,
    texts,
    textX0: nameX,
    textX1: nameX + Math.max(lineW, titleW),
    nameX0: nameX,
    nameX1: nameX + nm.w,
    ruleY: row1H,
  };
}

const VPUNCT = new Set(["、", "，", "。", ",", "."]);

/** Top offset of each glyph in a vertical column; punctuation takes half a cell. */
function columnTops(chars: string[], adv: number): number[] {
  const out: number[] = [];
  let y = 0;
  chars.forEach((c, i) => {
    out.push(y);
    const next = chars[i + 1];
    y += VPUNCT.has(c) || (next && VPUNCT.has(next)) ? adv * 0.75 : adv;
  });
  return out;
}

function columnHeight(chars: string[], size: number, adv: number) {
  if (!chars.length) return 0;
  return columnTops(chars, adv)[chars.length - 1] + size;
}

function layoutColumn(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const N = s.N * 0.98;
  const T = s.T;
  const E = s.E;
  const titles = titlesOf(p);
  const en = (p.en ?? "").trim().toUpperCase();
  const texts: TextItem[] = [];
  const padX = Math.max(L.padX, 0.4) * s.N;
  const padY = Math.max(L.padY, 0.4) * s.N;
  const hasSeal = spec.ornaments.some((o) => o.kind === "seal") || spec.vertical?.ornaments.some((o) => o.kind === "seal");

  const nameChars = [...p.name.trim()].filter((c) => c !== " ");
  const nAdv = N * 1.1;
  const nameH = columnHeight(nameChars, N, nAdv);
  let x = padX;
  const nameTop = padY;
  const nm = item(ctx, "name", 0, nameChars.join(""), s.nameFont, N, 0, t.nameFill, 1);
  nm.mode = "v";
  nm.adv = nAdv;
  nm.x = x;
  nm.y = nameTop;
  nm.w = N;
  nm.gx = x;
  nm.gw = N;
  nm.box = { x, y: nameTop, w: N, h: nameH };
  texts.push(nm);
  let colRight = x + N;
  let seal: Laid["seal"];
  let bottom = nameTop + nameH;
  if (hasSeal && L.lead === "seal") {
    const sz = N * 0.62;
    seal = { x: x + N / 2, y: bottom + N * 0.36 + sz / 2, s: sz, ch: surnameOf(p.name) };
    bottom = seal.y + sz / 2;
  }

  if (en) {
    const it = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.9);
    const ex = colRight + N * 0.22;
    it.mode = "rot";
    it.x = ex;
    it.y = nameTop + N * 0.06;
    it.box = { x: ex, y: it.y, w: E * 0.74, h: it.w };
    it.gx = ex;
    it.gw = E * 0.74;
    texts.push(it);
    colRight = ex + E * 0.74;
    bottom = Math.max(bottom, it.y + it.w);
  }

  const gap = L.gap * s.N;
  const ruleX = colRight + gap * 0.5;
  x = colRight + gap;
  const tAdv = T * 1.26;
  const titleTop = nameTop + N * 0.12;
  titles.forEach((line, i) => {
    const chars = [...line].filter((c) => c !== " ");
    const it = item(ctx, "title", i, chars.join(""), s.titleFont, T, 0, t.titleFill, t.titleAlpha);
    const h = columnHeight(chars, T, tAdv);
    it.mode = "v";
    it.adv = tAdv;
    it.x = x;
    it.y = titleTop;
    it.w = T;
    it.gx = x;
    it.gw = T;
    it.box = { x, y: titleTop, w: T, h };
    texts.push(it);
    bottom = Math.max(bottom, titleTop + h);
    x += T + T * 0.62;
  });
  if (titles.length) x -= T * 0.62;
  else x = colRight;
  const w = x + padX;
  const h = bottom + padY;
  return {
    spec,
    person: p,
    w,
    h,
    vertical: true,
    regions: { plate: { x: 0, y: 0, w, h } },
    texts,
    textX0: padX,
    textX1: x,
    nameX0: padX,
    nameX1: padX + N,
    ruleX: titles.length ? ruleX : undefined,
    ruleY0: padY * 0.6,
    ruleY1: h - padY * 0.6,
    seal,
  };
}

function layoutOf(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, cfg: RenderConfig, vertical: boolean): Laid {
  const s = sizesOf(spec, cfg, p);
  if (vertical) return layoutColumn(ctx, spec, p, s);
  switch (spec.layout.kind) {
    case "inline":
      return layoutInline(ctx, spec, p, s);
    case "tiers":
      return layoutTiers(ctx, spec, p, s);
    case "column":
      return layoutColumn(ctx, spec, p, s);
    default:
      return layoutStack(ctx, spec, p, s);
  }
}

/* ------------------------------------------------------------------ motion */

interface Motion {
  plate: number;
  orn: number;
  name: number;
  en: number;
  title: (i: number) => number;
  tag: number;
  /** horizontal/vertical drift and scale applied to the whole plate */
  dx: number;
  dy: number;
  scale: number;
  /** 0..1 progress of the hold sweep, or -1 */
  sweep: number;
  /** seconds since this plate started (drives flowing edges) */
  local: number;
  fadeOnly: boolean;
  cut: boolean;
  regionDelay: (r: Region) => number;
}

function driftOf(cfg: RenderConfig): { x: number; y: number } {
  switch (cfg.animIn) {
    case "up":
      return { x: 0, y: 26 };
    case "down":
      return { x: 0, y: -26 };
    case "right":
      return { x: 30, y: 0 };
    case "left":
      return { x: -30, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function motionOf(index: number, time: number, cfg: RenderConfig, spec: TemplateSpec): Motion | null {
  const inD = Math.max(cfg.inDuration, 0.05);
  const outD = Math.max(cfg.outDuration, 0.05);
  let local: number;
  let exitLocal: number;
  if (cfg.layout === "sequence") {
    const slot = cfg.inDuration + cfg.holdDuration + cfg.outDuration;
    local = time - index * slot;
    if (local < 0 || local > slot) return null;
    exitLocal = local - cfg.inDuration - cfg.holdDuration;
  } else {
    local = time - index * cfg.stagger;
    if (local < 0) return null;
    const total = totalDuration(cfg);
    exitLocal = time - (total - cfg.outDuration);
    if (time > total) return null;
  }

  const ez = easeFor(cfg, spec.motion.ease);
  const cut = cfg.animIn === "none";
  const fadeOnly = cfg.animIn === "fade";
  const step = outD * 0.1;
  const exitDur = outD * 0.7;
  const exitAt = (k: number) => (exitLocal <= 0 ? 1 : 1 - easeInCubic((exitLocal - k * step) / exitDur));

  if (cut) {
    const on = exitLocal < outD * 0.5 ? 1 : 0;
    return {
      plate: on,
      orn: on,
      name: on,
      en: on,
      title: () => on,
      tag: on,
      dx: 0,
      dy: 0,
      scale: 1,
      sweep: -1,
      local,
      fadeOnly: true,
      cut,
      regionDelay: () => 0,
    };
  }

  const ch = (start: number, dur: number) => ez(clamp((local - start) / Math.max(dur, 0.01)));
  const fadeCh = (start: number, dur: number) => easeCubic(clamp((local - start) / Math.max(dur, 0.01)));
  const pick = fadeOnly ? fadeCh : ch;

  const plate = pick(0, inD * 0.72) * exitAt(2);
  const orn = pick(inD * 0.16, inD * 0.66) * exitAt(1.5);
  const nameStart = inD * 0.2;
  const name = pick(nameStart, inD * 0.6) * exitAt(1);
  const en = pick(nameStart + 0.08, inD * 0.6) * exitAt(0.5);
  const tStart = nameStart + 0.1;
  const title = (i: number) => pick(tStart + i * 0.05, inD * 0.6) * exitAt(0);
  const tag = pick(inD * 0.1, inD * 0.6) * exitAt(1);
  const d = driftOf(cfg);
  const enterP = easeCubic(clamp(local / inD));
  const exitP = exitLocal > 0 ? easeInCubic(clamp(exitLocal / outD)) : 0;
  const dx = fadeOnly ? 0 : d.x * (1 - enterP) + d.x * 0.4 * exitP;
  const dy = fadeOnly ? 0 : d.y * (1 - enterP) + d.y * 0.4 * exitP;
  const scale = cfg.animIn === "scale" ? 0.94 + 0.06 * easeCubic(clamp(local / inD)) : 1;

  let sweep = -1;
  if (cfg.sweep && spec.motion.sweep !== "none" && exitLocal <= 0) {
    const sp = (local - inD - 0.3) / 1.2;
    if (sp > 0 && sp < 1) sweep = sp;
  }
  const delays: Partial<Record<Region, number>> = { lead: 0, name: 0.07, title: 0.15, tag: 0 };
  return {
    plate,
    orn,
    name,
    en,
    title,
    tag,
    dx,
    dy,
    scale,
    sweep,
    local,
    fadeOnly,
    cut,
    regionDelay: (r) => delays[r] ?? 0,
  };
}

/* ------------------------------------------------------------------ painting */

let paperCache: CanvasPattern | null = null;
let paperCtx: CanvasRenderingContext2D | null = null;

function paperPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (paperCache && paperCtx === ctx) return paperCache;
  const size = 220;
  let cv: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== "undefined") cv = new OffscreenCanvas(size, size);
  else if (typeof document !== "undefined") {
    cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
  } else return null;
  const c = cv.getContext("2d") as CanvasRenderingContext2D | null;
  if (!c) return null;
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 2600; i++) {
    const g = 60 + rnd() * 80;
    c.fillStyle = `rgba(${g},${g * 0.92},${g * 0.78},${0.05 + rnd() * 0.08})`;
    c.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
  }
  c.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = rnd() * Math.PI;
    const l = 6 + rnd() * 22;
    c.strokeStyle = `rgba(120,98,70,${0.05 + rnd() * 0.07})`;
    c.lineWidth = 0.6 + rnd() * 0.6;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  paperCache = ctx.createPattern(cv as CanvasImageSource, "repeat");
  paperCtx = ctx;
  return paperCache;
}

function roundRectPath(ctx: CanvasRenderingContext2D, r: Rect, rad: number) {
  const k = Math.max(0, Math.min(rad, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + k, r.y);
  ctx.lineTo(r.x + r.w - k, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + k, k);
  ctx.lineTo(r.x + r.w, r.y + r.h - k);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - k, r.y + r.h, k);
  ctx.lineTo(r.x + k, r.y + r.h);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - k, k);
  ctx.lineTo(r.x, r.y + k);
  ctx.arcTo(r.x, r.y, r.x + k, r.y, k);
  ctx.closePath();
}

function skewPath(ctx: CanvasRenderingContext2D, r: Rect, k: number) {
  const run = k * r.h;
  ctx.beginPath();
  ctx.moveTo(r.x + run, r.y);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.lineTo(r.x + r.w - run, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
}

function shadowOn(ctx: CanvasRenderingContext2D, s: number) {
  ctx.shadowColor = `rgba(0,0,0,${0.38 * s})`;
  ctx.shadowBlur = 28 * s;
  ctx.shadowOffsetY = 8 * s;
}

/** Reveal clip for a plate region, drawn in flipped space (x=0 is the outer edge). */
function revealPlate(ctx: CanvasRenderingContext2D, laid: Laid, r: Rect, p: number, m: Motion) {
  const kind = m.fadeOnly ? "fade" : laid.spec.motion.plate;
  if (p >= 0.999) return;
  if (kind === "wipe") {
    ctx.beginPath();
    ctx.rect(r.x - 40, r.y - 40, (r.w + 80) * p, r.h + 80);
    ctx.clip();
    ctx.globalAlpha *= clamp(p * 4);
  } else if (kind === "rise") {
    ctx.translate(0, (1 - p) * 18);
    ctx.globalAlpha *= p;
  } else if (kind === "stamp") {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(1 + (1 - p) * 0.08, 1 + (1 - p) * 0.08);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha *= p;
  } else {
    ctx.globalAlpha *= p;
  }
}

function drawPlateLayer(
  ctx: CanvasRenderingContext2D,
  layer: PlateLayer,
  laid: Laid,
  pal: Pal,
  m: Motion,
) {
  const plateR = laid.regions.plate!;
  if (layer.kind === "scrim") {
    const p = m.plate;
    if (p <= 0.001) return;
    const tb = textBounds(laid);
    const cx = tb.x + tb.w / 2;
    const cy = tb.y + tb.h / 2;
    ctx.save();
    ctx.globalAlpha *= p;
    ctx.translate(cx, cy);
    ctx.scale(tb.w * 0.95 + 160, tb.h * 1.25 + 90);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${layer.alpha})`);
    g.addColorStop(0.35, `rgba(0,0,0,${layer.alpha * 0.7})`);
    g.addColorStop(0.7, `rgba(0,0,0,${layer.alpha * 0.22})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const region: Region = layer.kind === "rect" || layer.kind === "skew" ? (layer.region ?? "plate") : "plate";
  const r = laid.regions[region];
  if (!r) return;
  const delay = m.regionDelay(region);
  const p = delay && !m.cut ? clamp(m.plate - delay * 2.2) / Math.max(1 - delay * 2.2, 0.01) : m.plate;
  if (p <= 0.001) return;

  ctx.save();
  revealPlate(ctx, laid, r, p, m);

  switch (layer.kind) {
    case "rect": {
      if (layer.shadow) {
        ctx.save();
        shadowOn(ctx, layer.shadow);
        ctx.fillStyle = "rgba(0,0,0,0.001)";
        roundRectPath(ctx, r, layer.radius ?? 0);
        ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r);
        ctx.fill();
        ctx.restore();
      } else {
        roundRectPath(ctx, r, layer.radius ?? 0);
        ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r);
        ctx.fill();
      }
      break;
    }
    case "chamfer": {
      const c = layer.cut;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.w - c, r.y);
      ctx.lineTo(r.x + r.w, r.y + c);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.closePath();
      ctx.save();
      shadowOn(ctx, 0.3);
      ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "skew": {
      skewPath(ctx, r, layer.skew);
      ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r);
      ctx.fill();
      break;
    }
    case "glass": {
      const tint = resolveRGBA(layer.tint, pal);
      ctx.save();
      shadowOn(ctx, 0.55);
      roundRectPath(ctx, r, layer.radius);
      ctx.fillStyle = css(tint);
      ctx.fill();
      ctx.restore();
      roundRectPath(ctx, r, layer.radius);
      const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      g.addColorStop(0, "rgba(255,255,255,0.20)");
      g.addColorStop(0.42, "rgba(255,255,255,0.07)");
      g.addColorStop(1, "rgba(255,255,255,0.03)");
      ctx.fillStyle = g;
      ctx.fill();
      // soft diagonal sheen
      ctx.save();
      roundRectPath(ctx, r, layer.radius);
      ctx.clip();
      const sh = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.6, r.y + r.h);
      sh.addColorStop(0, "rgba(255,255,255,0.10)");
      sh.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      // hairline edge + top highlight
      roundRectPath(ctx, { x: r.x + 0.5, y: r.y + 0.5, w: r.w - 1, h: r.h - 1 }, layer.radius);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const hl = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      hl.addColorStop(0, "rgba(255,255,255,0)");
      hl.addColorStop(0.3, "rgba(255,255,255,0.75)");
      hl.addColorStop(0.7, "rgba(255,255,255,0.35)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(r.x + layer.radius, r.y, r.w - layer.radius * 2, 1.2);
      break;
    }
    case "paper": {
      const pat = paperPattern(ctx);
      if (pat) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha *= layer.strength;
        ctx.fillStyle = pat;
        ctx.fillRect(plateR.x, plateR.y, plateR.w, plateR.h);
      }
      break;
    }
  }
  ctx.restore();
}

function textBounds(laid: Laid): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const t of laid.texts) {
    x0 = Math.min(x0, t.box.x);
    y0 = Math.min(y0, t.box.y);
    x1 = Math.max(x1, t.box.x + t.box.w);
    y1 = Math.max(y1, t.box.y + t.box.h);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: laid.w, h: laid.h };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function drawOrnament(
  ctx: CanvasRenderingContext2D,
  o: Ornament,
  laid: Laid,
  pal: Pal,
  m: Motion,
  flip: boolean,
) {
  const p = m.orn;
  if (p <= 0.001) return;
  const W = laid.w;
  const H = laid.h;
  ctx.save();
  switch (o.kind) {
    case "rule": {
      if (laid.vertical) {
        if (laid.ruleX == null) break;
        const y0 = o.span === "plate" ? (laid.ruleY0 ?? 0) : laid.texts[0]?.box.y ?? 0;
        const y1 = o.span === "plate" ? (laid.ruleY1 ?? H) : textBounds(laid).y + textBounds(laid).h;
        const len = (y1 - y0) * p;
        ctx.fillStyle = paint(ctx, o.color, pal, laid.ruleX, y0, laid.ruleX, y0 + (y1 - y0), 1, !!o.fadeEnd);
        ctx.fillRect(laid.ruleX - o.width / 2, y0, o.width, len);
        break;
      }
      let x0 = laid.textX0;
      let x1 = laid.textX1 + laid.spec.type.name * 0.3;
      if (o.span === "plate") {
        x0 = 0;
        x1 = W;
      } else if (o.span === "name") {
        x0 = laid.nameX0;
        x1 = laid.nameX1;
      }
      const y = o.at === "top" ? o.width / 2 : o.at === "bottom" ? H - o.width / 2 : (laid.ruleY ?? H / 2);
      const len = (x1 - x0) * p;
      ctx.fillStyle = paint(ctx, o.color, pal, x0, y, x1, y, 1, !!o.fadeEnd);
      ctx.fillRect(x0, y - o.width / 2, len, o.width);
      if (o.cap === "diamond") {
        const cx = x0 + len;
        const s = 4.5 + o.width;
        ctx.translate(cx, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = paint(ctx, o.color, pal, -s, -s, s, s);
        ctx.fillRect(-s / 2, -s / 2, s, s);
      }
      break;
    }
    case "edge": {
      const h = H * p;
      ctx.fillStyle = paint(ctx, o.color, pal, 0, 0, 0, H);
      ctx.fillRect(0, (H - h) / 2, o.width, h);
      break;
    }
    case "frame": {
      ctx.globalAlpha *= p;
      ctx.strokeStyle = paint(ctx, o.color, pal, 0, 0, W, H);
      ctx.lineWidth = o.width;
      const i = o.inset;
      // frame draws on from the outer-left corner both ways
      const per = 2 * (W - 2 * i) + 2 * (H - 2 * i);
      ctx.setLineDash([per * p, per]);
      ctx.strokeRect(i, i, W - 2 * i, H - 2 * i);
      break;
    }
    case "ticks": {
      ctx.globalAlpha *= p;
      ctx.strokeStyle = paint(ctx, o.color, pal, 0, 0, W, H);
      ctx.lineWidth = o.width;
      ctx.lineCap = "square";
      const s = o.size;
      const k = o.width / 2;
      ctx.beginPath();
      ctx.moveTo(k, s + k);
      ctx.lineTo(k, k);
      ctx.lineTo(s + k, k);
      ctx.moveTo(W - k, H - s - k);
      ctx.lineTo(W - k, H - k);
      ctx.lineTo(W - s - k, H - k);
      ctx.stroke();
      break;
    }
    case "divider": {
      const d = laid.divider;
      if (!d) break;
      const len = (d.y1 - d.y0) * p;
      const mid = (d.y0 + d.y1) / 2;
      ctx.fillStyle = paint(ctx, o.color, pal, d.x, d.y0, d.x, d.y1);
      ctx.fillRect(d.x - o.width / 2, mid - len / 2, o.width, len);
      break;
    }
    case "seal": {
      const sl = laid.seal;
      if (!sl) break;
      const sp = clamp(p * 1.15);
      const sc = 1 + (1 - easeBack(sp)) * 0.35;
      ctx.globalAlpha *= clamp(sp * 1.6);
      ctx.translate(sl.x, sl.y);
      ctx.scale(sc, sc);
      ctx.rotate(-0.035);
      const half = sl.s / 2;
      // slightly irregular hand-carved outline
      ctx.beginPath();
      const jit = [0.6, -0.8, 0.4, 0.9, -0.5, 0.7, -0.6, 0.3];
      const pts: [number, number][] = [
        [-half, -half],
        [0, -half - jit[0]],
        [half, -half],
        [half + jit[1], 0],
        [half, half],
        [0, half + jit[2]],
        [-half, half],
        [-half + jit[3], 0],
      ];
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = css(resolveRGBA(o.color, pal));
      ctx.fill();
      ctx.strokeStyle = "rgba(255,240,230,0.55)";
      ctx.lineWidth = Math.max(1, sl.s * 0.035);
      const ins = sl.s * 0.09;
      ctx.strokeRect(-half + ins, -half + ins, sl.s - ins * 2, sl.s - ins * 2);
      // glyph is drawn unflipped
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = "#FFF6EE";
      ctx.font = font(700, sl.s * 0.6, '"Noto Serif SC", "Songti SC", serif');
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sl.ch, 0, sl.s * 0.03);
      break;
    }
    case "dot": {
      const d = laid.dot;
      if (!d) break;
      const sc = easeBack(p);
      ctx.translate(d.x, d.y);
      ctx.scale(sc, sc);
      ctx.fillStyle = css(resolveRGBA(o.color, pal));
      ctx.beginPath();
      ctx.arc(0, 0, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(resolveRGBA(o.color, pal), 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, d.r + 5 + Math.sin(m.local * 3) * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "flow": {
      const c = resolveRGBA(o.color, pal);
      const cut = laid.spec.plate.find((l) => l.kind === "chamfer");
      const cutPx = cut && cut.kind === "chamfer" ? cut.cut : 0;
      // base border: top edge (up to the chamfer) + outer edge
      ctx.lineWidth = o.width;
      ctx.lineCap = "butt";
      ctx.strokeStyle = css(c, 0.55);
      const topLen = (W - cutPx) * p;
      ctx.beginPath();
      ctx.moveTo(0, o.width / 2);
      ctx.lineTo(topLen, o.width / 2);
      ctx.stroke();
      ctx.fillStyle = css(c);
      ctx.fillRect(0, 0, o.width * 1.6, H * p);
      // travelling highlight
      if (p > 0.98) {
        const phase = ((m.local * 0.42) % 1 + 1) % 1;
        const seg = Math.max(W * 0.22, 90);
        const x = -seg + phase * (W - cutPx + seg * 2);
        const g = ctx.createLinearGradient(x - seg / 2, 0, x + seg / 2, 0);
        g.addColorStop(0, css(c, 0));
        g.addColorStop(0.5, css(mix(c, WHITE, 0.55)));
        g.addColorStop(1, css(c, 0));
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, -6, W - cutPx, 14);
        ctx.clip();
        ctx.shadowColor = css(c, 0.9);
        ctx.shadowBlur = 10;
        ctx.fillStyle = g;
        ctx.fillRect(x - seg / 2, 0, seg, o.width + 0.5);
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}


function textProgress(t: TextItem, m: Motion) {
  if (t.kind === "name") return m.name;
  if (t.kind === "en") return m.en;
  if (t.kind === "tag") return m.tag;
  return m.title(t.index);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  t: TextItem,
  laid: Laid,
  pal: Pal,
  m: Motion,
  flip: boolean,
  cfg: RenderConfig,
) {
  const p = textProgress(t, m);
  if (p <= 0.001) return;
  const W = laid.w;
  // un-mirrored screen x of the item
  const sx = flip ? W - t.gx - t.gw + (t.x - t.gx) : t.x;
  const bx = flip ? W - t.box.x - t.box.w : t.box.x;
  const box: Rect = { x: bx, y: t.box.y, w: t.box.w, h: t.box.h };
  const kind = m.fadeOnly ? "fade" : laid.spec.motion.text;

  ctx.save();
  if (p < 0.999) {
    if (kind === "rise") {
      ctx.beginPath();
      ctx.rect(box.x - 20, box.y - t.size * 0.25, box.w + 40, box.h + t.size * 0.45);
      ctx.clip();
      const off = t.mode === "v" || t.mode === "rot" ? (1 - p) * t.size * 1.2 : (1 - p) * t.size * 0.95;
      ctx.translate(0, off);
      ctx.globalAlpha *= clamp(p * 1.4);
    } else if (kind === "mask") {
      ctx.beginPath();
      if (t.mode === "v" || t.mode === "rot") {
        ctx.rect(box.x - 20, box.y - 10, box.w + 40, (box.h + 20) * p);
      } else {
        const w = (box.w + 24) * p;
        ctx.rect(flip ? box.x + box.w + 12 - w : box.x - 12, box.y - t.size * 0.4, w, box.h + t.size * 0.8);
      }
      ctx.clip();
      ctx.globalAlpha *= clamp(p * 2);
    } else {
      ctx.globalAlpha *= p;
      ctx.translate((flip ? 1 : -1) * (1 - p) * 10, 0);
    }
  }

  ctx.font = t.font;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const fill = paint(ctx, t.fill, pal, box.x, box.y, box.x + box.w * 0.4, box.y + box.h, t.alpha);
  ctx.fillStyle = fill;

  const fx = cfg.textFx ?? "soft";
  const sh = laid.spec.type.shadow;
  const applyShadow = () => {
    if (fx === "soft" && sh > 0) {
      ctx.shadowColor = `rgba(0,0,0,${0.5 * sh})`;
      ctx.shadowBlur = 4 + 12 * sh;
      ctx.shadowOffsetY = 1 + 1.5 * sh;
    }
  };
  const outline = (draw: (stroke: boolean) => void) => {
    if (fx !== "outline") return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = Math.max(4, t.size * 0.08);
    ctx.strokeStyle = "rgba(6,8,12,0.9)";
    ctx.lineWidth = Math.max(2, t.size * 0.06);
    draw(true);
    ctx.restore();
  };

  if (t.mode === "h") {
    outline((st) => fillTracked(ctx, t.text, sx, t.y, t.track, st));
    applyShadow();
    fillTracked(ctx, t.text, sx, t.y, t.track);
  } else if (t.mode === "center") {
    outline((st) => fillTracked(ctx, t.text, sx, t.y, t.track, st));
    applyShadow();
    fillTracked(ctx, t.text, sx, t.y, t.track);
  } else if (t.mode === "v") {
    const adv = t.adv ?? t.size * 1.1;
    ctx.textAlign = "center";
    const cx = box.x + box.w / 2;
    const chars = [...t.text];
    const tops = columnTops(chars, adv);
    const run = (stroke: boolean) =>
      chars.forEach((c, i) => {
        const y = t.y + tops[i] + t.size * 0.88;
        if (c === "·" || c === "・" || c === "•") {
          if (stroke) return;
          ctx.fillText("·", cx, y - t.size * 0.05);
          return;
        }
        if (VPUNCT.has(c)) {
          // vertical punctuation sits in the upper-right of its cell
          if (stroke) return;
          ctx.fillText(c, cx + t.size * 0.34, y - t.size * 0.52);
          return;
        }
        if (stroke) ctx.strokeText(c, cx, y);
        else ctx.fillText(c, cx, y);
      });
    outline(run);
    applyShadow();
    run(false);
  } else {
    // rotated Latin column, reading top → bottom
    ctx.translate(box.x, t.y);
    ctx.rotate(Math.PI / 2);
    applyShadow();
    fillTracked(ctx, t.text, 0, -box.w * 0.02, t.track);
  }
  ctx.restore();
}

/**
 * One soft light sweep during the hold. Plate mode runs inside the flipped
 * plate space (x=0 is the outer edge) and lights only painted pixels; text
 * mode re-fills the name glyphs with a moving highlight gradient.
 */
function drawSweep(ctx: CanvasRenderingContext2D, laid: Laid, m: Motion, flip: boolean) {
  if (m.sweep < 0) return;
  const mode = laid.spec.motion.sweep;
  const W = laid.w;
  const H = laid.h;
  const s = m.sweep;
  if (mode === "text") {
    const nm = laid.texts.find((t) => t.kind === "name");
    if (!nm || nm.mode !== "h") return;
    const peak = Math.sin(Math.PI * s) * 0.6;
    const sx = flip ? W - nm.gx - nm.gw + (nm.x - nm.gx) : nm.x;
    const band = Math.max(nm.w * 0.35, 60);
    let cx = sx - band + s * (nm.w + band * 2);
    if (flip) cx = sx + nm.w - (cx - sx);
    const g = ctx.createLinearGradient(cx - band, nm.box.y, cx + band, nm.box.y + nm.box.h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${peak.toFixed(3)})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.font = nm.font;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = g;
    fillTracked(ctx, nm.text, sx, nm.y, nm.track);
    ctx.restore();
    return;
  }
  const peak = Math.sin(Math.PI * s) * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.globalCompositeOperation = "source-atop";
  const band = Math.max(W * 0.18, 110);
  const cx = -band + s * (W + band * 2);
  const g = ctx.createLinearGradient(cx - band, 0, cx + band, H * 0.5);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, `rgba(255,255,255,${peak.toFixed(3)})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function layerShift(person: Person, layer: ClipLayer) {
  const t = person.xform?.[layer];
  return t ? { x: t.x ?? 0, y: t.y ?? 0, r: t.rotation ?? 0 } : null;
}

function withLayer(
  ctx: CanvasRenderingContext2D,
  person: Person,
  layer: ClipLayer,
  pivot: { x: number; y: number },
  draw: () => void,
) {
  const t = layerShift(person, layer);
  if (!t || (!t.x && !t.y && !t.r)) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(t.x, t.y);
  if (t.r) {
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate((t.r * Math.PI) / 180);
    ctx.translate(-pivot.x, -pivot.y);
  }
  draw();
  ctx.restore();
}

function drawPlate(ctx: CanvasRenderingContext2D, laid: Laid, m: Motion, pal: Pal, flip: boolean, cfg: RenderConfig) {
  const spec = laid.spec;
  const plateLayers = laid.vertical && spec.vertical ? spec.vertical.plate : spec.plate;
  const ornaments = laid.vertical && spec.vertical ? spec.vertical.ornaments : spec.ornaments;
  const W = laid.w;
  const center = { x: W / 2, y: laid.h / 2 };
  const person = laid.person;

  const flipped = (fn: () => void) => {
    ctx.save();
    if (flip) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    fn();
    ctx.restore();
  };

  withLayer(ctx, person, "band", center, () =>
    flipped(() => {
      for (const l of plateLayers) {
        if (l.kind === "paper") continue;
        drawPlateLayer(ctx, l, laid, pal, m);
      }
      for (const l of plateLayers) {
        if (l.kind === "paper") drawPlateLayer(ctx, l, laid, pal, m);
      }
    }),
  );
  withLayer(ctx, person, "slash", center, () =>
    flipped(() => {
      for (const o of ornaments) drawOrnament(ctx, o, laid, pal, m, flip);
    }),
  );
  const names = laid.texts.filter((t) => t.kind === "name" || t.kind === "en");
  const rest = laid.texts.filter((t) => t.kind === "title" || t.kind === "tag");
  withLayer(ctx, person, "name", center, () => names.forEach((t) => drawText(ctx, t, laid, pal, m, flip, cfg)));
  withLayer(ctx, person, "title", center, () => rest.forEach((t) => drawText(ctx, t, laid, pal, m, flip, cfg)));
  if (spec.motion.sweep === "plate") {
    flipped(() => drawSweep(ctx, laid, m, flip));
  } else if (spec.motion.sweep === "text") {
    withLayer(ctx, person, "name", center, () => drawSweep(ctx, laid, m, flip));
  }
}

/* ------------------------------------------------------------------ frame */

const SAFE_X = BASE_W * 0.1;
const SAFE_BOTTOM = BASE_H * 0.9;
const SAFE_TOP = BASE_H * 0.1;

export function drawPremiumFrame(
  ctx: CanvasRenderingContext2D,
  people: Person[],
  time: number,
  cfg: RenderConfig,
) {
  if (!isPremiumId(cfg.style)) return;
  const spec = TEMPLATE_BY_ID[cfg.style];
  const pal = paletteOf(cfg);
  const vertical = !!spec.nativeVertical || (cfg.orient === "vertical" && !!spec.vertical);
  const laid = people.map((p) => layoutOf(ctx, spec, p, cfg, vertical));
  const sideOf = (i: number) =>
    spec.mirrored && i % 2 === 1 ? (cfg.side === "left" ? "right" : "left") : cfg.side;

  type Slot = { i: number; x: number; y: number; fit: number; right: boolean };
  const slots: Slot[] = [];
  const maxW = BASE_W - SAFE_X * 2;

  if (vertical) {
    const topY = BASE_H * 0.15;
    const availH = SAFE_BOTTOM - topY;
    if (cfg.layout === "sequence") {
      laid.forEach((l, i) => {
        const right = sideOf(i) === "right";
        const fit = Math.min(1, availH / l.h);
        slots.push({ i, x: right ? BASE_W - SAFE_X - l.w * fit : SAFE_X, y: topY, fit, right });
      });
    } else {
      const gap = 40 * cfg.scale;
      const total = laid.reduce((s, l) => s + l.w, 0) + gap * Math.max(0, laid.length - 1);
      const maxH = Math.max(...laid.map((l) => l.h), 1);
      const fit = Math.min(1, maxW / total, availH / maxH);
      const right = cfg.side === "right";
      let x = right ? BASE_W - SAFE_X : SAFE_X;
      laid.forEach((l, i) => {
        const w = l.w * fit;
        if (right) {
          x -= w;
          slots.push({ i, x, y: topY, fit, right });
          x -= gap * fit;
        } else {
          slots.push({ i, x, y: topY, fit, right });
          x += w + gap * fit;
        }
      });
    }
  } else if (cfg.layout === "sequence") {
    laid.forEach((l, i) => {
      const right = sideOf(i) === "right";
      const fit = Math.min(1, maxW / l.w, (SAFE_BOTTOM - SAFE_TOP) / l.h);
      slots.push({
        i,
        x: right ? BASE_W - SAFE_X - l.w * fit : SAFE_X,
        y: SAFE_BOTTOM - l.h * fit,
        fit,
        right,
      });
    });
  } else {
    // simultaneous: stack upward from the title-safe bottom; mirrored
    // templates pair people on one row (left + right).
    const gap = 26 * cfg.scale;
    const rows: number[][] = [];
    laid.forEach((_, i) => {
      if (spec.mirrored) {
        const r = Math.floor(i / 2);
        (rows[r] ??= []).push(i);
      } else rows.push([i]);
    });
    const rowH = rows.map((r) => Math.max(...r.map((i) => laid[i].h)));
    const total = rowH.reduce((s, h) => s + h, 0) + gap * Math.max(0, rows.length - 1);
    const widest = Math.max(...laid.map((l) => l.w), 1);
    const fit = Math.min(1, (SAFE_BOTTOM - SAFE_TOP) / total, maxW / (spec.mirrored ? widest * 2 + 80 : widest));
    let y = SAFE_BOTTOM - total * fit;
    rows.forEach((r, ri) => {
      r.forEach((i) => {
        const right = sideOf(i) === "right";
        const l = laid[i];
        slots.push({
          i,
          x: right ? BASE_W - SAFE_X - l.w * fit : SAFE_X,
          y: y + (rowH[ri] - l.h) * fit,
          fit,
          right,
        });
      });
      y += (rowH[ri] + gap) * fit;
    });
  }

  for (const s of slots) {
    const m = motionOf(s.i, time, cfg, spec);
    if (!m) continue;
    const l = laid[s.i];
    ctx.save();
    ctx.translate(s.x + m.dx * (s.right && (cfg.animIn === "left" || cfg.animIn === "right") ? -1 : 1), s.y + m.dy);
    ctx.scale(s.fit * m.scale, s.fit * m.scale);
    if (m.scale !== 1) {
      const k = (1 - m.scale) / m.scale;
      ctx.translate((s.right ? l.w : 0) * k, l.h * k);
    }
    drawPlate(ctx, l, m, pal, s.right, cfg);
    ctx.restore();
  }
}

/** Template defaults (palette, fonts, sweep) for a premium style. */
export function premiumDefaults(style: string) {
  if (!isPremiumId(style)) return null;
  const t = TEMPLATE_BY_ID[style];
  return { ...t.palette, fonts: t.fonts, sweep: t.motion.sweepDefault };
}
