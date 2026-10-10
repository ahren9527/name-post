/**
 * Shared legibility helpers for plate-less nameplates: the soft backing
 * behind the type (衬底) and the crisp text shadow (柔和投影).
 *
 * Why this exists: a large neutral-black haze at low alpha over a bright
 * white frame reads as a muddy grey smear, and so does a wide grey text
 * shadow. The backing therefore hugs the text block with a gaussian edge,
 * takes its colour from the 底板 colour (or a deep tint of the template's
 * palette when 底板 is the stock neutral black), follows 底板不透明, and drops
 * out entirely when 底板 and the type are both light (a light haze behind
 * light type helps nothing). The text shadow is two tight layers that read
 * as depth, never as fog.
 */

export type RGBA = [number, number, number, number];
export type TextBacking = "soft" | "none" | "solid";

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

export function rgbaCss([r, g, b, a]: RGBA, mul = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(a * mul).toFixed(3)})`;
}

/** Perceptual lightness 0..1 (sRGB-weighted, gamma-ish). */
export function luma([r, g, b]: RGBA): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function chroma([r, g, b]: RGBA) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** A deep shade carrying the hue of `ref` (navy for blue, warm brown for gold…). */
export function deepTint(ref: RGBA, lightness = 0.075): RGBA {
  const [r, g, b] = ref.map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-4) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  const l0 = (mx + mn) / 2;
  const s0 = d < 1e-4 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  const s = Math.min(0.45, s0);
  const l = lightness;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255, 1];
}

/** Stock 底板 colours of the plate-less templates are neutral near-black. */
function isNeutralBlack(c: RGBA) {
  return Math.max(c[0], c[1], c[2]) < 34 && chroma(c) < 14;
}

export interface BackingTone {
  /** Colour of the backing, alpha 1. */
  color: RGBA;
  /** Multiplier for the template's peak alpha (0 = draw nothing). */
  alpha: number;
}

/**
 * Resolve the soft backing colour + strength.
 * @param band the user's 底板 colour (alpha = 底板不透明)
 * @param refAlpha the template's stock 底板 alpha, so the slider is relative to it
 */
export function backingTone(band: RGBA, name: RGBA, accent: RGBA, refAlpha: number): BackingTone {
  // light 底板 behind light type (or dark behind dark) adds haze, not contrast
  const contrast = Math.abs(luma(name) - luma(band));
  const k = smooth((contrast - 0.22) / 0.3);
  if (k < 0.02) return { color: [0, 0, 0, 1], alpha: 0 };
  let color: RGBA;
  if (isNeutralBlack(band)) {
    const hueRef = chroma(accent) > 24 ? accent : chroma(name) > 10 ? name : accent;
    color = deepTint(hueRef);
  } else {
    color = [band[0], band[1], band[2], 1];
  }
  const rel = band[3] >= 0.95 ? 1 : band[3] / Math.max(0.05, refAlpha);
  return { color, alpha: clamp(rel, 0.35, 1.7) * k };
}

/** Device-space scale of the current transform. */
export function devScale(ctx: CanvasRenderingContext2D) {
  const T = ctx.getTransform();
  return Math.hypot(T.a, T.b) || 1;
}

/**
 * Run `draw` so that only its shadow lands on the canvas: the shape is drawn
 * far off-canvas and the shadow offset brings it back. Works under any
 * rotation/flip because the offset is computed from the live transform.
 * `dy` and `blur` are in user units; the shadow falls straight down on screen.
 */
export function shadowOnly(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  dy: number,
  draw: () => void,
) {
  const T = ctx.getTransform();
  const k = Math.hypot(T.a, T.b) || 1;
  const D = 30000 / k;
  ctx.save();
  ctx.translate(-D, 0);
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(0, blur * k);
  ctx.shadowOffsetX = D * T.a;
  ctx.shadowOffsetY = D * T.b + dy * k;
  draw();
  ctx.restore();
}

/**
 * Feathered rounded box (gaussian edge): the box edge sits at half strength,
 * fading to zero ≈ `feather` beyond it. Pure shadow, so no hard edge ever.
 */
export function featherBox(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  feather: number,
  color: RGBA,
  alpha: number,
) {
  if (alpha <= 0.002 || r.w <= 0 || r.h <= 0) return;
  ctx.save();
  ctx.fillStyle = "#000";
  shadowOnly(ctx, rgbaCss(color, alpha), feather, 0, () => {
    ctx.beginPath();
    const rad = Math.min(r.w, r.h) * 0.5;
    if (typeof ctx.roundRect === "function") ctx.roundRect(r.x, r.y, r.w, r.h, rad);
    else ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill();
  });
  ctx.restore();
}

/** Clean intentional plate (实底): rounded rectangle in the 底板 colour. */
export function solidBox(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  radius: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(r.x, r.y, r.w, r.h, radius);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill();
  ctx.restore();
}

/**
 * 柔和投影: a tight dark contact shadow plus a faint short soft layer,
 * painted as shadow-only passes, then the glyphs once on top (no double
 * fill, so translucent type keeps its alpha). `size` = font px (user units),
 * `strength` 0..1 (template type.shadow; ~0.55 for plate-less templates).
 */
export function crispShadow(
  ctx: CanvasRenderingContext2D,
  size: number,
  strength: number,
  draw: () => void,
  tint: RGBA = [6, 7, 10, 1],
) {
  if (strength > 0.001) {
    const s = clamp(strength / 0.55, 0, 1.5);
    // small type (English line, titles) gets a slightly firmer contact shadow
    const small = size < 30 ? 1.25 : 1;
    shadowOnly(ctx, rgbaCss(tint, 0.17 * s), Math.max(3, size * 0.11), Math.max(1, size * 0.035), draw);
    shadowOnly(ctx, rgbaCss(tint, Math.min(0.8, 0.5 * s * small)), Math.max(1, size * 0.028), Math.max(1, size * 0.02), draw);
  }
  draw();
}

/** Reference alpha of a template's stock 底板 colour string. */
export function alphaOfCss(c: string): number {
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return 1;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return p[3] ?? 1;
}
