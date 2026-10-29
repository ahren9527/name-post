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
import { alphaOfCss, backingTone, crispShadow, deepTint, featherBox, solidBox, type TextBacking } from "../backing";

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
  backing: TextBacking;
}

function paletteOf(cfg: RenderConfig): Pal {
  const accent = parseColor(cfg.accentColor || "#CFAA66");
  return {
    name: parseColor(cfg.nameColor || "#ffffff"),
    title: parseColor(cfg.titleColor || "#eeeeee"),
    accent,
    band: parseColor(cfg.bandColor || "rgba(14,30,58,0.94)"),
    en: accent,
    backing: cfg.backing ?? "soft",
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

/** A fill along `axis` whose inner end fades to nothing (the plate "tail"). */
export function fadesOut(fill: Fill, axis: "x" | "y" = "x"): boolean {
  if (fill.kind !== "linear" || (fill.axis ?? "x") !== axis || fill.stops.length < 2) return false;
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
  const drop = unfade && (fadesOut(fill, "x") || fadesOut(fill, "y"));
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
  /** vertical layouts: extent of the text columns (for text-long rules) */
  spanY0?: number;
  spanY1?: number;
  /** hairline segment between two parts of the composition; grows from its midpoint */
  divider?: { x0: number; y0: number; x1: number; y1: number };
  seal?: { x: number; y: number; s: number; ch: string };
  dot?: { x: number; y: number; r: number };
  /** editorial initial slot (local x, width; vertical: header y, height) */
  initial?: { x: number; w: number; ch: string; y?: number; h?: number };
  /** vertical footer band (sparkline) */
  foot?: { x0: number; x1: number; y0: number; y1: number };
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
  return packTitle(p.title);
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
  let serialIt: TextItem | null = null;
  if (L.lead === "serial" && tag) {
    const ns = N * 1.18;
    serialIt = item(ctx, "tag", 0, tag, font(300, ns, EN_FONTS.sans), ns, ns * 0.02, t.tagFill ?? "$accent", 1);
    leadW = serialIt.w + N * 0.66;
  }
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
  let serialDivider: Laid["divider"];
  if (serialIt) {
    const top = L.padY * N;
    const mid = (top + y) / 2;
    const ns = serialIt.size;
    serialIt.x = padX;
    serialIt.y = mid + ns * 0.36;
    serialIt.gx = padX;
    serialIt.gw = serialIt.w;
    serialIt.box = { x: padX, y: mid - ns * 0.38, w: serialIt.w, h: ns * 0.76 };
    texts.push(serialIt);
    const dx = padX + serialIt.w + N * 0.33;
    serialDivider = { x0: dx, x1: dx, y0: top + N * 0.04, y1: y - N * 0.04 };
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
    divider: serialDivider,
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
    divider: hasCol
      ? { x0: dividerX, x1: dividerX, y0: padY + (contentH - span) / 2, y1: padY + (contentH + span) / 2 }
      : undefined,
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

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;

type VLead = "seal" | "dot" | "initial" | "number" | "chip" | "serial" | "none";

function verticalLead(spec: TemplateSpec): VLead {
  const V = spec.vertical;
  if (V.lead) return V.lead;
  switch (spec.layout.lead) {
    case "seal":
    case "stamp":
      return "seal";
    case "dot":
      return "dot";
    case "initial":
      return "initial";
    case "number":
      return "number";
    case "tag":
      return "chip";
    case "serial":
      return "serial";
    default:
      return "none";
  }
}

/** A vertical CJK column item (top-left at x, y). */
function columnItem(
  ctx: CanvasRenderingContext2D,
  kind: TextKind,
  index: number,
  text: string,
  fontStr: string,
  size: number,
  adv: number,
  fill: ColorRef,
  alpha: number,
  x: number,
  y: number,
): TextItem {
  const chars = [...text].filter((c) => c !== " ");
  const it = item(ctx, kind, index, chars.join(""), fontStr, size, 0, fill, alpha);
  const h = columnHeight(chars, size, adv);
  it.mode = "v";
  it.adv = adv;
  it.x = x;
  it.y = y;
  it.w = size;
  it.gx = x;
  it.gw = size;
  it.box = { x, y, w: size, h };
  return it;
}

/** A Latin line rotated to read top → bottom (top-left at x, y). */
function rotItem(
  ctx: CanvasRenderingContext2D,
  kind: TextKind,
  text: string,
  fontStr: string,
  size: number,
  track: number,
  fill: ColorRef,
  alpha: number,
  x: number,
  y: number,
): TextItem {
  const it = item(ctx, kind, 0, text, fontStr, size, track, fill, alpha);
  it.mode = "rot";
  it.x = x;
  it.y = y;
  it.box = { x, y, w: size * 0.74, h: it.w };
  it.gx = x;
  it.gw = size * 0.74;
  return it;
}

/** Horizontal text centred in a box, shrunk to fit its width. */
function chipItem(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  family: string,
  track: number,
  fill: ColorRef,
  box: Rect,
  maxW: number,
): TextItem {
  let sz = size;
  ctx.font = font(weight, sz, family);
  const w0 = measureTracked(ctx, text, track);
  if (w0 > maxW) sz *= maxW / w0;
  const it = item(ctx, "tag", 0, text, font(weight, sz, family), sz, track * (sz / size), fill, 1);
  it.x = box.x + box.w / 2 - it.w / 2;
  it.y = box.y + box.h / 2 + sz * 0.36;
  it.gx = it.x;
  it.gw = it.w;
  it.box = { ...box };
  it.mode = "center";
  return it;
}

/**
 * Vertical (竖排) composition, driven by `spec.vertical`:
 *   [lead: dot / chip / number / serial / initial header]
 *   name column · rotated English column · rule · title columns · tag column
 * "split" puts the name and the titles in their own blocks, the title block
 * dropped down beside the name block (tiers, capsules, stickers).
 */
function layoutVertical(ctx: CanvasRenderingContext2D, spec: TemplateSpec, p: Person, s: Sizes): Laid {
  const L = spec.layout;
  const V = spec.vertical;
  const t = spec.type;
  const N = s.N * 0.98;
  const T = s.T;
  const E = s.E;
  const titles = titlesOf(p);
  const en = V.en === "none" ? "" : enText(p, spec);
  const tag = (p.tag ?? "").trim();
  const tagMode = V.tag ?? (L.lead === "tag" || L.lead === "number" || L.lead === "serial" ? "lead" : L.tag === "above" || L.tag === "below" ? "column" : "none");
  const lead0 = verticalLead(spec);
  const lead: VLead = lead0 === "none" && tagMode === "lead" && tag ? "chip" : lead0;
  const split = V.form === "split";
  const texts: TextItem[] = [];
  const regions: Partial<Record<Region, Rect>> = {};
  const padX = (V.padX ?? Math.max(L.padX, 0.4)) * s.N;
  const padY = (V.padY ?? Math.max(L.padY, 0.4)) * s.N;
  const gap = (V.gap ?? Math.max(L.gap, 0.42)) * s.N;
  const tagFam = t.tagFont ? EN_FONTS[t.tagFont] : famOf(s.titleFont);

  const nameChars = [...p.name.trim()].filter((c) => c !== " ");
  const nAdv = N * 1.1;
  const nameH = columnHeight(nameChars, N, nAdv);
  const enGap = N * 0.22;
  const enW = en ? E * 0.74 : 0;
  const nameColW = N + (en ? enGap + enW : 0);
  const nameBlockW = padX * 2 + nameColW;

  // ---- lead slot above the name column
  let y = split ? 0 : padY;
  const x0 = padX;
  let dot: Laid["dot"];
  let initial: Laid["initial"];
  let divider: Laid["divider"];
  if (lead === "dot") {
    const r = N * 0.15;
    dot = { x: x0 + N / 2, y: y + r, r };
    y += r * 2 + N * 0.34;
  } else if (lead === "initial") {
    const hh = N * 1.75;
    initial = { x: 0, w: 0, ch: initialOf(p, enText(p, spec)), y: 0, h: hh };
    y = hh + N * 0.42;
  } else if (lead === "serial" && tag) {
    const ns = N * 0.92;
    const it = item(ctx, "tag", 0, tag, font(300, ns, EN_FONTS.sans), ns, ns * 0.02, t.tagFill ?? "$accent", 1);
    place(it, x0, y, true);
    texts.push(it);
    y += ns * 0.74 + N * 0.36;
    divider = { x0: x0, x1: x0 + Math.max(N, it.w), y0: y, y1: y };
    y += N * 0.4;
  } else if ((lead === "chip" || lead === "number") && (tag || spec.vertical.plate.some((l) => (l.kind === "rect" || l.kind === "skew") && l.region === "lead"))) {
    const isNum = lead === "number";
    const chipH = isNum ? N * 1.25 : T * 1.75;
    let natural = 0;
    if (tag && !isNum) {
      ctx.font = font(700, T * 0.8, tagFam);
      natural = measureTracked(ctx, tag, T * 0.06) + T * 1.1;
    }
    const w = split ? nameBlockW : Math.max(N, nameColW, natural);
    const box: Rect = { x: split ? 0 : x0, y, w, h: tag || isNum ? chipH : T * 0.5 };
    regions.lead = box;
    if (tag) {
      const it = isNum
        ? chipItem(ctx, tag, 700, chipH * 0.62, EN_FONTS.cond, 0, t.tagFill ?? "#ffffff", box, w * 0.86)
        : chipItem(ctx, tag, tagFam === EN_FONTS.mono ? 500 : 700, T * 0.8, tagFam, T * 0.06, t.tagFill ?? "$accent", box, w - T * 0.6);
      if (isNum) it.font = font(700, it.size, EN_FONTS.cond, true);
      texts.push(it);
    }
    y += box.h + (split ? N * 0.1 : N * 0.3);
  }

  // ---- name column (+ en)
  const blockTop = y;
  const nameTop = split ? blockTop + padY : y;
  const nm = columnItem(ctx, "name", 0, nameChars.join(""), s.nameFont, N, nAdv, t.nameFill, 1, x0, nameTop);
  texts.push(nm);
  let colRight = x0 + N;
  let bottom = nameTop + nameH;
  let seal: Laid["seal"];
  if (lead === "seal") {
    const small = L.lead === "stamp";
    const sz = N * (small ? 0.5 : 0.62);
    seal = { x: x0 + N / 2, y: bottom + N * 0.36 + sz / 2, s: sz, ch: surnameOf(p.name) };
    bottom = seal.y + sz / 2;
  }
  if (en) {
    const it = rotItem(ctx, "en", en, s.enFont, E, s.enTrack, t.enFill, 0.9, colRight + enGap, nameTop + N * 0.06);
    texts.push(it);
    colRight += enGap + enW;
    bottom = Math.max(bottom, it.y + it.w);
  }
  regions.name = split
    ? { x: 0, y: blockTop, w: nameBlockW, h: bottom - blockTop + padY }
    : { x: x0 - N * 0.2, y: nameTop - N * 0.2, w: colRight - x0 + N * 0.4, h: bottom - nameTop + N * 0.4 };

  // ---- title columns (+ tag column)
  const tAdv = T * 1.26;
  const colGap = T * (V.colGap ?? 0.62);
  const cols: TextItem[] = [];
  const tPadX = T * 0.62;
  const tPadY = T * (V.titlePad ?? 0.72);
  let tx: number;
  let titleTop: number;
  if (split) {
    tx = Math.max(nameBlockW, nameBlockW + (V.splitGap ?? 0) * s.N) + tPadX;
    titleTop = blockTop + (V.drop ?? 0.8) * s.N + tPadY;
  } else {
    tx = colRight + gap;
    titleTop = nameTop + N * 0.12;
  }
  const ruleX = colRight + gap * 0.5;
  let x = tx;
  titles.forEach((line, i) => {
    const it = columnItem(ctx, "title", i, line, s.titleFont, T, tAdv, t.titleFill, t.titleAlpha, x, titleTop);
    cols.push(it);
    x += T + colGap;
  });
  if (tag && tagMode === "column") {
    const tz = T * 0.82;
    const fill = t.tagFill ?? "$accent";
    const it = HAN.test(tag)
      ? columnItem(ctx, "tag", 0, tag, font(600, tz, tagFam), tz, tz * 1.22, fill, 1, x + T * 0.12, titleTop)
      : rotItem(ctx, "tag", tag.toUpperCase(), font(t.tagFont === "mono" ? 500 : 600, tz * 0.92, tagFam), tz * 0.92, tz * 0.1, fill, 1, x + T * 0.12, titleTop);
    cols.push(it);
    x += it.box.w + colGap;
  }
  texts.push(...cols);
  const colsBottom = cols.reduce((m, it) => Math.max(m, it.box.y + it.box.h), titleTop);
  let right: number;
  if (cols.length) {
    x -= colGap;
    if (split) {
      const bx = nameBlockW + (V.splitGap ?? 0) * s.N;
      regions.title = { x: bx, y: titleTop - tPadY, w: x - bx + tPadX, h: colsBottom - titleTop + tPadY * 2 };
      right = Math.max(nameBlockW, x + tPadX);
      bottom = Math.max(bottom + padY, colsBottom + tPadY);
    } else {
      regions.title = { x: tx - T * 0.3, y: titleTop - T * 0.3, w: x - tx + T * 0.6, h: colsBottom - titleTop + T * 0.6 };
      right = x + padX;
      bottom = Math.max(bottom, colsBottom);
    }
  } else {
    right = split ? nameBlockW : colRight + padX;
    if (split) bottom += padY;
  }
  if (regions.lead && !split) right = Math.max(right, regions.lead.x + regions.lead.w + padX);

  let foot: Laid["foot"];
  if (V.foot) {
    const fy = bottom + N * 0.34;
    foot = { x0: padX, x1: right - padX, y0: fy, y1: fy + V.foot * s.N };
    bottom = foot.y1;
  }
  const h = (split ? bottom : bottom + padY) + (V.tail ?? 0) * s.N;
  const w = right;
  if (initial) initial.w = w;
  regions.plate = { x: 0, y: 0, w, h };
  if (!divider && cols.length && !split) divider = { x0: ruleX, x1: ruleX, y0: titleTop - T * 0.1, y1: colsBottom + T * 0.1 };
  return {
    spec,
    person: p,
    w,
    h,
    vertical: true,
    regions,
    texts,
    textX0: x0,
    textX1: cols.length ? x : colRight,
    nameX0: x0,
    nameX1: x0 + N,
    ruleX: cols.length && !split ? ruleX : undefined,
    ruleY0: padY * 0.6,
    ruleY1: h - padY * 0.6,
    spanY0: nameTop,
    spanY1: Math.max(colsBottom, nameTop + nameH),
    divider,
    seal,
    dot,
    initial,
    foot,
  };
}

function layoutOf(
  ctx: CanvasRenderingContext2D,
  spec: TemplateSpec,
  person: Person,
  cfg: RenderConfig,
  vertical: boolean,
  index = 0,
): Laid {
  // the serial template numbers guests 01, 02 … unless a tag says otherwise
  const p =
    spec.layout.lead === "serial" && !(person.tag ?? "").trim() ? { ...person, tag: String(index + 1).padStart(2, "0") } : person;
  const s = sizesOf(spec, cfg, p);
  if (vertical) return layoutVertical(ctx, spec, p, s);
  switch (spec.layout.kind) {
    case "inline":
      return layoutInline(ctx, spec, p, s);
    case "tiers":
      return layoutTiers(ctx, spec, p, s);
    case "blocks":
      return layoutBlocks(ctx, spec, p, s);
    case "column":
      return layoutVertical(ctx, spec, p, s);
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

/** Vertical parallelogram: top and bottom edges slant (run = k × width). */
function skewPathV(ctx: CanvasRenderingContext2D, r: Rect, k: number) {
  const run = k * r.w;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + run);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.lineTo(r.x + r.w, r.y + r.h - run);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
}

/**
 * Draw a "lengthwise" plate shape (brush, ribbon) designed for a horizontal
 * band. Vertical plates rotate the frame 90° so the stroke runs top → bottom
 * and its own fade stops follow the column.
 */
function alongPlate(ctx: CanvasRenderingContext2D, r: Rect, vertical: boolean, fn: (r: Rect) => void) {
  if (!vertical) {
    fn(r);
    return;
  }
  ctx.save();
  ctx.translate(r.x + r.w, r.y);
  ctx.rotate(Math.PI / 2);
  fn({ x: 0, y: 0, w: r.h, h: r.w });
  ctx.restore();
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
    if (laid.vertical) ctx.rect(r.x - 40, r.y - 40, r.w + 80, (r.h + 80) * p);
    else ctx.rect(r.x - 40, r.y - 40, (r.w + 80) * p, r.h + 80);
    ctx.clip();
    ctx.globalAlpha *= clamp(p * 4);
  } else if (kind === "rise") {
    ctx.translate(0, (1 - p) * 18);
    ctx.globalAlpha *= p;
  } else if (kind === "pop") {
    // springy scale from the block's outer-left centre, slight overshoot
    const sc = 0.5 + 0.5 * easeBack(p);
    const cx = laid.vertical ? r.x + r.w / 2 : r.x;
    const cy = laid.vertical ? r.y : r.y + r.h / 2;
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
    if (p <= 0.001 || pal.backing === "none") return;
    const tb = textBounds(laid);
    const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
    ctx.save();
    ctx.globalAlpha *= p;
    if (pal.backing === "solid") {
      // 实底: an intentional clean plate in the 底板 colour, hugging the type
      const padX = N * 0.42;
      const padY = N * 0.34;
      solidBox(ctx, { x: tb.x - padX, y: tb.y - padY, w: tb.w + padX * 2, h: tb.h + padY * 2 }, N * 0.1, css(pal.band));
    } else {
      // 柔光: a shade that hugs the text block with a gaussian edge, tinted by
      // the 底板 colour (or the palette's deep tone when 底板 is stock black) and
      // dropped when 底板 and type are both light — never a grey fog.
      const tone = backingTone(pal.band, pal.name, pal.accent, alphaOfCss(laid.spec.palette.band));
      const padX = N * 0.2;
      const padY = N * 0.14;
      featherBox(
        ctx,
        { x: tb.x - padX, y: tb.y - padY, w: tb.w + padX * 2, h: tb.h + padY * 2 },
        N * 1.0,
        tone.color,
        layer.alpha * 0.46 * tone.alpha,
      );
    }
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
      const rad = layer.pill ? Math.min(r.h, r.w) / 2 : (layer.radius ?? 0);
      if (layer.drop) {
        ctx.save();
        ctx.translate(layer.drop * 0.7, layer.drop);
        roundRectPath(ctx, r, rad);
        ctx.fillStyle = "rgba(12,12,22,0.5)";
        ctx.fill();
        ctx.restore();
      }
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
      if (layer.outline) {
        roundRectPath(ctx, r, rad);
        ctx.strokeStyle = css(resolveRGBA(layer.outline, pal));
        ctx.lineWidth = layer.outlineWidth ?? 2;
        ctx.lineJoin = "round";
        ctx.stroke();
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
      const path = () => (laid.vertical ? skewPathV(ctx, r, layer.skew) : skewPath(ctx, r, layer.skew));
      if (layer.drop) {
        ctx.save();
        ctx.translate(layer.drop * 0.7, layer.drop);
        path();
        ctx.fillStyle = "rgba(12,12,22,0.5)";
        ctx.fill();
        ctx.restore();
      }
      path();
      ctx.fillStyle = fillStyleOf(ctx, layer.fill, pal, r, unfade);
      ctx.fill();
      if (layer.outline) {
        path();
        ctx.strokeStyle = css(resolveRGBA(layer.outline, pal));
        ctx.lineWidth = layer.outlineWidth ?? 2;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
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
      alongPlate(ctx, r, laid.vertical, (rr) => drawBrush(ctx, rr, layer.fill, pal, unfade, laid.person.name));
      break;
    }
    case "strips": {
      drawStrips(ctx, layer, laid, pal, m);
      break;
    }
    case "ribbon": {
      alongPlate(ctx, r, laid.vertical, (rr) => drawRibbon(ctx, rr, layer, pal, m, laid.person.name));
      break;
    }
    case "metal": {
      drawMetal(ctx, r, layer, pal, laid.vertical, laid.person.name);
      break;
    }
    case "mountains": {
      drawMountains(ctx, laid, layer, pal, laid.person.name);
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

/** Soft strip behind each title line; reveals with that line's own stagger (朱条). */
function drawStrips(
  ctx: CanvasRenderingContext2D,
  layer: Extract<PlateLayer, { kind: "strips" }>,
  laid: Laid,
  pal: Pal,
  m: Motion,
) {
  const fill = layer.fill;
  const c = fill.kind === "solid" ? resolveRGBA(fill.color, pal) : resolveRGBA(fill.stops[0][1], pal);
  const a0 = fill.kind === "solid" ? (fill.alpha ?? 1) : (fill.stops[0][2] ?? 1);
  const v = laid.vertical;
  for (const t of laid.texts) {
    if (t.kind !== "title") continue;
    const pi = m.cut ? 1 : clamp(m.title(t.index) * 1.15);
    if (pi <= 0.001) continue;
    const pad = layer.pad * t.size;
    const r: Rect = v
      ? { x: t.box.x - pad, y: t.box.y - t.size * 0.55, w: t.box.w + pad * 2, h: t.box.h + t.size * 2.6 }
      : { x: t.box.x - t.size * 0.55, y: t.box.y - pad, w: t.box.w + t.size * 2.8, h: t.box.h + pad * 2 };
    const len = v ? r.h : r.w;
    const g = v ? ctx.createLinearGradient(0, r.y, 0, r.y + r.h) : ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    const lead = Math.min(0.1, (t.size * 0.45) / len);
    const from = Math.max(lead + 0.05, 1 - (t.size * 2.4) / len);
    g.addColorStop(0, css(c, 0));
    for (let i = 1; i <= 4; i++) g.addColorStop((lead * i) / 4, css(c, a0 * smoother(i / 4)));
    const n = 12;
    for (let i = 0; i <= n; i++) g.addColorStop(from + (1 - from) * (i / n), css(c, a0 * (1 - smoother(i / n))));
    ctx.save();
    ctx.beginPath();
    if (v) ctx.rect(r.x - 4, r.y - 4, r.w + 8, (r.h + 8) * pi);
    else ctx.rect(r.x - 4, r.y - 4, (r.w + 8) * pi, r.h + 8);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

/**
 * Silk ribbon: a band whose two edges wave out of phase (so it seems to
 * twist), deep-red edges, a lifted centre, fold shading and a few satin
 * highlights. Drawn in a horizontal frame; the plate fade takes the tail.
 */
function drawRibbon(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  layer: Extract<PlateLayer, { kind: "ribbon" }>,
  pal: Pal,
  m: Motion,
  seed: string,
) {
  const c = resolveRGBA(layer.color, pal);
  const d = resolveRGBA(layer.deep, pal);
  const rnd = rng(hashStr(seed) + 31);
  const ph = rnd() * 6 + m.local * 0.35;
  const steps = 110;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  const mid: [number, number][] = [];
  const cy = r.y + r.h / 2;
  const amp = r.h * 0.07;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = r.x + r.w * u;
    const body = (u < 0.07 ? 0.62 + (u / 0.07) * 0.38 : u > 0.55 ? 1 - (u - 0.55) * 0.6 : 1) * r.h * 0.5;
    const wave = Math.sin(u * 5.2 + ph) * amp + Math.sin(u * 11 + ph * 1.7) * amp * 0.22;
    const twist = Math.sin(u * 3.1 + ph * 0.8) * 0.1;
    top.push([x, cy + wave - body * (1 + twist)]);
    bot.push([x, cy + wave + body * (1 - twist)]);
    mid.push([x, cy + wave]);
  }
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    top.forEach(([x, y], i) => i && ctx.lineTo(x, y));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.bezierCurveTo(r.x - r.h * 0.12, bot[0][1] - r.h * 0.15, r.x - r.h * 0.12, top[0][1] + r.h * 0.15, top[0][0], top[0][1]);
    ctx.closePath();
  };
  ctx.save();
  shadowOn(ctx, 0.35);
  path();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, css(d));
  g.addColorStop(0.28, css(c));
  g.addColorStop(0.5, css(mix(c, WHITE, 0.1)));
  g.addColorStop(0.74, css(c));
  g.addColorStop(1, css(d));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  path();
  ctx.clip();
  // fold shading: soft darker bands across the ribbon
  const fold = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const a = Math.max(0, Math.sin(u * 13 + ph * 1.3)) ** 2 * 0.26;
    fold.addColorStop(u, css(d, a));
  }
  ctx.fillStyle = fold;
  ctx.fillRect(r.x - 20, r.y - 20, r.w + 40, r.h + 40);
  // satin highlights following the wave
  ctx.lineCap = "round";
  const hl = mix(c, WHITE, 0.55);
  [-0.22, 0.06, 0.3].forEach((k, j) => {
    ctx.beginPath();
    mid.forEach(([x, y], i) => {
      const yy = y + k * r.h + Math.sin((i / steps) * 7 + ph + j) * r.h * 0.05;
      if (i) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    });
    const sg = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    sg.addColorStop(0, css(hl, 0));
    sg.addColorStop(0.12 + j * 0.08, css(hl, 0.22 - j * 0.04));
    sg.addColorStop(0.6, css(hl, 0.06));
    sg.addColorStop(1, css(hl, 0));
    ctx.strokeStyle = sg;
    ctx.lineWidth = r.h * (0.05 - j * 0.01);
    ctx.shadowColor = css(hl, 0.4);
    ctx.shadowBlur = 8;
    ctx.stroke();
  });
  ctx.restore();
  // a warm hairline along the upper edge
  ctx.save();
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.8) : ctx.moveTo(x, y + 0.8)));
  const eg = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  eg.addColorStop(0, "rgba(255,214,150,0.55)");
  eg.addColorStop(0.6, "rgba(255,214,150,0.2)");
  eg.addColorStop(1, "rgba(255,214,150,0)");
  ctx.strokeStyle = eg;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/** Brushed metal bar: bevelled cross-gradient, fine brush lines, soft specular. */
function drawMetal(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  layer: Extract<PlateLayer, { kind: "metal" }>,
  pal: Pal,
  vertical: boolean,
  seed: string,
) {
  const rad = layer.radius;
  const tones: [number, RGBA][] =
    layer.tone === "gold"
      ? [
          [0, mix(pal.accent, WHITE, 0.55)],
          [0.12, mix(pal.accent, WHITE, 0.28)],
          [0.5, pal.accent],
          [0.56, mix(pal.accent, BLACK, 0.1)],
          [0.9, mix(pal.accent, WHITE, 0.22)],
          [1, mix(pal.accent, BLACK, 0.25)],
        ]
      : [
          [0, parseColor("#F8F9FB")],
          [0.12, parseColor("#E1E4E8")],
          [0.5, parseColor("#C6CAD0")],
          [0.56, parseColor("#B8BDC4")],
          [0.9, parseColor("#D8DBDF")],
          [1, parseColor("#A2A8B0")],
        ];
  const across = vertical
    ? ctx.createLinearGradient(r.x, 0, r.x + r.w, 0)
    : ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  tones.forEach(([t, c]) => across.addColorStop(t, css(c)));
  ctx.save();
  shadowOn(ctx, 0.45);
  roundRectPath(ctx, r, rad);
  ctx.fillStyle = across;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, r, rad);
  ctx.clip();
  const rnd = rng(hashStr(seed) + 7);
  const thick = vertical ? r.w : r.h;
  const len = vertical ? r.h : r.w;
  for (let i = 0; i < 170; i++) {
    const o = rnd() * thick;
    const a = 0.025 + rnd() * 0.06;
    const lw = 0.5 + rnd() * 0.9;
    const s0 = rnd() * len * 0.3 - len * 0.1;
    const l = len * (0.5 + rnd() * 0.8);
    ctx.fillStyle = i % 2 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${(a * 0.7).toFixed(3)})`;
    if (vertical) ctx.fillRect(r.x + o, r.y + s0, lw, l);
    else ctx.fillRect(r.x + s0, r.y + o, l, lw);
  }
  // broad soft specular along the bar
  const sp = vertical ? ctx.createLinearGradient(0, r.y, 0, r.y + r.h) : ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  sp.addColorStop(0, "rgba(255,255,255,0)");
  sp.addColorStop(0.28, "rgba(255,255,255,0.2)");
  sp.addColorStop(0.62, "rgba(255,255,255,0)");
  sp.addColorStop(1, "rgba(255,255,255,0.06)");
  ctx.fillStyle = sp;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // bevel: bright lip on the lit edge, soft dark lip on the far edge
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  if (vertical) ctx.fillRect(r.x, r.y, 1.2, r.h);
  else ctx.fillRect(r.x, r.y, r.w, 1.2);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  if (vertical) ctx.fillRect(r.x + r.w - 1.2, r.y, 1.2, r.h);
  else ctx.fillRect(r.x, r.y + r.h - 1.2, r.w, 1.2);
  ctx.restore();
}

/** Layered ink-wash ridges with misty feet (金墨山水). */
function drawMountains(
  ctx: CanvasRenderingContext2D,
  laid: Laid,
  layer: Extract<PlateLayer, { kind: "mountains" }>,
  pal: Pal,
  seed: string,
) {
  const c = resolveRGBA(layer.color, pal);
  const W = laid.w;
  const H = laid.h;
  const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
  const v = laid.vertical;
  const x0 = v ? -N * 0.3 : W * 0.3;
  const x1 = v ? W + N * 0.3 : W + N * 0.6;
  const base = H + N * 0.1;
  const maxH = v ? N * 1.6 : H * 0.8;
  const rnd = rng(hashStr(seed) + 211);
  const layers: [number, number][] = [
    [1, 0.16],
    [0.74, 0.24],
    [0.5, 0.34],
  ];
  layers.forEach(([hk, a]) => {
    const f1 = 4 + rnd() * 5;
    const f2 = 9 + rnd() * 9;
    const p1 = rnd() * 6;
    const p2 = rnd() * 6;
    ctx.beginPath();
    ctx.moveTo(x0, base);
    const n = 70;
    let peak = base;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const env = smoother(u / 0.22) * (1 - smoother((u - 0.72) / 0.28));
      const hgt = maxH * hk * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(u * f1 + p1))) * (0.7 + 0.3 * Math.sin(u * f2 + p2)) * env;
      const y = base - hgt;
      peak = Math.min(peak, y);
      ctx.lineTo(x0 + (x1 - x0) * u, y);
    }
    ctx.lineTo(x1, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, peak, 0, base);
    g.addColorStop(0, css(c, a));
    g.addColorStop(0.55, css(c, a * 0.45));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fill();
  });
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
        if (o.at === "top" || o.at === "bottom") {
          // a cap across the top / foot of the column
          const y = o.at === "top" ? o.width / 2 : H - o.width / 2;
          ctx.fillStyle = paint(ctx, o.color, pal, 0, y, W, y);
          ctx.fillRect(0, y - o.width / 2, W * p, o.width);
          break;
        }
        let x: number;
        let y0: number;
        let y1: number;
        const side = o.at === "outer" || o.at === "inner";
        if (side) {
          x = o.at === "outer" ? o.width / 2 : W - o.width / 2;
          y0 = 0;
          y1 = H;
        } else {
          if (laid.ruleX == null) break;
          x = laid.ruleX;
          y0 = o.span === "plate" ? (laid.ruleY0 ?? 0) : (laid.spanY0 ?? 0);
          y1 = o.span === "plate" ? (laid.ruleY1 ?? H) : (laid.spanY1 ?? H);
        }
        const len = (y1 - y0) * p;
        const pf = o.fadeEnd && (side || o.span === "plate") ? plateFadeOf(laid, laid.spec.vertical.plate) : null;
        if (pf) {
          const g = ctx.createLinearGradient(x, y0, x, y1);
          const [l, mid] = goldStops(pal);
          const tone = o.color === "$gold" ? mix(l, mid, 0.5) : resolveRGBA(o.color, pal);
          addFadeStops(g, (a) => css(tone, a), 1, (pf.start - y0) / Math.max(1, y1 - y0));
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = paint(ctx, o.color, pal, x, y0, x, y1, 1, !!o.fadeEnd);
        }
        ctx.fillRect(x - o.width / 2, y0, o.width, len);
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
      const mx = (d.x0 + d.x1) / 2;
      const my = (d.y0 + d.y1) / 2;
      ctx.fillStyle = paint(ctx, o.color, pal, d.x0, d.y0, d.x1 + 0.01, d.y1);
      if (Math.abs(d.x1 - d.x0) < 0.5) {
        const len = (d.y1 - d.y0) * p;
        ctx.fillRect(mx - o.width / 2, my - len / 2, o.width, len);
      } else {
        const len = (d.x1 - d.x0) * p;
        ctx.fillRect(mx - len / 2, my - o.width / 2, len, o.width);
      }
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
      let x1 = W - N * 0.42;
      let x0 = Math.max(laid.textX1 + N * 0.5, x1 - N * 2.2);
      let top = nm.box.y + N * 0.05;
      let bot = nm.box.y + N * 0.85;
      if (laid.foot) {
        x0 = laid.foot.x0;
        x1 = laid.foot.x1;
        top = laid.foot.y0;
        bot = laid.foot.y1;
      } else if (laid.vertical) break;
      if (x1 - x0 < N * 0.8) break;
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
      const u = Math.min(r.w, r.h);
      const stars: [number, number, number, number][] = [
        [r.x + r.w - u * 0.18, r.y - u * 0.08, u * 0.2, 0],
        [r.x + r.w + u * 0.12, r.y + u * 0.2, u * 0.11, 1.3],
        [r.x + r.w - u * 0.55, r.y - u * 0.2, u * 0.08, 2.4],
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
    case "disc": {
      const nm = laid.texts.find((t) => t.kind === "name");
      if (!nm) break;
      let cx: number;
      let cy: number;
      if (nm.mode === "v") {
        cx = nm.box.x + nm.box.w / 2;
        cy = nm.box.y + nm.size * 0.5;
      } else {
        ctx.font = nm.font;
        const cw = ctx.measureText([...nm.text][0] ?? "").width;
        cx = flip ? nm.gx + nm.gw - (nm.x - nm.gx) - cw / 2 : nm.x + cw / 2;
        cy = nm.box.y + nm.size * 0.46;
      }
      const R = nm.size * 0.84;
      cx -= R * 0.14;
      cy -= R * 0.06;
      const sp = clamp(p * 1.15);
      const sc = 0.72 + 0.28 * easeBack(sp);
      ctx.globalAlpha *= clamp(sp * 1.6);
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      const c = resolveRGBA(o.color, pal);
      const c2 = resolveRGBA(o.color2, pal);
      const g = ctx.createRadialGradient(-R * 0.25, -R * 0.3, 0, 0, 0, R);
      g.addColorStop(0, css(c2));
      g.addColorStop(0.62, css(c));
      g.addColorStop(0.86, css(c, 0.95));
      g.addColorStop(0.94, css(c, 0.45));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "beam": {
      const c = resolveRGBA(o.color, pal);
      const hot = mix(c, WHITE, 0.4);
      const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
      let ax0: number;
      let ay0: number;
      let ax1: number;
      let ay1: number;
      if (laid.vertical) {
        const x = laid.ruleX ?? laid.nameX1 + N * 0.3;
        ax0 = ax1 = x;
        ay0 = 0;
        ay1 = H + N * 0.2;
      } else {
        const y = laid.ruleY ?? H / 2;
        ay0 = ay1 = y;
        ax0 = -N * 0.2;
        ax1 = W + N * 0.5;
      }
      const L = Math.hypot(ax1 - ax0, ay1 - ay0);
      const env = (u: number) => smoother(u / 0.16) * (1 - smoother((u - 0.42) / 0.58));
      const g = ctx.createLinearGradient(ax0, ay0, ax1, ay1);
      for (let i = 0; i <= 20; i++) g.addColorStop(i / 20, css(hot, env(i / 20)));
      ctx.save();
      ctx.beginPath();
      if (laid.vertical) ctx.rect(ax0 - 30, ay0, 60, L * p);
      else ctx.rect(ax0, ay0 - 30, L * p, 60);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.shadowColor = css(c, 0.6);
      ctx.shadowBlur = N * 0.12;
      const lw = 1.6;
      if (laid.vertical) ctx.fillRect(ax0 - lw / 2, ay0, lw, L);
      else ctx.fillRect(ax0, ay0 - lw / 2, L, lw);
      ctx.shadowBlur = 3;
      if (laid.vertical) ctx.fillRect(ax0 - lw / 2, ay0, lw, L);
      else ctx.fillRect(ax0, ay0 - lw / 2, L, lw);
      ctx.restore();
      // drifting particles hugging the beam
      const rnd = rng(hashStr(laid.person.name) + 5);
      ctx.shadowColor = css(c, 0.7);
      ctx.shadowBlur = 3;
      for (let i = 0; i < 26; i++) {
        const u0 = rnd();
        const speed = 0.006 + rnd() * 0.02;
        const off = (rnd() + rnd() + rnd() - 1.5) * N * 0.42;
        const size = 0.7 + rnd() * 1.9;
        const fq = 1 + rnd() * 2.2;
        const ph = rnd() * 6;
        const u = (u0 + m.local * speed) % 1;
        if (u > p) continue;
        const tw = 0.45 + 0.55 * Math.sin(m.local * fq + ph);
        const a = env(u) * clamp(tw) * 0.95;
        if (a < 0.02) continue;
        const px = laid.vertical ? ax0 + off : ax0 + (ax1 - ax0) * u;
        const py = laid.vertical ? ay0 + (ay1 - ay0) * u : ay0 + off;
        ctx.fillStyle = css(mix(c, WHITE, 0.55), a);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "flare": {
      // A refined anamorphic glint along the name: bounded to the plate,
      // tapering to zero at both ends, champagne rather than orange, with one
      // brief bright sweep on entry that settles to a quiet hairline.
      const nm = laid.texts.find((t) => t.kind === "name");
      if (!nm) break;
      const N = nm.size;
      const v = laid.vertical;
      const CHAMPAGNE: RGBA = [246, 224, 182, 1];
      const c = mix(resolveRGBA(o.color, pal), CHAMPAGNE, 0.72);
      const hot = mix(mix(resolveRGBA(o.core, pal), CHAMPAGNE, 0.5), WHITE, 0.4);
      let a0: number;
      let a1: number;
      let cx: number;
      let cy: number;
      if (v) {
        a0 = Math.max(0, nm.box.y - N * 0.9);
        a1 = Math.min(H, nm.box.y + nm.box.h + N * 0.9);
        cx = nm.box.x + nm.box.w / 2;
        cy = (a0 + a1) / 2;
      } else {
        a0 = Math.max(0, laid.nameX0 - N * 0.9);
        a1 = Math.min(W, laid.nameX1 + N * 1.1);
        cx = (a0 + a1) / 2;
        cy = nm.box.y + N * 0.5;
      }
      const sp = easeCubic(p);
      if (sp < 0.02) break;
      const half = ((a1 - a0) / 2) * sp;
      // glint sweep: once, ~1.1s from the start of the entry, then settled
      const st = clamp((m.local - 0.12) / 1.1);
      const burst = st > 0 && st < 1 ? Math.sin(Math.PI * st) : 0;
      const level = 0.62 + 0.38 * burst;
      ctx.translate(cx, cy);
      if (v) ctx.rotate(Math.PI / 2);
      // hairline with a short glow, enveloped to zero at both ends
      const env = (u: number) => Math.pow(Math.sin(Math.PI * clamp(u)), 1.6);
      const g = ctx.createLinearGradient(-half, 0, half, 0);
      for (let i = 0; i <= 20; i++) g.addColorStop(i / 20, css(c, env(i / 20) * 0.9 * level));
      const lw = Math.max(1.2, N * 0.03);
      ctx.save();
      ctx.fillStyle = g;
      ctx.shadowColor = css(c, 0.6 * level);
      ctx.shadowBlur = N * 0.16;
      ctx.fillRect(-half, -lw / 2, half * 2, lw);
      ctx.restore();
      // faint narrow bloom around the line
      ctx.save();
      ctx.scale((half * 0.85) / (N * 0.3), 1);
      const bl = ctx.createRadialGradient(0, 0, 0, 0, 0, N * 0.3);
      bl.addColorStop(0, css(c, 0.2 * level));
      bl.addColorStop(0.5, css(c, 0.07 * level));
      bl.addColorStop(1, css(c, 0));
      ctx.fillStyle = bl;
      ctx.fillRect(-N * 0.3, -N * 0.3, N * 0.6, N * 0.6);
      ctx.restore();
      // the travelling glint (only during the sweep)
      if (burst > 0.01) {
        const gx = -half + half * 2 * smoother(st);
        const r = N * 0.55;
        ctx.save();
        ctx.translate(gx, 0);
        ctx.scale(2.2, 1);
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gg.addColorStop(0, css(hot, 0.85 * burst));
        gg.addColorStop(0.35, css(c, 0.26 * burst));
        gg.addColorStop(1, css(c, 0));
        ctx.fillStyle = gg;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      }
      break;
    }
    case "brackets": {
      const sz = o.size;
      const off = (1 - easeCubic(p)) * sz * 0.9;
      ctx.globalAlpha *= clamp(p * 1.5);
      ctx.strokeStyle = paint(ctx, o.color, pal, 0, 0, W, H);
      ctx.lineWidth = o.width;
      ctx.lineCap = "square";
      const k = o.width / 2;
      const corners: [number, number, number, number][] = [
        [k + off, k + off, 1, 1],
        [W - k - off, k + off, -1, 1],
        [W - k - off, H - k - off, -1, -1],
        [k + off, H - k - off, 1, -1],
      ];
      ctx.beginPath();
      for (const [x, y, dx, dy] of corners) {
        ctx.moveTo(x, y + dy * sz);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * sz, y);
      }
      ctx.stroke();
      break;
    }
    case "chevrons": {
      const tr = laid.regions.title ?? laid.regions.name;
      if (!tr) break;
      const c = resolveRGBA(o.color, pal);
      const v = laid.vertical;
      const sz = Math.min(15, (v ? tr.w : tr.h) * 0.24);
      for (let k = 0; k < 4; k++) {
        const ph = (((m.local * 1.4 - k * 0.2) % 1.2) + 1.2) % 1.2;
        let a = 0.3 + 0.7 * clamp(1 - Math.abs(ph - 0.3) / 0.3);
        a *= clamp(p * 2 - k * 0.2);
        if (a <= 0.01) continue;
        ctx.fillStyle = css(c, a);
        ctx.beginPath();
        if (v) {
          const x = tr.x + tr.w / 2;
          const y = tr.y + tr.h + sz * 0.9 + k * sz * 1.1;
          ctx.moveTo(x, y);
          ctx.lineTo(x + sz * 0.55, y + sz * 0.7);
          ctx.lineTo(x - sz * 0.55, y + sz * 0.7);
        } else {
          const x = tr.x + tr.w + sz * 0.6 + k * sz * 1.1;
          const y = tr.y + tr.h / 2;
          ctx.moveTo(x, y);
          ctx.lineTo(x + sz * 0.7, y - sz * 0.55);
          ctx.lineTo(x + sz * 0.7, y + sz * 0.55);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "rollers": {
      const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
      const v = laid.vertical;
      const R = N * 0.3;
      const over = N * 0.3;
      const pp = clamp(m.plate);
      if (pp <= 0.001) break;
      ctx.globalAlpha *= clamp(pp * 3);
      const wood = resolveRGBA(o.color, pal);
      const knob = resolveRGBA(o.knob, pal);
      const L = v ? H : W;
      const front = Math.min(L, Math.max(0, -40 + (L + 80) * (m.cut || m.fadeOnly || laid.spec.motion.plate !== "wipe" ? 1 : pp)));
      const rods = [-R * 0.45, Math.max(front - R * 0.55, R * 0.6)];
      for (const at of rods) {
        const rod: Rect = v ? { x: -over, y: at, w: W + over * 2, h: R } : { x: at, y: -over, w: R, h: H + over * 2 };
        const g = v ? ctx.createLinearGradient(0, rod.y, 0, rod.y + rod.h) : ctx.createLinearGradient(rod.x, 0, rod.x + rod.w, 0);
        g.addColorStop(0, css(mix(wood, BLACK, 0.35)));
        g.addColorStop(0.35, css(mix(wood, WHITE, 0.22)));
        g.addColorStop(0.6, css(wood));
        g.addColorStop(1, css(mix(wood, BLACK, 0.45)));
        ctx.save();
        shadowOn(ctx, 0.4);
        roundRectPath(ctx, rod, R * 0.3);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        // gilt end caps
        const caps: Rect[] = v
          ? [
              { x: rod.x - R * 0.42, y: rod.y - R * 0.12, w: R * 0.5, h: R * 1.24 },
              { x: rod.x + rod.w - R * 0.08, y: rod.y - R * 0.12, w: R * 0.5, h: R * 1.24 },
            ]
          : [
              { x: rod.x - R * 0.12, y: rod.y - R * 0.42, w: R * 1.24, h: R * 0.5 },
              { x: rod.x - R * 0.12, y: rod.y + rod.h - R * 0.08, w: R * 1.24, h: R * 0.5 },
            ];
        for (const cp of caps) {
          const kg = v ? ctx.createLinearGradient(0, cp.y, 0, cp.y + cp.h) : ctx.createLinearGradient(cp.x, 0, cp.x + cp.w, 0);
          kg.addColorStop(0, css(mix(knob, BLACK, 0.3)));
          kg.addColorStop(0.4, css(mix(knob, WHITE, 0.35)));
          kg.addColorStop(1, css(mix(knob, BLACK, 0.35)));
          roundRectPath(ctx, cp, R * 0.22);
          ctx.fillStyle = kg;
          ctx.fill();
        }
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
      // travelling highlight (vertical plates: down the outer edge)
      if (p > 0.98 && laid.vertical) {
        const phase = ((m.local * 0.42) % 1 + 1) % 1;
        const seg = Math.max(H * 0.2, 90);
        const y = -seg + phase * (H + seg * 2);
        const g = ctx.createLinearGradient(0, y - seg / 2, 0, y + seg / 2);
        g.addColorStop(0, css(c, 0));
        g.addColorStop(0.5, css(mix(c, WHITE, 0.55)));
        g.addColorStop(1, css(c, 0));
        ctx.save();
        ctx.beginPath();
        ctx.rect(-6, 0, 14, H);
        ctx.clip();
        ctx.shadowColor = css(c, 0.9);
        ctx.shadowBlur = 10;
        ctx.fillStyle = g;
        ctx.fillRect(0, y - seg / 2, o.width * 1.6 + 0.5, seg);
        ctx.restore();
      } else if (p > 0.98) {
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
    const hy = ini.y ?? 0;
    const hh = ini.h ?? H;
    let size = hh * (latin ? 1.22 : 0.98);
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
    ctx.rect(0, hy, W, hh);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(x - 20, hy, gw + 40, hh * clamp(p * 1.1));
    ctx.clip();
    ctx.globalAlpha *= clamp(p * 1.6);
    ctx.fillStyle = css(resolveRGBA(o.color, pal));
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ini.ch, x, hy + hh * 0.5 + size * 0.36);
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
    if (last.mode === "v" || last.mode === "rot") {
      // a flat block cursor under the last column
      const bx = flip ? W - last.box.x - last.box.w : last.box.x;
      ctx.save();
      ctx.fillStyle = css(resolveRGBA(o.color, pal), 0.9);
      ctx.fillRect(bx + last.box.w * 0.08, last.box.y + last.box.h + sz * 0.22, last.box.w * 0.84, sz * 0.36);
      ctx.restore();
      return;
    }
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
  const shadowTint = deepTint(pal.accent, 0.035);
  // where the soft backing is off (衬底 无, or dropped because 底板 is as light
  // as the type) the contact shadow alone carries legibility: firm it up
  const scrimmed = (laid.vertical ? laid.spec.vertical.plate : laid.spec.plate).some((l) => l.kind === "scrim");
  let boost = 1;
  if (scrimmed && pal.backing !== "solid") {
    const toneA =
      pal.backing === "none" ? 0 : Math.min(1, backingTone(pal.band, pal.name, pal.accent, alphaOfCss(laid.spec.palette.band)).alpha);
    boost = 1.15 + 0.25 * (1 - toneA);
  }
  /** Paint `draw` with the text effect: neon glow, or the crisp two-layer 柔和投影. */
  const withFx = (draw: () => void) => {
    if (glow && t.kind === "name" && fx !== "none") {
      ctx.save();
      ctx.shadowColor = css(resolveRGBA(glow, pal), 0.85);
      ctx.shadowBlur = t.size * 0.32;
      ctx.shadowOffsetY = 0;
      draw();
      ctx.restore();
      return;
    }
    if (fx === "soft" && sh > 0) {
      crispShadow(ctx, t.size, sh * boost, draw, shadowTint);
      return;
    }
    draw();
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
    withFx(() => fillTracked(ctx, t.text, sx + dsx, t.y, track));
  } else if (t.mode === "center") {
    outline((st) => fillTracked(ctx, t.text, sx + dsx, t.y, track, st));
    withFx(() => fillTracked(ctx, t.text, sx + dsx, t.y, track));
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
    withFx(() => run(false));
  } else {
    // rotated Latin column, reading top → bottom
    ctx.translate(box.x, t.y);
    ctx.rotate(Math.PI / 2);
    withFx(() => fillTracked(ctx, t.text, 0, -box.w * 0.02, t.track));
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
  let g: CanvasGradient;
  if (laid.vertical) {
    const band = Math.max(H * 0.16, 110);
    const cy = -band + s * (H + band * 2);
    g = ctx.createLinearGradient(0, cy - band, W * 0.5, cy + band);
  } else {
    const band = Math.max(W * 0.18, 110);
    const cx = -band + s * (W + band * 2);
    g = ctx.createLinearGradient(cx - band, 0, cx + band, H * 0.5);
  }
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
  /** local coordinate along the plate (outer edge = 0) where the fade begins */
  start: number;
  /** where the plate reaches alpha 0 (the plate's inner / bottom end) */
  end: number;
  axis: "x" | "y";
}

/** t along the plate where a layer starts fading out, or -1 when it doesn't fade. */
function fadeStopOf(l: PlateLayer, vertical: boolean): number {
  if (l.kind === "ribbon") return 0.55;
  if (l.kind === "brush") {
    return fadesOut(l.fill, "x") && l.fill.kind === "linear" ? l.fill.stops[l.fill.stops.length - 2][0] : -1;
  }
  if ((l.kind === "rect" || l.kind === "skew" || l.kind === "chamfer") && fadesOut(l.fill, vertical ? "y" : "x") && l.fill.kind === "linear") {
    return l.fill.stops[l.fill.stops.length - 2][0];
  }
  return -1;
}

/**
 * A plate "fades" when any layer runs out to transparent at its inner end
 * (horizontal) or its foot (vertical). Instead of letting every layer fade
 * (or not) on its own — which left hard edges where a sheen layer ran full
 * length — the whole plate group is drawn offscreen and faded by one eased
 * alpha mask.
 */
function plateFadeOf(laid: Laid, layers: PlateLayer[]): PlateFade | null {
  let stopT = -1;
  for (const l of layers) stopT = Math.max(stopT, fadeStopOf(l, laid.vertical));
  if (stopT < 0) return null;
  const N = laid.texts.find((t) => t.kind === "name")?.size ?? 60;
  if (laid.vertical) {
    const L = laid.h;
    const tb = textBounds(laid);
    let start = Math.max(stopT * L, tb.y + tb.h - N * 0.1);
    start = Math.min(start, L - N * 1.4);
    start = Math.max(start, L * 0.35);
    return { start, end: L, axis: "y" };
  }
  const W = laid.w;
  // keep the type on solid plate, fade over the tail, and never shorter than ~2 em
  let start = Math.max(stopT * W, laid.textX1 - N * 0.2);
  start = Math.min(start, W - N * 2);
  start = Math.max(start, W * 0.35);
  return { start, end: W, axis: "x" };
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
  axis: "x" | "y" = "x",
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
  const g = axis === "y" ? c.createLinearGradient(0, start, 0, end) : c.createLinearGradient(start, 0, end, 0);
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
  const plateLayers = laid.vertical ? spec.vertical.plate : spec.plate;
  const ornaments = laid.vertical ? spec.vertical.ornaments : spec.ornaments;
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
      const isBase = (l: PlateLayer) => fadeStopOf(l, laid.vertical) >= 0;
      drawMasked(ctx, 0, bounds, fade.start, fade.end, (c) => {
        paintLayers(c, true, isBase);
        // overlays (sheens, bottom tints) leave the fade zone early, so a dark
        // tint can never turn the fading tail grey on a light background
        if (plateLayers.some((l) => !isBase(l) && l.kind !== "paper")) {
          drawMasked(
            c,
            1,
            bounds,
            fade.start - zone * 0.15,
            fade.start + zone * 0.5,
            (c2) => paintLayers(c2, true, (l) => !isBase(l)),
            fade.axis,
          );
        }
        for (const l of plateLayers) {
          if (l.kind === "paper") drawPlateLayer(c, l, laid, pal, m);
        }
        if (plateSweep) drawSweep(c, laid, m, flip);
      }, fade.axis);
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
  const vertical = !!spec.nativeVertical || cfg.orient === "vertical";
  const laid = people.map((p, i) => layoutOf(ctx, spec, p, cfg, vertical, i));
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
    drawPlate(ctx, l, m, pal, s.right && !(spec.keepOrder && !vertical), cfg);
    ctx.restore();
  }
}

/** Template defaults (palette, fonts, sweep) for a premium style. */
export function premiumDefaults(style: string) {
  if (!isPremiumId(style)) return null;
  const t = TEMPLATE_BY_ID[style];
  return { ...t.palette, fonts: t.fonts, sweep: t.motion.sweepDefault };
}
