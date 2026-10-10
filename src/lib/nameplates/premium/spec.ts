/**
 * Flagship nameplate templates — declarative specs.
 *
 * A template is data, not a draw function: it picks a layout (where the name,
 * English line, title lines and tag sit), a stack of plate layers (backing
 * shapes), ornaments (rules, frames, seals, edges) and a motion recipe. The
 * engine in ./engine.ts interprets these specs, so a new template is a new
 * entry in TEMPLATES rather than another few hundred lines of canvas code.
 *
 * Colour tokens resolve against the user's palette at render time:
 *   $name $title $accent $band — the four colours in the inspector
 *   $gold                      — metallic gradient derived from $accent
 *   $en                        — English line colour (defaults to $accent)
 * Anything else is a literal CSS colour.
 */
import type { NameplateStyle } from "../types";

export type PremiumStyle = Extract<
  NameplateStyle,
  | "goldnavy"
  | "blackgold"
  | "keynote"
  | "glass"
  | "newsduo"
  | "techedge"
  | "seal"
  | "xuan"
  | "bizblue"
  | "redcarpet"
  | "sport"
  | "dialog"
>;

export type ColorRef = string;

/** Fill along the plate, measured from the screen edge inward (t=0 outer edge). */
export type Fill =
  | { kind: "solid"; color: ColorRef; alpha?: number }
  | { kind: "linear"; stops: [number, ColorRef, number?][]; axis?: "x" | "y" };

export type Region = "plate" | "name" | "title" | "tag" | "lead";

export type PlateLayer =
  /** Rectangle over a region; `fade` fades the inner end (fraction of width). */
  | { kind: "rect"; region?: Region; fill: Fill; radius?: number; fade?: number; shadow?: number }
  /** Rectangle with one corner cut (tech). */
  | { kind: "chamfer"; fill: Fill; cut: number }
  /** Parallelogram over a region. `skew` is the horizontal run per unit height. */
  | { kind: "skew"; region: Region; fill: Fill; skew: number; extend?: number }
  /** Smoked-glass card: translucent fill, top highlight, hairline edge. */
  | { kind: "glass"; radius: number; tint: ColorRef }
  /** Procedural paper fibre texture over the plate (source-atop). */
  | { kind: "paper"; strength: number }
  /** Large soft scrim behind type, no visible edge (keynote). */
  | { kind: "scrim"; alpha: number };

export type Ornament =
  /** Rule between name and title (or at plate bottom/top), grows from the outer edge. */
  | {
      kind: "rule";
      at: "between" | "bottom" | "top";
      color: ColorRef;
      width: number;
      span: "text" | "plate" | "name";
      cap?: "diamond" | "dot";
      fadeEnd?: boolean;
    }
  /** Vertical bar on the outer edge of the plate. */
  | { kind: "edge"; color: ColorRef; width: number }
  /** Thin frame inset inside the plate. */
  | { kind: "frame"; color: ColorRef; width: number; inset: number; corners?: number }
  /** Vertical divider between name and right column (inline layout). */
  | { kind: "divider"; color: ColorRef; width: number }
  /** Red seal carrying the surname, in the lead slot. */
  | { kind: "seal"; color: ColorRef }
  /** Speaker dot in the lead slot (dialog). */
  | { kind: "dot"; color: ColorRef }
  /** A bright segment running along the top/outer border (tech). */
  | { kind: "flow"; color: ColorRef; width: number }
  /** Small L-shaped corner ticks. */
  | { kind: "ticks"; color: ColorRef; size: number; width: number };

export type EnFont = "sans" | "serif" | "cond";

export interface TypeSpec {
  /** px at scale 1 on a 1920×1080 frame. */
  name: number;
  title: number;
  en: number;
  nameWeight: number;
  titleWeight: number;
  enWeight: number;
  enFont: EnFont;
  /** em */
  nameTracking: number;
  titleTracking: number;
  enTracking: number;
  titleAlpha: number;
  nameFill: ColorRef;
  titleFill: ColorRef;
  enFill: ColorRef;
  tagFill?: ColorRef;
  italic?: boolean;
  /** Soft drop shadow strength 0..1 (never an outline). */
  shadow: number;
}

export type LayoutKind = "stack" | "inline" | "tiers" | "column";

