import { FONT_SANS, FONT_SERIF, resolveFontStack } from "./fonts";
import {
  BASE_H,
  BASE_W,
  type ClipLayer,
  type LayerXform,
  type NameplateStyle,
  type Person,
  type RenderConfig,
  totalDuration,
} from "./types";

const THEME = {
  name: "#f7f7f7",
  title: "#e8e8e8",
  accent: "#2A8CFF",
  band: "rgba(18, 22, 28, 0.72)",
  line: "rgba(236, 236, 236, 0.92)",
};

let PALETTE = { ...THEME };

function applyPalette(cfg: RenderConfig) {
  PALETTE = {
    name: cfg.nameColor || THEME.name,
    title: cfg.titleColor || THEME.title,
    accent: cfg.accentColor || THEME.accent,
    band: cfg.bandColor || THEME.band,
    line: THEME.line,
  };
}

function nameFace(cfg: RenderConfig) {
  return cfg.nameFont || FONT_SERIF;
}

function titleFace(cfg: RenderConfig) {
  return cfg.titleFont || FONT_SANS;
}

function clamp(n: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, n));
}

function easeOut(t: number) {
  const x = clamp(t);
  return 1 - (1 - x) * (1 - x) * (1 - x);
}

function easeIn(t: number) {
  const x = clamp(t);
  return x * x * x;
}

function easeLinear(t: number) {
  return clamp(t);
}

function easeOf(cfg: RenderConfig) {
  if (cfg.ease === "linear") return easeLinear;
  if (cfg.ease === "snap") return (t: number) => easeOut(easeOut(t));
  return easeOut;
}

function animOffset(cfg: RenderConfig): { x: number; y: number } {
  switch (cfg.animIn) {
    case "none":
    case "fade":
    case "scale":
      return { x: 0, y: 0 };
    case "up":
      return { x: 0, y: 42 };
    case "down":
      return { x: 0, y: -42 };
    case "right":
      return { x: 56, y: 0 };
    default:
      return { x: -56, y: 0 };
  }
}

export type PlateMotion = {
  opacity: number;
  x: number;
  y: number;
  bar: number;
  nameClip: number;
  titleClip: number;
  label: number;
};

export function plateMotion(
  index: number,
  count: number,
  time: number,
  cfg: RenderConfig,
): PlateMotion {
  const from = animOffset(cfg);
  const ez = easeOf(cfg);
  const empty: PlateMotion = {
    opacity: 0,
    x: from.x,
    y: from.y,
    bar: 0,
    nameClip: 0,
    titleClip: 0,
    label: 0,
  };

  const finish = (local: number, enterRaw: number, exit: number): PlateMotion => {
    if (cfg.animIn === "none") {
      const on = local >= 0 && exit > 0.02;
      return {
        opacity: on ? exit : 0,
        x: 0,
        y: 0,
        bar: on ? 1 : 0,
        nameClip: on ? 1 : 0,
        titleClip: on ? 1 : 0,
        label: 0,
      };
    }
    const enter = ez(enterRaw);
    const t = enter * exit;
    const fade = cfg.animIn === "fade" || cfg.animIn === "scale";
    return {
      opacity: t,
      x: fade ? 0 : from.x * (1 - enter) + from.x * 0.18 * (1 - exit),
      y: fade ? 0 : from.y * (1 - enter),
      bar: enter,
      nameClip: ez(clamp((local - cfg.inDuration * 0.08) / Math.max(cfg.inDuration * 0.72, 0.05))),
      titleClip: ez(clamp((local - cfg.inDuration * 0.28) / Math.max(cfg.inDuration * 0.72, 0.05))),
      label: 0,
    };
  };

  if (cfg.layout === "sequence") {
    const slot = cfg.inDuration + cfg.holdDuration + cfg.outDuration;
    const local = time - index * slot;
    if (local < 0 || local > slot) return empty;
    const enterRaw = clamp(local / Math.max(cfg.inDuration, 0.04));
    const exit = easeIn(
      1 - clamp((local - cfg.inDuration - cfg.holdDuration) / Math.max(cfg.outDuration, 0.04)),
    );
    return finish(local, enterRaw, exit);
  }

  const enterStart = index * cfg.stagger;
  const local = time - enterStart;
  const total = totalDuration(cfg);
  const exitStart = total - cfg.outDuration;
  const enterRaw = clamp(local / Math.max(cfg.inDuration, 0.04));
  const exit = easeIn(1 - clamp((time - exitStart) / Math.max(cfg.outDuration, 0.04)));
  return finish(local, enterRaw, exit);
}

function splitTitleParts(text: string): string[] {
  const parts: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (ch === "、" || ch === "，") {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

function splitEvenChars(text: string, n: number): string[] {
  const chars = [...text];
  if (chars.length === 0) return [];
  const count = Math.min(Math.max(n, 1), chars.length);
  const size = Math.ceil(chars.length / count);
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = chars.slice(i * size, (i + 1) * size).join("");
    if (chunk) lines.push(chunk);
  }
  return lines;
}

function balanceParts(parts: string[], n: number): string[] {
  if (parts.length === 0) return [];
  if (parts.length === n) return parts;
  if (parts.length < n) {
    const buckets = [...parts];
    while (buckets.length < n) {
      let maxI = 0;
      for (let i = 1; i < buckets.length; i++) {
        if ([...buckets[i]!].length > [...buckets[maxI]!].length) maxI = i;
      }
      const chars = [...buckets[maxI]!];
      if (chars.length < 2) break;
      const mid = Math.ceil(chars.length / 2);
      buckets.splice(maxI, 1, chars.slice(0, mid).join(""), chars.slice(mid).join(""));
    }
    return buckets;
  }
  const lines: string[] = [];
  let i = 0;
  for (let k = 0; k < n && i < parts.length; k++) {
    const remainBuckets = n - k;
    const remainChars = parts.slice(i).reduce((s, p) => s + [...p].length, 0);
    const want = remainChars / remainBuckets;
    let acc = "";
    let accLen = 0;
    while (i < parts.length) {
      const nextLen = [...parts[i]!].length;
      if (k === n - 1) {
        acc += parts[i++];
        continue;
      }
      if (acc && accLen + nextLen > want * 1.2) break;
      acc += parts[i++];
      accLen += nextLen;
      if (accLen >= want * 0.8) break;
    }
    if (acc) lines.push(acc);
  }
  return lines;
}

export function packTitle(text: string, n: number): string[] {
  const t = text.trim();
  if (!t) return [];
  const count = Math.max(1, Math.min(3, Math.round(n) || 1));
  if (count === 1) return [t];
  const parts = splitTitleParts(t);
  if (parts.length === 1) return splitEvenChars(t, count);
  return balanceParts(parts, count);
}

function nameEnds(name: string): { first: string; last: string } {
  const chars = [...name.trim()].filter(
    (c) => c !== "·" && c !== "•" && c !== "." && c !== " " && c !== "．" && c !== "・",
  );
  if (chars.length === 0) return { first: "", last: "" };
  if (chars.length === 1) return { first: chars[0]!, last: "" };
  return { first: chars[0]!, last: chars[chars.length - 1]! };
}

function nameTracking(name: string): number {
  if (name.length <= 2) return 14;
  if (name.length <= 3) return 10;
  if (name.length <= 4) return 5;
  return 1.5;
}

function fillTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  return cx - x - tracking;
}

function strokeTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  let cx = x;
  for (const ch of text) {
    ctx.strokeText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

function trackedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
) {
  if (!text) return 0;
  return ctx.measureText(text).width + Math.max(text.length - 1, 0) * tracking;
}

const HALO = "rgba(0, 0, 0, 0.92)";
const STROKE_OUTER = "rgba(0,0,0,0.58)";
const STROKE_CORE = "rgba(6, 8, 12, 0.96)";

function beginStroke(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.miterLimit = 2;
}

function paintTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  fill: string,
  strokeWidth: number,
) {
  ctx.save();
  beginStroke(ctx);
  ctx.shadowColor = HALO;
  ctx.shadowBlur = strokeWidth * 2.8;
  ctx.shadowOffsetY = strokeWidth * 0.28;
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  fillTracked(ctx, text, x, y, tracking);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = strokeWidth + 2.8;
  ctx.strokeStyle = STROKE_OUTER;
  strokeTracked(ctx, text, x, y, tracking);
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = STROKE_CORE;
  strokeTracked(ctx, text, x, y, tracking);

  ctx.fillStyle = fill;
  fillTracked(ctx, text, x, y, tracking);
  ctx.restore();
}

function paintGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  fill: string,
  strokeWidth: number,
) {
  ctx.save();
  beginStroke(ctx);
  ctx.shadowColor = HALO;
  ctx.shadowBlur = strokeWidth * 2.8;
  ctx.shadowOffsetY = strokeWidth * 0.28;
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  ctx.fillText(ch, x, y);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = strokeWidth + 2.6;
  ctx.strokeStyle = STROKE_OUTER;
  ctx.strokeText(ch, x, y);
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = STROKE_CORE;
  ctx.strokeText(ch, x, y);

  ctx.fillStyle = fill;
  ctx.fillText(ch, x, y);
  ctx.restore();
}

const ZERO_XFORM: LayerXform = { x: 0, y: 0, rotation: 0 };

export function layerXform(person: Person, layer: ClipLayer): LayerXform {
  const t = person.xform?.[layer];
  return t ? { x: t.x ?? 0, y: t.y ?? 0, rotation: t.rotation ?? 0 } : ZERO_XFORM;
}

function withXform(
  ctx: CanvasRenderingContext2D,
  person: Person,
  layer: ClipLayer,
  px: number,
  py: number,
  draw: () => void,
) {
  const t = layerXform(person, layer);
  if (!t.x && !t.y && !t.rotation) {
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

function nameU(cfg: RenderConfig) {
  return cfg.scale * Math.max(cfg.textSize, 0.4);
}

function titleU(cfg: RenderConfig) {
  return cfg.scale * Math.max(cfg.titleSize ?? 1, 0.35);
}

function isRightAlign(cfg: RenderConfig) {
  return (cfg.align ?? "left") === "right";
}

function isTopAlign(cfg: RenderConfig) {
  return cfg.orient === "vertical" || (cfg.align ?? "left") === "top";
}

function titleBlockH(lines: number, size: number) {
  return size * 1.28 * Math.max(lines, 1);
}

/** Inner left/right of a parallelogram at yFromTop, with stroke inset. */
function paraInner(
  x: number,
  w: number,
  h: number,
  skew: number,
  yFromTop: number,
  inset: number,
) {
  const t = Math.max(0, Math.min(1, yFromTop / Math.max(h, 1)));
  const shift = skew * (1 - t);
  return { left: x + shift + inset, right: x + w + shift - inset };
}

function fillSkew(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  skew: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + skew, y);
  ctx.lineTo(x + w + skew, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
  ctx.fill();
}

function clipRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
  ctx.clip();
}

function drawBlueSlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  flip: boolean,
  skewRatio = 0.38,
) {
  if (t <= 0.01) return;
  const hh = Math.max(h * t, 1);
  const skew = (flip ? -1 : 1) * hh * skewRatio;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = PALETTE.accent;
  fillSkew(ctx, x, y, w, hh, skew);
  ctx.restore();
}

function drawBlueSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) {
  if (t <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= t;
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(x, y, s, s);
  ctx.restore();
}

function drawHairline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  t: number,
  thick: number,
  side: "left" | "right",
) {
  if (t <= 0.01) return;
  const span = x2 - x1;
  const drawn = side === "left" ? x1 + span * t : x2 - span * t;
  const a = side === "left" ? x1 : drawn;
  const b = side === "left" ? drawn : x2;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = thick + 2.2;
  ctx.beginPath();
  ctx.moveTo(a, y);
  ctx.lineTo(b, y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = thick;
  ctx.beginPath();
  ctx.moveTo(a, y);
  ctx.lineTo(b, y);
  ctx.stroke();
  ctx.restore();
}

/** Line between name and title matches the title block: same origin and width. */
function titleLineSpan(
  flip: boolean,
  originL: number,
  originR: number,
  titleW: number,
): { l: number; r: number } {
  const w = Math.max(titleW, 8);
  if (flip) return { l: originR - w, r: originR };
  return { l: originL, r: originL + w };
}

function clipReveal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  side: "left" | "right",
) {
  ctx.beginPath();
  if (side === "left") ctx.rect(x, y, Math.max(w * t, 1), h);
  else ctx.rect(x + w * (1 - t), y, Math.max(w * t, 1), h);
  ctx.clip();
}

function clipSkew(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  skew: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + skew, y);
  ctx.lineTo(x + w + skew, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
}

function withAlpha(color: string, a: number) {
  if (color.startsWith("rgb")) {
    const inner = color.slice(color.indexOf("(") + 1, color.indexOf(")"));
    const p = inner.split(",").map((s) => s.trim());
    return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
  }
  const n = color.replace("#", "");
  if (n.length < 6) return `rgba(80,180,255,${a})`;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawWaveCurve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  t: number,
  flip: boolean,
) {
  if (t <= 0.01 || w <= 1) return;
  const drawn = Math.max(w * t, 4);
  const x0 = flip ? x + w - drawn : x;
  const x1 = flip ? x + w : x + drawn;
  const amp = Math.max(14, Math.min(28, w * 0.055));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const g = ctx.createLinearGradient(x0, y, x1, y);
  g.addColorStop(flip ? 1 : 0, PALETTE.accent);
  g.addColorStop(0.45, PALETTE.accent);
  g.addColorStop(flip ? 0 : 1, withAlpha(PALETTE.accent, 0.05));
  ctx.beginPath();
  ctx.moveTo(x0, y + amp * 0.15);
  ctx.bezierCurveTo(
    x0 + (x1 - x0) * 0.22,
    y - amp,
    x0 + (x1 - x0) * 0.55,
    y + amp * 1.35,
    x1,
    y - amp * 0.1,
  );
  ctx.strokeStyle = withAlpha(PALETTE.accent, 0.28);
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = g;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.restore();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  thick: number,
  arm: number,
) {
  if (t <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= t;
  ctx.fillStyle = PALETTE.accent;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.fillRect(x, y, thick, arm);
  ctx.fillRect(x, y, arm, thick);
  ctx.fillRect(x + w - thick, y + h - arm, thick, arm);
  ctx.fillRect(x + w - arm, y + h - thick, arm, thick);
  ctx.restore();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) {
  if (t <= 0.01) return;
  const r = s * Math.max(t, 0.12);
  ctx.save();
  ctx.fillStyle = PALETTE.accent;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
) {
  if (t <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= t;
  ctx.fillStyle = PALETTE.accent;
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Two parallel bars. angle 0 = vertical, positive = clockwise. */
function drawTwinBars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  thick: number,
  gap: number,
  angle: number,
  t: number,
) {
  if (t <= 0.01) return;
  const hh = Math.max(len * t, 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.accent;
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 5;
  const x0 = -gap / 2 - thick;
  const x1 = gap / 2;
  ctx.fillRect(x0, -hh / 2, thick, hh);
  ctx.fillRect(x1, -hh / 2, thick, hh);
  ctx.restore();
}

/** Short tilted stroke (signature underline). angle in radians, 0 = horizontal. */
function drawTiltStroke(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  thick: number,
  angle: number,
  t: number,
) {
  if (t <= 0.01) return;
  const w = Math.max(len * Math.max(t, 0.14), 8);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.accent;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  const hw = w / 2;
  const ht = thick / 2;
  const sk = thick * 0.38;
  ctx.beginPath();
  ctx.moveTo(-hw + sk, -ht);
  ctx.lineTo(hw + sk, -ht);
  ctx.lineTo(hw - sk, ht);
  ctx.lineTo(-hw - sk, ht);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVHairline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  t: number,
  thick: number,
) {
  if (t <= 0.01) return;
  const span = y2 - y1;
  const drawn = Math.max(span * t, 1);
  ctx.save();
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = thick;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y1 + drawn);
  ctx.stroke();
  ctx.restore();
}

function drawWaveCurveV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
) {
  if (t <= 0.01 || h <= 1) return;
  const drawn = Math.max(h * t, 4);
  const amp = Math.max(8, Math.min(16, h * 0.07));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const g = ctx.createLinearGradient(x, y, x, y + drawn);
  g.addColorStop(0, PALETTE.accent);
  g.addColorStop(0.45, PALETTE.accent);
  g.addColorStop(1, withAlpha(PALETTE.accent, 0.05));
  ctx.beginPath();
  ctx.moveTo(x + amp * 0.15, y);
  ctx.bezierCurveTo(
    x - amp,
    y + drawn * 0.22,
    x + amp * 1.35,
    y + drawn * 0.55,
    x - amp * 0.1,
    y + drawn,
  );
  ctx.strokeStyle = withAlpha(PALETTE.accent, 0.28);
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = g;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.restore();
}

function drawAccentLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
  thick: number,
) {
  if (t <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = thick;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  ctx.stroke();
  ctx.restore();
}

function drawHookPath(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  mx: number,
  my: number,
  ex: number,
  ey: number,
  t: number,
  thick: number,
) {
  if (t <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = thick;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 4;
  const d1 = Math.hypot(mx - sx, my - sy);
  const d2 = Math.hypot(ex - mx, ey - my);
  const total = Math.max(d1 + d2, 1);
  const drawn = total * t;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  if (drawn <= d1) {
    const k = drawn / Math.max(d1, 1);
    ctx.lineTo(sx + (mx - sx) * k, sy + (my - sy) * k);
  } else {
    ctx.lineTo(mx, my);
    const k = (drawn - d1) / Math.max(d2, 1);
    ctx.lineTo(mx + (ex - mx) * k, my + (ey - my) * k);
  }
  ctx.stroke();
  ctx.restore();
}

function nameStroke(u: number) {
  return Math.max(4.2, 0.074 * 86 * u);
}

function titleStroke(u: number) {
  return Math.max(2.8, 0.12 * 30 * u);
}

type Box = { width: number; height: number };

type SlashMetrics = Box & {
  person: Person;
  titleLines: string[];
  nameSize: number;
  titleSize: number;
  nameW: number;
  titleW: number;
  slashW: number;
  slashH: number;
  gap: number;
  pad: number;
};

function measureSlash(
  ctx: CanvasRenderingContext2D,
  person: Person,
  cfg: RenderConfig,
): SlashMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  let nameSize = 86 * nu;
  const titleSize = 30 * tu;
  const pad = 8 * nu;
  const gap = 14 * nu;
  ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
  let nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
  while (nameW > 720 * nu && nameSize > 48 * nu) {
    nameSize *= 0.94;
    ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
    nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
  }
  const slashW = Math.max(10, nameSize * 0.14);
  const slashH = nameSize;
  const ns = nameStroke(nu);
  ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
  const titleLines = packTitle(person.title, person.titleLines ?? 1);
  const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
  const titleH = titleBlockH(titleLines.length, titleSize);
  const top = isTopAlign(cfg);
  const topW = top
    ? nameW + 24 * nu + slashW + 22 * nu + titleW
    : nameW + 24 * nu + slashW + slashH * 0.38 + 20 * nu;
  const width = Math.max(topW, top ? topW : titleW) + pad * 2 + ns;
  const height = top
    ? pad + Math.max(nameSize, titleH) + 18 * nu + pad
    : pad + nameSize + ns + gap + gap + titleH + pad;
  return {
    person,
    titleLines,
    nameSize,
    titleSize,
    nameW,
    titleW,
    slashW,
    slashH,
    gap,
    pad,
    width,
    height,
  };
}

function drawSlashPlate(
  ctx: CanvasRenderingContext2D,
  m: SlashMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);

  const flip = isRightAlign(cfg);
  const top = isTopAlign(cfg);
  const nameTop = m.pad;
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);

  let nameX: number;
  let slashX: number;
  let titleAnchor: number;
  if (top) {
    const nameOnRight = cfg.side === "right";
    if (nameOnRight) {
      titleAnchor = m.pad;
      slashX = titleAnchor + m.titleW + 22 * nu;
      nameX = slashX + m.slashW + 22 * nu;
    } else {
      nameX = m.pad;
      slashX = nameX + m.nameW + 22 * nu;
      titleAnchor = slashX + m.slashW + 22 * nu;
    }
  } else {
    nameX = flip ? m.width - m.pad - m.nameW : m.pad;
    slashX = flip ? nameX - 22 * nu - m.slashW : nameX + m.nameW + 22 * nu;
    titleAnchor = m.pad;
  }
  const slashY = nameTop + (m.nameSize - m.slashH) / 2;

  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });

  withXform(ctx, m.person, "slash", slashX + m.slashW * 0.5, slashY + m.slashH * 0.5, () => {
    drawBlueSlash(ctx, slashX, slashY, m.slashW, m.slashH, motion.bar, flip || (top && cfg.side === "right"));
  });

  const rowBottom = nameTop + (top ? Math.max(m.nameSize, titleH) : m.nameSize + ns * 0.35);
  const lineY = rowBottom + m.gap;
  let lineStart: number;
  let lineEnd: number;
  if (top) {
    lineStart = m.pad;
    lineEnd = m.width - m.pad;
  } else {
    const span = titleLineSpan(flip, m.pad, m.width - m.pad, m.titleW);
    lineStart = span.l;
    lineEnd = span.r;
  }
  withXform(ctx, m.person, "band", (lineStart + lineEnd) * 0.5, lineY, () => {
    drawHairline(ctx, lineStart, lineEnd, lineY, motion.bar, Math.max(1.2, 0.018 * m.nameSize), flip ? "right" : "left");
  });

  withXform(ctx, m.person, "title", titleAnchor + m.titleW * 0.5, (top ? nameTop : lineY + m.gap) + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    let ty = top ? nameTop : lineY + m.gap;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = top
        ? titleAnchor
        : flip
          ? m.width - m.pad - lw
          : m.pad;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, tsStroke);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

type BandMetrics = Box & {
  person: Person;
  titleLines: string[];
  nameSize: number;
  titleSize: number;
  nameW: number;
  titleW: number;
  bandH: number;
  bandW: number;
  slashW: number;
  skew: number;
  padX: number;
  padY: number;
};

