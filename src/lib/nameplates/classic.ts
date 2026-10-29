/**
 * Classic v3 — the 经典 family (下划线 / 方块 / 竖线条 / 双栏 / 斜切条 / 光弧 /
 * 括号 / 双斜杠 / 勾线 / 侧勾 / 叠字 / 斜杠), horizontal and vertical.
 *
 * One shared type system (sizes, tracking, gaps, ink-aligned baseline grid),
 * one accent stroke weight, one slash angle and one refined palette. Each
 * template only describes its layout as a list of parts in un-mirrored
 * coordinates; mirroring (右对齐 / 竖排左右) and drawing are shared.
 */
import { FONT_SANS, FONT_SERIF } from "./fonts.ts";
import { packTitle } from "./text.ts";
import { backingTone, crispShadow, deepTint, featherBox, solidBox } from "./backing.ts";
import type { ClipLayer, NameplateStyle, Person, RenderConfig } from "./types.ts";

/* ─────────────────────────── palette ─────────────────────────── */

export const CLASSIC_COLORS = {
  white: "#F5F2EC",
  gold: "#D6B67C",
  goldHi: "#EAD6A6",
  goldLo: "#B88F4E",
  red: "#B3262E",
  blue: "#7CC4D6",
  ink: "#1A1714",
  goldInk: "#2A2012",
} as const;

/** Legacy flat colours from the v1/v2 classic cards → the refined palette. */
const LEGACY_COLORS: Record<string, string> = {
  "#cfaa66": CLASSIC_COLORS.gold,
  "#c8102e": CLASSIC_COLORS.red,
  "#3ec6e0": CLASSIC_COLORS.blue,
  "#4f8cff": CLASSIC_COLORS.blue,
  "#f4f4f4": CLASSIC_COLORS.white,
  "#f2f2f2": CLASSIC_COLORS.white,
  "#f7f7f7": CLASSIC_COLORS.white,
  "#ffffff": CLASSIC_COLORS.white,
  "#fff": CLASSIC_COLORS.white,
  "#141414": CLASSIC_COLORS.ink,
  "#161616": CLASSIC_COLORS.ink,
  "#1a1408": CLASSIC_COLORS.goldInk,
};

export function refineClassicColor(c: string | undefined): string | undefined {
  if (!c) return c;
  return LEGACY_COLORS[c.trim().toLowerCase()] ?? c;
}

type RGBA = [number, number, number, number];

function parseColor(c: string): RGBA {
  const s = c.trim();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1]!.split(",").map((x) => Number.parseFloat(x));
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
  }
  return [245, 242, 236, 1];
}