export interface LayoutSpec {
  kind: LayoutKind;
  /** em of name size */
  padX: number;
  padY: number;
  /** gap between name line and first title line, em of name size */
  gap: number;
  /** extra plate length beyond the text, used by fading plates (em of name) */
  tail: number;
  /** en line placement */
  en: "inline" | "above" | "below" | "column" | "none";
  /** what the lead slot (left of the name) holds */
  lead?: "seal" | "dot" | "number" | "tag";
  /** where `tag` is printed when not in the lead slot */
  tag?: "above" | "below" | "none";
  titleLineHeight: number;
  /** tiers only: skew applied to every bar */
  skew?: number;
  /** min plate width, em of name */
  minWidth?: number;
}

export type PlateIn = "wipe" | "fade" | "rise" | "stamp";
export type TextIn = "rise" | "mask" | "fade";
export type PremiumEase = "expo" | "quint" | "back";

export interface MotionSpec {
  plate: PlateIn;
  text: TextIn;
  ease: PremiumEase;
  /** what the hold-phase light sweep runs over */
  sweep: "plate" | "text" | "none";
  /** default on/off of the sweep for this template */
  sweepDefault: boolean;
}

export interface VerticalSpec {
  plate: PlateLayer[];
  ornaments: Ornament[];
}

export interface TemplateSpec {
  id: PremiumStyle;
  label: string;
  caption: string;
  type: TypeSpec;
  layout: LayoutSpec;
  plate: PlateLayer[];
  ornaments: Ornament[];
  motion: MotionSpec;
  /** Vertical (column) rendition; omitted → template is horizontal-only. */
  vertical?: VerticalSpec;
  /** Always render as a column, whatever the orientation (宣纸竖排). */
  nativeVertical?: boolean;
  /** Alternate sides per person and pair them on one row (对话访谈). */
  mirrored?: boolean;
  /** Preset palette applied when the template is chosen. */
  palette: { name: string; title: string; accent: string; band: string };
  fonts: { name: "serif" | "sans" | "wenkai"; title: "serif" | "sans" };
}

const GOLD = "#CFAA66";
const RED = "#C8102E";
const NAVY = "#0E1E3A";
const CYAN = "#3EC6E0";
const WARM = "#F7F2E8";

const baseType: TypeSpec = {
  name: 60,
  title: 25,
  en: 15,
  nameWeight: 600,
  titleWeight: 400,
  enWeight: 500,
  enFont: "sans",
  nameTracking: 0.06,
  titleTracking: 0.1,
  enTracking: 0.22,
  titleAlpha: 0.82,
  nameFill: "$name",
  titleFill: "$title",
  enFill: "$en",
  shadow: 0.25,
};

const baseMotion: MotionSpec = {
  plate: "wipe",
  text: "rise",
  ease: "expo",
  sweep: "plate",
  sweepDefault: true,
};

