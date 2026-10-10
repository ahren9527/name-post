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
  | "variety"
  | "docu"
  | "finance"
  | "lecture"
  | "wedding"
  | "aurora"
  | "capsule"
  | "magazine"
  | "ink"
  | "neon"
  | "applewhite"
  | "govred"
  | "redsun"
  | "strips"
  | "lightline"
  | "silk"
  | "techblue"
  | "viewfinder"
  | "goldink"
  | "comic"
  | "flare"
  | "metal"
  | "serial"
  | "scroll"
>;

/** Gallery sub-category inside the 旗舰 tab. */
export type TemplateCategory = "news" | "ceremony" | "business" | "creative";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "news", label: "新闻政务" },
  { id: "ceremony", label: "典礼人文" },
  { id: "business", label: "商务科技" },
  { id: "creative", label: "综艺创意" },
];

export type ColorRef = string;

/** Fill along the plate, measured from the screen edge inward (t=0 outer edge). */
export type Fill =
  | { kind: "solid"; color: ColorRef; alpha?: number }
  | { kind: "linear"; stops: [number, ColorRef, number?][]; axis?: "x" | "y" };

export type Region = "plate" | "name" | "title" | "tag" | "lead";

export type PlateLayer =
  /**
   * Rectangle over a region; `pill` rounds the ends fully. `outline` strokes
   * the edge and `drop` adds an offset sticker shadow (漫画).
   */
  | {
      kind: "rect";
      region?: Region;
      fill: Fill;
      radius?: number;
      fade?: number;
      shadow?: number;
      pill?: boolean;
      outline?: ColorRef;
      outlineWidth?: number;
      drop?: number;
    }
  /** Rectangle with one corner cut (tech). */
  | { kind: "chamfer"; fill: Fill; cut: number }
  /** Parallelogram over a region. `skew` is the horizontal run per unit height. */
  | { kind: "skew"; region: Region; fill: Fill; skew: number; extend?: number; outline?: ColorRef; outlineWidth?: number; drop?: number }
  /** Smoked-glass card: translucent fill, top highlight, hairline edge. */
  | { kind: "glass"; radius: number; tint: ColorRef }
  /** Procedural paper fibre texture over the plate (source-atop). */
  | { kind: "paper"; strength: number }
  /** Large soft scrim behind type, no visible edge (keynote). */
  | { kind: "scrim"; alpha: number }
  /** Rounded card filled with slowly drifting soft colour blobs (极光). */
  | { kind: "aurora"; radius: number; base: ColorRef; colors: ColorRef[] }
  /** Ink-wash brush stroke: ragged edges, dry-brush streaks into the tail (水墨). */
  | { kind: "brush"; fill: Fill }
  /** One soft strip behind every title line, fading toward its end (朱条). */
  | { kind: "strips"; fill: Fill; pad: number }
  /** Flowing silk ribbon with folds and sheen, fading at the tail (红绸). */
  | { kind: "ribbon"; color: ColorRef; deep: ColorRef }
  /** Brushed-metal bar: bevelled gradient + fine brush lines (金属拉丝). */
  | { kind: "metal"; radius: number; tone: "silver" | "gold" }
  /** Distant ink-wash mountain ridges drifting at the plate's tail (金墨山水). */
  | { kind: "mountains"; color: ColorRef };

export type Ornament =
  /** Rule between name and title (or at plate bottom/top), grows from the outer edge. */
  | {
      kind: "rule";
      /**
       * between: separator between name and titles. top/bottom: plate caps.
       * outer/inner (vertical only): hairlines down the long sides.
       */
      at: "between" | "bottom" | "top" | "outer" | "inner";
      color: ColorRef;
      width: number;
      span: "text" | "plate" | "name";
      cap?: "diamond" | "dot" | "flourish";
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
  | { kind: "ticks"; color: ColorRef; size: number; width: number }
  /** Mini sparkline that draws itself at the inner end of the plate (财经). */
  | { kind: "spark"; color: ColorRef; width: number }
  /** Blinking terminal block after the last title line. */
  | { kind: "cursor"; color: ColorRef }
  /** Oversized editorial initial in the lead slot, cropped by the plate (杂志). */
  | { kind: "initial"; color: ColorRef }
  /** Glowing neon outline around the plate, flickers on. */
  | { kind: "neon"; color: ColorRef; color2: ColorRef; width: number; radius: number }
  /** 回纹 key-pattern band along the top/bottom edge. */
  | { kind: "fret"; color: ColorRef; size: number; at: "top" | "bottom" | "both" }
  /** A few twinkling four-point stars near a block corner (综艺). */
  | { kind: "sparkle"; color: ColorRef }
  /** Soft sun disc behind the surname (朱日). */
  | { kind: "disc"; color: ColorRef; color2: ColorRef }
  /** Glowing hairline beam with drifting particles (光线). */
  | { kind: "beam"; color: ColorRef }
  /** Anamorphic light streak through the name (流光). */
  | { kind: "flare"; color: ColorRef; core: ColorRef }
  /** Four open corner brackets around the plate (取景框). */
  | { kind: "brackets"; color: ColorRef; size: number; width: number }
  /** Blinking ◂◂◂◂ chevrons after the title block (科技蓝条). */
  | { kind: "chevrons"; color: ColorRef }
  /** Scroll rollers capping both ends of the plate (卷轴). */
  | { kind: "rollers"; color: ColorRef; knob: ColorRef };

export type EnFont = "sans" | "serif" | "cond" | "script" | "mono";

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
  /** Coloured glow instead of a drop shadow (neon). */
  glow?: ColorRef;
  /** Face for the tag / org line (defaults to the title face). */
  tagFont?: EnFont;
  /** English line casing: UPPER (default) or Title Case (script lines). */
  enCase?: "upper" | "title";
}

export type LayoutKind = "stack" | "inline" | "tiers" | "column" | "blocks";

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
  lead?: "seal" | "dot" | "number" | "tag" | "initial" | "stamp" | "serial";
  /** where `tag` is printed when not in the lead slot */
  tag?: "above" | "below" | "none";
  titleLineHeight: number;
  /** tiers only: skew applied to every bar */
  skew?: number;
  /** min plate width, em of name */
  minWidth?: number;
  /** blocks only: title block under the name ("stack") or joined on its right ("row") */
  blocks?: "stack" | "row";
  /** blocks only: vertical gap between name and title block (em of name) */
  tierGap?: number;
  /** blocks only: title block indent from the name block (em of name) */
  titleIndent?: number;
}