function measureBand(
  ctx: CanvasRenderingContext2D,
  person: Person,
  cfg: RenderConfig,
): BandMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const nameSize = 78 * nu;
  const titleSize = 28 * tu;
  const inset = Math.max(8, titleStroke(tu) + 5);
  const padX = inset;
  const padY = 12 * tu;
  ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
  const nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
  ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
  const titleLines = packTitle(person.title, person.titleLines ?? 1);
  const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
  const titleH = titleBlockH(titleLines.length, titleSize);
  const bandH = padY + titleH - titleSize * 0.28 + padY;
  const slashW = Math.max(14, bandH * 0.28);
  const skew = bandH * 0.28;
  const bandW = titleW + padX * 2;
  return {
    person,
    titleLines,
    nameSize,
    titleSize,
    nameW,
    titleW,
    bandH,
    bandW,
    slashW,
    skew,
    padX,
    padY,
    width: Math.max(nameW, slashW + bandW + Math.abs(skew)) + 12 * nu,
    height: nameSize + 16 * nu + bandH,
  };
}

function drawBandPlate(
  ctx: CanvasRenderingContext2D,
  m: BandMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);

  const flip = isRightAlign(cfg);
  const skew = (flip ? -1 : 1) * m.skew * motion.bar;
  const bandY = m.nameSize + 16 * nu;
  const slashX = flip ? m.bandW : 0;
  const bandX = flip ? 0 : m.slashW;
  const inner = paraInner(bandX, m.bandW, m.bandH, skew, m.padY + m.titleSize * 0.15, m.padX);
  const nameX = flip ? inner.right - m.nameW : inner.left;

  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, 0, tracking, PALETTE.name, ns);
    ctx.restore();
  });

  withXform(ctx, m.person, "band", bandX + m.bandW * 0.5, bandY + m.bandH * 0.5, () => {
    ctx.save();
    ctx.globalAlpha *= motion.bar;
    ctx.fillStyle = PALETTE.band;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 12;
    fillSkew(ctx, bandX, bandY, m.bandW, m.bandH, skew);
    ctx.restore();
  });

  withXform(ctx, m.person, "slash", slashX + m.slashW * 0.5, bandY + m.bandH * 0.5, () => {
    drawBlueSlash(
      ctx,
      slashX,
      bandY + m.padY * 0.15,
      m.slashW,
      m.bandH - m.padY * 0.3,
      motion.bar,
      flip,
    );
  });

  withXform(ctx, m.person, "title", bandX + m.bandW * 0.5, bandY + m.bandH * 0.5, () => {
    ctx.save();
    clipSkew(ctx, bandX, bandY, m.bandW, m.bandH, skew);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    let ty = bandY + m.padY;
    let yOff = m.padY;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const edge = paraInner(bandX, m.bandW, m.bandH, skew, yOff + m.titleSize * 0.15, m.padX);
      const tx = flip ? edge.right - lw : edge.left;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, tsStroke);
      ty += m.titleSize * 1.28;
      yOff += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

type BarMetrics = Box & {
  person: Person;
  titleLines: string[];
  nameSize: number;
  titleSize: number;
  nameW: number;
  titleW: number;
  barH: number;
  barW: number;
  skew: number;
  padX: number;
  padY: number;
  slashW: number;
  slashH: number;
};

function measureBar(
  ctx: CanvasRenderingContext2D,
  person: Person,
  cfg: RenderConfig,
): BarMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const nameSize = 82 * nu;
  const titleSize = 28 * tu;
  const inset = Math.max(8, titleStroke(tu) + 5);
  const padX = inset;
  const padY = 12 * tu;
  const slashW = Math.max(10, nameSize * 0.12);
  const slashH = nameSize * 0.32;
  ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
  const nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
  ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
  const titleLines = packTitle(person.title, person.titleLines ?? 1);
  const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
  const titleH = titleBlockH(titleLines.length, titleSize);
  const top = isTopAlign(cfg);
  const barH = top
    ? Math.max(8 * nu, 10)
    : padY + titleH - titleSize * 0.28 + padY;
  const skew = barH * 0.32;
  const rowW = top
    ? nameW + 28 * nu + slashW * 2 + 18 * nu + titleW
    : nameW + 28 * nu + slashW * 2 + 18 * nu;
  const barW = top ? rowW + padX : titleW + padX * 2;
  return {
    person,
    titleLines,
    nameSize,
    titleSize,
    nameW,
    titleW,
    barH,
    barW,
    skew,
    padX,
    padY,
    slashW,
    slashH,
    width: Math.max(rowW, barW + Math.abs(skew)) + 8 * nu,
    height: top ? Math.max(nameSize, titleH) + 12 * nu + barH : nameSize + 16 * nu + barH,
  };
}

function drawBarPlate(
  ctx: CanvasRenderingContext2D,
  m: BarMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const flip = isRightAlign(cfg);
  const top = isTopAlign(cfg);
  const nameOnRight = top && cfg.side === "right";
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);

  let nameX: number;
  let slashX: number;
  let titleX0: number;
  const nameTop = 0;
  if (top) {
    if (nameOnRight) {
      titleX0 = 8 * nu;
      slashX = titleX0 + m.titleW + 18 * nu;
      nameX = slashX + m.slashW * 2 + 20 * nu;
    } else {
      nameX = 8 * nu;
      slashX = nameX + m.nameW + 20 * nu;
      titleX0 = slashX + m.slashW * 2 + 18 * nu;
    }
  } else {
    nameX = 0;
    slashX = 0;
    titleX0 = 0;
  }

  const barY = nameTop + (top ? Math.max(m.nameSize, titleH) + 12 * nu : m.nameSize + 16 * nu);
  const skew = ((flip || nameOnRight) ? -1 : 1) * m.skew * motion.bar;
  const barX = flip || nameOnRight ? m.width - m.barW : 0;
  const inner = paraInner(barX, m.barW, m.barH, skew, m.padY + m.titleSize * 0.15, m.padX);

  if (!top) {
    nameX = flip ? inner.right - m.nameW : inner.left;
    slashX = flip ? nameX - 22 * nu - m.slashW * 2 : nameX + m.nameW + 20 * nu;
  }

  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });

  const slashY = nameTop + (m.nameSize - m.slashH) / 2;
  withXform(ctx, m.person, "slash", slashX + m.slashW, slashY + m.slashH * 0.5, () => {
    drawBlueSlash(ctx, slashX, slashY, m.slashW, m.slashH, motion.bar, false);
    drawBlueSlash(ctx, slashX + m.slashW + 6 * nu, slashY, m.slashW, m.slashH, motion.bar, false);
  });

  if (top) {
    withXform(ctx, m.person, "title", titleX0 + m.titleW * 0.5, nameTop + m.titleSize * 0.5, () => {
      ctx.save();
      clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
      ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      let ty = nameTop;
      for (const line of m.titleLines) {
        paintTracked(ctx, line, titleX0, ty, 0, PALETTE.title, tsStroke);
        ty += m.titleSize * 1.28;
      }
      ctx.restore();
    });
  }

  withXform(ctx, m.person, "band", barX + m.barW * 0.5, barY + m.barH * 0.5, () => {
    ctx.save();
    ctx.globalAlpha *= motion.titleClip;
    ctx.fillStyle = PALETTE.band;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 10;
    fillSkew(ctx, barX, barY, m.barW, m.barH, skew);
    ctx.restore();
  });

  if (!top) {
    withXform(ctx, m.person, "title", barX + m.barW * 0.5, barY + m.barH * 0.5, () => {
      ctx.save();
      clipSkew(ctx, barX, barY, m.barW, m.barH, skew);
      ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      let ty = barY + m.padY;
      let yOff = m.padY;
      for (const line of m.titleLines) {
        const lw = ctx.measureText(line).width;
        const edge = paraInner(barX, m.barW, m.barH, skew, yOff + m.titleSize * 0.15, m.padX);
        const tx = flip ? edge.right - lw : edge.left;
        paintTracked(ctx, line, tx, ty, 0, PALETTE.title, tsStroke);
        ty += m.titleSize * 1.28;
        yOff += m.titleSize * 1.28;
      }
      ctx.restore();
    });
  }
  ctx.restore();
}

function titleCharStep(ch: string, titleSize: number, titleGap: number, last: boolean) {
  if (ch === "、") return titleSize * 0.42;
  if (ch === "·" || ch === " ") return titleSize * 0.7;
  return last ? titleSize : titleSize + titleGap;
}

function columnHeight(text: string, titleSize: number, titleGap: number) {
  let h = 0;
  const chars = [...text];
  chars.forEach((ch, i) => {
    h += titleCharStep(ch, titleSize, titleGap, i === chars.length - 1);
  });
  return h;
}

function paintTitleColumn(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  top: number,
  titleSize: number,
  titleGap: number,
  stroke: number,
  nudge: number,
) {
  let ty = top;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const last = i === chars.length - 1;
    if (ch === "、") {
      paintGlyph(ctx, "、", cx + nudge, ty - titleSize * 0.82, PALETTE.title, stroke * 0.7);
      ty += titleSize * 0.42;
      return;
    }
    paintGlyph(ctx, ch === " " ? "·" : ch, cx, ty, PALETTE.title, stroke);
    ty += titleCharStep(ch, titleSize, titleGap, last);
  });
}

type ColMetrics = Box & {
  person: Person;
  titleCols: string[];
  nameSize: number;
  titleSize: number;
  nameGap: number;
  titleGap: number;
  pad: number;
  nameH: number;
  titleH: number;
  slashH: number;
  slashW: number;
  gap: number;
  colGap: number;
};

function measureColumn(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const nameSize = 72 * nu;
  const titleSize = 28 * tu;
  const nameGap = 10 * nu;
  const titleGap = 6 * tu;
  const pad = 8 * nu;
  const gap = 14 * nu;
  const colGap = 10 * tu;
  const slashW = Math.max(14, nameSize * 0.22);
  const slashH = nameSize * 0.5;
  const nameH =
    person.name.length * (nameSize + nameGap) - (person.name.length ? nameGap : 0);
  const titleCols = packTitle(person.title, person.titleLines ?? 1);
  const titleH = Math.max(
    0,
    ...titleCols.map((col) => columnHeight(col, titleSize, titleGap)),
  );
  const cols = Math.max(titleCols.length, 1);
  const titleBlock = cols * titleSize * 1.15 + (cols - 1) * colGap;
  const sq = Math.max(6, 0.09 * nameSize);
  const nameStack = nameH + gap + slashH;
  return {
    person,
    titleCols,
    nameSize,
    titleSize,
    nameGap,
    titleGap,
    pad,
    nameH,
    titleH,
    slashH,
    slashW,
    gap,
    colGap,
    width: pad + nameSize + gap + 12 * nu + titleBlock + pad,
    height: pad + Math.max(nameStack, titleH) + 16 * nu + sq + pad,
  };
}

function colNameOnLeft(cfg: RenderConfig) {
  return cfg.side === "right";
}

function colInk(cfg: RenderConfig) {
  return nameStroke(nameU(cfg)) * 0.55;
}

function titleBlockW(m: ColMetrics) {
  const cols = Math.max(m.titleCols.length, 1);
  return cols * m.titleSize * 1.15 + (cols - 1) * m.colGap;
}