export const TEMPLATES: TemplateSpec[] = [
  {
    id: "goldnavy",
    label: "央视金辉",
    caption: "藏青渐变底 · 宋体 · 金线",
    palette: { name: WARM, title: "#E9E4DA", accent: GOLD, band: "rgba(14,30,58,0.94)" },
    fonts: { name: "serif", title: "sans" },
    type: { ...baseType, nameWeight: 700 },
    layout: { kind: "stack", padX: 0.62, padY: 0.36, gap: 0.5, tail: 2.6, en: "inline", titleLineHeight: 1.5 },
    plate: [
      {
        kind: "rect",
        fill: { kind: "linear", stops: [[0, "$band"], [0.55, "$band", 0.86], [1, "$band", 0]] },
        fade: 0,
      },
      {
        kind: "rect",
        fill: { kind: "linear", axis: "y", stops: [[0, "#ffffff", 0.07], [0.5, "#ffffff", 0], [1, "#000000", 0.18]] },
      },
    ],
    ornaments: [
      { kind: "edge", color: "$gold", width: 5 },
      { kind: "rule", at: "between", color: "$gold", width: 2, span: "text", fadeEnd: true },
    ],
    motion: { ...baseMotion },
    vertical: {
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [0.7, "$band", 0.86], [1, "$band", 0]] },
        },
      ],
      ornaments: [
        { kind: "edge", color: "$gold", width: 4 },
        { kind: "rule", at: "between", color: "$gold", width: 2, span: "text", fadeEnd: true },
      ],
    },
  },
  {
    id: "blackgold",
    label: "黑金典藏",
    caption: "黑底细金框 · 英文副行",
    palette: { name: "#F4EEDF", title: "#E6DFCF", accent: GOLD, band: "rgba(10,9,8,0.9)" },
    fonts: { name: "serif", title: "sans" },
    type: { ...baseType, enFont: "serif", en: 19, enWeight: 600, enTracking: 0.24, nameTracking: 0.08 },
    layout: { kind: "inline", padX: 0.62, padY: 0.42, gap: 0.5, tail: 0, en: "column", titleLineHeight: 1.45 },
    plate: [
      {
        kind: "rect",
        fill: { kind: "linear", stops: [[0, "$band"], [1, "$band", 0.8]] },
        shadow: 0.35,
      },
      {
        kind: "rect",
        fill: { kind: "linear", axis: "y", stops: [[0, "#ffffff", 0.06], [0.45, "#ffffff", 0], [1, "#000000", 0.2]] },
      },
    ],
    ornaments: [
      { kind: "frame", color: "$gold", width: 1.25, inset: 7, corners: 0 },
      { kind: "ticks", color: "$gold", size: 16, width: 2.5 },
      { kind: "divider", color: "$gold", width: 1.5 },
    ],
    motion: { ...baseMotion, plate: "fade", text: "mask" },
    vertical: {
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.35 }],
      ornaments: [
        { kind: "frame", color: "$gold", width: 1.25, inset: 7 },
        { kind: "ticks", color: "$gold", size: 14, width: 2.5 },
        { kind: "rule", at: "between", color: "$gold", width: 1.5, span: "text" },
      ],
    },
  },
  {
    id: "keynote",
    label: "发布会极简",
    caption: "无装饰 · 大字 · 留白",
    palette: { name: "#FFFFFF", title: "#F2F2F2", accent: "#FFFFFF", band: "rgba(0,0,0,0.42)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 74,
      title: 29,
      en: 15,
      nameWeight: 700,
      titleWeight: 400,
      nameTracking: 0.02,
      titleTracking: 0.12,
      enTracking: 0.32,
      titleAlpha: 0.78,
      enFill: "$title",
      shadow: 0.55,
    },
    layout: { kind: "stack", padX: 0, padY: 0, gap: 0.42, tail: 0, en: "above", titleLineHeight: 1.5 },
    plate: [{ kind: "scrim", alpha: 0.36 }],
    ornaments: [],
    motion: { ...baseMotion, plate: "fade", sweep: "text", sweepDefault: false },
    vertical: { plate: [{ kind: "scrim", alpha: 0.36 }], ornaments: [] },
  },
  {
    id: "glass",
    label: "毛玻璃卡",
    caption: "烟熏玻璃底板 · 高光边",
    palette: { name: "#FFFFFF", title: "#EEF2F7", accent: "#FFFFFF", band: "rgba(28,34,46,0.55)" },
    fonts: { name: "sans", title: "sans" },
    type: { ...baseType, nameWeight: 700, nameTracking: 0.03, enFill: "$title", shadow: 0.2 },
    layout: { kind: "stack", padX: 0.6, padY: 0.42, gap: 0.42, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "glass", radius: 18, tint: "$band" }],
    ornaments: [],
    motion: { ...baseMotion, plate: "rise" },
  },
  {
    id: "newsduo",
    label: "新闻双层条",
    caption: "白色姓名条 + 红色职务块",
    palette: { name: "#14161C", title: "#FFFFFF", accent: RED, band: "rgba(255,255,255,0.97)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 50,
      title: 24,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 500,
      titleTracking: 0.08,
      titleAlpha: 1,
      enFill: "$accent",
      tagFill: "#FFFFFF",
      shadow: 0,
    },
    layout: { kind: "tiers", padX: 0.5, padY: 0, gap: 0, tail: 0, en: "inline", lead: "tag", titleLineHeight: 1.4 },
    plate: [
      { kind: "rect", region: "name", fill: { kind: "solid", color: "$band" }, shadow: 0.3 },
      { kind: "rect", region: "title", fill: { kind: "linear", stops: [[0, "$accent"], [1, "$accent", 0.92]] } },
      { kind: "rect", region: "lead", fill: { kind: "solid", color: NAVY } },
    ],
    ornaments: [],
    motion: { ...baseMotion, text: "mask" },
  },
  {
    id: "techedge",
    label: "科技光边",
    caption: "深色切角底 · 青色流光边",
    palette: { name: "#FFFFFF", title: "#D9EEF4", accent: CYAN, band: "rgba(6,16,28,0.86)" },
    fonts: { name: "sans", title: "sans" },
    type: { ...baseType, nameWeight: 700, nameTracking: 0.03, enFont: "sans", enWeight: 600, shadow: 0.15 },
    layout: { kind: "stack", padX: 0.62, padY: 0.38, gap: 0.46, tail: 0.6, en: "inline", titleLineHeight: 1.5 },
    plate: [
      {
        kind: "chamfer",
        cut: 22,
        fill: { kind: "linear", stops: [[0, "$band"], [1, "$band", 0.7]] },
      },
    ],
    ornaments: [
      { kind: "flow", color: "$accent", width: 2 },
      { kind: "ticks", color: "$accent", size: 12, width: 2 },
    ],
    motion: { ...baseMotion, ease: "quint", text: "mask" },
  },
  {
    id: "seal",
    label: "国风印章",
    caption: "宋体 · 红色印章 · 宣纸纹理",
    palette: { name: "#1D1A16", title: "#3A342C", accent: RED, band: "rgba(246,239,226,0.95)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      nameWeight: 700,
      titleWeight: 500,
      nameTracking: 0.12,
      titleTracking: 0.14,
      titleAlpha: 0.86,
      enFont: "serif",
      en: 17,
      enWeight: 600,
      enFill: "#8A6F45",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.55, padY: 0.38, gap: 0.46, tail: 1.4, en: "inline", lead: "seal", titleLineHeight: 1.5 },
    plate: [
      {
        kind: "rect",
        fill: { kind: "linear", stops: [[0, "$band"], [0.78, "$band", 0.94], [1, "$band", 0]] },
      },
      { kind: "paper", strength: 0.5 },
    ],
    ornaments: [{ kind: "seal", color: "$accent" }, { kind: "rule", at: "between", color: "$accent", width: 1.5, span: "text", fadeEnd: true }],
    motion: { ...baseMotion, sweep: "none", sweepDefault: false },
    vertical: {
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [0.72, "$band", 0.9], [1, "$band", 0]] },
        },
        { kind: "paper", strength: 0.5 },
      ],
      ornaments: [{ kind: "seal", color: "$accent" }, { kind: "rule", at: "between", color: "$accent", width: 1.5, span: "text" }],
    },
  },
  {
    id: "xuan",
    label: "宣纸竖排",
    caption: "竖排姓名 · 细线 · 纪录片",
    palette: { name: "#F6F1E6", title: "#E8E1D3", accent: "#C9B48A", band: "rgba(10,10,10,0.64)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      name: 64,
      title: 25,
      nameWeight: 700,
      titleWeight: 500,
      titleAlpha: 0.8,
      enFont: "serif",
      en: 15,
      enWeight: 600,
      shadow: 0.5,
    },
    layout: { kind: "column", padX: 0.5, padY: 0.5, gap: 0.6, tail: 0, en: "column", lead: "seal", titleLineHeight: 1.6 },
    nativeVertical: true,
    plate: [
      {
        kind: "rect",
        fill: { kind: "linear", axis: "y", stops: [[0, "$band", 0], [0.18, "$band"], [0.82, "$band"], [1, "$band", 0]] },
      },
    ],
    ornaments: [
      { kind: "rule", at: "between", color: "$accent", width: 1.25, span: "plate" },
      { kind: "seal", color: RED },
    ],
    motion: { ...baseMotion, plate: "fade", text: "mask", sweep: "none", sweepDefault: false },
    vertical: {
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "$band", 0], [0.18, "$band"], [0.82, "$band"], [1, "$band", 0]] },
        },
      ],
      ornaments: [
        { kind: "rule", at: "between", color: "$accent", width: 1.25, span: "plate" },
        { kind: "seal", color: RED },
      ],
    },
  },
  {
    id: "bizblue",
    label: "商务蓝白",
    caption: "白色卡片 · 蓝色侧轨",
    palette: { name: NAVY, title: "#3E4A5E", accent: "#1F57C3", band: "rgba(255,255,255,0.97)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 54,
      title: 23,
      nameWeight: 700,
      nameTracking: 0.03,
      titleWeight: 400,
      titleAlpha: 0.9,
      enWeight: 600,
      tagFill: "$accent",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.66, padY: 0.42, gap: 0.4, tail: 0, en: "inline", tag: "below", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 6, shadow: 0.4 }],
    ornaments: [{ kind: "edge", color: "$accent", width: 8 }],
    motion: { ...baseMotion, ease: "quint" },
  },
  {
    id: "redcarpet",
    label: "红毯典礼",
    caption: "红金渐变 · 典礼",
    palette: { name: "#FFF5E1", title: "#F3E2C0", accent: "#D9B46C", band: "rgba(168,14,36,0.95)" },
    fonts: { name: "serif", title: "sans" },
    type: { ...baseType, nameWeight: 700, nameTracking: 0.1, nameFill: "$name", enFont: "serif", en: 17, enWeight: 600, shadow: 0.3 },
    layout: { kind: "stack", padX: 0.7, padY: 0.42, gap: 0.5, tail: 2.4, en: "inline", titleLineHeight: 1.5 },
    plate: [
      {
        kind: "rect",
        fill: { kind: "linear", stops: [[0, "#5E0614", 0.96], [0.18, "$band"], [0.6, "$band", 0.88], [1, "$band", 0]] },
      },
      {
        kind: "rect",
        fill: { kind: "linear", axis: "y", stops: [[0, "#ffd9a0", 0.12], [0.5, "#ffffff", 0], [1, "#000000", 0.22]] },
      },
    ],
    ornaments: [
      { kind: "rule", at: "top", color: "$gold", width: 2, span: "plate", fadeEnd: true },
      { kind: "rule", at: "bottom", color: "$gold", width: 2, span: "plate", fadeEnd: true },
      { kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text", cap: "diamond" },
    ],
    motion: { ...baseMotion },
  },
  {
    id: "sport",
    label: "运动斜切",
    caption: "陡斜切色块 · 号码位",
    palette: { name: "#FFFFFF", title: "#FFFFFF", accent: RED, band: "rgba(12,16,26,0.94)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 54,
      title: 22,
      nameWeight: 800,
      nameTracking: 0.04,
      titleWeight: 600,
      titleTracking: 0.1,
      titleAlpha: 1,
      enFont: "cond",
      enWeight: 600,
      en: 18,
      enTracking: 0.16,
      enFill: "$accent",
      tagFill: "#FFFFFF",
      italic: true,
      shadow: 0,
    },
    layout: { kind: "tiers", padX: 0.5, padY: 0, gap: 0, tail: 0, en: "inline", lead: "number", titleLineHeight: 1.4, skew: 0.36 },
    plate: [
      { kind: "skew", region: "name", fill: { kind: "linear", stops: [[0, "$band"], [1, "$band", 0.92]] }, skew: 0.36 },
      { kind: "skew", region: "title", fill: { kind: "solid", color: "$accent" }, skew: 0.36 },
      { kind: "skew", region: "lead", fill: { kind: "linear", axis: "y", stops: [[0, "$accent"], [1, "#7d0a1d"]] }, skew: 0.36 },
    ],
    ornaments: [],
    motion: { ...baseMotion, ease: "back", text: "mask" },
  },
  {
    id: "dialog",
    label: "对话访谈",
    caption: "两人镜像 · 左右对坐",
    palette: { name: "#FFFFFF", title: "#E7EAF0", accent: "#E6B85C", band: "rgba(14,16,22,0.8)" },
    fonts: { name: "sans", title: "sans" },
    type: { ...baseType, name: 50, title: 22, nameWeight: 700, nameTracking: 0.04, enFill: "$title", shadow: 0.15 },
    layout: { kind: "stack", padX: 0.5, padY: 0.36, gap: 0.42, tail: 0, en: "inline", lead: "dot", titleLineHeight: 1.5 },
    mirrored: true,
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 14, shadow: 0.3 }],
    ornaments: [
      { kind: "dot", color: "$accent" },
      { kind: "rule", at: "between", color: "$accent", width: 2, span: "name" },
    ],
    motion: { ...baseMotion, plate: "rise", ease: "quint" },
  },
];

export const TEMPLATE_BY_ID: Record<PremiumStyle, TemplateSpec> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
) as Record<PremiumStyle, TemplateSpec>;

export const PREMIUM_IDS = TEMPLATES.map((t) => t.id);

export function isPremiumId(style: string): style is PremiumStyle {
  return style in TEMPLATE_BY_ID;
}

/** Whether a template can render as a vertical column. */
export function supportsVertical(style: string): boolean {
  if (!isPremiumId(style)) return true;
  const t = TEMPLATE_BY_ID[style];
  return !!t.vertical || !!t.nativeVertical;
}