const rgba = ([r, g, b]: RGBA, a: number) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.max(0, Math.min(1, a)).toFixed(4)})`;

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

const W_: RGBA = [255, 255, 255, 1];
const K_: RGBA = [0, 0, 0, 1];

function isGold(c: string) {
  const k = c.trim().toLowerCase();
  return k === CLASSIC_COLORS.gold.toLowerCase() || k === "#cfaa66" || k === CLASSIC_COLORS.goldHi.toLowerCase();
}

/** Three stops (light → base → deep) for a colour; gold gets the refined metal ramp. */
function rampOf(c: string): [RGBA, RGBA, RGBA] {
  if (isGold(c)) return [parseColor(CLASSIC_COLORS.goldHi), parseColor(CLASSIC_COLORS.gold), parseColor(CLASSIC_COLORS.goldLo)];
  const base = parseColor(c);
  return [mix(base, W_, 0.16), base, mix(base, K_, 0.12)];
}

function rampAt(r: [RGBA, RGBA, RGBA], t: number): RGBA {
  return t < 0.5 ? mix(r[0], r[1], t * 2) : mix(r[1], r[2], (t - 0.5) * 2);
}

/** Smootherstep: zero slope at both ends, so fades have no visible start/stop line. */
const smoother = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/* ─────────────────────────── type system ─────────────────────────── */

const TYPE = {
  nameH: 76, // name px at 1080p, horizontal
  nameV: 72, // name px at 1080p, vertical
  titleRatio: 0.4, // title ≈ 0.40 × name
  titleTrack: 0.1, // em
  titleAlpha: 0.86,
  gap: 0.28, // name ink → title ink, × name size
  divGap: 0.2, // name ink → divider → title ink, × name size
  lineH: 1.42, // title line pitch, × title size
  stroke: 2.6, // accent stroke at 1080p (scaled with the plate)
  slant: 0.34, // tan of the shared slash angle (≈19°)
};

function nameTrackEm(name: string) {
  const n = [...name].length;
  if (n <= 2) return 0.24; // two-character names keep the traditional open spacing
  if (n <= 4) return 0.06;
  return 0.03;
}

/* ─────────────────────────── parts ─────────────────────────── */

type Pt = [number, number];
type Grow = "l" | "r" | "t";

type Part =
  | { k: "name"; x: number; y: number; onBand?: boolean }
  | { k: "title"; x: number; y: number; text: string; w: number; onBand?: boolean }
  | { k: "glyph"; ch: string; cx: number; y: number; size: number }
  | { k: "vname"; cx: number; y: number }
  | { k: "vtitle"; cx: number; y: number; text: string; onBand?: boolean }
  | { k: "line"; pts: Pt[]; w: number; fade?: boolean; layer: ClipLayer; join?: CanvasLineJoin; delay?: number }
  | { k: "shape"; pts: Pt[]; fill: "accent" | "band"; grow: Grow; layer: ClipLayer; fadeFrom?: number }
  | { k: "arc"; x: number; y: number; w: number; amp: number; dir: 1 | -1; thick: number }
  | { k: "brackets"; x: number; y: number; w: number; h: number; arm: number; thick: number; mirrored: boolean };

export type ClassicPlate = {
  width: number;
  height: number;
  person: Person;
  parts: Part[];
  flip: boolean;
  vertical: boolean;
  N: number;
  T: number;
  nTrack: number;
  tTrack: number;
  nameW: number;
  nameFont: string;
  titleFont: string;
  namePitch: number;
  titleGapV: number;
};

export type ClassicMotion = {
  opacity: number;
  x: number;
  y: number;
  bar: number;
  nameClip: number;
  titleClip: number;
};

const CLASSIC_STYLES = new Set<NameplateStyle>([
  "underline",
  "block",
  "rule",
  "split",
  "skew",
  "wave",
  "bracket",
  "duo",
  "hook",
  "ledge",
  "fold",
  "ceremony",
]);

export function isClassicStyle(style: string): boolean {
  return CLASSIC_STYLES.has(style as NameplateStyle);
}

function nameEnds(name: string): { first: string; last: string } {
  const chars = [...name.trim()].filter((c) => !"·•. ．・".includes(c));
  if (chars.length === 0) return { first: "", last: "" };
  if (chars.length === 1) return { first: chars[0]!, last: "" };
  return { first: chars[0]!, last: chars[chars.length - 1]! };
}

function trackedW(ctx: CanvasRenderingContext2D, text: string, track: number) {
  if (!text) return 0;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + Math.max([...text].length - 1, 0) * track;
}

/** Ink top/bottom of a reference ideograph relative to the em top (textBaseline = top). */
function inkOf(ctx: CanvasRenderingContext2D, size: number): [number, number] {
  ctx.textBaseline = "top";
  const mt = ctx.measureText("国");
  const top = -(mt.actualBoundingBoxAscent ?? 0);
  const bot = mt.actualBoundingBoxDescent ?? 0;
  if (!Number.isFinite(top) || !Number.isFinite(bot) || bot - top < size * 0.4) return [size * 0.09, size * 0.91];
  return [top, bot];
}

/* vertical title columns (shared with the legacy punctuation handling) */
function vStep(ch: string, size: number, gap: number, last: boolean) {
  if (ch === "、" || ch === "，") return size * 0.42;
  if (ch === "·") return size * 0.7;
  // a typed space is just a gap — no auto 圆点
  if (ch === " " || ch === "\u3000") return size * 0.6;
  return last ? size : size + gap;
}

function vColumnH(text: string, size: number, gap: number) {
  const chars = [...text];
  return chars.reduce((h, ch, i) => h + vStep(ch, size, gap, i === chars.length - 1), 0);
}

/* ─────────────────────────── measure ─────────────────────────── */

export function measureClassic(ctx: CanvasRenderingContext2D, person: Person, cfg: RenderConfig): ClassicPlate {
  const vertical = cfg.orient === "vertical";
  const nu = cfg.scale * Math.max(cfg.textSize, 0.4);
  const tu = cfg.scale * Math.max(cfg.titleSize ?? 1, 0.35);
  const nameFace = cfg.nameFont || FONT_SERIF;
  const titleFace = cfg.titleFont || FONT_SANS;
  const base = vertical ? TYPE.nameV : TYPE.nameH;
  let N = base * nu;
  const T = base * TYPE.titleRatio * tu;
  const S = Math.max(1.6, TYPE.stroke * nu);
  const nameFont = (n: number) => `600 ${n}px ${nameFace}`;
  const titleFont = `500 ${T}px ${titleFace}`;
  const name = person.name.trim();
  const em = nameTrackEm(name);

  ctx.save();
  ctx.font = nameFont(N);
  let nameW = trackedW(ctx, name, N * em);
  if (!vertical) {
    while (nameW > 760 * nu && N > 46 * nu) {
      N *= 0.95;
      ctx.font = nameFont(N);
      nameW = trackedW(ctx, name, N * em);
    }
  }
  const nTrack = N * em;
  const [a, b] = inkOf(ctx, N);
  ctx.font = titleFont;
  const tTrack = T * TYPE.titleTrack;
  const [ta, tb] = inkOf(ctx, T);
  const lines = packTitle(person.title).filter((l) => l.length > 0);
  const lineWs = lines.map((l) => trackedW(ctx, l, tTrack));
  ctx.restore();

  const titleW = Math.max(0, ...lineWs);
  const lineH = T * TYPE.lineH;
  const titleInkH = lines.length ? (lines.length - 1) * lineH + (tb - ta) : 0;
  const G = N * TYPE.gap;
  const D = N * TYPE.divGap;
  const SL = TYPE.slant;
  const style = cfg.style;
  const parts: Part[] = [];

  /** Title lines whose first ink line starts at `inkTop`. */
  const titlesAt = (x: number, inkTop: number, onBand = false) => {
    lines.forEach((text, i) => {
      parts.push({ k: "title", x, y: inkTop - ta + i * lineH, text, w: lineWs[i]!, onBand });
    });
    return inkTop + titleInkH;
  };

  const namePitch = N * 1.1;
  const titleGapV = T * 0.14;

  if (!vertical) {
    const mid = (a + b) / 2;
    const cap = b - a;
    switch (style) {
      case "underline": {
        parts.push({ k: "name", x: 0, y: 0 });
        const ly = b + D;
        const span = Math.max(nameW, titleW) + N * 0.42;
        parts.push({ k: "line", pts: [[0, ly], [span, ly]], w: S, fade: true, layer: "band" });
        titlesAt(0, ly + D);
        break;
      }
      case "block": {
        const q = N * 0.34;
        parts.push({ k: "shape", pts: rect(0, a, q, q), fill: "accent", grow: "t", layer: "slash" });
        const nx = q + N * 0.28;
        parts.push({ k: "name", x: nx, y: 0 });
        titlesAt(nx, b + G);
        break;
      }
      case "rule": {
        const rw = Math.max(4 * nu, N * 0.075);
        const nx = rw + N * 0.3;
        parts.push({ k: "name", x: nx, y: 0 });
        const bandTop = b + N * 0.24;
        const padY = N * 0.18;
        const textEnd = nx + titleW + N * 0.3;
        const bandEnd = textEnd + N * 0.85;
        const bandBot = bandTop + titleInkH + padY * 2;
        parts.push({
          k: "shape",
          pts: rect(rw, bandTop, bandEnd - rw, bandBot - bandTop),
          fill: "band",
          grow: "l",
          layer: "band",
          fadeFrom: (textEnd - rw) / (bandEnd - rw),
        });
        parts.push({ k: "shape", pts: rect(0, a - N * 0.04, rw, bandBot - (a - N * 0.04)), fill: "accent", grow: "t", layer: "slash" });
        titlesAt(nx, bandTop + padY, true);
        break;
      }
      case "split": {
        parts.push({ k: "name", x: 0, y: 0 });
        const dx = nameW + N * 0.36;
        const span = Math.max(cap, titleInkH) + N * 0.06;
        parts.push({ k: "line", pts: [[dx, mid - span / 2], [dx, mid + span / 2]], w: S, layer: "slash" });
        titlesAt(dx + N * 0.36, mid - titleInkH / 2);
        break;
      }
      case "skew": {
        const y0 = a - N * 0.3;
        const y1 = b + N * 0.3;
        const s = (y1 - y0) * SL;
        const nx = s * 0.5 + N * 0.38;
        const x1 = nx + nameW + N * 0.38 - s * 0.5;
        parts.push({ k: "shape", pts: [[s, y0], [x1 + s, y0], [x1, y1], [0, y1]], fill: "band", grow: "l", layer: "band" });
        parts.push({ k: "name", x: nx, y: 0, onBand: true });
        titlesAt(x1 + s * 0.5 + N * 0.34, (y0 + y1) / 2 - titleInkH / 2);
        break;
      }
      case "wave": {
        parts.push({ k: "name", x: 0, y: 0 });
        const tb2 = titlesAt(0, b + G);
        const amp = N * 0.15;
        const w = Math.max(nameW, titleW) * 1.05 + N * 0.2;
        parts.push({ k: "arc", x: 0, y: tb2 + N * 0.3 + amp, w, amp, dir: 1, thick: S * 2.6 });
        break;
      }
      case "bracket": {
        const px = N * 0.34;
        const py = N * 0.28;
        parts.push({ k: "name", x: px, y: 0 });
        const bot = titlesAt(px, b + G);
        const w = px * 2 + Math.max(nameW, titleW);
        parts.push({ k: "brackets", x: 0, y: a - py, w, h: bot + py - (a - py), arm: N * 0.5, thick: S * 1.2, mirrored: false });
        break;
      }
      case "duo": {
        parts.push({ k: "name", x: 0, y: 0 });
        const h = cap * 0.92;
        const run = h * SL;
        const c1 = nameW + N * 0.3 + run * 0.5;
        const c2 = c1 + N * 0.17;
        for (const [c, delay] of [[c1, 0], [c2, 0.18]] as const) {
          parts.push({ k: "line", pts: [[c - run / 2, mid + h / 2], [c + run / 2, mid - h / 2]], w: S * 1.6, layer: "slash", delay });
        }
        titlesAt(0, b + G);
        break;
      }
      case "hook": {
        const ly = b + D;
        const p0: Pt = [0, a - N * 0.16];
        const p1: Pt = [(ly - p0[1]) * SL, ly];
        const nx = p1[0] + N * 0.22;
        const p2: Pt = [nx + Math.max(nameW, titleW) + N * 0.3, ly];
        parts.push({ k: "line", pts: [p0, p1, p2], w: S, fade: true, layer: "slash", join: "round" });
        parts.push({ k: "name", x: nx, y: 0 });
        titlesAt(nx, ly + D);
        break;
      }
      case "ledge": {
        const tw = S * 1.6;
        parts.push({ k: "line", pts: [[tw / 2, a], [tw / 2, b]], w: tw, layer: "slash" });
        const nx = tw + N * 0.3;
        parts.push({ k: "name", x: nx, y: 0 });
        titlesAt(nx, b + G);
        break;
      }
      case "fold": {
        const F = N * 1.04;
        const ga = (a / N) * F;
        const gb = (b / N) * F;
        const ends = nameEnds(name);
        parts.push({ k: "glyph", ch: ends.first, cx: F / 2, y: 0, size: F });
        let bot = gb;
        if (ends.last) {
          const ly = F + N * 0.08;
          parts.push({ k: "glyph", ch: ends.last, cx: F / 2, y: ly, size: F });
          bot = ly + gb;
        }
        const h = bot - ga;
        const bx = F + N * 0.24;
        const top: Pt = [bx + h * SL, ga];
        parts.push({ k: "line", pts: [[bx, bot], top], w: S * 1.2, layer: "slash" });
        titlesAt(top[0] + N * 0.3, (ga + bot) / 2 - titleInkH / 2);
        break;
      }
      default: {
        // ceremony 斜杠
        parts.push({ k: "name", x: 0, y: 0 });
        const h = cap * 1.02;
        const sw = N * 0.13;
        const s = h * SL;
        const x0 = nameW + N * 0.28;
        const y0 = mid - h / 2;
        parts.push({ k: "shape", pts: [[x0 + s, y0], [x0 + s + sw, y0], [x0 + sw, y0 + h], [x0, y0 + h]], fill: "accent", grow: "t", layer: "slash" });
        const ly = b + D;
        const span = Math.max(nameW, titleW) + N * 0.42;
        parts.push({ k: "line", pts: [[0, ly], [span, ly]], w: S, fade: true, layer: "band" });
        titlesAt(0, ly + D);
      }
    }
  } else {
    /* vertical: name column on the left, title columns to its right (un-mirrored) */
    const n = [...name].length;
    const nInkTop = a;
    const nInkBot = (n - 1) * namePitch + b;
    const colPitch = T * 1.55;
    const colHs = lines.map((l) => vColumnH(l, T, titleGapV) - (T - tb) - ta);
    const titlesInkH = Math.max(0, ...colHs);
    const titleBlockW = lines.length ? (lines.length - 1) * colPitch + T : 0;
    const cx = N / 2;
    const Gv = N * 0.4;
    const vtitles = (firstCx: number, inkTop: number, onBand = false) => {
      lines.forEach((text, i) => parts.push({ k: "vtitle", cx: firstCx + i * colPitch, y: inkTop - ta, text, onBand }));
      return inkTop + titlesInkH;
    };
    const firstCx = N + Gv + T / 2;
    const vname = () => parts.push({ k: "vname", cx, y: 0 });
    switch (style) {
      case "duo": {
        vname();
        vtitles(firstCx, nInkTop);
        const h = N * 0.52;
        const run = h * SL;
        const cy = nInkBot + N * 0.34 + h / 2;
        for (const [c, delay] of [[cx - N * 0.085, 0], [cx + N * 0.085, 0.18]] as const) {
          parts.push({ k: "line", pts: [[c - run / 2, cy + h / 2], [c + run / 2, cy - h / 2]], w: S * 1.6, layer: "slash", delay });
        }
        break;
      }
      case "hook": {
        vname();
        const bot = Math.max(nInkBot, vtitles(firstCx, nInkTop));
        const hx = -N * 0.3;
        const p0: Pt = [N * 0.85, nInkTop - N * 0.36];
        const p1: Pt = [hx, p0[1] + (p0[0] - hx) * SL];
        parts.push({ k: "line", pts: [p0, p1, [hx, bot + N * 0.1]], w: S, fade: true, layer: "slash", join: "round" });
        break;
      }
      case "fold": {
        const ends = nameEnds(name);
        parts.push({ k: "glyph", ch: ends.first, cx, y: 0, size: N });
        const tTop = b + N * 0.34;
        const tBot = vtitles(firstCx, tTop);
        if (ends.last) parts.push({ k: "glyph", ch: ends.last, cx, y: tBot + N * 0.34 - a, size: N });
        const gx = N + Gv / 2;
        parts.push({ k: "line", pts: [[gx, tTop], [gx, tBot]], w: S, layer: "slash" });
        break;
      }
      case "underline": {
        const blockW = Math.max(N, titleBlockW);
        const ncx = blockW / 2;
        parts.push({ k: "vname", cx: ncx, y: 0 });
        const ly = nInkBot + D;
        const span = blockW + N * 0.3;
        parts.push({ k: "line", pts: [[ncx - span / 2, ly], [ncx + span / 2, ly]], w: S, layer: "band" });
        vtitles(ncx - titleBlockW / 2 + T / 2, ly + D);
        break;
      }
      case "block": {
        const q = N * 0.34;
        parts.push({ k: "shape", pts: rect(cx - q / 2, nInkTop, q, q), fill: "accent", grow: "t", layer: "slash" });
        parts.push({ k: "vname", cx, y: q + N * 0.26 });
        vtitles(firstCx, nInkTop);
        break;
      }
      case "split": {
        vname();
        const bot = Math.max(nInkBot, vtitles(firstCx, nInkTop));
        const gx = N + Gv / 2;
        parts.push({ k: "line", pts: [[gx, nInkTop], [gx, bot]], w: S, layer: "slash" });
        break;
      }
      case "bracket": {
        const p = N * 0.32;
        parts.push({ k: "vname", cx: p + cx, y: 0 });
        const bot = Math.max(nInkBot, vtitles(p + firstCx, nInkTop));
        const w = p * 2 + N + Gv + titleBlockW;
        parts.push({ k: "brackets", x: 0, y: nInkTop - p, w, h: bot - nInkTop + p * 2, arm: N * 0.5, thick: S * 1.2, mirrored: false });
        break;
      }
      case "ledge": {
        vname();
        vtitles(firstCx, nInkTop);
        const tw = S * 1.6;
        const lx = -N * 0.26;
        parts.push({ k: "line", pts: [[lx, nInkTop], [lx, nInkBot]], w: tw, layer: "slash" });
        break;
      }
      case "wave": {
        vname();
        vtitles(firstCx, nInkTop);
        const w = N * 1.5;
        const amp = N * 0.12;
        parts.push({ k: "arc", x: cx - w / 2, y: nInkBot + N * 0.3 + amp, w, amp, dir: 1, thick: S * 2.6 });
        break;
      }
      case "skew": {
        const x0 = -N * 0.3;
        const x1 = N + N * 0.3;
        const y0 = nInkTop - N * 0.34;
        const y1 = nInkBot + N * 0.34;
        const s = (x1 - x0) * SL * 0.5;
        parts.push({ k: "shape", pts: [[x0, y0 + s], [x1, y0], [x1, y1 - s], [x0, y1]], fill: "band", grow: "t", layer: "band" });
        parts.push({ k: "vname", cx, y: 0 });
        vtitles(x1 + N * 0.34 + T / 2, nInkTop);
        break;
      }
      case "rule": {
        vname();
        const rw = Math.max(4 * nu, N * 0.075);
        const pad = N * 0.2;
        const tTop = nInkTop + pad;
        const tBot = vtitles(firstCx + pad * 0.5, tTop, true);
        const bx0 = firstCx + pad * 0.5 - T / 2 - pad;
        const bx1 = firstCx + pad * 0.5 + (lines.length - 1) * colPitch + T / 2 + pad;
        parts.unshift({ k: "shape", pts: rect(bx0, nInkTop, bx1 - bx0, tBot + pad - nInkTop), fill: "band", grow: "t", layer: "band" });
        const bot = Math.max(nInkBot, tBot + pad);
        parts.push({ k: "shape", pts: rect(-N * 0.3 - rw, nInkTop - N * 0.04, rw, bot - nInkTop + N * 0.04), fill: "accent", grow: "t", layer: "slash" });
        break;
      }
      default: {
        vname();
        vtitles(firstCx, nInkTop);
        const h = N * 0.56;
        const sw = N * 0.13;
        const s = h * SL;
        const y0 = nInkBot + N * 0.34;
        const x0 = cx - (sw + s) / 2;
        parts.push({ k: "shape", pts: [[x0 + s, y0], [x0 + s + sw, y0], [x0 + sw, y0 + h], [x0, y0 + h]], fill: "accent", grow: "t", layer: "slash" });
      }
    }
  }

  // un-mirrored → normalized → mirrored
  const plate: ClassicPlate = {
    width: 0,
    height: 0,
    person,
    parts,
    flip: false,
    vertical,
    N,
    T,
    nTrack,
    tTrack,
    nameW,
    nameFont: nameFont(N),
    titleFont,
    namePitch,
    titleGapV,
  };
  const bx = boundsOf(plate, a, b, ta, tb);
  const dx = -bx.x0;
  const dy = -bx.y0;
  plate.width = bx.x1 - bx.x0;
  plate.height = bx.y1 - bx.y0;
  const flip = vertical ? cfg.side === "left" : (cfg.align ?? "left") === "right";
  plate.flip = flip;
  const W = plate.width;
  const mx = (x: number) => (flip ? W - x : x);
  const mp = (p: Pt): Pt => [mx(p[0] + dx), p[1] + dy];
  plate.parts = parts.map((p): Part => {
    switch (p.k) {
      case "name":
        return { ...p, x: flip ? W - (p.x + dx) - nameW : p.x + dx, y: p.y + dy };
      case "title":
        return { ...p, x: flip ? W - (p.x + dx) - p.w : p.x + dx, y: p.y + dy };
      case "glyph":
      case "vname":
      case "vtitle":
        return { ...p, cx: mx(p.cx + dx), y: p.y + dy };
      case "line":
        return { ...p, pts: p.pts.map(mp) };
      case "shape":
        return { ...p, pts: p.pts.map(mp), grow: flip && p.grow === "l" ? "r" : p.grow };
      case "arc":
        return { ...p, x: mx(p.x + dx) - (flip ? p.w : 0), y: p.y + dy, dir: flip ? -1 : 1 };
      case "brackets":
        return { ...p, x: mx(p.x + dx) - (flip ? p.w : 0), y: p.y + dy, mirrored: flip };
    }
  });
  return plate;
}

function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

function boundsOf(m: ClassicPlate, a: number, b: number, ta: number, tb: number) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (xa: number, ya: number, xb: number, yb: number) => {
    x0 = Math.min(x0, xa);
    y0 = Math.min(y0, ya);
    x1 = Math.max(x1, xb);
    y1 = Math.max(y1, yb);
  };
  const n = [...m.person.name.trim()].length;
  for (const p of m.parts) {
    switch (p.k) {
      case "name":
        add(p.x, p.y + a, p.x + m.nameW, p.y + b);
        break;
      case "title":
        add(p.x, p.y + ta, p.x + p.w, p.y + tb);
        break;
      case "glyph":
        add(p.cx - p.size / 2, p.y + (a / m.N) * p.size, p.cx + p.size / 2, p.y + (b / m.N) * p.size);
        break;
      case "vname":
        add(p.cx - m.N / 2, p.y + a, p.cx + m.N / 2, p.y + (n - 1) * m.namePitch + b);
        break;
      case "vtitle": {
        const h = vColumnH(p.text, m.T, m.titleGapV);
        add(p.cx - m.T / 2, p.y + ta, p.cx + m.T / 2, p.y + h - (m.T - tb));
        break;
      }
      case "line":
        for (const [x, y] of p.pts) add(x - p.w / 2, y - p.w / 2, x + p.w / 2, y + p.w / 2);
        break;
      case "shape":
        for (const [x, y] of p.pts) add(x, y, x, y);
        break;
      case "arc":
        add(p.x, p.y - p.amp * 1.1 - p.thick, p.x + p.w, p.y + p.amp * 1.3 + p.thick);
        break;
      case "brackets":
        add(p.x - p.thick / 2, p.y - p.thick / 2, p.x + p.w + p.thick / 2, p.y + p.h + p.thick / 2);
        break;
    }
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0, y0, x1, y1 };
}

/* ─────────────────────────── draw ─────────────────────────── */

type Pal = {
  name: string;
  title: string;
  accent: string;
  band: string;
  fx: RenderConfig["textFx"];
  backing: NonNullable<RenderConfig["backing"]>;
};

function palOf(cfg: RenderConfig): Pal {
  return {
    name: refineClassicColor(cfg.nameColor) || CLASSIC_COLORS.white,
    title: refineClassicColor(cfg.titleColor) || "#E9E4DA",
    accent: refineClassicColor(cfg.accentColor) || CLASSIC_COLORS.white,
    band: refineClassicColor(cfg.bandColor) || "rgba(10,10,12,0.5)",
    fx: cfg.textFx ?? "soft",
    backing: cfg.backing ?? "soft",
  };
}

function devScale(ctx: CanvasRenderingContext2D) {
  const T = ctx.getTransform();
  return Math.hypot(T.a, T.b) || 1;
}

function layerXform(person: Person, layer: ClipLayer) {
  const t = person.xform?.[layer];
  return t ? { x: t.x ?? 0, y: t.y ?? 0, rotation: t.rotation ?? 0 } : null;
}

function withLayer(ctx: CanvasRenderingContext2D, person: Person, layer: ClipLayer, px: number, py: number, draw: () => void) {
  const t = layerXform(person, layer);
  if (!t || (!t.x && !t.y && !t.rotation)) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(t.x, t.y);
  if (t.rotation) {
    ctx.translate(px, py);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.translate(-px, -py);
  }
  draw();
  ctx.restore();
}

/*
 * Backing behind the plate (衬底). 柔光 hugs the plate with a gaussian edge,
 * tinted by the 底板 colour (or a deep tone of the accent when it is stock
 * near-black) and dropped when 底板 and type are both light, so it never turns
 * into a grey smear over bright footage. 实底 is a clean intentional plate.
 */
function drawScrim(ctx: CanvasRenderingContext2D, m: ClassicPlate, pal: Pal, t: number) {
  if (pal.fx === "none" || pal.backing === "none" || t <= 0.01) return;
  const N = m.N;
  ctx.save();
  ctx.globalAlpha *= smoother(Math.min(1, t * 1.4));
  if (pal.backing === "solid") {
    const px = N * 0.32;
    const py = N * 0.24;
    solidBox(ctx, { x: -px, y: -py, w: m.width + px * 2, h: m.height + py * 2 }, N * 0.08, pal.band);
  } else {
    const tone = backingTone(parseColor(pal.band), parseColor(pal.name), parseColor(pal.accent), 0.5);
    const px = N * 0.16;
    const py = N * 0.1;
    featherBox(ctx, { x: -px, y: -py, w: m.width + px * 2, h: m.height + py * 2 }, N * 0.9, tone.color, 0.22 * tone.alpha);
  }
  ctx.restore();
}

function paintText(
  ctx: CanvasRenderingContext2D,
  pal: Pal,
  text: string,
  x: number,
  y: number,
  track: number,
  fill: string,
  size: number,
  onBand: boolean,
) {
  const run = (fn: (ch: string, cx: number) => void) => {
    let cx = x;
    for (const ch of text) {
      fn(ch, cx);
      cx += ctx.measureText(ch).width + track;
    }
  };
  if (!onBand && pal.fx === "outline") {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size * 0.075);
    ctx.strokeStyle = "rgba(6,8,12,0.9)";
    run((ch, cx) => ctx.strokeText(ch, cx, y));
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = fill;
  const draw = () => run((ch, cx) => ctx.fillText(ch, cx, y));
  if (!onBand && pal.fx !== "none") crispShadow(ctx, size, 0.72, draw, deepTint(parseColor(pal.accent), 0.035));
  else draw();
  ctx.restore();
}

function accentShadow(ctx: CanvasRenderingContext2D, blur = 5) {
  const k = devScale(ctx);
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetY = 1 * k;
}

function polyLen(pts: Pt[]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return L;
}

function tracePartial(ctx: CanvasRenderingContext2D, pts: Pt[], p: number) {
  const L = polyLen(pts) * p;
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (acc + d >= L) {
      const k = d > 0 ? (L - acc) / d : 0;
      ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
      return;
    }
    ctx.lineTo(x1, y1);
    acc += d;
  }
}

/** Accent gradient along a vector; `fade` eases the far end out to transparent. */
function accentGradient(ctx: CanvasRenderingContext2D, color: string, from: Pt, to: Pt, fade: boolean) {
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
  const r = rampOf(color);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const alpha = fade ? 1 - smoother((t - 0.55) / 0.45) : 1;
    g.addColorStop(t, rgba(rampAt(r, fade ? t * 0.7 : t), alpha));
  }
  return g;
}

function boxOf(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function drawLine(ctx: CanvasRenderingContext2D, p: Extract<Part, { k: "line" }>, pal: Pal, prog: number) {
  const t = Math.min(1, Math.max(0, (prog - (p.delay ?? 0)) / (1 - (p.delay ?? 0))));
  if (t <= 0.001) return;
  ctx.save();
  accentShadow(ctx, 4);
  ctx.lineCap = "round";
  ctx.lineJoin = p.join ?? "round";
  ctx.lineWidth = p.w;
  ctx.strokeStyle = accentGradient(ctx, pal.accent, p.pts[0]!, p.pts[p.pts.length - 1]!, !!p.fade);
  ctx.beginPath();
  tracePartial(ctx, p.pts, t);
  ctx.stroke();
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, p: Extract<Part, { k: "shape" }>, pal: Pal, prog: number) {
  if (prog <= 0.001) return;
  const bx = boxOf(p.pts);
  const w = bx.x1 - bx.x0;
  const h = bx.y1 - bx.y0;
  ctx.save();
  ctx.beginPath();
  if (p.grow === "t") ctx.rect(bx.x0 - 8, bx.y0 - 8, w + 16, (h + 8) * prog + 8);
  else if (p.grow === "l") ctx.rect(bx.x0 - 8, bx.y0 - 8, (w + 8) * prog + 8, h + 16);
  else ctx.rect(bx.x1 + 8 - (w + 8) * prog - 8, bx.y0 - 8, (w + 8) * prog + 8, h + 16);
  ctx.clip();
  const color = p.fill === "accent" ? pal.accent : pal.band;
  const r = rampOf(color);
  let fill: CanvasGradient;
  if (p.fadeFrom !== undefined) {
    const rev = p.grow === "r";
    fill = ctx.createLinearGradient(rev ? bx.x1 : bx.x0, 0, rev ? bx.x0 : bx.x1, 0);
    const n = 14;
    fill.addColorStop(0, rgba(rampAt(r, 0.2), r[1][3]));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const at = p.fadeFrom + (1 - p.fadeFrom) * t;
      fill.addColorStop(at, rgba(rampAt(r, 0.2 + 0.5 * at), r[1][3] * (1 - smoother(t))));
    }
  } else if (p.fill === "accent") {
    fill = ctx.createLinearGradient(bx.x0, bx.y0, bx.x1, bx.y1);
    fill.addColorStop(0, rgba(r[0], r[0][3]));
    fill.addColorStop(0.5, rgba(r[1], r[1][3]));
    fill.addColorStop(1, rgba(r[2], r[2][3]));
  } else {
    fill = ctx.createLinearGradient(0, bx.y0, 0, bx.y1);
    fill.addColorStop(0, rgba(mix(r[0], r[1], 0.4), r[1][3]));
    fill.addColorStop(1, rgba(mix(r[1], r[2], 0.6), r[1][3]));
  }
  accentShadow(ctx, p.fill === "band" ? 14 : 6);
  if (p.fill === "band") ctx.shadowColor = "rgba(0,0,0,0.26)";
  ctx.fillStyle = fill;
  ctx.beginPath();
  p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Tapered gradient arc: thickness follows a sine envelope, colour fades out at the tail. */
function drawArc(ctx: CanvasRenderingContext2D, p: Extract<Part, { k: "arc" }>, pal: Pal, prog: number) {
  if (prog <= 0.001) return;
  const { x, y, w, amp, dir } = p;
  const bez = (t: number): Pt => {
    // control points in un-mirrored space, then mirrored by dir
    const P = [
      [0, amp * 0.2],
      [w * 0.25, -amp * 1.1],
      [w * 0.6, amp * 1.25],
      [w, -amp * 0.1],
    ] as const;
    const u = 1 - t;
    const bx = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const by = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    return [dir === 1 ? x + bx : x + w - bx, y + by];
  };
  const n = 64;
  const steps = Math.max(2, Math.round(n * prog));
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * prog;
    const [px, py] = bez(t);
    const [qx, qy] = bez(Math.min(1, t + 0.004));
    const [rx, ry] = bez(Math.max(0, t - 0.004));
    const tx = qx - rx;
    const ty = qy - ry;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const half = (p.thick / 2) * Math.max(0.12, Math.pow(Math.sin(Math.PI * Math.min(1, t)), 0.6));
    top.push([px + nx * half, py + ny * half]);
    bot.push([px - nx * half, py - ny * half]);
  }
  const r = rampOf(pal.accent);
  const g = ctx.createLinearGradient(dir === 1 ? x : x + w, 0, dir === 1 ? x + w : x, 0);
  const m = 12;
  for (let i = 0; i <= m; i++) {
    const t = i / m;
    const alpha = smoother(t / 0.16) * (1 - 0.8 * smoother((t - 0.55) / 0.45));
    g.addColorStop(t, rgba(rampAt(r, t * 0.8), alpha));
  }
  ctx.save();
  ctx.beginPath();
  top.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i]![0], bot[i]![1]);
  ctx.closePath();
  // soft glow under the stroke
  const k = devScale(ctx);
  ctx.shadowColor = rgba(r[1], 0.45);
  ctx.shadowBlur = p.thick * 3 * k;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawBrackets(ctx: CanvasRenderingContext2D, p: Extract<Part, { k: "brackets" }>, pal: Pal, prog: number) {
  if (prog <= 0.001) return;
  const { x, y, w, h, arm } = p;
  const a = Math.min(arm, w / 2, h / 2);
  // top-left + bottom-right (mirrored: top-right + bottom-left)
  const c1: Pt[] = p.mirrored ? [[x + w - a, y], [x + w, y], [x + w, y + a]] : [[x, y + a], [x, y], [x + a, y]];
  const c2: Pt[] = p.mirrored ? [[x + a, y + h], [x, y + h], [x, y + h - a]] : [[x + w, y + h - a], [x + w, y + h], [x + w - a, y + h]];
  ctx.save();
  accentShadow(ctx, 5);
  ctx.lineWidth = p.thick;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 4;
  const g = accentGradient(ctx, pal.accent, [x, y], [x + w, y + h], false);
  ctx.strokeStyle = g;
  for (const c of [c1, c2]) {
    ctx.beginPath();
    tracePartial(ctx, c, prog);
    ctx.stroke();
  }
  ctx.restore();
}

function revealClip(ctx: CanvasRenderingContext2D, m: ClassicPlate, p: number, vertical: boolean) {
  const pad = m.N;
  ctx.beginPath();
  if (vertical) ctx.rect(-pad, -pad, m.width + pad * 2, (m.height + pad * 2) * p);
  else if (m.flip) ctx.rect(m.width + pad - (m.width + pad * 2) * p, -pad, (m.width + pad * 2) * p, m.height + pad * 2);
  else ctx.rect(-pad, -pad, (m.width + pad * 2) * p, m.height + pad * 2);
  ctx.clip();
}

function partCenter(m: ClassicPlate, p: Part): Pt {
  switch (p.k) {
    case "name":
      return [p.x + m.nameW / 2, p.y + m.N / 2];
    case "title":
      return [p.x + p.w / 2, p.y + m.T / 2];
    case "glyph":
      return [p.cx, p.y + p.size / 2];
    case "vname":
    case "vtitle":
      return [p.cx, m.height / 2];
    case "line":
    case "shape": {
      const b = boxOf(p.pts);
      return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    }
    case "arc":
      return [p.x + p.w / 2, p.y];
    case "brackets":
      return [p.x + p.w / 2, p.y + p.h / 2];
  }
}

function layerOf(p: Part): ClipLayer {
  switch (p.k) {
    case "name":
    case "glyph":
    case "vname":
      return "name";
    case "title":
    case "vtitle":
      return "title";
    case "arc":
    case "brackets":
      return "slash";
    default:
      return p.layer;
  }
}

function zOf(p: Part) {
  if (p.k === "shape" && p.fill === "band") return 0;
  if (p.k === "name" || p.k === "title" || p.k === "glyph" || p.k === "vname" || p.k === "vtitle") return 2;
  return 1;
}

export function drawClassicPlate(
  ctx: CanvasRenderingContext2D,
  m: ClassicPlate,
  x: number,
  y: number,
  motion: ClassicMotion,
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const pal = palOf(cfg);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  drawScrim(ctx, m, pal, Math.max(motion.bar, motion.nameClip));

  const ordered = [...m.parts].sort((p, q) => zOf(p) - zOf(q));
  for (const p of ordered) {
    const layer = layerOf(p);
    const [px, py] = partCenter(m, p);
    const prog = layer === "name" ? motion.nameClip : layer === "title" ? motion.titleClip : motion.bar;
    withLayer(ctx, m.person, layer, px, py, () => {
      switch (p.k) {
        case "line":
          drawLine(ctx, p, pal, prog);
          return;
        case "shape":
          drawShape(ctx, p, pal, prog);
          return;
        case "arc":
          drawArc(ctx, p, pal, prog);
          return;
        case "brackets":
          drawBrackets(ctx, p, pal, prog);
          return;
      }
      if (prog <= 0.001) return;
      ctx.save();
      const vertical = p.k === "vname" || p.k === "vtitle";
      revealClip(ctx, m, prog, vertical);
      ctx.globalAlpha *= Math.min(1, prog * 1.6);
      ctx.textBaseline = "top";
      if (p.k === "name") {
        ctx.font = m.nameFont;
        ctx.textAlign = "left";
        paintText(ctx, pal, m.person.name.trim(), p.x, p.y, m.nTrack, pal.name, m.N, !!p.onBand);
      } else if (p.k === "title") {
        ctx.font = m.titleFont;
        ctx.textAlign = "left";
        ctx.globalAlpha *= p.onBand ? 0.94 : TYPE.titleAlpha;
        paintText(ctx, pal, p.text, p.x, p.y, m.tTrack, pal.title, m.T, !!p.onBand);
      } else if (p.k === "glyph") {
        ctx.font = m.nameFont.replace(/\d+(\.\d+)?px/, `${p.size}px`);
        ctx.textAlign = "center";
        paintText(ctx, pal, p.ch, p.cx, p.y, 0, pal.name, p.size, false);
      } else if (p.k === "vname") {
        ctx.font = m.nameFont;
        ctx.textAlign = "center";
        const onBand = m.parts.some((q) => q.k === "shape" && q.fill === "band" && q.layer === "band") && cfg.style === "skew";
        let ny = p.y;
        for (const ch of m.person.name.trim()) {
          paintText(ctx, pal, ch, p.cx, ny, 0, pal.name, m.N, onBand);
          ny += m.namePitch;
        }
      } else if (p.k === "vtitle") {
        ctx.font = m.titleFont;
        ctx.textAlign = "center";
        ctx.globalAlpha *= p.onBand ? 0.94 : TYPE.titleAlpha;
        const chars = [...p.text];
        let ty = p.y;
        chars.forEach((ch, i) => {
          const last = i === chars.length - 1;
          if (ch === "、" || ch === "，") {
            // vertical punctuation sits in the upper-right of its own cell
            paintText(ctx, pal, ch, p.cx + m.T * 0.5, ty - m.T * 0.6, 0, pal.title, m.T, !!p.onBand);
          } else if (ch !== " " && ch !== "\u3000") {
            paintText(ctx, pal, ch, p.cx, ty, 0, pal.title, m.T, !!p.onBand);
          }
          ty += vStep(ch, m.T, m.titleGapV, last);
        });
      }
      ctx.restore();
    });
  }
  ctx.restore();
}