function measureColGutter(
  person: Person,
  cfg: RenderConfig,
  gutter: number,
  extra: { outer?: number; extraH?: number; extraW?: number } = {},
): ColMetrics {
  const m = measureColumn(person, cfg);
  const titleBlock = titleBlockW(m);
  const ink = colInk(cfg);
  const outer = extra.outer ?? 0;
  const extraH = extra.extraH ?? 0;
  const extraW = extra.extraW ?? 0;
  const body = Math.max(m.nameH, m.titleH) + extraH;
  return {
    ...m,
    slashW: gutter,
    slashH: body,
    width: m.pad + outer + m.nameSize + ink * 2 + gutter + titleBlock + m.pad + extraW,
    height: m.pad + body + m.pad,
  };
}

type ColPair = {
  nameOnLeft: boolean;
  nameCx: number;
  nameTop: number;
  firstCx: number;
  colPitch: number;
  gutterCx: number;
  titleBlock: number;
  bodyH: number;
  cols: number;
  outerX: number;
  nameHalf: number;
};

function layoutColPair(m: ColMetrics, cfg: RenderConfig, gutter: number, outer = 0): ColPair {
  const nameOnLeft = colNameOnLeft(cfg);
  const cols = Math.max(m.titleCols.length, 1);
  const titleBlock = titleBlockW(m);
  const colPitch = m.titleSize * 1.15 + m.colGap;
  const ink = colInk(cfg);
  const nameHalf = m.nameSize * 0.5 + ink;
  const nameCx = nameOnLeft
    ? m.pad + outer + nameHalf
    : m.width - m.pad - outer - nameHalf;
  const firstCx = nameOnLeft
    ? nameCx + nameHalf + gutter + m.titleSize * 0.5
    : nameCx - nameHalf - gutter - m.titleSize * 0.5;
  const gutterCx = nameOnLeft
    ? nameCx + nameHalf + gutter * 0.5
    : nameCx - nameHalf - gutter * 0.5;
  const outerX = nameOnLeft
    ? nameCx - nameHalf - Math.max(outer * 0.55, 8)
    : nameCx + nameHalf + Math.max(outer * 0.55, 8);
  return {
    nameOnLeft,
    nameCx,
    nameTop: m.pad,
    firstCx,
    colPitch,
    gutterCx,
    titleBlock,
    bodyH: Math.max(m.nameH, m.titleH),
    cols,
    outerX,
    nameHalf,
  };
}

function beginCol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  motion: PlateMotion,
) {
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
}

function paintColName(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  cfg: RenderConfig,
  nameCx: number,
  nameTop: number,
  motion: PlateMotion,
  ns: number,
) {
  withXform(ctx, m.person, "name", nameCx, nameTop + m.nameH * 0.5, () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, nameTop - 8, m.width + 40, Math.max(m.nameH * motion.nameClip, 4) + 16);
    ctx.clip();
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    let ny = nameTop;
    for (const ch of m.person.name) {
      paintGlyph(ctx, ch, nameCx, ny, PALETTE.name, ns);
      ny += m.nameSize + m.nameGap;
    }
    ctx.restore();
  });
}

function paintColTitles(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  cfg: RenderConfig,
  layout: ColPair,
  motion: PlateMotion,
  tsStroke: number,
  tu: number,
  titleTop = layout.nameTop,
) {
  withXform(ctx, m.person, "title", layout.firstCx, titleTop + m.titleH * 0.5, () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, titleTop - 8, m.width + 40, Math.max(m.titleH * motion.titleClip, 4) + 16);
    ctx.clip();
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    m.titleCols.forEach((col, i) => {
      const cx = layout.nameOnLeft
        ? layout.firstCx + i * layout.colPitch
        : layout.firstCx - i * layout.colPitch;
      paintTitleColumn(ctx, col, cx, titleTop, m.titleSize, m.titleGap, tsStroke, 3 * tu);
    });
    ctx.restore();
  });
}

type PanelMetrics = Box & {
  person: Person;
  titleLines: string[];
  nameSize: number;
  titleSize: number;
  nameW: number;
  titleW: number;
  pad: number;
  gap: number;
  radius: number;
  strip: number;
  first: string;
  rest: string;
  restW: number;
  box: number;
};

function measurePanel(ctx: CanvasRenderingContext2D, person: Person, cfg: RenderConfig): PanelMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const nameSize = 68 * nu;
  const titleSize = 26 * tu;
  const pad = 18 * nu;
  const gap = 8 * nu;
  const radius = 14 * nu;
  const strip = 8 * nu;
  const chars = [...person.name];
  const first = chars[0] ?? "";
  const rest = chars.slice(1).join("");
  ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
  const tracking = nameTracking(person.name) * nu;
  const nameW = trackedWidth(ctx, person.name, tracking);
  const restTrack = nameTracking(rest) * nu;
  const restW = rest ? trackedWidth(ctx, rest, restTrack) : 0;
  ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
  const titleLines = packTitle(person.title, person.titleLines ?? 1);
  const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
  const titleH = titleBlockH(titleLines.length, titleSize);
  const box = nameSize * 1.18;
  let width = pad * 2 + Math.max(nameW, titleW);
  let height = pad + nameSize + gap + titleH + pad;
  if (cfg.style === "card") {
    width = strip + pad + Math.max(nameW, titleW) + pad;
  } else if (cfg.style === "pill") {
    height = pad * 0.85 + nameSize * 0.92 + gap + titleH + pad * 0.85;
    width = pad * 1.4 + Math.max(nameW, titleW) + pad * 1.4;
  } else if (cfg.style === "stack") {
    width = Math.max(nameW + pad * 2, titleW + pad * 2);
    height = nameSize * 1.22 + 5 * nu + pad * 0.7 + titleH + pad * 0.7;
  } else if (cfg.style === "rail") {
    width = 12 * nu + 16 * nu + Math.max(nameW, titleW);
    height = nameSize + gap + titleH;
  } else if (cfg.style === "badge") {
    width = box + 16 * nu + Math.max(restW, titleW, 8);
    height = Math.max(box, (box + nameSize) / 2 + gap + titleH);
  }
  return {
    person,
    titleLines,
    nameSize,
    titleSize,
    nameW,
    titleW,
    pad,
    gap,
    radius,
    strip,
    first,
    rest,
    restW,
    box,
    width,
    height,
  };
}

