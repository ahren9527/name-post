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

/** Smootherstep — zero slope at both ends, so a fade has no visible start or stop line. */
const smoother = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * Add eased fade-out stops to a gradient: full `alpha` until `from`, then a
 * smootherstep falloff that reaches exactly 0 at t=1.
 */
function addFadeStops(g: CanvasGradient, rgba: (a: number) => string, alpha: number, from: number) {
  const f = Math.min(0.98, Math.max(0, from));
  g.addColorStop(0, rgba(alpha));
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.addColorStop(f + (1 - f) * t, rgba(alpha * (1 - smoother(t))));
  }
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
    if (fade) {
      // metallic tone shifts light → mid while the alpha eases out smoothly
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const tone = t < 0.5 ? mix(l, m, t * 2) : mix(m, d, (t - 0.5) * 2);
        g.addColorStop(t, css(tone, alpha * (t < 0.4 ? 1 : 1 - smoother((t - 0.4) / 0.6))));
      }
      return g;
    }
    g.addColorStop(0, css(l, alpha));
    g.addColorStop(0.5, css(m, alpha));
    g.addColorStop(1, css(mix(m, l, 0.4), alpha));
    return g;
  }
  const c = resolveRGBA(ref, pal);
  if (!fade) return css(c, alpha);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  addFadeStops(g, (a) => css(c, a), alpha, 0.4);
  return g;
}

/** A horizontal fill whose inner end fades to nothing (the plate "tail"). */
export function fadesOut(fill: Fill): boolean {
  if (fill.kind !== "linear" || fill.axis === "y" || fill.stops.length < 2) return false;
  const last = fill.stops[fill.stops.length - 1];
  return last[0] >= 0.98 && (last[2] ?? 1) <= 0.001;
}

/**
 * `unfade` drops a trailing transparent stop (holding the previous alpha
 * instead) — used when one shared alpha mask fades the whole plate group.
 */
function fillStyleOf(
  ctx: CanvasRenderingContext2D,
  fill: Fill,
  pal: Pal,
  r: Rect,
  unfade = false,
): string | CanvasGradient {
  if (fill.kind === "solid") return css(resolveRGBA(fill.color, pal), fill.alpha ?? 1);
  const vertical = fill.axis === "y";
  const g = vertical
    ? ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h)
    : ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y);
  const stops = fill.stops;
  const drop = unfade && fadesOut(fill);
  stops.forEach(([t, ref, a], i) => {
    const c = ref === "$gold" ? goldStops(pal)[1] : resolveRGBA(ref, pal);
    const alpha = drop && i === stops.length - 1 ? (stops[i - 1][2] ?? 1) : (a ?? 1);
    g.addColorStop(Math.max(0, Math.min(1, t)), css(c, alpha));
  });
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
  script: '"Cormorant Garamond", "Times New Roman", serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace',
} as const;