export type PlateIn = "wipe" | "fade" | "rise" | "stamp" | "pop" | "flicker";
export type TextIn = "rise" | "mask" | "fade" | "drift";
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

/**
 * Vertical (竖排) composition. The name runs as one column on the outer
 * side, an optional rotated English column beside it, then the title lines
 * as columns moving inward — right-side plates mirror, so the name sits on
 * the screen edge and the columns read right → left.
 */
export interface VerticalSpec {
  plate: PlateLayer[];
  ornaments: Ornament[];
  /**
   * "column": one plate around everything (default).
   * "split": the name and the titles get their own blocks (regions `name`
   * and `title`), the title block dropped down beside the name block.
   */
  form?: "column" | "split";
  /** split: title block offset below the name block's top (em of name) */
  drop?: number;
  /** split: gap between name block and title block (em of name) */
  splitGap?: number;
  /** what sits above the name column */
  lead?: "seal" | "dot" | "initial" | "number" | "chip" | "serial" | "none";
  /** where the person's tag prints: lead chip, a slim last column, or nowhere */
  tag?: "lead" | "column" | "none";
  /** English line: rotated column beside the name, or hidden */
  en?: "column" | "none";
  /** paddings / gaps (em of name) */
  padX?: number;
  padY?: number;
  gap?: number;
  /** extra plate length under the columns, for fading tails (em of name) */
  tail?: number;
  /** footer band under the columns (em of name), used by the sparkline */
  foot?: number;
  /** gap between title columns (em of title size, default 0.62) */
  colGap?: number;
  /** split: title block padding along the columns (em of title size, default 0.72) */
  titlePad?: number;
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
  /** Vertical (column) rendition — every flagship template ships one. */
  vertical: VerticalSpec;
  /** Always render as a column, whatever the orientation (宣纸竖排). */
  nativeVertical?: boolean;
  /** Alternate sides per person and pair them on one row (对话访谈). */
  mirrored?: boolean;
  /** Right-side plates keep the left-to-right composition instead of mirroring. */
  keepOrder?: boolean;
  /** Preset palette applied when the template is chosen. */
  palette: { name: string; title: string; accent: string; band: string };
  fonts: { name: "serif" | "sans" | "wenkai" | "yuan"; title: "serif" | "sans" };
  category: TemplateCategory;
  /** Inspector label / placeholder for the tag field when the template prints it. */
  tagHint?: { label: string; placeholder: string };
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
    category: "news",
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
      tail: 1.6,
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [0.7, "$band", 0.86], [1, "$band", 0]] },
        },
      ],
      ornaments: [
        { kind: "rule", at: "outer", color: "$gold", width: 4, span: "plate", fadeEnd: true },
        { kind: "rule", at: "between", color: "$gold", width: 2, span: "text", fadeEnd: true },
      ],
    },
  },
  {
    id: "blackgold",
    category: "ceremony",
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
    category: "business",
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
    vertical: { plate: [{ kind: "scrim", alpha: 0.42 }], ornaments: [] },
  },
  {
    id: "glass",
    category: "business",
    label: "毛玻璃卡",
    caption: "烟熏玻璃底板 · 高光边",
    palette: { name: "#FFFFFF", title: "#EEF2F7", accent: "#FFFFFF", band: "rgba(28,34,46,0.55)" },
    fonts: { name: "sans", title: "sans" },
    type: { ...baseType, nameWeight: 700, nameTracking: 0.03, enFill: "$title", shadow: 0.2 },
    layout: { kind: "stack", padX: 0.6, padY: 0.42, gap: 0.42, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "glass", radius: 18, tint: "$band" }],
    ornaments: [],
    motion: { ...baseMotion, plate: "rise" },
    vertical: {
      plate: [{ kind: "glass", radius: 18, tint: "$band" }],
      ornaments: [],
      padX: 0.5,
      padY: 0.5,
    },
  },
  {
    id: "newsduo",
    category: "news",
    tagHint: { label: "左侧标签", placeholder: "现场" },
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
    vertical: {
      form: "split",
      drop: 0.9,
      padX: 0.3,
      padY: 0.36,
      plate: [
        { kind: "rect", region: "title", fill: { kind: "linear", axis: "y", stops: [[0, "$accent"], [1, "$accent", 0.92]] } },
        { kind: "rect", region: "name", fill: { kind: "solid", color: "$band" }, shadow: 0.3 },
        { kind: "rect", region: "lead", fill: { kind: "solid", color: NAVY } },
      ],
      ornaments: [],
    },
  },
  {
    id: "techedge",
    category: "business",
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
    vertical: {
      padX: 0.5,
      padY: 0.5,
      plate: [{ kind: "chamfer", cut: 22, fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [1, "$band", 0.74]] } }],
      ornaments: [
        { kind: "flow", color: "$accent", width: 2 },
        { kind: "ticks", color: "$accent", size: 12, width: 2 },
      ],
    },
  },
  {
    id: "seal",
    category: "ceremony",
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
      tail: 1.5,
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
    category: "ceremony",
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
    category: "business",
    tagHint: { label: "机构行", placeholder: "FENJIU GROUP" },
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
    vertical: {
      padX: 0.5,
      padY: 0.55,
      tag: "column",
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 6, shadow: 0.4 }],
      ornaments: [{ kind: "rule", at: "top", color: "$accent", width: 7, span: "plate" }],
    },
  },
  {
    id: "redcarpet",
    category: "ceremony",
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
    vertical: {
      padX: 0.55,
      padY: 0.6,
      tail: 1.8,
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "#5E0614", 0.96], [0.12, "$band"], [0.6, "$band", 0.9], [1, "$band", 0]] },
        },
        {
          kind: "rect",
          fill: { kind: "linear", stops: [[0, "#ffd9a0", 0.12], [0.5, "#ffffff", 0], [1, "#000000", 0.22]] },
        },
      ],
      ornaments: [
        { kind: "rule", at: "outer", color: "$gold", width: 2, span: "plate", fadeEnd: true },
        { kind: "rule", at: "inner", color: "$gold", width: 2, span: "plate", fadeEnd: true },
        { kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text" },
      ],
    },
  },
  {
    id: "sport",
    category: "creative",
    tagHint: { label: "号码", placeholder: "10" },
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
    vertical: {
      form: "split",
      drop: 1.1,
      splitGap: 0.06,
      padX: 0.3,
      padY: 0.42,
      plate: [
        { kind: "skew", region: "title", fill: { kind: "solid", color: "$accent" }, skew: 0.3 },
        { kind: "skew", region: "name", fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [1, "$band", 0.92]] }, skew: 0.3 },
        { kind: "skew", region: "lead", fill: { kind: "linear", stops: [[0, "$accent"], [1, "#7d0a1d"]] }, skew: 0.3 },
      ],
      ornaments: [],
    },
  },
  {
    id: "dialog",
    category: "news",
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
    vertical: {
      padX: 0.42,
      padY: 0.42,
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 14, shadow: 0.3 }],
      ornaments: [
        { kind: "dot", color: "$accent" },
        { kind: "rule", at: "between", color: "$accent", width: 2, span: "text" },
      ],
    },
  },
  /* ------------------------------------------------------------ v2 set */
  {
    id: "variety",
    category: "creative",
    label: "卫视综艺",
    caption: "糖果色圆角块 · 弹跳登场",
    tagHint: { label: "角标", placeholder: "嘉宾" },
    palette: { name: "#FFFFFF", title: "#1E1B2E", accent: "#FF3D7F", band: "#FFFFFF" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 56,
      title: 24,
      en: 15,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 600,
      titleTracking: 0.08,
      titleAlpha: 1,
      enWeight: 700,
      enTracking: 0.16,
      enFill: "rgba(255,255,255,0.86)",
      tagFill: "#1E1B2E",
      shadow: 0.12,
    },
    layout: { kind: "blocks", blocks: "stack", padX: 0.42, padY: 0, gap: 0, tail: 0, en: "inline", lead: "tag", tierGap: 0.12, titleIndent: 0.55, titleLineHeight: 1.4 },
    plate: [
      { kind: "rect", region: "title", pill: true, fill: { kind: "solid", color: "$band" }, shadow: 0.28 },
      { kind: "rect", region: "name", pill: true, fill: { kind: "linear", stops: [[0, "$accent"], [1, "#FF8A3D"]] }, shadow: 0.35 },
      { kind: "rect", region: "lead", pill: true, fill: { kind: "solid", color: "#FFD43B" }, shadow: 0.25 },
    ],
    ornaments: [{ kind: "sparkle", color: "#FFE66D" }],
    motion: { ...baseMotion, plate: "pop", ease: "quint", sweepDefault: false },
    vertical: {
      form: "split",
      drop: 0.7,
      splitGap: 0.1,
      padX: 0.26,
      padY: 0.5,
      titlePad: 1.2,
      plate: [
        { kind: "rect", region: "title", pill: true, fill: { kind: "solid", color: "$band" }, shadow: 0.28 },
        { kind: "rect", region: "name", pill: true, fill: { kind: "linear", axis: "y", stops: [[0, "$accent"], [1, "#FF8A3D"]] }, shadow: 0.35 },
        { kind: "rect", region: "lead", pill: true, fill: { kind: "solid", color: "#FFD43B" }, shadow: 0.25 },
      ],
      ornaments: [{ kind: "sparkle", color: "#FFE66D" }],
    },
  },
  {
    id: "docu",
    category: "ceremony",
    label: "纪录片",
    caption: "无底板 · 细宋宽字距 · 胶片感",
    palette: { name: "#F5F1E8", title: "#E6E0D2", accent: "#D8C7A0", band: "rgba(0,0,0,0.5)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      name: 60,
      title: 24,
      en: 14,
      nameWeight: 500,
      titleWeight: 500,
      nameTracking: 0.34,
      titleTracking: 0.24,
      enTracking: 0.6,
      enFont: "serif",
      enWeight: 600,
      enFill: "$accent",
      titleAlpha: 0.86,
      shadow: 0.6,
    },
    layout: { kind: "stack", padX: 0, padY: 0, gap: 0.62, tail: 0, en: "above", titleLineHeight: 1.6 },
    plate: [{ kind: "scrim", alpha: 0.3 }],
    ornaments: [{ kind: "rule", at: "between", color: "$accent", width: 1, span: "text", fadeEnd: true }],
    motion: { ...baseMotion, plate: "fade", text: "drift", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.2,
      padY: 0.4,
      gap: 0.7,
      plate: [{ kind: "scrim", alpha: 0.42 }],
      ornaments: [{ kind: "rule", at: "between", color: "$accent", width: 1, span: "text", fadeEnd: true }],
    },
  },
  {
    id: "finance",
    category: "business",
    label: "财经数据",
    caption: "终端深色底 · 代码行 · 走势线",
    tagHint: { label: "代码 / 栏目", placeholder: "SZ 000858" },
    palette: { name: "#FFFFFF", title: "#A9B4C2", accent: "#21D07A", band: "rgba(9,13,19,0.92)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 54,
      title: 23,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.03,
      titleWeight: 400,
      titleTracking: 0.08,
      titleAlpha: 0.95,
      enFont: "mono",
      enWeight: 500,
      enTracking: 0.1,
      enFill: "$accent",
      tagFill: "$accent",
      tagFont: "mono",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.5, padY: 0.38, gap: 0.42, tail: 2.5, en: "inline", tag: "above", titleLineHeight: 1.5 },
    plate: [
      { kind: "rect", fill: { kind: "linear", stops: [[0, "$band"], [1, "$band", 0.97]] }, shadow: 0.3 },
      { kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "#ffffff", 0.06], [0.45, "#ffffff", 0], [1, "#ffffff", 0]] } },
    ],
    ornaments: [
      { kind: "rule", at: "top", color: "$accent", width: 2, span: "plate" },
      { kind: "spark", color: "$accent", width: 2 },
      { kind: "cursor", color: "$accent" },
    ],
    motion: { ...baseMotion, text: "mask", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.45,
      padY: 0.5,
      tag: "lead",
      foot: 0.9,
      plate: [
        { kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.3 },
        { kind: "rect", fill: { kind: "linear", stops: [[0, "#ffffff", 0.06], [0.45, "#ffffff", 0], [1, "#ffffff", 0]] } },
      ],
      ornaments: [
        { kind: "rule", at: "top", color: "$accent", width: 2, span: "plate" },
        { kind: "rule", at: "between", color: "rgba(255,255,255,0.14)", width: 1, span: "text" },
        { kind: "spark", color: "$accent", width: 2 },
        { kind: "cursor", color: "$accent" },
      ],
    },
  },
  {
    id: "lecture",
    category: "business",
    label: "学术讲座",
    caption: "白卡 · 院系色顶线 · 机构行",
    tagHint: { label: "机构", placeholder: "经济管理学院" },
    palette: { name: "#1A1A1A", title: "#4A4A4A", accent: "#8C1D40", band: "rgba(255,255,255,0.97)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 54,
      title: 23,
      en: 21,
      nameWeight: 700,
      nameTracking: 0.06,
      titleWeight: 400,
      titleTracking: 0.08,
      titleAlpha: 0.95,
      enFont: "script",
      enWeight: 500,
      enTracking: 0.01,
      enCase: "title",
      enFill: "#7A6A5A",
      tagFill: "$accent",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.62, padY: 0.42, gap: 0.48, tail: 0, en: "inline", tag: "below", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 3, shadow: 0.35 }],
    ornaments: [
      { kind: "rule", at: "top", color: "$accent", width: 6, span: "plate" },
      { kind: "rule", at: "between", color: "#D9D4CC", width: 1, span: "text" },
    ],
    motion: { ...baseMotion, plate: "rise", text: "fade", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.6,
      tag: "column",
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 3, shadow: 0.35 }],
      ornaments: [
        { kind: "rule", at: "top", color: "$accent", width: 6, span: "plate" },
        { kind: "rule", at: "between", color: "#D9D4CC", width: 1, span: "text" },
      ],
    },
  },
  {
    id: "wedding",
    category: "ceremony",
    label: "婚礼典雅",
    caption: "香槟粉底 · 花体英文 · 细金线",
    palette: { name: "#5A3B2E", title: "#7A5A4A", accent: "#C9A27A", band: "rgba(251,243,236,0.95)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      name: 56,
      title: 23,
      en: 30,
      nameWeight: 600,
      nameTracking: 0.14,
      titleWeight: 500,
      titleTracking: 0.16,
      titleAlpha: 0.92,
      enFont: "script",
      enWeight: 500,
      enTracking: 0.01,
      enCase: "title",
      enFill: "#B07C6A",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.72, padY: 0.36, gap: 0.5, tail: 1.8, en: "above", titleLineHeight: 1.5 },
    plate: [
      { kind: "rect", fill: { kind: "linear", stops: [[0, "#F2D9D0", 0.97], [0.35, "$band"], [0.7, "$band", 0.94], [1, "$band", 0]] } },
      { kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "#ffffff", 0.35], [0.5, "#ffffff", 0], [1, "#E8C9B8", 0.16]] } },
    ],
    ornaments: [
      { kind: "rule", at: "top", color: "$gold", width: 1, span: "plate", fadeEnd: true },
      { kind: "rule", at: "bottom", color: "$gold", width: 1, span: "plate", fadeEnd: true },
      { kind: "rule", at: "between", color: "$gold", width: 1, span: "text", cap: "flourish" },
    ],
    motion: { ...baseMotion, plate: "fade", text: "drift", ease: "quint" },
    vertical: {
      padX: 0.6,
      padY: 0.62,
      tail: 1.6,
      plate: [
        {
          kind: "rect",
          fill: { kind: "linear", axis: "y", stops: [[0, "#F2D9D0", 0.97], [0.3, "$band"], [0.68, "$band", 0.94], [1, "$band", 0]] },
        },
        { kind: "rect", fill: { kind: "linear", stops: [[0, "#ffffff", 0.35], [0.5, "#ffffff", 0], [1, "#E8C9B8", 0.16]] } },
      ],
      ornaments: [
        { kind: "rule", at: "outer", color: "$gold", width: 1, span: "plate", fadeEnd: true },
        { kind: "rule", at: "inner", color: "$gold", width: 1, span: "plate", fadeEnd: true },
        { kind: "rule", at: "between", color: "$gold", width: 1, span: "text" },
      ],
    },
  },
  {
    id: "aurora",
    category: "creative",
    label: "极光渐变",
    caption: "流动极光色卡 · 柔光",
    palette: { name: "#FFFFFF", title: "#EEF0FF", accent: "#9F8CFF", band: "rgba(20,18,48,0.74)" },
    fonts: { name: "sans", title: "sans" },
    type: { ...baseType, nameWeight: 700, nameTracking: 0.03, enFill: "#E4E0FF", titleAlpha: 0.9, shadow: 0.25 },
    layout: { kind: "stack", padX: 0.62, padY: 0.42, gap: 0.42, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "aurora", radius: 22, base: "$band", colors: ["#3EE6C1", "$accent", "#FF7AB6", "#5B8CFF"] }],
    ornaments: [],
    motion: { ...baseMotion, plate: "rise", ease: "quint", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.5,
      plate: [{ kind: "aurora", radius: 22, base: "$band", colors: ["#3EE6C1", "$accent", "#FF7AB6", "#5B8CFF"] }],
      ornaments: [],
    },
  },
  {
    id: "capsule",
    keepOrder: true,
    category: "creative",
    label: "胶囊标签",
    caption: "分段胶囊 · 状态标签 · 现代 UI",
    tagHint: { label: "状态标签", placeholder: "LIVE" },
    palette: { name: "#FFFFFF", title: "#16181D", accent: "#FF3B30", band: "rgba(22,24,30,0.94)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 46,
      title: 21,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.03,
      titleWeight: 500,
      titleTracking: 0.08,
      titleAlpha: 1,
      enFill: "#9AA3B2",
      enWeight: 600,
      tagFill: "#FFFFFF",
      shadow: 0,
    },
    layout: { kind: "blocks", blocks: "row", padX: 0.5, padY: 0, gap: 0, tail: 0, en: "inline", lead: "tag", titleLineHeight: 1.35 },
    plate: [
      { kind: "rect", region: "title", pill: true, fill: { kind: "solid", color: "#FFFFFF", alpha: 0.95 }, shadow: 0.3 },
      { kind: "rect", region: "name", pill: true, fill: { kind: "solid", color: "$band" } },
      { kind: "rect", region: "lead", pill: true, fill: { kind: "solid", color: "$accent" }, shadow: 0.25 },
    ],
    ornaments: [{ kind: "dot", color: "#FFFFFF" }],
    motion: { ...baseMotion, plate: "pop", text: "fade", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      form: "split",
      drop: 0.55,
      splitGap: -0.42,
      padX: 0.32,
      padY: 0.52,
      titlePad: 1.25,
      plate: [
        { kind: "rect", region: "title", pill: true, fill: { kind: "solid", color: "#FFFFFF", alpha: 0.95 }, shadow: 0.3 },
        { kind: "rect", region: "name", pill: true, fill: { kind: "solid", color: "$band" } },
        { kind: "rect", region: "lead", pill: true, fill: { kind: "solid", color: "$accent" }, shadow: 0.25 },
      ],
      ornaments: [],
    },
  },
  {
    id: "magazine",
    keepOrder: true,
    category: "creative",
    label: "杂志封面",
    caption: "超大首字母 · 编辑排版",
    palette: { name: "#111111", title: "#333333", accent: "#E0362C", band: "rgba(250,248,244,0.97)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 60,
      title: 24,
      en: 24,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 500,
      titleTracking: 0.12,
      titleAlpha: 0.92,
      enFont: "script",
      enWeight: 500,
      enTracking: 0.01,
      enCase: "title",
      enFill: "$accent",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.5, padY: 0.42, gap: 0.46, tail: 0, en: "inline", lead: "initial", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.45 }],
    ornaments: [
      { kind: "initial", color: "$accent" },
      { kind: "rule", at: "between", color: "#111111", width: 2, span: "name" },
      { kind: "rule", at: "bottom", color: "$accent", width: 5, span: "plate" },
    ],
    motion: { ...baseMotion, text: "mask", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.5,
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.45 }],
      ornaments: [
        { kind: "initial", color: "$accent" },
        { kind: "rule", at: "between", color: "#111111", width: 2, span: "text" },
        { kind: "rule", at: "bottom", color: "$accent", width: 5, span: "plate" },
      ],
    },
  },
  {
    id: "ink",
    category: "ceremony",
    label: "水墨",
    caption: "飞白笔触底 · 宋体 · 朱印",
    palette: { name: "#F7F3EA", title: "#E7E1D4", accent: "#C8102E", band: "rgba(18,18,20,0.9)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      name: 62,
      title: 24,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.14,
      titleWeight: 500,
      titleTracking: 0.14,
      titleAlpha: 0.86,
      enFont: "serif",
      enWeight: 600,
      enTracking: 0.3,
      enFill: "#BDB4A2",
      shadow: 0.3,
    },
    layout: { kind: "stack", padX: 0.8, padY: 0.52, gap: 0.5, tail: 2.6, en: "below", lead: "stamp", titleLineHeight: 1.5 },
    plate: [{ kind: "brush", fill: { kind: "linear", stops: [[0, "$band"], [0.6, "$band", 0.94], [1, "$band", 0]] } }],
    ornaments: [{ kind: "seal", color: "$accent" }],
    motion: { ...baseMotion, text: "fade", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.62,
      padY: 0.62,
      tail: 2.2,
      plate: [{ kind: "brush", fill: { kind: "linear", stops: [[0, "$band"], [0.6, "$band", 0.94], [1, "$band", 0]] } }],
      ornaments: [{ kind: "seal", color: "$accent" }],
    },
  },
  {
    id: "neon",
    category: "creative",
    label: "赛博霓虹",
    caption: "霓虹描边 · 辉光 · 闪烁点亮",
    palette: { name: "#FFFFFF", title: "#CFE9FF", accent: "#FF2BD6", band: "rgba(8,6,20,0.84)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      nameWeight: 700,
      nameTracking: 0.06,
      enFont: "mono",
      enWeight: 500,
      enTracking: 0.18,
      enFill: "#3CF2FF",
      titleAlpha: 0.9,
      glow: "$accent",
      shadow: 0.3,
    },
    layout: { kind: "stack", padX: 0.62, padY: 0.42, gap: 0.46, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "linear", stops: [[0, "$band"], [1, "$band", 0.9]] }, radius: 10 }],
    ornaments: [{ kind: "neon", color: "$accent", color2: "#3CF2FF", width: 2.5, radius: 10 }],
    motion: { ...baseMotion, plate: "flicker", text: "fade", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.5,
      plate: [{ kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [1, "$band", 0.9]] }, radius: 10 }],
      ornaments: [{ kind: "neon", color: "$accent", color2: "#3CF2FF", width: 2.5, radius: 10 }],
    },
  },
  {
    id: "applewhite",
    category: "business",
    label: "发布会白",
    caption: "白色圆角卡 · 黑灰字 · 极简",
    palette: { name: "#1D1D1F", title: "#6E6E73", accent: "#0071E3", band: "rgba(255,255,255,0.95)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 56,
      title: 23,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.01,
      titleWeight: 400,
      titleTracking: 0.08,
      titleAlpha: 1,
      enWeight: 600,
      enTracking: 0.24,
      enFill: "$accent",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.72, padY: 0.5, gap: 0.4, tail: 0, en: "above", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 22, shadow: 0.3 }],
    ornaments: [],
    motion: { ...baseMotion, plate: "rise", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.55,
      padY: 0.62,
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 22, shadow: 0.3 }],
      ornaments: [],
    },
  },
  {
    id: "govred",
    category: "news",
    label: "政务庄重",
    caption: "中国红底 · 金色回纹 · 对称",
    palette: { name: "#FFE9B8", title: "#F6E3C0", accent: "#E2B65C", band: "rgba(170,18,24,0.96)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      nameWeight: 700,
      nameTracking: 0.12,
      titleWeight: 500,
      titleTracking: 0.12,
      titleAlpha: 0.95,
      enFont: "serif",
      en: 17,
      enWeight: 600,
      enFill: "$accent",
      shadow: 0.25,
    },
    layout: { kind: "inline", padX: 0.72, padY: 0.66, gap: 0.5, tail: 0, en: "column", titleLineHeight: 1.45 },
    plate: [
      { kind: "rect", fill: { kind: "linear", stops: [[0, "#8E0C12"], [0.3, "$band"], [1, "$band"]] }, shadow: 0.35 },
      { kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "#ffcf8a", 0.1], [0.5, "#ffffff", 0], [1, "#000000", 0.16]] } },
    ],
    ornaments: [
      { kind: "fret", color: "$gold", size: 9, at: "both" },
      { kind: "divider", color: "$gold", width: 1.5 },
    ],
    motion: { ...baseMotion, text: "mask" },
    vertical: {
      padX: 0.62,
      padY: 0.95,
      plate: [
        { kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "#8E0C12"], [0.22, "$band"], [1, "$band"]] }, shadow: 0.35 },
        { kind: "rect", fill: { kind: "linear", stops: [[0, "#ffcf8a", 0.1], [0.5, "#ffffff", 0], [1, "#000000", 0.16]] } },
      ],
      ornaments: [
        { kind: "fret", color: "$gold", size: 9, at: "both" },
        { kind: "divider", color: "$gold", width: 1.5 },
      ],
    },
  },
  /* ------------------------------------------------------------ v3 set */
  {
    id: "redsun",
    category: "ceremony",
    label: "朱日题名",
    caption: "朱红圆日衬姓 · 宋体 · 无底板",
    palette: { name: "#FFFFFF", title: "#F3EDE4", accent: "#D7262E", band: "rgba(0,0,0,0.5)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 64,
      title: 25,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.1,
      titleWeight: 500,
      titleTracking: 0.12,
      titleAlpha: 0.94,
      enFont: "serif",
      enWeight: 600,
      enTracking: 0.3,
      enFill: "#EBCFAE",
      shadow: 0.55,
    },
    layout: { kind: "stack", padX: 0.5, padY: 0.42, gap: 0.5, tail: 0, en: "below", titleLineHeight: 1.5 },
    plate: [{ kind: "scrim", alpha: 0.34 }],
    ornaments: [
      { kind: "disc", color: "$accent", color2: "#F0573E" },
      { kind: "rule", at: "between", color: "$accent", width: 1.5, span: "text", fadeEnd: true },
    ],
    motion: { ...baseMotion, plate: "fade", text: "rise", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.55,
      plate: [{ kind: "scrim", alpha: 0.38 }],
      ornaments: [
        { kind: "disc", color: "$accent", color2: "#F0573E" },
        { kind: "rule", at: "between", color: "$accent", width: 1.5, span: "text", fadeEnd: true },
      ],
    },
  },
  {
    id: "strips",
    category: "news",
    label: "朱条题名",
    caption: "每行职务一条红底 · 渐隐收尾",
    palette: { name: "#FFFFFF", title: "#FFFFFF", accent: "#C8102E", band: "rgba(0,0,0,0.45)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 60,
      title: 24,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.08,
      titleWeight: 500,
      titleTracking: 0.1,
      titleAlpha: 1,
      enFont: "serif",
      enWeight: 600,
      enFill: "#F2D3A0",
      shadow: 0.5,
    },
    layout: { kind: "stack", padX: 0.55, padY: 0.42, gap: 0.66, tail: 0.6, en: "inline", titleLineHeight: 1.78 },
    plate: [
      { kind: "scrim", alpha: 0.3 },
      { kind: "strips", fill: { kind: "solid", color: "$accent", alpha: 0.94 }, pad: 0.26 },
    ],
    ornaments: [{ kind: "edge", color: "$accent", width: 4 }],
    motion: { ...baseMotion, plate: "fade", text: "mask", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.55,
      gap: 0.7,
      colGap: 1.0,
      tail: 1.2,
      plate: [
        { kind: "scrim", alpha: 0.3 },
        { kind: "strips", fill: { kind: "solid", color: "$accent", alpha: 0.94 }, pad: 0.26 },
      ],
      ornaments: [],
    },
  },
  {
    id: "lightline",
    category: "creative",
    label: "光线粒子",
    caption: "发光细线 · 粒子漂浮 · 无底板",
    palette: { name: "#FFFFFF", title: "#E8F1FF", accent: "#7FD8FF", band: "rgba(0,0,0,0.45)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 62,
      title: 25,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.08,
      titleWeight: 400,
      titleTracking: 0.14,
      titleAlpha: 0.92,
      enWeight: 600,
      enTracking: 0.32,
      enFill: "#BFE9FF",
      shadow: 0.6,
    },
    layout: { kind: "stack", padX: 0.2, padY: 0.42, gap: 0.72, tail: 0, en: "above", titleLineHeight: 1.55 },
    plate: [{ kind: "scrim", alpha: 0.3 }],
    ornaments: [{ kind: "beam", color: "$accent" }],
    motion: { ...baseMotion, plate: "fade", text: "drift", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.3,
      padY: 0.55,
      gap: 0.72,
      plate: [{ kind: "scrim", alpha: 0.38 }],
      ornaments: [{ kind: "beam", color: "$accent" }],
    },
  },
  {
    id: "silk",
    category: "ceremony",
    label: "红绸飘带",
    caption: "飘逸红绸衬底 · 金白字",
    palette: { name: "#FFF6E2", title: "#FBE6C4", accent: "#E8C27A", band: "#C8102E" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 58,
      title: 24,
      en: 15,
      nameWeight: 700,
      nameTracking: 0.1,
      titleWeight: 500,
      titleTracking: 0.1,
      titleAlpha: 0.96,
      enFont: "serif",
      enWeight: 600,
      enFill: "#F3D9A8",
      shadow: 0.45,
    },
    layout: { kind: "stack", padX: 0.95, padY: 0.52, gap: 0.46, tail: 3.0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "ribbon", color: "$band", deep: "#5E0510" }],
    ornaments: [{ kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text", fadeEnd: true }],
    motion: { ...baseMotion },
    vertical: {
      padX: 0.72,
      padY: 0.85,
      tail: 2.2,
      plate: [{ kind: "ribbon", color: "$band", deep: "#5E0510" }],
      ornaments: [{ kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text" }],
    },
  },
  {
    id: "techblue",
    category: "business",
    label: "科技蓝条",
    caption: "蓝色斜切光条 · 箭头律动",
    palette: { name: "#FFFFFF", title: "#E6F3FF", accent: "#3FD0FF", band: "#1D5BFF" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 50,
      title: 22,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 500,
      titleTracking: 0.1,
      titleAlpha: 1,
      enWeight: 600,
      enTracking: 0.18,
      enFill: "#CFF3FF",
      shadow: 0.2,
    },
    layout: { kind: "tiers", padX: 0.5, padY: 0, gap: 0, tail: 0, en: "inline", titleLineHeight: 1.4, skew: 0.22 },
    plate: [
      { kind: "skew", region: "name", fill: { kind: "linear", stops: [[0, "$band"], [1, "#2EA8FF"]] }, skew: 0.22 },
      { kind: "skew", region: "title", fill: { kind: "linear", stops: [[0, "#06163A", 0.94], [1, "#06163A", 0.82]] }, skew: 0.22 },
    ],
    ornaments: [
      { kind: "chevrons", color: "$accent" },
      { kind: "rule", at: "bottom", color: "$accent", width: 2, span: "plate", fadeEnd: true },
    ],
    motion: { ...baseMotion, ease: "quint", text: "mask" },
    vertical: {
      form: "split",
      drop: 1.0,
      splitGap: 0.06,
      padX: 0.3,
      padY: 0.42,
      plate: [
        { kind: "skew", region: "title", fill: { kind: "linear", axis: "y", stops: [[0, "#06163A", 0.94], [1, "#06163A", 0.82]] }, skew: 0.18 },
        { kind: "skew", region: "name", fill: { kind: "linear", axis: "y", stops: [[0, "$band"], [1, "#2EA8FF"]] }, skew: 0.18 },
      ],
      ornaments: [{ kind: "chevrons", color: "$accent" }],
    },
  },
  {
    id: "viewfinder",
    category: "news",
    label: "取景框",
    caption: "四角取景框 · 录制红点 · 现场感",
    palette: { name: "#FFFFFF", title: "#E4E8EE", accent: "#FF3B30", band: "rgba(8,10,14,0.58)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 56,
      title: 23,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 400,
      titleTracking: 0.1,
      titleAlpha: 0.94,
      enFont: "mono",
      enWeight: 500,
      enTracking: 0.16,
      enFill: "#C9D2DC",
      shadow: 0.25,
    },
    layout: { kind: "stack", padX: 0.55, padY: 0.5, gap: 0.42, tail: 0, en: "above", lead: "dot", titleLineHeight: 1.5 },
    plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 3 }],
    ornaments: [
      { kind: "dot", color: "$accent" },
      { kind: "brackets", color: "#FFFFFF", size: 16, width: 2.5 },
    ],
    motion: { ...baseMotion, plate: "fade", text: "mask", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.5,
      padY: 0.55,
      plate: [{ kind: "rect", fill: { kind: "solid", color: "$band" }, radius: 3 }],
      ornaments: [
        { kind: "dot", color: "$accent" },
        { kind: "brackets", color: "#FFFFFF", size: 16, width: 2.5 },
      ],
    },
  },
  {
    id: "goldink",
    category: "ceremony",
    label: "金墨山水",
    caption: "鎏金楷书 · 远山水墨 · 无底板",
    palette: { name: "#F3DDA6", title: "#F4ECDD", accent: "#D9B46C", band: "rgba(0,0,0,0.5)" },
    fonts: { name: "wenkai", title: "serif" },
    type: {
      ...baseType,
      name: 64,
      title: 25,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.12,
      titleWeight: 500,
      titleTracking: 0.14,
      titleAlpha: 0.95,
      enFont: "serif",
      enWeight: 600,
      enTracking: 0.3,
      enFill: "#E9D3A0",
      nameFill: "$gold",
      shadow: 0.55,
    },
    layout: { kind: "stack", padX: 0.25, padY: 0.45, gap: 0.52, tail: 0.6, en: "below", titleLineHeight: 1.5 },
    plate: [
      { kind: "scrim", alpha: 0.42 },
      { kind: "mountains", color: "$accent" },
    ],
    ornaments: [{ kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text", fadeEnd: true }],
    motion: { ...baseMotion, plate: "fade", text: "drift", ease: "quint", sweep: "text", sweepDefault: true },
    vertical: {
      padX: 0.35,
      padY: 0.5,
      tail: 1.1,
      plate: [
        { kind: "scrim", alpha: 0.44 },
        { kind: "mountains", color: "$accent" },
      ],
      ornaments: [{ kind: "rule", at: "between", color: "$gold", width: 1.25, span: "text", fadeEnd: true }],
    },
  },
  {
    id: "comic",
    category: "creative",
    label: "漫画贴纸",
    caption: "描边贴纸 · 撞色 · 弹跳",
    tagHint: { label: "角标", placeholder: "嘉宾" },
    palette: { name: "#141414", title: "#FFFFFF", accent: "#FF3D5A", band: "#FFD43B" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 52,
      title: 23,
      en: 15,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 700,
      titleTracking: 0.08,
      titleAlpha: 1,
      enFont: "cond",
      enWeight: 700,
      enTracking: 0.1,
      enFill: "#141414",
      tagFill: "#FFFFFF",
      italic: true,
      shadow: 0,
    },
    layout: { kind: "blocks", blocks: "stack", padX: 0.45, padY: 0, gap: 0, tail: 0, en: "inline", lead: "tag", tierGap: 0.12, titleIndent: 0.7, titleLineHeight: 1.4 },
    plate: [
      { kind: "skew", region: "title", fill: { kind: "solid", color: "#2F6BFF" }, skew: 0.14, outline: "#141414", outlineWidth: 3, drop: 6 },
      { kind: "skew", region: "name", fill: { kind: "solid", color: "$band" }, skew: 0.14, outline: "#141414", outlineWidth: 3, drop: 6 },
      { kind: "rect", region: "lead", fill: { kind: "solid", color: "$accent" }, radius: 8, outline: "#141414", outlineWidth: 3, drop: 4 },
    ],
    ornaments: [],
    motion: { ...baseMotion, plate: "pop", text: "fade", ease: "back", sweep: "none", sweepDefault: false },
    vertical: {
      form: "split",
      drop: 0.8,
      splitGap: 0.16,
      padX: 0.3,
      padY: 0.4,
      plate: [
        { kind: "skew", region: "title", fill: { kind: "solid", color: "#2F6BFF" }, skew: 0.12, outline: "#141414", outlineWidth: 3, drop: 6 },
        { kind: "skew", region: "name", fill: { kind: "solid", color: "$band" }, skew: 0.12, outline: "#141414", outlineWidth: 3, drop: 6 },
        { kind: "rect", region: "lead", fill: { kind: "solid", color: "$accent" }, radius: 8, outline: "#141414", outlineWidth: 3, drop: 4 },
      ],
      ornaments: [],
    },
  },
  {
    id: "flare",
    category: "creative",
    label: "流光光晕",
    caption: "镜头光晕横扫 · 暖金大字",
    palette: { name: "#FFF5E3", title: "#F6E7CF", accent: "#FF6A2B", band: "rgba(0,0,0,0.5)" },
    fonts: { name: "serif", title: "sans" },
    type: {
      ...baseType,
      name: 64,
      title: 25,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.1,
      titleWeight: 500,
      titleTracking: 0.14,
      titleAlpha: 0.94,
      enFont: "serif",
      enWeight: 600,
      enTracking: 0.28,
      enFill: "#FFC48A",
      shadow: 0.6,
    },
    layout: { kind: "stack", padX: 0.3, padY: 0.45, gap: 0.5, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "scrim", alpha: 0.32 }],
    ornaments: [
      { kind: "flare", color: "$accent", core: "#FFD9A0" },
      { kind: "rule", at: "between", color: "$accent", width: 1, span: "text", fadeEnd: true },
    ],
    motion: { ...baseMotion, plate: "fade", text: "mask", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.4,
      padY: 0.55,
      plate: [{ kind: "scrim", alpha: 0.4 }],
      ornaments: [
        { kind: "flare", color: "$accent", core: "#FFD9A0" },
        { kind: "rule", at: "between", color: "$accent", width: 1, span: "text", fadeEnd: true },
      ],
    },
  },
  {
    id: "metal",
    category: "business",
    label: "金属拉丝",
    caption: "银色拉丝金属条 · 斜光扫过",
    palette: { name: "#16191E", title: "#3A4049", accent: "#B8892E", band: "rgba(255,255,255,1)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 54,
      title: 23,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.04,
      titleWeight: 500,
      titleTracking: 0.1,
      titleAlpha: 1,
      enWeight: 600,
      enTracking: 0.24,
      enFill: "#6A707A",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 0.66, padY: 0.44, gap: 0.42, tail: 0, en: "inline", titleLineHeight: 1.5 },
    plate: [{ kind: "metal", radius: 4, tone: "silver" }],
    ornaments: [
      { kind: "edge", color: "$accent", width: 6 },
      { kind: "rule", at: "between", color: "rgba(20,24,30,0.28)", width: 1, span: "text" },
    ],
    motion: { ...baseMotion, ease: "quint", text: "mask" },
    vertical: {
      padX: 0.5,
      padY: 0.55,
      plate: [{ kind: "metal", radius: 4, tone: "silver" }],
      ornaments: [
        { kind: "rule", at: "top", color: "$accent", width: 6, span: "plate" },
        { kind: "rule", at: "between", color: "rgba(20,24,30,0.28)", width: 1, span: "text" },
      ],
    },
  },
  {
    id: "serial",
    category: "business",
    label: "编号极简",
    caption: "大号编号 · 细线 · 系列访谈",
    tagHint: { label: "编号", placeholder: "01" },
    palette: { name: "#FFFFFF", title: "#E6E6E6", accent: "#FFC94D", band: "rgba(0,0,0,0.45)" },
    fonts: { name: "sans", title: "sans" },
    type: {
      ...baseType,
      name: 58,
      title: 24,
      en: 13,
      nameWeight: 700,
      nameTracking: 0.03,
      titleWeight: 400,
      titleTracking: 0.1,
      titleAlpha: 0.9,
      enWeight: 600,
      enTracking: 0.26,
      enFill: "$accent",
      tagFill: "$accent",
      shadow: 0.55,
    },
    layout: { kind: "stack", padX: 0.2, padY: 0.42, gap: 0.42, tail: 0, en: "above", lead: "serial", titleLineHeight: 1.5 },
    plate: [{ kind: "scrim", alpha: 0.32 }],
    ornaments: [{ kind: "divider", color: "rgba(255,255,255,0.72)", width: 1.25 }],
    motion: { ...baseMotion, plate: "fade", text: "rise", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.3,
      padY: 0.5,
      plate: [{ kind: "scrim", alpha: 0.38 }],
      ornaments: [{ kind: "divider", color: "rgba(255,255,255,0.72)", width: 1.25 }],
    },
  },
  {
    id: "scroll",
    category: "ceremony",
    label: "卷轴",
    caption: "宣纸卷轴 · 木轴展开 · 朱印",
    palette: { name: "#231B12", title: "#4A3D2E", accent: "#B3261E", band: "rgba(243,234,214,0.98)" },
    fonts: { name: "serif", title: "serif" },
    type: {
      ...baseType,
      name: 58,
      title: 24,
      en: 14,
      nameWeight: 700,
      nameTracking: 0.14,
      titleWeight: 500,
      titleTracking: 0.14,
      titleAlpha: 0.92,
      enFont: "serif",
      enWeight: 600,
      enFill: "#8A6F45",
      shadow: 0,
    },
    layout: { kind: "stack", padX: 1.0, padY: 0.5, gap: 0.46, tail: 0, en: "inline", lead: "stamp", titleLineHeight: 1.5 },
    plate: [
      { kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.35 },
      { kind: "paper", strength: 0.6 },
      { kind: "rect", fill: { kind: "linear", axis: "y", stops: [[0, "#5a4020", 0.1], [0.14, "#5a4020", 0], [0.86, "#5a4020", 0], [1, "#5a4020", 0.12]] } },
    ],
    ornaments: [
      { kind: "seal", color: "$accent" },
      { kind: "rollers", color: "#5B3A21", knob: "#C9A24E" },
      { kind: "rule", at: "between", color: "$accent", width: 1, span: "text" },
    ],
    motion: { ...baseMotion, text: "fade", ease: "quint", sweep: "none", sweepDefault: false },
    vertical: {
      padX: 0.62,
      padY: 1.0,
      plate: [
        { kind: "rect", fill: { kind: "solid", color: "$band" }, shadow: 0.35 },
        { kind: "paper", strength: 0.6 },
        { kind: "rect", fill: { kind: "linear", stops: [[0, "#5a4020", 0.1], [0.14, "#5a4020", 0], [0.86, "#5a4020", 0], [1, "#5a4020", 0.12]] } },
      ],
      ornaments: [
        { kind: "seal", color: "$accent" },
        { kind: "rollers", color: "#5B3A21", knob: "#C9A24E" },
        { kind: "rule", at: "between", color: "$accent", width: 1, span: "text" },
      ],
    },
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