function drawCardPlate(
  ctx: CanvasRenderingContext2D,
  m: PanelMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const w = m.width * Math.max(motion.bar, 0.08);
  const cardX = flip ? m.width - w : 0;
  withXform(ctx, m.person, "band", cardX + w * 0.5, m.height * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.band;
    fillRound(ctx, cardX, 0, w, m.height, m.radius);
    ctx.restore();
  });
  const stripX = flip ? cardX + w - m.strip : cardX;
  withXform(ctx, m.person, "slash", stripX + m.strip * 0.5, m.height * 0.5, () => {
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(stripX, 0, m.strip, m.height);
  });
  const innerL = flip ? cardX + m.pad : cardX + m.strip + m.pad;
  const innerR = flip ? cardX + w - m.strip - m.pad : cardX + w - m.pad;
  withXform(ctx, m.person, "name", (innerL + innerR) * 0.5, m.pad + m.nameSize * 0.5, () => {
    ctx.save();
    clipRound(ctx, cardX, 0, w, m.height, m.radius);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    clipReveal(ctx, cardX, 0, w, m.height, motion.nameClip, side);
    const nx = flip ? innerR - m.nameW : innerL;
    paintTracked(ctx, m.person.name, nx, m.pad, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", (innerL + innerR) * 0.5, m.pad + m.nameSize + m.gap + m.titleSize * 0.5, () => {
    ctx.save();
    clipRound(ctx, cardX, 0, w, m.height, m.radius);
    clipReveal(ctx, cardX, 0, w, m.height, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = m.pad + m.nameSize + m.gap;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? innerR - lw : innerL;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawPillPlate(
  ctx: CanvasRenderingContext2D,
  m: PanelMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const w = m.width * Math.max(motion.bar, 0.12);
  const px = flip ? m.width - w : 0;
  const r = m.height / 2;
  withXform(ctx, m.person, "band", px + w * 0.5, m.height * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.band;
    fillRound(ctx, px, 0, w, m.height, r);
    ctx.restore();
  });
  const tick = Math.max(8, 10 * nu);
  const tickX = flip ? px + w - m.pad * 0.7 - tick : px + m.pad * 0.55;
  withXform(ctx, m.person, "slash", tickX + tick * 0.5, m.height * 0.5, () => {
    ctx.fillStyle = PALETTE.accent;
    fillRound(ctx, tickX, m.height * 0.28, tick, m.height * 0.44, tick / 2);
  });
  const innerL = px + m.pad * 1.15 + (flip ? 0 : tick * 0.2);
  const innerR = px + w - m.pad * 1.15;
  const ny = m.pad * 0.7;
  withXform(ctx, m.person, "name", (innerL + innerR) * 0.5, ny + m.nameSize * 0.5, () => {
    ctx.save();
    clipRound(ctx, px, 0, w, m.height, r);
    clipReveal(ctx, px, 0, w, m.height, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const nx = flip ? innerR - m.nameW : innerL;
    paintTracked(ctx, m.person.name, nx, ny, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", (innerL + innerR) * 0.5, ny + m.nameSize, () => {
    ctx.save();
    clipRound(ctx, px, 0, w, m.height, r);
    clipReveal(ctx, px, 0, w, m.height, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = ny + m.nameSize * 0.92 + m.gap;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? innerR - lw : innerL;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawStackPlate(
  ctx: CanvasRenderingContext2D,
  m: PanelMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  const nameH = m.nameSize * 1.22;
  const titleH = m.pad * 0.7 + titleBlockH(m.titleLines.length, m.titleSize) + m.pad * 0.7;
  const nameW = Math.min(m.width, m.nameW + m.pad * 2);
  const titleW = Math.min(m.width, Math.max(m.titleW + m.pad * 2, nameW * 0.92));
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const nameBarW = nameW * Math.max(motion.bar, 0.1);
  const titleBarW = titleW * Math.max(motion.bar, 0.1);
  const nx0 = flip ? m.width - nameBarW : 0;
  const tx0 = flip ? m.width - titleBarW : 0;
  withXform(ctx, m.person, "slash", nx0 + nameBarW * 0.5, nameH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(nx0, 0, nameBarW, nameH);
    ctx.restore();
  });
  withXform(ctx, m.person, "band", tx0 + titleBarW * 0.5, nameH + 5 * nu + titleH * 0.5, () => {
    ctx.fillStyle = PALETTE.band;
    ctx.fillRect(tx0, nameH + 5 * nu, titleBarW, titleH);
  });
  withXform(ctx, m.person, "name", nx0 + nameBarW * 0.5, nameH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, nx0, 0, nameBarW, nameH, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const nameX = flip ? nx0 + nameBarW - m.pad - m.nameW : nx0 + m.pad;
    paintTracked(ctx, m.person.name, nameX, nameH / 2, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", tx0 + titleBarW * 0.5, nameH + 5 * nu + titleH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, tx0, nameH + 5 * nu, titleBarW, titleH, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = nameH + 5 * nu + m.pad * 0.7;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? tx0 + titleBarW - m.pad - lw : tx0 + m.pad;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawRailPlate(
  ctx: CanvasRenderingContext2D,
  m: PanelMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  const railW = 12 * nu;
  const gap = 16 * nu;
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const railH = m.height * Math.max(motion.bar, 0.08);
  const railX = flip ? m.width - railW : 0;
  withXform(ctx, m.person, "slash", railX + railW * 0.5, railH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = PALETTE.accent;
    fillRound(ctx, railX, 0, railW, railH, 3);
    ctx.restore();
  });
  const textX0 = flip ? 0 : railW + gap;
  const textRight = flip ? m.width - railW - gap : m.width;
  withXform(ctx, m.person, "name", flip ? textRight - m.nameW * 0.5 : textX0 + m.nameW * 0.5, m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, 0, 0, m.width, m.height, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const nx = flip ? textRight - m.nameW : textX0;
    paintTracked(ctx, m.person.name, nx, 0, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", flip ? textRight - m.titleW * 0.5 : textX0 + m.titleW * 0.5, m.nameSize + m.gap + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, 0, 0, m.width, m.height, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = m.nameSize + m.gap;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? textRight - lw : textX0;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawBadgePlate(
  ctx: CanvasRenderingContext2D,
  m: PanelMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const restTrack = nameTracking(m.rest) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
  const box = m.box;
  const gap = 16 * nu;
  const boxX = flip ? m.width - box : 0;
  const s = Math.max(motion.bar, 0.08);
  withXform(ctx, m.person, "slash", boxX + box * 0.5, box * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(boxX + (1 - s) * box * 0.5, (1 - s) * box * 0.5, box * s, box * s);
    ctx.restore();
  });
  const colX = flip ? 0 : box + gap;
  const colR = flip ? m.width - box - gap : m.width;
  withXform(ctx, m.person, "name", boxX + box * 0.5, box * 0.5, () => {
    ctx.save();
    clipReveal(ctx, boxX, 0, box, box, motion.nameClip, side);
    ctx.font = `600 ${m.nameSize * 0.78}px ${nameFace(cfg)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    paintGlyph(ctx, m.first, boxX + box / 2, box / 2, PALETTE.name, ns);
    ctx.restore();
    ctx.save();
    clipReveal(ctx, 0, 0, m.width, m.height, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (m.rest) {
      const rx = flip ? colR - m.restW : colX;
      paintTracked(ctx, m.rest, rx, (box - m.nameSize) / 2, restTrack, PALETTE.name, ns);
    }
    ctx.restore();
  });
  withXform(ctx, m.person, "title", flip ? colR - m.titleW * 0.5 : colX + m.titleW * 0.5, box, () => {
    ctx.save();
    clipReveal(ctx, 0, 0, m.width, m.height, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = Math.max(box - titleBlockH(m.titleLines.length, m.titleSize), m.nameSize + 6 * nu);
    if (!m.rest) ty = box + 8 * nu;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? colR - lw : colX;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

type LineMetrics = Box & {
  person: Person;
  titleLines: string[];
  nameSize: number;
  titleSize: number;
  nameW: number;
  titleW: number;
  pad: number;
  gap: number;
  sq: number;
  ruleW: number;
  barH: number;
  skew: number;
  lineW: number;
};

function measureLine(
  ctx: CanvasRenderingContext2D,
  person: Person,
  cfg: RenderConfig,
): LineMetrics {
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const nameSize = 78 * nu;
  const titleSize = 28 * tu;
  const pad = 10 * nu;
  const gap = 12 * nu;
  ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
  const tracking = nameTracking(person.name) * nu;
  const nameW = trackedWidth(ctx, person.name, tracking);
  ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
  const titleLines = packTitle(person.title, person.titleLines ?? 1);
  const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
  const titleH = titleBlockH(titleLines.length, titleSize);
  const sq = Math.max(16, nameSize * 0.34);
  const ruleW = Math.max(8, nameSize * 0.1);
  const barH = nameSize * 1.18;
  const skew = barH * 0.42;
  let width = pad * 2 + Math.max(nameW, titleW);
  let height = pad + nameSize + gap + titleH + pad;
  let lineW = Math.max(nameW * 1.28, titleW);
  const style = cfg.style;
  if (style === "underline") {
    const beside = titleLines.length >= 2;
    const firstW = beside ? ctx.measureText(titleLines[0] ?? "").width : 0;
    const rowW = beside ? nameW + 18 * nu + firstW : nameW;
    lineW = Math.max(titleW, 8);
    width = pad * 2 + Math.max(rowW, titleW, nameW);
    height = pad + nameSize + gap + 3 + gap + titleH + pad;
  } else if (style === "block") {
    lineW = Math.max(titleW, 8);
    width = pad + sq + 28 * nu + Math.max(nameW, titleW) + pad;
    height = pad + nameSize + gap + 3 + gap + titleH + pad;
  } else if (style === "rule") {
    const titleBarH = titleH + 16 * tu;
    width = ruleW + 16 * nu + Math.max(nameW, titleW + 28 * nu) + pad;
    height = nameSize + 10 * nu + titleBarH;
  } else if (style === "split") {
    width = pad + nameW + 18 * nu + 2 + 18 * nu + titleW + pad;
    height = pad + Math.max(nameSize, titleH) + pad;
  } else if (style === "skew") {
    const besideW = titleLines.length ? ctx.measureText(titleLines[0] ?? "").width : 0;
    const restH = titleLines.length > 1 ? titleBlockH(titleLines.length - 1, titleSize) : 0;
    width = nameW + 36 * nu + Math.abs(skew) + 18 * nu + Math.max(besideW, titleW) + pad;
    height = barH + gap + 3 + (restH ? gap + restH : 10 * nu);
    lineW = Math.max(titleW, 8);
  } else if (style === "wave") {
    lineW = Math.max(titleW, 8);
    const amp = Math.max(14, Math.min(28, lineW * 0.055));
    width = pad * 2 + Math.max(nameW, titleW);
    height = pad + nameSize + 6 * nu + titleH + 14 * nu + amp + amp * 1.35 + 12 * nu + pad;
  } else if (style === "bracket") {
    width = 16 * nu + Math.max(nameW, titleW) + 16 * nu;
    height = 12 * nu + nameSize + 6 * nu + titleH + 12 * nu;
  } else if (style === "duo") {
    const slashLen = nameSize * 0.82;
    width = pad * 2 + Math.max(nameW + 22 * nu + slashLen * 0.55, titleW);
    height = pad + nameSize + gap + titleH + 14 * nu + pad;
    lineW = Math.max(titleW, 8);
  } else if (style === "hook") {
    width = pad + 28 * nu + Math.max(nameW, titleW) + pad;
    height = pad + 16 * nu + nameSize + gap + 3 + gap + titleH + pad;
    lineW = Math.max(nameW, titleW);
  } else if (style === "ledge") {
    width = pad + 18 * nu + Math.max(nameW, titleW) + pad;
    height = pad + nameSize + gap + titleH + pad;
    lineW = nameSize;
  } else if (style === "fold") {
    const glyph = nameSize * 1.08;
    const slashRun = 36 * nu;
    width = pad + glyph + slashRun + 18 * nu + titleW + pad;
    height = pad + glyph + 20 * nu + glyph + pad;
    if (titleH + 12 * nu > height - pad * 2) {
      height = pad * 2 + Math.max(glyph * 2 + 20 * nu, titleH + 12 * nu);
    }
    lineW = glyph * 1.7;
  }
  return {
    person,
    titleLines,
    nameSize,
    titleSize,
    nameW,
    titleW,
    pad,
    gap,
    sq,
    ruleW,
    barH,
    skew,
    lineW,
    width,
    height,
  };
}

function beginPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
) {
  ctx.save();
  ctx.globalAlpha = motion.opacity;
  ctx.translate(x + motion.x, y + motion.y);
}

function drawUnderlinePlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  const beside = m.titleLines.length >= 2;
  beginPlate(ctx, m, x, y, motion);
  const nameTop = m.pad;
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad;
  let firstTitleW = 0;
  if (beside) {
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    firstTitleW = ctx.measureText(m.titleLines[0] ?? "").width;
  }
  const firstTitleX = flip
    ? nameX - 16 * nu - firstTitleW
    : nameX + m.nameW + 16 * nu;
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  if (beside) {
    withXform(ctx, m.person, "title", firstTitleX + firstTitleW * 0.5, nameTop + m.nameSize * 0.62, () => {
      ctx.save();
      clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
      ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      paintTracked(ctx, m.titleLines[0] ?? "", firstTitleX, nameTop + m.nameSize * 0.82, 0, PALETTE.title, ts);
      ctx.restore();
    });
  }
  const lineY = nameTop + m.nameSize + m.gap * 0.55;
  const span = titleLineSpan(flip, m.pad, m.width - m.pad, m.lineW);
  withXform(ctx, m.person, "band", (span.l + span.r) * 0.5, lineY, () => {
    drawHairline(ctx, span.l, span.r, lineY, motion.bar, Math.max(1.4, 0.02 * m.nameSize), flip ? "right" : "left");
  });
  const rest = beside ? m.titleLines.slice(1) : m.titleLines;
  withXform(ctx, m.person, "title", m.width * 0.5, lineY + m.gap + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = lineY + m.gap * 0.7;
    for (const line of rest) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? m.width - m.pad - lw : m.pad;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawBlockPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const nameTop = m.pad;
  const sq = m.sq;
  const sqY = nameTop + m.nameSize - sq * 0.7;
  const sqX = flip ? m.width - m.pad - sq : m.pad;
  const nameX = flip ? sqX - 28 * nu - m.nameW : sqX + sq + 28 * nu;
  withXform(ctx, m.person, "slash", sqX + sq * 0.5, sqY + sq * 0.5, () => {
    drawBlueSquare(ctx, sqX, sqY, sq, motion.bar);
  });
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const lineY = sqY + sq;
  const span = titleLineSpan(flip, nameX, nameX + m.nameW, m.titleW);
  withXform(ctx, m.person, "band", (span.l + span.r) * 0.5, lineY, () => {
    drawHairline(ctx, span.l, span.r, lineY, motion.bar, Math.max(1.4, 0.018 * m.nameSize), flip ? "right" : "left");
  });
  withXform(ctx, m.person, "title", nameX + m.nameW * 0.5, lineY + m.gap + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = lineY + m.gap * 0.65;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? nameX + m.nameW - lw : nameX;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawRulePlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const ruleW = m.ruleW;
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);
  const titleBarH = titleH + 16 * tu;
  const titleBarW = (m.titleW + 28 * nu) * Math.max(motion.bar, 0.08);
  const ruleH = m.height * Math.max(motion.bar, 0.08);
  const ruleX = flip ? m.width - ruleW : 0;
  const textX0 = flip ? 0 : ruleW + 16 * nu;
  const textRight = flip ? m.width - ruleW - 16 * nu : m.width;
  withXform(ctx, m.person, "slash", ruleX + ruleW * 0.5, ruleH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(ruleX, 0, ruleW, ruleH);
    ctx.restore();
  });
  withXform(ctx, m.person, "name", flip ? textRight - m.nameW * 0.5 : textX0 + m.nameW * 0.5, m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, 0, 0, m.width, m.height, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const nx = flip ? textRight - m.nameW : textX0;
    paintTracked(ctx, m.person.name, nx, 0, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const barY = m.nameSize + 8 * nu;
  const barX = flip ? textRight - titleBarW : textX0;
  withXform(ctx, m.person, "band", barX + titleBarW * 0.5, barY + titleBarH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = PALETTE.band;
    ctx.fillRect(barX, barY, titleBarW, titleBarH);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", barX + titleBarW * 0.5, barY + titleBarH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, barX, barY, titleBarW, titleBarH, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = barY + 8 * tu;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? barX + titleBarW - 14 * nu - lw : barX + 14 * nu;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawSplitPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);
  const rowH = Math.max(m.nameSize, titleH);
  const nameY = m.pad + (rowH - m.nameSize) / 2;
  const titleY = m.pad + (rowH - titleH) / 2;
  const divH = rowH * Math.max(motion.bar, 0.08);
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad;
  const titleX0 = flip ? m.pad : m.pad + m.nameW + 18 * nu + 2 + 18 * nu;
  const divX = flip ? nameX - 18 * nu - 1 : nameX + m.nameW + 18 * nu;
  withXform(ctx, m.person, "slash", divX, m.pad + rowH * 0.5, () => {
    ctx.save();
    ctx.fillStyle = PALETTE.accent;
    ctx.globalAlpha *= motion.bar;
    ctx.fillRect(divX, m.pad + (rowH - divH) / 2, Math.max(2, 0.028 * m.nameSize), divH);
    ctx.restore();
  });
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameY + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameY, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "title", titleX0 + m.titleW * 0.5, titleY + titleH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleY;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? titleX0 : titleX0;
      const aligned = flip ? titleX0 + m.titleW - lw : tx;
      paintTracked(ctx, line, aligned, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawSkewPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const barH = m.barH;
  const barW = (m.nameW + 36 * nu) * Math.max(motion.bar, 0.1);
  const skew = (flip ? -1 : 1) * m.skew * motion.bar;
  const barX = flip ? m.width - barW - Math.abs(m.skew) : 0;
  ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
  const first = m.titleLines[0] ?? "";
  const firstW = first ? ctx.measureText(first).width : 0;
  const rest = m.titleLines.slice(1);
  withXform(ctx, m.person, "band", barX + barW * 0.5, barH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.band;
    fillSkew(ctx, barX, 0, barW, barH, skew);
    ctx.restore();
  });
  const inner = paraInner(barX, barW, barH, skew, barH * 0.5, 16 * nu);
  withXform(ctx, m.person, "name", barX + barW * 0.5, barH * 0.5, () => {
    ctx.save();
    clipSkew(ctx, barX, 0, barW, barH, skew);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const nx = flip ? inner.right - m.nameW : inner.left;
    paintTracked(ctx, m.person.name, nx, barH / 2, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const titleX = flip
    ? barX - 16 * nu - firstW
    : barX + barW + Math.abs(skew) + 16 * nu;
  withXform(ctx, m.person, "title", titleX + firstW * 0.5, barH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "middle";
    if (first) paintTracked(ctx, first, titleX, barH / 2, 0, PALETTE.title, ts);
    ctx.restore();
  });
  const lineY = barH + 6 * nu;
  const titleLeft = flip ? titleX + firstW - m.lineW : titleX;
  const titleRight = titleLeft + m.lineW;
  withXform(ctx, m.person, "slash", (titleLeft + titleRight) * 0.5, lineY, () => {
    drawHairline(ctx, titleLeft, titleRight, lineY, motion.bar, Math.max(1.4, 0.018 * m.nameSize), flip ? "right" : "left");
  });
  if (rest.length) {
    withXform(ctx, m.person, "title", titleLeft + m.titleW * 0.5, lineY + m.gap + m.titleSize * 0.5, () => {
      ctx.save();
      clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
      ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
      ctx.textBaseline = "top";
      let ty = lineY + m.gap * 0.7;
      for (const line of rest) {
        const lw = ctx.measureText(line).width;
        const tx = flip ? titleRight - lw : titleLeft;
        paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
        ty += m.titleSize * 1.28;
      }
      ctx.restore();
    });
  }
  ctx.restore();
}

function drawWavePlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const nameTop = m.pad;
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad;
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const titleTop = nameTop + m.nameSize + 6 * nu;
  withXform(ctx, m.person, "title", nameX + m.titleW * 0.5, titleTop + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? m.width - m.pad - lw : m.pad;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);
  const amp = Math.max(14, Math.min(28, m.lineW * 0.055));
  const waveY = titleTop + titleH + 14 * nu + amp;
  const waveL = flip ? m.width - m.pad - m.lineW : m.pad;
  withXform(ctx, m.person, "slash", waveL + m.lineW * 0.5, waveY, () => {
    drawWaveCurve(ctx, waveL, waveY, m.lineW, motion.bar, flip);
  });
  ctx.restore();
}

function drawBracketPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const thick = Math.max(3, 0.042 * m.nameSize);
  const arm = Math.max(14, 0.22 * m.nameSize);
  const inset = 8 * nu;
  withXform(ctx, m.person, "slash", m.width * 0.5, m.height * 0.5, () => {
    drawCornerBrackets(ctx, 0, 0, m.width, m.height, motion.bar, thick, arm);
  });
  const nameTop = 10 * nu;
  const nameX = flip ? m.width - inset - m.nameW : inset;
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const titleTop = nameTop + m.nameSize + 6 * nu;
  withXform(ctx, m.person, "title", nameX + m.titleW * 0.5, titleTop + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? m.width - inset - lw : inset;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawDuoPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const nameTop = m.pad;
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad;
  const slashLen = m.nameSize * 0.82;
  const slashThick = Math.max(3.2, m.nameSize * 0.055);
  const slashGap = Math.max(4.5, m.nameSize * 0.08);
  const slashCx = flip
    ? nameX - 16 * nu - slashLen * 0.18
    : nameX + m.nameW + 16 * nu + slashLen * 0.18;
  const slashCy = nameTop + m.nameSize * 0.48;
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "slash", slashCx, slashCy, () => {
    drawTwinBars(ctx, slashCx, slashCy, slashLen, slashThick, slashGap, 0.32, motion.bar);
  });
  const titleTop = nameTop + m.nameSize + m.gap * 0.7;
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);
  withXform(ctx, m.person, "title", m.width * 0.5, titleTop + titleH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? m.width - m.pad - lw : m.pad;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  const lineY = titleTop + titleH + 8 * nu;
  const span = titleLineSpan(flip, m.pad, m.width - m.pad, m.lineW);
  const thick = Math.max(2.2, 0.028 * m.nameSize);
  const dotR = Math.max(3.6, 0.045 * m.nameSize);
  const dia = Math.max(5.2, 0.07 * m.nameSize);
  withXform(ctx, m.person, "band", (span.l + span.r) * 0.5, lineY, () => {
    drawAccentLine(ctx, span.l, lineY, span.r, lineY, motion.bar, thick);
    if (flip) {
      drawDiamond(ctx, span.l, lineY, dia, motion.bar);
      drawDot(ctx, span.r, lineY, dotR, motion.bar);
    } else {
      drawDot(ctx, span.l, lineY, dotR, motion.bar);
      drawDiamond(ctx, span.r, lineY, dia, motion.bar);
    }
  });
  ctx.restore();
}

function drawHookPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const nameTop = m.pad + 16 * nu;
  const rail = 22 * nu;
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad + rail;
  const lineY = nameTop + m.nameSize + m.gap * 0.55;
  const contentW = Math.max(m.nameW, m.lineW);
  const lineL = flip ? m.width - m.pad - contentW : nameX;
  const lineR = flip ? nameX + m.nameW : nameX + contentW;
  const thick = Math.max(2.6, 0.034 * m.nameSize);
  const sx = flip ? lineR + 16 * nu : lineL - 18 * nu;
  const sy = nameTop - 20 * nu;
  const mx = flip ? lineR + 3 * nu : lineL - 3 * nu;
  const my = lineY;
  const ex = flip ? lineL : lineR;
  const ey = lineY;
  withXform(ctx, m.person, "slash", (lineL + lineR) * 0.5, (sy + my) * 0.5, () => {
    drawHookPath(ctx, sx, sy, mx, my, ex, ey, motion.bar, thick);
  });
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const titleTop = lineY + m.gap * 0.75;
  withXform(ctx, m.person, "title", m.width * 0.5, titleTop + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? lineR - lw : lineL;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawLedgePlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const tracking = nameTracking(m.person.name) * nu;
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const rail = 12 * nu;
  const nameTop = m.pad;
  const nameX = flip ? m.width - m.pad - m.nameW : m.pad + rail + 8 * nu;
  const tickX = flip ? nameX + m.nameW + 8 * nu : nameX - 8 * nu;
  const tickTop = nameTop + m.nameSize * 0.06;
  const tickBot = nameTop + m.nameSize * 0.94;
  const thick = Math.max(2.4, 0.032 * m.nameSize);
  withXform(ctx, m.person, "slash", tickX, (tickTop + tickBot) * 0.5, () => {
    drawAccentLine(ctx, tickX, tickTop, tickX, tickBot, motion.bar, thick);
  });
  withXform(ctx, m.person, "name", nameX + m.nameW * 0.5, nameTop + m.nameSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
    ctx.restore();
  });
  const titleTop = nameTop + m.nameSize + m.gap * 0.85;
  withXform(ctx, m.person, "title", m.width * 0.5, titleTop + m.titleSize * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? nameX + m.nameW - lw : nameX;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawFoldPlate(
  ctx: CanvasRenderingContext2D,
  m: LineMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const ts = titleStroke(tu);
  const flip = isRightAlign(cfg);
  beginPlate(ctx, m, x, y, motion);
  const glyph = m.nameSize * 1.08;
  const ends = nameEnds(m.person.name);
  const topY = m.pad;
  const botY = ends.last ? topY + glyph + 18 * nu : topY;
  const nameColX = flip ? m.width - m.pad - glyph : m.pad;
  const nameCx = nameColX + glyph * 0.5;
  const slashX1 = flip ? nameColX - 6 * nu : nameColX + glyph + 6 * nu;
  const slashY1 = topY + glyph * 0.1;
  const slashX2 = flip ? slashX1 - 24 * nu : slashX1 + 24 * nu;
  const slashY2 = (ends.last ? botY : topY) + glyph * 0.9;
  const titleH = titleBlockH(m.titleLines.length, m.titleSize);
  const titleX0 = flip ? m.pad : Math.max(slashX1, slashX2) + 14 * nu;
  const stackH = (ends.last ? botY + glyph : topY + glyph) - topY;
  const titleTop = topY + Math.max(0, (stackH - titleH) * 0.45);
  withXform(ctx, m.person, "name", nameCx, topY + stackH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
    ctx.font = `500 ${glyph}px ${nameFace(cfg)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (ends.first) paintGlyph(ctx, ends.first, nameCx, topY, PALETTE.name, ns);
    if (ends.last) paintGlyph(ctx, ends.last, nameCx, botY, PALETTE.name, ns);
    ctx.restore();
  });
  withXform(ctx, m.person, "slash", (slashX1 + slashX2) * 0.5, (slashY1 + slashY2) * 0.5, () => {
    drawAccentLine(ctx, slashX1, slashY1, slashX2, slashY2, motion.bar, Math.max(2.6, 0.034 * m.nameSize));
  });
  withXform(ctx, m.person, "title", titleX0 + m.titleW * 0.5, titleTop + titleH * 0.5, () => {
    ctx.save();
    clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
    ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
    ctx.textBaseline = "top";
    let ty = titleTop;
    for (const line of m.titleLines) {
      const lw = ctx.measureText(line).width;
      const tx = flip ? titleX0 + m.titleW - lw : titleX0;
      paintTracked(ctx, line, tx, ty, 0, PALETTE.title, ts);
      ty += m.titleSize * 1.28;
    }
    ctx.restore();
  });
  ctx.restore();
}

function measureFlag(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  const m = measureColumn(person, cfg);
  const sq = Math.max(20, m.nameSize * 0.42);
  const gutter = 28 * nu;
  const body = Math.max(sq + 8 * nu + m.nameH, m.titleH);
  return {
    ...measureColGutter(person, cfg, gutter, { extraH: sq + 8 * nu }),
    slashW: sq,
    slashH: body,
    height: m.pad + body + m.pad,
  };
}

function drawFlagPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 28 * nu;
  const sq = m.slashW;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  const lineW = Math.max(2.2, 0.03 * m.nameSize);
  const lineX = layout.gutterCx - lineW / 2;
  const sqX = layout.gutterCx - sq / 2;
  const sqY = m.pad;
  const nameTop = sqY + sq + 8 * nu;
  const titleTop = sqY + 4 * nu;
  const lineH = (sq + 8 * nu + Math.max(m.nameH, m.titleH)) * Math.max(motion.bar, 0.08);
  withXform(ctx, m.person, "slash", layout.gutterCx, sqY + lineH * 0.5, () => {
    drawBlueSquare(ctx, sqX, sqY, sq, motion.bar);
    ctx.save();
    ctx.fillStyle = PALETTE.line;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.fillRect(lineX, sqY + sq, lineW, Math.max(lineH - sq, 1));
    ctx.restore();
  });
  paintColName(ctx, m, cfg, layout.nameCx, nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu, titleTop);
  ctx.restore();
}

function measureVSplit(person: Person, cfg: RenderConfig): ColMetrics {
  const m = measureColumn(person, cfg);
  const cols = Math.max(m.titleCols.length, 1);
  const titleBlock = cols * m.titleSize * 1.15 + (cols - 1) * m.colGap;
  return {
    ...m,
    width: m.pad + Math.max(m.nameSize, titleBlock) + m.pad,
    height: m.pad + m.nameH + m.gap + 3 + m.gap + m.titleH + m.pad,
  };
}

function drawVSplitPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  beginCol(ctx, x, y, motion);
  const cx = m.width / 2;
  const nameTop = m.pad;
  const cols = Math.max(m.titleCols.length, 1);
  const colPitch = m.titleSize * 1.15 + m.colGap;
  const titleBlock = cols * m.titleSize * 1.15 + (cols - 1) * m.colGap;
  paintColName(ctx, m, cfg, cx, nameTop, motion, ns);
  const lineY = nameTop + m.nameH + m.gap;
  const lineW = Math.max(titleBlock, m.nameSize) * Math.max(motion.bar, 0.08);
  const growRight = cfg.side === "right";
  withXform(ctx, m.person, "slash", cx, lineY, () => {
    drawHairline(
      ctx,
      cx - lineW / 2,
      cx + lineW / 2,
      lineY,
      motion.bar,
      Math.max(1.6, 0.024 * m.nameSize),
      growRight ? "right" : "left",
    );
  });
  const titleTop = lineY + m.gap;
  const firstCx = cx - titleBlock / 2 + m.titleSize * 0.5;
  const dummy: ColPair = {
    nameOnLeft: true,
    nameCx: cx,
    nameTop,
    firstCx,
    colPitch,
    gutterCx: cx,
    titleBlock,
    bodyH: m.titleH,
    cols,
    outerX: cx,
    nameHalf: m.nameSize * 0.5,
  };
  paintColTitles(ctx, m, cfg, dummy, motion, tsStroke, tu, titleTop);
  ctx.restore();
}

function measureDuoCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 24 * nu, { extraH: 44 * nu });
}

function drawDuoColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 24 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  const slashLen = m.nameSize * 0.48;
  const slashThick = Math.max(3.2, m.nameSize * 0.055);
  const slashGap = Math.max(4.5, m.nameSize * 0.08);
  const slashCy = layout.nameTop + m.nameH + 10 * nu + slashLen * 0.5;
  const dia = Math.max(5.2, 0.07 * m.nameSize);
  const dotR = Math.max(3.4, 0.042 * m.nameSize);
  const lineY = slashCy + slashLen * 0.5 + 8 * nu;
  const lineW = Math.max(m.nameSize * 0.95, 28);
  const lineL = layout.nameCx - lineW * 0.5;
  const lineR = layout.nameCx + lineW * 0.5;
  withXform(ctx, m.person, "slash", layout.nameCx, slashCy, () => {
    drawTwinBars(ctx, layout.nameCx, slashCy, slashLen, slashThick, slashGap, 0.32, motion.bar);
  });
  withXform(ctx, m.person, "band", layout.nameCx, lineY, () => {
    drawAccentLine(ctx, lineL, lineY, lineR, lineY, motion.bar, Math.max(2, 0.028 * m.nameSize));
    if (layout.nameOnLeft) {
      drawDot(ctx, lineL, lineY, dotR, motion.bar);
      drawDiamond(ctx, lineR, lineY, dia, motion.bar);
    } else {
      drawDiamond(ctx, lineL, lineY, dia, motion.bar);
      drawDot(ctx, lineR, lineY, dotR, motion.bar);
    }
  });
  ctx.restore();
}

function measureHookCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 22 * nu, { outer: 32 * nu, extraH: 18 * nu });
}

function drawHookColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const outer = 32 * nu;
  const gutter = 22 * nu;
  const layout = layoutColPair(m, cfg, gutter, outer);
  beginCol(ctx, x, y, motion);
  const thick = Math.max(2.6, 0.034 * m.nameSize);
  const dir = layout.nameOnLeft ? -1 : 1;
  const hx = layout.outerX;
  const nameTop = layout.nameTop + 12 * nu;
  const sx = hx + dir * 18 * nu;
  const sy = nameTop - 16 * nu;
  const mx = hx;
  const my = nameTop + m.nameSize * 0.18;
  const ex = hx;
  const ey = nameTop + m.nameH;
  withXform(ctx, m.person, "slash", hx, (sy + ey) * 0.5, () => {
    drawHookPath(ctx, sx, sy, mx, my, ex, ey, motion.bar, thick);
  });
  paintColName(ctx, m, cfg, layout.nameCx, nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, { ...layout, nameTop }, motion, tsStroke, tu, nameTop);
  ctx.restore();
}

function measureVBar(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 28 * nu);
}

function drawVBarPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 28 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  const lineW = Math.max(2.2, 0.028 * m.nameSize);
  const lineH = layout.bodyH * Math.max(motion.bar, 0.08);
  withXform(ctx, m.person, "slash", layout.gutterCx, layout.nameTop + lineH * 0.5, () => {
    ctx.save();
    ctx.fillStyle = PALETTE.accent;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.fillRect(layout.gutterCx - lineW / 2, layout.nameTop, lineW, lineH);
    ctx.restore();
  });
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  ctx.restore();
}

function measureLedgeCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 22 * nu, { outer: 20 * nu });
}

function drawLedgeColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const outer = 20 * nu;
  const gutter = 22 * nu;
  const layout = layoutColPair(m, cfg, gutter, outer);
  beginCol(ctx, x, y, motion);
  const thick = Math.max(2.4, 0.032 * m.nameSize);
  const tickTop = layout.nameTop + m.nameSize * 0.08;
  const tickBot = layout.nameTop + m.nameH - m.nameSize * 0.08;
  withXform(ctx, m.person, "slash", layout.outerX, (tickTop + tickBot) * 0.5, () => {
    drawVHairline(ctx, layout.outerX, tickTop, tickBot, motion.bar, thick);
  });
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  ctx.restore();
}

function measureRuleCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  const ruleW = Math.max(8, 72 * nu * 0.1);
  return measureColGutter(person, cfg, 26 * nu, { extraW: ruleW + 16 * nu });
}

function drawRuleColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const ruleW = Math.max(8, m.nameSize * 0.1);
  const gutter = 26 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  const barX = layout.nameOnLeft ? m.width - ruleW : 0;
  const barH = m.height * Math.max(motion.bar, 0.08);
  withXform(ctx, m.person, "slash", barX + ruleW * 0.5, barH * 0.5, () => {
    ctx.save();
    ctx.fillStyle = PALETTE.accent;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.fillRect(barX, 0, ruleW, barH);
    ctx.restore();
  });
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  ctx.restore();
}

function measureSkewCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 26 * nu, { extraW: 18 * nu });
}

function drawSkewColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 26 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  const tabW = Math.max(8, m.nameSize * 0.12);
  const tabH = m.nameH * Math.max(motion.bar, 0.1);
  const skew = (layout.nameOnLeft ? 1 : -1) * Math.min(5 * nu, tabW * 0.45);
  const tabX = layout.gutterCx - tabW * 0.5;
  const tabY = layout.nameTop;
  withXform(ctx, m.person, "band", layout.gutterCx, tabY + tabH * 0.5, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = PALETTE.band;
    fillSkew(ctx, tabX, tabY, tabW, tabH, skew);
    ctx.restore();
  });
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  ctx.restore();
}

function measureWaveCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 22 * nu, { extraH: 36 * nu });
}

function drawWaveColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 22 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  const waveW = Math.max(m.nameSize * 1.05, 40);
  const waveY = layout.nameTop + m.nameH + 18 * nu;
  const waveL = layout.nameCx - waveW * 0.5;
  withXform(ctx, m.person, "slash", layout.nameCx, waveY, () => {
    drawWaveCurve(ctx, waveL, waveY, waveW, motion.bar, !layout.nameOnLeft);
  });
  ctx.restore();
}

function measureBracketCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 22 * nu, { outer: 16 * nu, extraH: 14 * nu, extraW: 16 * nu });
}

function drawBracketColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const outer = 16 * nu;
  const gutter = 22 * nu;
  const layout = layoutColPair(m, cfg, gutter, outer);
  beginCol(ctx, x, y, motion);
  const thick = Math.max(3, 0.042 * m.nameSize);
  const arm = Math.max(14, 0.22 * m.nameSize);
  withXform(ctx, m.person, "slash", m.width * 0.5, m.height * 0.5, () => {
    drawCornerBrackets(ctx, 4, 4, m.width - 8, m.height - 8, motion.bar, thick, arm);
  });
  const nameTop = layout.nameTop + 8 * nu;
  paintColName(ctx, m, cfg, layout.nameCx, nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, { ...layout, nameTop }, motion, tsStroke, tu, nameTop);
  ctx.restore();
}

function measureCeremonyCol(person: Person, cfg: RenderConfig): ColMetrics {
  const nu = nameU(cfg);
  return measureColGutter(person, cfg, 24 * nu, { extraH: 32 * nu });
}

function drawCeremonyColPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 24 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  paintColName(ctx, m, cfg, layout.nameCx, layout.nameTop, motion, ns);
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu);
  const len = Math.max(m.nameSize * 0.82, 36);
  const thick = Math.max(5.2, m.nameSize * 0.08);
  const angle = layout.nameOnLeft ? -0.42 : 0.42;
  const cx = layout.nameCx;
  const cy = layout.nameTop + m.nameH + 14 * nu + thick * 0.5;
  withXform(ctx, m.person, "slash", cx, cy, () => {
    drawTiltStroke(ctx, cx, cy, len, thick, angle, motion.bar);
  });
  ctx.restore();
}