/** English / pinyin line text in the template's casing. */
function enText(p: Person, spec: TemplateSpec): string {
  const raw = (p.en ?? "").trim();
  if (!raw) return "";
  if (spec.type.enCase === "title") {
    return raw.toLowerCase().replace(/(^|[\s\-·'])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
  }
  return raw.toUpperCase();
}

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
  /** editorial initial slot (local x, width) */
  initial?: { x: number; w: number; ch: string };
}

/** Editorial initial: Latin initial of the English line, else the surname. */
function initialOf(p: Person, en: string): string {
  const m = en.match(/\p{L}/u);
  return m ? m[0].toUpperCase() : surnameOf(p.name);
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
    enFont: font(
      t.enFont === "script" ? Math.min(t.enWeight, 500) : t.enWeight,
      E,
      EN_FONTS[t.enFont],
      t.enFont === "script" || (!!t.italic && t.enFont !== "serif"),
    ),
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
  const en = enText(p, spec);
  const tag = (p.tag ?? "").trim();
  const texts: TextItem[] = [];

  let leadW = 0;
  if (L.lead === "seal") leadW = N * 1.12 + N * 0.34;
  else if (L.lead === "dot") leadW = N * 0.3 + N * 0.32;
  else if (L.lead === "initial") leadW = N * 1.5 + N * 0.36;
  const padX = L.padX * N;
  const x0 = padX + leadW;
  let y = L.padY * N;
  let contentW = 0;

  if (tag && L.tag === "above") {
    const tf = t.tagFont ? EN_FONTS[t.tagFont] : famOf(s.titleFont);
    const it = item(ctx, "tag", 0, tag, font(t.tagFont === "mono" ? 500 : 600, T * 0.78, tf), T * 0.78, T * (t.tagFont === "mono" ? 0.04 : 0.12), t.tagFill ?? "$accent", 1);
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
    y += T * 0.66;
    const it = item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.9);
    place(it, x0, y, true);
    texts.push(it);
    contentW = Math.max(contentW, it.w);
    y += E * 0.74;
  }
  if (tag && L.tag === "below") {
    y += T * 0.55;
    const tf = t.tagFont ? EN_FONTS[t.tagFont] : famOf(s.titleFont);
    const it = item(ctx, "tag", 0, tag, font(600, T * 0.8, tf), T * 0.8, T * 0.1, t.tagFill ?? "$accent", 1);
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
  } else if (L.lead === "stamp") {
    // small seal after the name line, its top aligned with the cap height
    const sz = N * 0.5;
    laid.seal = { x: x0 + lineW + N * 0.42 + sz / 2, y: nameTop + N * 0.18 + sz / 2, s: sz, ch: surnameOf(p.name) };
    laid.w = Math.max(laid.w, x0 + lineW + N * 0.42 + sz + padX + L.tail * N * 0.6);
    laid.regions.plate!.w = laid.w;
  } else if (L.lead === "initial") {
    laid.initial = { x: padX, w: N * 1.5, ch: initialOf(p, en) };
  }
  return laid;
}

function layoutInline(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const { N, T, E } = s;
  const titles = titlesOf(p);
  const en = enText(p, spec);
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
  const en = enText(p, spec);
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

/**
 * Rounded blocks: name block (+ optional lead chip) with the title either as
 * a second, indented block underneath ("stack") or as a segment joined on
 * the name block's right ("row" — a segmented capsule).
 */
function layoutBlocks(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const t = spec.type;
  const { N, T, E } = s;
  const row = L.blocks === "row";
  const titles = titlesOf(p);
  const en = enText(p, spec);
  const tag = (p.tag ?? "").trim();
  const texts: TextItem[] = [];
  const regions: Partial<Record<Region, Rect>> = {};
  const padX = L.padX * N;

  const nm = item(ctx, "name", 0, p.name.trim(), s.nameFont, N, s.nameTrack, t.nameFill, 1);
  const enIt = en && L.en !== "none" ? item(ctx, "en", 0, en, s.enFont, E, s.enTrack, t.enFill, 0.95) : null;
  const enGap = N * 0.3;
  const lineW = nm.w + (enIt ? enGap + enIt.w : 0);
  const tItems = titles.map((line, i) => item(ctx, "title", i, line, s.titleFont, T, s.titleTrack, t.titleFill, t.titleAlpha));
  const titleW = Math.max(0, ...tItems.map((it) => it.w));
  const tLH = T * L.titleLineHeight;
  const titleColH = titles.length ? T + (titles.length - 1) * tLH : 0;
  const tPadX = T * 0.85;

  let row1H = N * 1.46;
  if (row && titles.length) row1H = Math.max(row1H, titleColH + T * 1.1);

  let x = 0;
  let dot: Laid["dot"];
  if (tag && L.lead === "tag") {
    const cs = T * 0.8;
    const tf = t.tagFont ? EN_FONTS[t.tagFont] : famOf(s.titleFont);
    const chip = item(ctx, "tag", 0, tag, font(700, cs, tf), cs, cs * 0.1, t.tagFill ?? "#ffffff", 1);
    const chipH = Math.min(row1H * 0.74, cs * 2.2);
    const hasDot = spec.ornaments.some((o) => o.kind === "dot");
    const dotR = hasDot ? chipH * 0.13 : 0;
    const inner = chipH * 0.48;
    const chipW = inner * 2 + chip.w + (hasDot ? dotR * 2 + chipH * 0.22 : 0);
    const cy = (row1H - chipH) / 2;
    regions.lead = { x: 0, y: cy, w: chipW, h: chipH };
    const tx = inner + (hasDot ? dotR * 2 + chipH * 0.22 : 0);
    chip.x = tx;
    chip.y = cy + chipH / 2 + cs * 0.36;
    chip.gx = tx;
    chip.gw = chip.w;
    chip.box = { x: tx, y: cy + (chipH - cs) / 2, w: chip.w, h: cs };
    texts.push(chip);
    if (hasDot) dot = { x: inner + dotR, y: cy + chipH / 2, r: dotR };
    x = chipW + N * 0.14;
  }

  const nameW = padX * 2 + lineW;
  regions.name = { x, y: 0, w: nameW, h: row1H };
  const nameX = x + padX;
  place(nm, nameX, (row1H - N) / 2 + N * 0.02);
  nm.gx = nameX;
  nm.gw = lineW;
  texts.push(nm);
  if (enIt) {
    const ex = nameX + nm.w + enGap;
    enIt.x = ex;
    enIt.y = nm.y - N * 0.05;
    enIt.box = { x: ex, y: enIt.y - E * 0.72, w: enIt.w, h: E * 0.74 };
    enIt.gx = nameX;
    enIt.gw = lineW;
    texts.push(enIt);
  }

  let right = x + nameW;
  let H = row1H;
  let tx0 = 0;
  if (titles.length) {
    if (row) {
      const overlap = row1H / 2;
      tx0 = x + nameW + tPadX * 0.85;
      const ty = (row1H - titleColH) / 2;
      tItems.forEach((it, i) => place(it, tx0, ty + i * tLH));
      regions.title = { x: x + nameW - overlap, y: 0, w: overlap + tPadX * 0.85 + titleW + tPadX * 1.05, h: row1H };
    } else {
      const gap = (L.tierGap ?? 0.12) * N;
      const indent = (L.titleIndent ?? 0.4) * N;
      const padY2 = T * 0.46;
      const row2H = padY2 * 2 + titleColH;
      const bx = x + indent;
      tx0 = bx + tPadX;
      tItems.forEach((it, i) => place(it, tx0, row1H + gap + padY2 + i * tLH));
      regions.title = { x: bx, y: row1H + gap, w: tPadX * 2 + titleW, h: row2H };
      H = row1H + gap + row2H;
    }
    texts.push(...tItems);
    right = Math.max(right, regions.title.x + regions.title.w);
  }
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
    textX1: Math.max(nameX + lineW, titles.length ? tx0 + titleW : 0),
    nameX0: nameX,
    nameX1: nameX + nm.w,
    ruleY: row1H,
    dot,
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
  const en = enText(p, spec);
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
    case "blocks":
      return layoutBlocks(ctx, spec, p, s);
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

/** Neon-style switch-on: a few hard flickers, then steady. */
function flickerOf(p: number): number {
  if (p >= 0.999) return 1;
  const k = Math.floor(p * 14);
  const pattern = [0, 0.7, 0.1, 0, 0.85, 0.3, 1, 0.55, 1, 1, 0.8, 1, 1, 1, 1];
  return clamp(pattern[k] ?? 1) * clamp(p * 1.6);
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
  } else if (kind === "pop") {
    // springy scale from the block's outer-left centre, slight overshoot
    const sc = 0.5 + 0.5 * easeBack(p);
    const cx = r.x;
    const cy = r.y + r.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha *= clamp(p * 2.5);
  } else if (kind === "flicker") {
    ctx.globalAlpha *= flickerOf(p);
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
  unfade = false,
) {
  const plateR = laid.regions.plate!;
  if (layer.kind === "scrim") {
    const p = m.plate;
    if (p <= 0.001) return;
    const tb = textBounds(laid);
    const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
    // A soft shade band anchored toward the screen edge: eased vertically and
    // faded horizontally past the type with the same smootherstep the plates
    // use — it reads as deliberate shading, never as a grey disc on light
    // backgrounds.
    const padV = N * 1.3;
    const y0 = tb.y - padV;
    const y1 = tb.y + tb.h + padV;
    const x0 = -N * 3;
    const fadeStart = tb.x + tb.w + N * 0.15;
    const x1 = fadeStart + N * 3.2;
    const bounds: Rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    ctx.save();
    ctx.globalAlpha *= p;
    drawMasked(ctx, 2, bounds, fadeStart, x1, (c) => {
      const g = c.createLinearGradient(0, y0, 0, y1);
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const d = Math.abs(t - 0.5) * 2;
        const core = (tb.h / 2) / (tb.h / 2 + padV);
        const a = 1 - smoother((d - core * 0.7) / (1 - core * 0.7));
        g.addColorStop(t, `rgba(0,0,0,${(layer.alpha * a).toFixed(4)})`);
      }
      c.fillStyle = g;
      c.fillRect(x0, y0, x1 - x0, y1 - y0);
    });
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
      const rad = layer.pill ? r.h / 2 : (layer.radius ?? 0);
      if (layer.shadow) {
        ctx.save();
        shadowOn(ctx, layer.shadow);
        ctx.fillStyle = "rgba(0,0,0,0.001)";
        roundRectPath(ctx, r, rad);
        ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r, unfade);
        ctx.fill();
        ctx.restore();
      } else {
        roundRectPath(ctx, r, rad);
        ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r, unfade);
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
      ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r, unfade);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "skew": {
      skewPath(ctx, r, layer.skew);
      ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r, unfade);
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
    case "aurora": {
      const base = resolveRGBA(layer.base, pal);
      ctx.save();
      shadowOn(ctx, 0.5);
      roundRectPath(ctx, r, layer.radius);
      ctx.fillStyle = css(base);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRectPath(ctx, r, layer.radius);
      ctx.clip();
      // drifting soft blobs; each one breathes on its own slow cycle
      const t = m.local;
      layer.colors.forEach((ref, i) => {
        const c = resolveRGBA(ref, pal);
        const n = layer.colors.length;
        const fx = (i + 0.5) / n + Math.sin(t * 0.45 + i * 1.7) * 0.08;
        const fy = i % 2 ? 0.95 + Math.cos(t * 0.38 + i) * 0.12 : 0.1 + Math.sin(t * 0.33 + i * 2.1) * 0.12;
        const rad = Math.max(r.w / n, r.h) * (1.05 + 0.1 * Math.sin(t * 0.6 + i));
        const cx = r.x + r.w * fx;
        const cy = r.y + r.h * fy;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, css(c, 0.85));
        g.addColorStop(0.45, css(c, 0.4));
        g.addColorStop(1, css(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      });
      // re-darken the text zone a touch so white type always holds
      const veil = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      veil.addColorStop(0, css(base, 0.1));
      veil.addColorStop(0.5, css(base, 0.24));
      veil.addColorStop(1, css(base, 0.12));
      ctx.fillStyle = veil;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const hl = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h * 0.5);
      hl.addColorStop(0, "rgba(255,255,255,0.16)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      roundRectPath(ctx, { x: r.x + 0.5, y: r.y + 0.5, w: r.w - 1, h: r.h - 1 }, layer.radius);
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case "brush": {
      drawBrush(ctx, r, layer.fill, pal, unfade, laid.person.name);
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

/** Seeded PRNG so a brush stroke is identical on every frame. */
function rng(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

function hashStr(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return Math.abs(h) || 7;
}

/**
 * Ink-wash stroke: a body with ragged top/bottom edges, darker pooled ink
 * at the start, bristle streaks, and dry-brush (飞白) strands that thin out
 * toward the tail. The plate's shared fade mask takes it to nothing.
 */
function drawBrush(ctx: CanvasRenderingContext2D, r: Rect, fill: Fill, pal: Pal, unfade: boolean, seedStr: string) {
  const rnd = rng(hashStr(seedStr) + 97);
  const steps = 90;
  const amp = r.h * 0.022;
  const ph1 = rnd() * 6;
  const ph2 = rnd() * 6;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = r.x + r.w * u;
    // stroke swells slightly in the middle and thins toward the tail
    const taper = u < 0.06 ? 0.9 + u * 1.6 : u > 0.7 ? 1 - (u - 0.7) * 0.5 : 1;
    const hh = (r.h / 2) * taper;
    const cy = r.y + r.h / 2 + Math.sin(u * 2.6 + ph1) * r.h * 0.018;
    // slow wobble + fine grain, grain grows rougher toward the dry tail
    const wob = (k: number) => Math.sin(u * 9 + k) * r.h * 0.014 + Math.sin(u * 23 + k * 2) * r.h * 0.006;
    const grain = () => (rnd() - 0.5) * amp * (0.4 + u * 1.4);
    top.push([x, cy - hh + wob(ph1) + grain()]);
    bot.push([x, cy + hh + wob(ph2) + grain()]);
  }
  ctx.save();
  ctx.beginPath();
  // rounded, slightly blobby start like a loaded brush touching paper
  ctx.moveTo(top[0][0] + r.h * 0.05, top[0][1]);
  top.forEach(([x, y], i) => i && ctx.lineTo(x, y));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.bezierCurveTo(r.x - r.h * 0.04, bot[0][1] - r.h * 0.2, r.x - r.h * 0.03, top[0][1] + r.h * 0.2, top[0][0] + r.h * 0.05, top[0][1]);
  ctx.closePath();
  ctx.fillStyle = fillStyleOf(ctx, fill, pal, r, unfade);
  ctx.fill();
  ctx.clip();
  // pooled ink at the start, lighter wash toward the middle
  const pool = ctx.createLinearGradient(r.x, 0, r.x + r.w * 0.45, 0);
  pool.addColorStop(0, "rgba(0,0,0,0.35)");
  pool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(r.x - 10, r.y - 10, r.w * 0.5, r.h + 20);
  // bristle streaks: thin lighter lines running along the stroke
  ctx.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const y = r.y + r.h * (0.06 + rnd() * 0.88);
    const x0 = r.x + r.w * (0.05 + rnd() * 0.5);
    const len = r.w * (0.2 + rnd() * 0.5);
    ctx.strokeStyle = `rgba(255,255,255,${(0.025 + rnd() * 0.045).toFixed(3)})`;
    ctx.lineWidth = 0.6 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + len, y + (rnd() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
  // dry-brush strands leaving the body into the tail (飞白)
  const base = fill.kind === "linear" ? resolveRGBA(fill.stops[0][1], pal) : resolveRGBA(fill.color, pal);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 22; i++) {
    const u = rnd();
    const y = r.y + r.h * (0.08 + u * 0.84);
    const x0 = r.x + r.w * (0.6 + rnd() * 0.15);
    const len = r.w * (0.18 + rnd() * 0.3);
    const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
    const a = (0.25 + rnd() * 0.45) * base[3];
    g.addColorStop(0, css(base, a));
    g.addColorStop(1, css(base, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + rnd() * r.h * 0.06;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + len * 0.5, y + (rnd() - 0.5) * r.h * 0.08, x0 + len, y + (rnd() - 0.5) * r.h * 0.12);
    ctx.stroke();
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
      const pf = o.span === "plate" && o.fadeEnd ? plateFadeOf(laid, laid.spec.plate) : null;
      if (pf) {
        // plate-long rules follow the plate's own fade curve exactly
        const g = ctx.createLinearGradient(x0, y, x1, y);
        const [l, mid] = goldStops(pal);
        const tone = o.color === "$gold" ? mix(l, mid, 0.5) : resolveRGBA(o.color, pal);
        addFadeStops(g, (a) => css(tone, a), 1, pf.start / Math.max(1, x1 - x0));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = paint(ctx, o.color, pal, x0, y, x1, y, 1, !!o.fadeEnd);
      }
      ctx.fillRect(x0, y - o.width / 2, len, o.width);
      if (o.cap === "flourish" && p > 0.05) {
        // a tiny swash: two mirrored curls meeting at a diamond
        const cx = x0 + len + 10;
        const sz = 7 + o.width * 2;
        ctx.save();
        ctx.translate(cx, y);
        ctx.globalAlpha *= clamp((p - 0.6) / 0.4);
        ctx.strokeStyle = paint(ctx, o.color, pal, -sz, -sz, sz, sz);
        ctx.lineWidth = Math.max(1, o.width);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.bezierCurveTo(-4, -sz * 0.9, sz * 0.6, -sz * 0.9, sz * 0.5, -sz * 0.2);
        ctx.moveTo(-10, 0);
        ctx.bezierCurveTo(-4, sz * 0.9, sz * 0.6, sz * 0.9, sz * 0.5, sz * 0.2);
        ctx.stroke();
        ctx.translate(sz * 1.25, 0);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = paint(ctx, o.color, pal, -4, -4, 4, 4);
        ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
        ctx.restore();
      }
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
      ctx.arc(0, 0, d.r + Math.min(5, d.r * 0.7) + Math.sin(m.local * 3) * Math.min(1.2, d.r * 0.2), 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "spark": {
      // mini sparkline at the inner end of the plate, beside the name
      const nm = laid.texts.find((t) => t.kind === "name");
      if (!nm) break;
      const N = nm.size;
      const x1 = W - N * 0.42;
      const x0 = Math.max(laid.textX1 + N * 0.5, x1 - N * 2.2);
      if (x1 - x0 < N * 0.8) break;
      const top = nm.box.y + N * 0.05;
      const bot = nm.box.y + N * 0.85;
      const c = resolveRGBA(o.color, pal);
      const vals = [0.35, 0.42, 0.3, 0.5, 0.46, 0.62, 0.55, 0.7, 0.64, 0.82, 0.76, 0.95];
      const pts = vals.map((v, i) => [x0 + ((x1 - x0) * i) / (vals.length - 1), bot - (bot - top) * v] as [number, number]);
      // keep the trend reading left → right on right-side plates too
      if (flip) {
        ctx.translate(x0 + x1, 0);
        ctx.scale(-1, 1);
      }
      const k = p * (pts.length - 1);
      const n = Math.floor(k);
      const vis = pts.slice(0, n + 1);
      if (n < pts.length - 1) {
        const a = pts[n];
        const b = pts[n + 1];
        vis.push([a[0] + (b[0] - a[0]) * (k - n), a[1] + (b[1] - a[1]) * (k - n)]);
      }
      const end = vis[vis.length - 1];
      // area wash
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, css(c, 0.28));
      g.addColorStop(1, css(c, 0));
      ctx.beginPath();
      vis.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineTo(end[0], bot);
      ctx.lineTo(x0, bot);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      // baseline + line
      ctx.fillStyle = css(c, 0.25);
      ctx.fillRect(x0, bot, (x1 - x0) * p, 1);
      ctx.beginPath();
      vis.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = css(c);
      ctx.lineWidth = o.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      // live point
      const pulse = 0.5 + 0.5 * Math.sin(m.local * 4);
      ctx.fillStyle = css(c, 0.25 * pulse);
      ctx.beginPath();
      ctx.arc(end[0], end[1], o.width * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(mix(c, WHITE, 0.4));
      ctx.beginPath();
      ctx.arc(end[0], end[1], o.width * 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "neon": {
      const c = resolveRGBA(o.color, pal);
      const c2 = resolveRGBA(o.color2, pal);
      const f = flickerOf(p);
      if (f <= 0.01) break;
      ctx.globalAlpha *= f;
      const i = o.width / 2;
      const rr: Rect = { x: i, y: i, w: W - o.width, h: H - o.width };
      const per = 2 * (rr.w + rr.h);
      // glow pass, then a hot white-ish core
      ctx.setLineDash([per * clamp(p * 1.4), per]);
      ctx.lineWidth = o.width;
      roundRectPath(ctx, rr, o.radius);
      ctx.shadowColor = css(c, 0.95);
      ctx.shadowBlur = 18;
      ctx.strokeStyle = css(c);
      ctx.stroke();
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = css(mix(c, WHITE, 0.55));
      ctx.lineWidth = Math.max(1, o.width * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
      // second-colour accent: a short bar along the bottom-outer corner
      const len = Math.min(W * 0.32, 160) * clamp((p - 0.3) / 0.7);
      if (len > 1) {
        ctx.shadowColor = css(c2, 0.95);
        ctx.shadowBlur = 14;
        ctx.fillStyle = css(mix(c2, WHITE, 0.25));
        ctx.fillRect(o.radius + 6, H + 5, len, 2);
        ctx.fillRect(o.radius + 6 + len + 8, H + 5, Math.min(14, len * 0.15), 2);
      }
      break;
    }
    case "fret": {
      // 回纹 band, revealed from the outer edge
      const c = o.color;
      const u = o.size;
      const bands: number[] = [];
      const m0 = u * 0.55;
      if (o.at !== "bottom") bands.push(m0);
      if (o.at !== "top") bands.push(H - m0 - u);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W * p, H);
      ctx.clip();
      ctx.strokeStyle = paint(ctx, c, pal, 0, 0, W, H, 0.85);
      ctx.lineWidth = Math.max(1, u * 0.14);
      ctx.lineCap = "square";
      for (const y of bands) {
        const step = u * 1.5;
        const x0 = u * 0.8;
        const count = Math.max(0, Math.floor((W - x0 * 2) / step));
        const off = (W - count * step) / 2;
        ctx.beginPath();
        for (let k = 0; k < count; k++) {
          const x = off + k * step;
          // one key: up, across, down, back, up (a squared spiral)
          ctx.moveTo(x, y + u);
          ctx.lineTo(x, y);
          ctx.lineTo(x + u, y);
          ctx.lineTo(x + u, y + u * 0.68);
          ctx.lineTo(x + u * 0.36, y + u * 0.68);
          ctx.lineTo(x + u * 0.36, y + u * 0.34);
          ctx.moveTo(x, y + u);
          ctx.lineTo(x + step, y + u);
        }
        ctx.stroke();
        // hairlines framing the band
        ctx.globalAlpha *= 0.6;
        ctx.fillStyle = paint(ctx, c, pal, 0, 0, W, 0);
        ctx.fillRect(off, y - u * 0.35, count * step, Math.max(1, u * 0.1));
        ctx.globalAlpha /= 0.6;
      }
      ctx.restore();
      break;
    }
    case "sparkle": {
      const r = laid.regions.name;
      if (!r) break;
      const c = resolveRGBA(o.color, pal);
      const stars: [number, number, number, number][] = [
        [r.x + r.w - r.h * 0.18, r.y - r.h * 0.08, r.h * 0.2, 0],
        [r.x + r.w + r.h * 0.12, r.y + r.h * 0.2, r.h * 0.11, 1.3],
        [r.x + r.w - r.h * 0.55, r.y - r.h * 0.2, r.h * 0.08, 2.4],
      ];
      for (const [x, y, size, ph] of stars) {
        const tw = 0.75 + 0.25 * Math.sin(m.local * 3.2 + ph);
        const sp = clamp((p - 0.4 - ph * 0.08) / 0.4);
        if (sp <= 0) continue;
        const sz = size * easeBack(sp) * tw;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(m.local * 0.6 + ph);
        ctx.fillStyle = css(c, sp);
        ctx.shadowColor = css(c, 0.6);
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const rad = k % 2 ? sz * 0.28 : sz;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
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


/** Ornaments tied to the type, drawn unflipped like the text (initial, cursor). */
function drawFrontOrnament(
  ctx: CanvasRenderingContext2D,
  o: Ornament,
  laid: Laid,
  pal: Pal,
  m: Motion,
  flip: boolean,
) {
  const W = laid.w;
  const H = laid.h;
  if (o.kind === "initial") {
    const ini = laid.initial;
    const p = m.name;
    if (!ini || p <= 0.001) return;
    const latin = /[A-Z]/.test(ini.ch);
    const fam = latin ? EN_FONTS.serif : '"Noto Serif SC", "Songti SC", serif';
    let size = H * (latin ? 1.22 : 0.98);
    ctx.save();
    ctx.font = font(latin ? 600 : 700, size, fam);
    const mw = ctx.measureText(ini.ch).width;
    if (mw > ini.w * 1.05) size *= (ini.w * 1.05) / mw;
    ctx.font = font(latin ? 600 : 700, size, fam);
    const gw = ctx.measureText(ini.ch).width;
    const lx = ini.x + (ini.w - gw) / 2;
    const x = flip ? W - lx - gw : lx;
    // cropped by the plate: the letter bleeds off the top/bottom edges
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(x - 20, 0, gw + 40, H * clamp(p * 1.1));
    ctx.clip();
    ctx.globalAlpha *= clamp(p * 1.6);
    ctx.fillStyle = css(resolveRGBA(o.color, pal));
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ini.ch, x, latin ? H * 0.5 + size * 0.36 : H * 0.5 + size * 0.36);
    ctx.restore();
    return;
  }
  if (o.kind === "cursor") {
    const titles = laid.texts.filter((t) => t.kind === "title");
    const last = titles[titles.length - 1] ?? laid.texts.find((t) => t.kind === "name");
    if (!last) return;
    const p = textProgress(last, m);
    if (p < 0.98) return;
    if (Math.floor(m.local * 1.8) % 2 === 1) return;
    const sz = last.size;
    const cw = sz * 0.5;
    const lx = last.x + last.w + sz * 0.25;
    const sx = flip ? W - (last.gx + last.gw) + (last.x - last.gx) + last.w + sz * 0.25 : lx;
    ctx.save();
    ctx.fillStyle = css(resolveRGBA(o.color, pal), 0.9);
    ctx.fillRect(sx, last.box.y + sz * 0.08, cw, sz * 0.86);
    ctx.restore();
  }
}

const FRONT_ORNAMENTS = new Set<Ornament["kind"]>(["initial", "cursor"]);

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
    } else if (kind === "drift") {
      // film-title reveal: letters settle inward from a wider tracking
      ctx.globalAlpha *= clamp(p * 1.2);
    } else {
      ctx.globalAlpha *= p;
      ctx.translate((flip ? 1 : -1) * (1 - p) * 10, 0);
    }
  }
  let track = t.track;
  let dsx = 0;
  if (kind === "drift" && p < 0.999 && (t.mode === "h" || t.mode === "center")) {
    const extra = (1 - p) * t.size * 0.16;
    const n = [...t.text].length;
    track += extra;
    if (flip) dsx = -(n - 1) * extra;
  }

  ctx.font = t.font;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const fill = paint(ctx, t.fill, pal, box.x, box.y, box.x + box.w * 0.4, box.y + box.h, t.alpha);
  ctx.fillStyle = fill;

  const fx = cfg.textFx ?? "soft";
  const sh = laid.spec.type.shadow;
  const glow = laid.spec.type.glow;
  const applyShadow = () => {
    if (glow && t.kind === "name" && fx !== "none") {
      ctx.shadowColor = css(resolveRGBA(glow, pal), 0.85);
      ctx.shadowBlur = t.size * 0.32;
      ctx.shadowOffsetY = 0;
      return;
    }
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
    outline((st) => fillTracked(ctx, t.text, sx + dsx, t.y, track, st));
    applyShadow();
    fillTracked(ctx, t.text, sx + dsx, t.y, track);
  } else if (t.mode === "center") {
    outline((st) => fillTracked(ctx, t.text, sx + dsx, t.y, track, st));
    applyShadow();
    fillTracked(ctx, t.text, sx + dsx, t.y, track);
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

/* ------------------------------------------------------------ plate fade */

interface PlateFade {
  /** local x (outer edge = 0) where the fade begins */
  start: number;
  /** local x where the plate reaches alpha 0 (the plate's inner end) */
  end: number;
}

/**
 * A plate "fades" when any horizontal layer runs out to transparent at its
 * inner end. Instead of letting every layer fade (or not) on its own — which
 * left hard edges where a sheen layer ran full width — the whole plate group
 * is drawn offscreen and faded by one eased alpha mask.
 */
function plateFadeOf(laid: Laid, layers: PlateLayer[]): PlateFade | null {
  if (laid.vertical) return null;
  let stopT = -1;
  for (const l of layers) {
    if ((l.kind === "rect" || l.kind === "skew" || l.kind === "chamfer" || l.kind === "brush") && fadesOut(l.fill) && l.fill.kind === "linear") {
      const st = l.fill.stops;
      stopT = Math.max(stopT, st[st.length - 2][0]);
    }
  }
  if (stopT < 0) return null;
  const W = laid.w;
  const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
  // keep the type on solid plate, fade over the tail, and never shorter than ~2 em
  let start = Math.max(stopT * W, laid.textX1 - N * 0.2);
  start = Math.min(start, W - N * 2);
  start = Math.max(start, W * 0.35);
  return { start, end: W };
}

type Scratch = { cv: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D };
const scratchPool: Scratch[] = [];

function scratch(i: number, w: number, h: number): Scratch | null {
  let s = scratchPool[i];
  if (!s) {
    let cv: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== "undefined") cv = new OffscreenCanvas(w, h);
    else if (typeof document !== "undefined") {
      cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
    } else return null;
    const c = cv.getContext("2d") as CanvasRenderingContext2D | null;
    if (!c) return null;
    s = { cv, ctx: c };
    scratchPool[i] = s;
  }
  if (s.cv.width < w || s.cv.height < h) {
    s.cv.width = Math.max(s.cv.width, w);
    s.cv.height = Math.max(s.cv.height, h);
  }
  return s;
}

/** Device-space bounding box of a local rect under the current transform. */
function deviceBox(ctx: CanvasRenderingContext2D, r: Rect) {
  const T = ctx.getTransform();
  const pts = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ].map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]))));
  const x1 = Math.min(cw, Math.ceil(Math.max(...pts.map((p) => p[0]))));
  const y1 = Math.min(ch, Math.ceil(Math.max(...pts.map((p) => p[1]))));
  return { T, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Draw `fn` into an offscreen copy of the current transform, multiply it by a
 * horizontal eased alpha mask (1 before `start`, 0 at `end`) and composite the
 * result back. Shadows, overlays and sweeps inside `fn` all fade together and
 * nothing can poke past the plate's end. Fades only remove alpha — they never
 * add dark pixels, so light backgrounds stay clean.
 */
function drawMasked(
  ctx: CanvasRenderingContext2D,
  slot: number,
  bounds: Rect,
  start: number,
  end: number,
  fn: (c: CanvasRenderingContext2D) => void,
) {
  const box = deviceBox(ctx, bounds);
  if (box.w <= 0 || box.h <= 0) return;
  const sc = scratch(slot, box.w, box.h);
  if (!sc) {
    fn(ctx);
    return;
  }
  const c = sc.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
  c.clearRect(0, 0, box.w, box.h);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  const T = box.T;
  c.setTransform(T.a, T.b, T.c, T.d, T.e - box.x, T.f - box.y);
  c.save();
  fn(c);
  c.restore();
  c.save();
  c.globalCompositeOperation = "destination-in";
  const g = c.createLinearGradient(start, 0, end, 0);
  addFadeStops(g, (a) => `rgba(0,0,0,${a.toFixed(4)})`, 1, 0);
  c.fillStyle = g;
  c.fillRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
  c.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(sc.cv as CanvasImageSource, 0, 0, box.w, box.h, box.x, box.y, box.w, box.h);
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

  const fade = plateFadeOf(laid, plateLayers);
  const plateSweep = spec.motion.sweep === "plate";
  const paintLayers = (c: CanvasRenderingContext2D, unfade: boolean, which: (l: PlateLayer) => boolean) => {
    for (const l of plateLayers) {
      if (l.kind === "paper" || !which(l)) continue;
      drawPlateLayer(c, l, laid, pal, m, unfade);
    }
  };
  withLayer(ctx, person, "band", center, () =>
    flipped(() => {
      if (!fade) {
        paintLayers(ctx, false, () => true);
        for (const l of plateLayers) {
          if (l.kind === "paper") drawPlateLayer(ctx, l, laid, pal, m);
        }
        return;
      }
      // generous margins so soft shadows are kept (and faded) too
      const bounds: Rect = { x: -60, y: -60, w: laid.w + 120, h: laid.h + 140 };
      const zone = fade.end - fade.start;
      const isBase = (l: PlateLayer) =>
        (l.kind === "rect" || l.kind === "skew" || l.kind === "chamfer" || l.kind === "brush") && fadesOut(l.fill);
      drawMasked(ctx, 0, bounds, fade.start, fade.end, (c) => {
        paintLayers(c, true, isBase);
        // overlays (sheens, bottom tints) leave the fade zone early, so a dark
        // tint can never turn the fading tail grey on a light background
        if (plateLayers.some((l) => !isBase(l) && l.kind !== "paper")) {
          drawMasked(c, 1, bounds, fade.start - zone * 0.15, fade.start + zone * 0.5, (c2) =>
            paintLayers(c2, true, (l) => !isBase(l)),
          );
        }
        for (const l of plateLayers) {
          if (l.kind === "paper") drawPlateLayer(c, l, laid, pal, m);
        }
        if (plateSweep) drawSweep(c, laid, m, flip);
      });
    }),
  );
  withLayer(ctx, person, "slash", center, () =>
    flipped(() => {
      for (const o of ornaments) if (!FRONT_ORNAMENTS.has(o.kind)) drawOrnament(ctx, o, laid, pal, m, flip);
    }),
  );
  withLayer(ctx, person, "slash", center, () => {
    for (const o of ornaments) if (FRONT_ORNAMENTS.has(o.kind)) drawFrontOrnament(ctx, o, laid, pal, m, flip);
  });
  const names = laid.texts.filter((t) => t.kind === "name" || t.kind === "en");
  const rest = laid.texts.filter((t) => t.kind === "title" || t.kind === "tag");
  withLayer(ctx, person, "name", center, () => names.forEach((t) => drawText(ctx, t, laid, pal, m, flip, cfg)));
  withLayer(ctx, person, "title", center, () => rest.forEach((t) => drawText(ctx, t, laid, pal, m, flip, cfg)));
  if (spec.motion.sweep === "plate" && !fade) {
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
    drawPlate(ctx, l, m, pal, s.right && !spec.keepOrder, cfg);
    ctx.restore();
  }
}

/** Template defaults (palette, fonts, sweep) for a premium style. */
export function premiumDefaults(style: string) {
  if (!isPremiumId(style)) return null;
  const t = TEMPLATE_BY_ID[style];
  return { ...t.palette, fonts: t.fonts, sweep: t.motion.sweepDefault };
}
