import { FONT_SANS, FONT_SERIF, resolveFontStack } from "./fonts";
import { packTitle } from "./text";
import { drawPremiumFrame, easeByName, isPremiumStyle } from "./premium/engine";
import { type ClassicPlate, drawClassicPlate, isClassicStyle, measureClassic } from "./classic";

export { packTitle };
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
let TEXT_FX: RenderConfig["textFx"] = "soft";

function applyPalette(cfg: RenderConfig) {
  TEXT_FX = cfg.textFx ?? "soft";
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
  if (cfg.ease === "expo" || cfg.ease === "quint" || cfg.ease === "back") return easeByName(cfg.ease);
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
  // reveal sub-timeline: ease-out-expo by default, the user's curve otherwise
  const rz = cfg.ease === "smooth" || !cfg.ease ? easeByName("expo") : ez;
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
      // staggered entrance: accent draws first, then the name, then the title
      bar: rz(clamp(local / Math.max(cfg.inDuration * 0.55, 0.04))),
      nameClip: rz(clamp((local - cfg.inDuration * 0.16) / Math.max(cfg.inDuration * 0.6, 0.05))),
      titleClip: rz(clamp((local - cfg.inDuration * 0.34) / Math.max(cfg.inDuration * 0.6, 0.05))),
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

/** Default legibility: a very soft drop shadow instead of the legacy outline. */
function softText(ctx: CanvasRenderingContext2D, strokeWidth: number) {
  if (TEXT_FX === "none") return;
  // tight contact shadow: reads as depth, not as a grey haze on bright footage
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = Math.max(2, strokeWidth * 0.9);
  ctx.shadowOffsetY = Math.max(1, strokeWidth * 0.3);
}

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
  if (TEXT_FX !== "outline") {
    softText(ctx, strokeWidth);
    ctx.fillStyle = fill;
    fillTracked(ctx, text, x, y, tracking);
    ctx.restore();
    return;
  }
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
  if (TEXT_FX !== "outline") {
    softText(ctx, strokeWidth);
    ctx.fillStyle = fill;
    ctx.fillText(ch, x, y);
    ctx.restore();
    return;
  }
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












function nameStroke(u: number) {
  return Math.max(4.2, 0.074 * 86 * u);
}

function titleStroke(u: number) {
  return Math.max(2.8, 0.12 * 30 * u);
}

type Box = { width: number; height: number };


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

  if (isPremiumStyle(cfg.style)) {
    drawPremiumFrame(ctx, people, time, cfg);
    return;
  }

  if (cfg.orient === "vertical" || isClassicStyle(cfg.style)) {
    // Classic v3 family (both orients); legacy panel styles fall back to 斜杠 when vertical.
    const vertical = cfg.orient === "vertical";
    const ccfg = isClassicStyle(cfg.style) ? cfg : { ...cfg, style: "ceremony" as NameplateStyle };
    const measured = people.map((p) => measureClassic(ctx, p, ccfg));
    placePlates(ctx, people, time, ccfg, measured, (plate, i, x, y, motion) => {
      drawClassicPlate(ctx, plate as ClassicPlate, x, y, motion, ccfg);
    }, vertical);
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
  sweep?: boolean;
  textFx?: import("./types").TextFx;
  backing?: import("./types").TextBacking;
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
    sweep: state.sweep ?? true,
    textFx: state.textFx ?? "soft",
    backing: state.backing ?? "soft",
  };
}

export function soloConfig(config: RenderConfig, person: Person): RenderConfig {
  return { ...config, people: [person], layout: "sequence", sectionLabel: "" };
}