function measureVGap(person: Person, cfg: RenderConfig): ColMetrics {
  const m = measureColumn(person, cfg);
  const nu = nameU(cfg);
  const ink = colInk(cfg);
  const titleBlock = titleBlockW(m);
  const ends = nameEnds(person.name);
  const charH = m.nameSize;
  const mid = 20 * nu;
  const body = ends.last ? charH + mid + m.titleH + mid + charH : charH + mid + m.titleH;
  return {
    ...m,
    slashH: m.titleH,
    slashW: Math.max(2, 0.028 * m.nameSize),
    width: m.pad + m.nameSize + ink * 2 + 28 * nu + titleBlock + m.pad,
    height: m.pad + body + m.pad,
  };
}

function drawVGapPlate(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  _side: "left" | "right",
  cfg: RenderConfig,
) {
  if (motion.opacity <= 0.001) return;
  const nu = nameU(cfg);
  const tu = titleU(cfg);
  const ns = nameStroke(nu);
  const tsStroke = titleStroke(tu);
  const gutter = 28 * nu;
  const layout = layoutColPair(m, cfg, gutter);
  beginCol(ctx, x, y, motion);
  const ends = nameEnds(m.person.name);
  const charH = m.nameSize;
  const mid = 20 * nu;
  const nameTop = m.pad;
  const titleTop = nameTop + charH + mid;
  const lastY = ends.last ? titleTop + m.titleH + mid : nameTop;
  const slashY1 = titleTop + 4 * nu;
  const slashY2 = titleTop + m.titleH - 4 * nu;
  const lean = 7 * nu;
  const slashX1 = layout.gutterCx + (layout.nameOnLeft ? -lean : lean);
  const slashX2 = layout.gutterCx + (layout.nameOnLeft ? lean : -lean);
  withXform(ctx, m.person, "slash", layout.gutterCx, (slashY1 + slashY2) * 0.5, () => {
    drawAccentLine(
      ctx,
      slashX1,
      slashY1,
      slashX2,
      slashY2,
      motion.bar,
      Math.max(2.4, 0.032 * m.nameSize),
    );
  });
  withXform(ctx, m.person, "name", layout.nameCx, nameTop + (lastY + charH - nameTop) * 0.5, () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, nameTop - 8, m.width + 40, Math.max(m.height * motion.nameClip, 4) + 16);
    ctx.clip();
    ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (ends.first) paintGlyph(ctx, ends.first, layout.nameCx, nameTop, PALETTE.name, ns);
    if (ends.last) paintGlyph(ctx, ends.last, layout.nameCx, lastY, PALETTE.name, ns);
    ctx.restore();
  });
  paintColTitles(ctx, m, cfg, layout, motion, tsStroke, tu, titleTop);
  ctx.restore();
}

function measureVerticalFamily(person: Person, cfg: RenderConfig): ColMetrics {
  switch (cfg.style) {
    case "duo":
      return measureDuoCol(person, cfg);
    case "hook":
      return measureHookCol(person, cfg);
    case "fold":
      return measureVGap(person, cfg);
    case "underline":
      return measureVSplit(person, cfg);
    case "block":
      return measureFlag(person, cfg);
    case "split":
      return measureVBar(person, cfg);
    case "bracket":
      return measureBracketCol(person, cfg);
    case "ledge":
      return measureLedgeCol(person, cfg);
    case "wave":
      return measureWaveCol(person, cfg);
    case "skew":
      return measureSkewCol(person, cfg);
    case "rule":
      return measureRuleCol(person, cfg);
    default:
      return measureCeremonyCol(person, cfg);
  }
}

function drawVerticalFamily(
  ctx: CanvasRenderingContext2D,
  m: ColMetrics,
  x: number,
  y: number,
  motion: PlateMotion,
  side: "left" | "right",
  cfg: RenderConfig,
) {
  switch (cfg.style) {
    case "duo":
      drawDuoColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "hook":
      drawHookColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "fold":
      drawVGapPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "underline":
      drawVSplitPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "block":
      drawFlagPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "split":
      drawVBarPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "bracket":
      drawBracketColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "ledge":
      drawLedgeColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "wave":
      drawWaveColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "skew":
      drawSkewColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    case "rule":
      drawRuleColPlate(ctx, m, x, y, motion, side, cfg);
      return;
    default:
      drawCeremonyColPlate(ctx, m, x, y, motion, side, cfg);
  }
}

type AnyPlate = { width: number; height: number };

function placePlates(
  ctx: CanvasRenderingContext2D,
  people: Person[],
  time: number,
  cfg: RenderConfig,
  measured: AnyPlate[],
  draw: (plate: AnyPlate, i: number, x: number, y: number, motion: PlateMotion) => void,
  vertical: boolean,
) {
  const u = nameU(cfg);
  const edge = 160;
  const gap = vertical ? 56 * u : 36 * u;
  const maxH = Math.max(...measured.map((p) => p.height), 1);
  const groupH =
    cfg.layout === "sequence"
      ? maxH
      : measured.reduce((s, p) => s + p.height, 0) + gap * Math.max(measured.length - 1, 0);
  const available = BASE_H - 80;
  const fit = Math.min(1, available / groupH);
  const originY = vertical
    ? (BASE_H - groupH * fit) / 2
    : Math.max(72, Math.min(BASE_H * 0.66 - (groupH * fit) / 2, BASE_H - groupH * fit - 72));

  if (cfg.layout === "sequence") {
    people.forEach((_, i) => {
      const plate = measured[i]!;
      const motion = plateMotion(i, people.length, time, cfg);
      const originX =
        cfg.side === "left" ? edge : BASE_W - edge - plate.width * fit;
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(fit, fit);
      draw(plate, i, 0, 0, motion);
      ctx.restore();
    });
    return;
  }

  const groupW = vertical
    ? measured.reduce((s, p) => s + p.width, 0) + gap * Math.max(people.length - 1, 0)
    : Math.max(...measured.map((p) => p.width));
  const originX = cfg.side === "left" ? edge : BASE_W - edge - groupW * fit;
  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(fit, fit);
  if (vertical) {
    let px = 0;
    measured.forEach((plate, i) => {
      const motion = plateMotion(i, people.length, time, cfg);
      draw(plate, i, px, 0, motion);
      px += plate.width + gap;
    });
  } else {
    let py = 0;
    measured.forEach((plate, i) => {
      const motion = plateMotion(i, people.length, time, cfg);
      const px = cfg.side === "left" ? 0 : groupW - plate.width;
      draw(plate, i, px, py, motion);
      py += plate.height + gap;
    });
  }
  ctx.restore();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  time: number,
  cfg: RenderConfig,
) {
  applyPalette(cfg);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const sx = canvasW / BASE_W;
  const sy = canvasH / BASE_H;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);

  const people = cfg.people.filter((p) => p.name.trim().length > 0);
  if (people.length === 0) return;

  if (cfg.orient === "vertical") {
    const measured = people.map((p) => measureVerticalFamily(p, cfg));
    placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
      drawVerticalFamily(ctx, plate as ColMetrics, x, y, motion, cfg.side, cfg);
    }, true);
    return;
  }

  if (cfg.style === "qinghua") {
    const measured = people.map((p) => measureBand(ctx, p, cfg));
    placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
      drawBandPlate(ctx, plate as BandMetrics, x, y, motion, cfg.side, cfg);
    }, false);
    return;
  }

  if (cfg.style === "news") {
    const measured = people.map((p) => measureBar(ctx, p, cfg));
    placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
      drawBarPlate(ctx, plate as BarMetrics, x, y, motion, cfg.side, cfg);
    }, false);
    return;
  }

  if (
    cfg.style === "card" ||
    cfg.style === "pill" ||
    cfg.style === "stack" ||
    cfg.style === "rail" ||
    cfg.style === "badge"
  ) {
    const measured = people.map((p) => measurePanel(ctx, p, cfg));
    const draw =
      cfg.style === "card"
        ? drawCardPlate
        : cfg.style === "pill"
          ? drawPillPlate
          : cfg.style === "stack"
            ? drawStackPlate
            : cfg.style === "rail"
              ? drawRailPlate
              : drawBadgePlate;
    placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
      draw(ctx, plate as PanelMetrics, x, y, motion, cfg.side, cfg);
    }, false);
    return;
  }

  const lineStyles: NameplateStyle[] = [
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
  ];
  if (lineStyles.includes(cfg.style)) {
    const measured = people.map((p) => measureLine(ctx, p, cfg));
    const draw =
      cfg.style === "underline"
        ? drawUnderlinePlate
        : cfg.style === "block"
          ? drawBlockPlate
          : cfg.style === "rule"
            ? drawRulePlate
            : cfg.style === "split"
              ? drawSplitPlate
              : cfg.style === "skew"
                ? drawSkewPlate
                : cfg.style === "wave"
                  ? drawWavePlate
                  : cfg.style === "duo"
                    ? drawDuoPlate
                    : cfg.style === "hook"
                      ? drawHookPlate
                      : cfg.style === "ledge"
                        ? drawLedgePlate
                        : cfg.style === "fold"
                          ? drawFoldPlate
                          : drawBracketPlate;
    placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
      draw(ctx, plate as LineMetrics, x, y, motion, cfg.side, cfg);
    }, false);
    return;
  }

  const measured = people.map((p) => measureSlash(ctx, p, cfg));
  placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
    drawSlashPlate(ctx, plate as SlashMetrics, x, y, motion, cfg.side, cfg);
  }, false);
}

export function renderConfigFromState(state: {
  people: Person[];
  style: NameplateStyle;
  layout: "stack" | "sequence";
  side: "left" | "right";
  orient?: "horizontal" | "vertical";
  align?: "left" | "right" | "top";
  scale: number;
  textSize?: number;
  titleSize?: number;
  nameFontId?: string;
  titleFontId?: string;
  nameColor?: string;
  titleColor?: string;
  accentColor?: string;
  bandColor?: string;
  sectionLabel: string;
  inDuration: number;
  holdDuration: number;
  outDuration: number;
  stagger: number;
  animIn?: import("./types").AnimIn;
  ease?: import("./types").EaseKind;
}): RenderConfig {
  return {
    people: state.people,
    style: state.style,
    layout: state.layout,
    side: state.side,
    orient: state.orient ?? "horizontal",
    align: state.align ?? "left",
    scale: state.scale,
    textSize: state.textSize ?? 1,
    titleSize: state.titleSize ?? 1,
    nameFont: resolveFontStack(state.nameFontId, "name"),
    titleFont: resolveFontStack(state.titleFontId, "title"),
    nameColor: state.nameColor ?? THEME.name,
    titleColor: state.titleColor ?? THEME.title,
    accentColor: state.accentColor ?? THEME.accent,
    bandColor: state.bandColor ?? THEME.band,
    sectionLabel: "",
    inDuration: state.inDuration,
    holdDuration: state.holdDuration,
    outDuration: state.outDuration,
    stagger: state.stagger,
    animIn: state.animIn ?? "left",
    ease: state.ease ?? "smooth",
  };
}

export function soloConfig(config: RenderConfig, person: Person): RenderConfig {
  return { ...config, people: [person], layout: "sequence", sectionLabel: "" };
}
