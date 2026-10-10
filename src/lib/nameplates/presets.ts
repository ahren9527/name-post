import { TEMPLATES, type TemplateCategory } from "./premium/spec";
import type { NameplateStyle, Side } from "./types";

export type PresetGroup =
  | "premium"
  | "line"
  | "block"
  | "split"
  | "slash"
  | "wave"
  | "bracket"
  | "simple";

export interface StyleCard {
  id: string;
  label: string;
  caption: string;
  style: NameplateStyle;
  side: Side;
  accentColor: string;
  bandColor: string;
  nameColor?: string;
  titleColor?: string;
  group: PresetGroup;
  nameFontId?: string;
  titleFontId?: string;
  sweep?: boolean;
  /** 旗舰 sub-category (gallery chips). */
  sub?: TemplateCategory;
}

export function groupOf(style: NameplateStyle): PresetGroup {
  if (TEMPLATES.some((t) => t.id === style)) return "premium";
  switch (style) {
    case "underline":
    case "hook":
    case "ledge":
      return "line";
    case "block":
      return "block";
    case "split":
    case "rule":
      return "split";
    case "ceremony":
    case "skew":
    case "duo":
    case "fold":
      return "slash";
    case "wave":
      return "wave";
    case "bracket":
      return "bracket";
    default:
      return "simple";
  }
}

const GOLD = "#CFAA66";
const RED = "#C8102E";

/** Flagship cards: one per premium template, palette + fonts from its spec. */
export const PREMIUM_CARDS: StyleCard[] = TEMPLATES.map((t) => ({
  id: `pro-${t.id}`,
  label: t.label,
  caption: t.caption,
  style: t.id,
  side: "left",
  accentColor: t.palette.accent,
  bandColor: t.palette.band,
  nameColor: t.palette.name,
  titleColor: t.palette.title,
  nameFontId: t.fonts.name,
  titleFontId: t.fonts.title,
  sweep: t.motion.sweepDefault,
  group: "premium",
  sub: t.category,
}));

function card(
  id: string,
  label: string,
  style: NameplateStyle,
  accent: string,
  group: PresetGroup,
  extra?: Partial<StyleCard>,
): StyleCard {
  return {
    id,
    label,
    caption: label,
    style,
    side: "left",
    accentColor: accent,
    bandColor: extra?.bandColor ?? (accent === GOLD ? "rgba(12,10,6,0.45)" : "rgba(10,10,10,0.5)"),
    group,
    ...extra,
  };
}

export const CLASSIC_CARDS: StyleCard[] = [
  card("duo-gold", "双斜杠", "duo", GOLD, "slash"),
  card("hook-white", "勾线", "hook", "#f4f4f4", "line"),
  card("fold-white", "叠字", "fold", "#f4f4f4", "slash"),
  card("split-white", "双栏", "split", "#f2f2f2", "split"),
  card("underline-white", "下划线", "underline", "#f2f2f2", "line"),
  card("block-white", "方块", "block", "#f4f4f4", "block"),
  card("ledge-white", "侧勾", "ledge", "#f4f4f4", "line"),
  card("wave-cyan", "光弧", "wave", "#3EC6E0", "wave", { bandColor: "rgba(8,18,28,0.4)" }),
  card("bracket-red", "括号", "bracket", RED, "bracket", { bandColor: "rgba(20,8,8,0.4)" }),
  card("skew-white", "斜切条", "skew", "#f4f4f4", "slash", {
    bandColor: "#f4f4f4",
    nameColor: "#141414",
    titleColor: "#f2f2f2",
  }),
  card("rule-white", "竖线条", "rule", "#f4f4f4", "split", {
    bandColor: "#f4f4f4",
    nameColor: "#f7f7f7",
    titleColor: "#161616",
  }),
  card("slash-white", "斜杠", "ceremony", "#f2f2f2", "slash"),
  card("duo-white", "双斜杠白", "duo", "#f4f4f4", "slash"),
  card("hook-gold", "勾线金", "hook", GOLD, "line"),
  card("fold-gold", "叠字金", "fold", GOLD, "slash"),
  card("split-gold", "双栏金", "split", GOLD, "split"),
  card("underline-gold", "下划线金", "underline", GOLD, "line"),
  card("underline-red", "下划线红", "underline", RED, "line", { bandColor: "rgba(20,8,8,0.5)" }),
  card("block-gold", "方块金", "block", GOLD, "block"),
  card("block-red", "方块红", "block", RED, "block", { bandColor: "rgba(20,8,8,0.5)" }),
  card("ledge-gold", "侧勾金", "ledge", GOLD, "line"),
  card("wave-gold", "光弧金", "wave", GOLD, "wave", { bandColor: "rgba(18,12,4,0.4)" }),
  card("wave-blue", "光弧蓝", "wave", "#4f8cff", "wave", { bandColor: "rgba(8,14,28,0.4)" }),
  card("bracket-white", "括号白", "bracket", "#f2f2f2", "bracket"),
  card("bracket-gold", "括号金", "bracket", GOLD, "bracket"),
  card("skew-gold", "斜切金", "skew", GOLD, "slash", {
    bandColor: GOLD,
    nameColor: "#1a1408",
    titleColor: "#f3e6c0",
  }),
  card("skew-red", "斜切红", "skew", RED, "slash", {
    bandColor: RED,
    nameColor: "#ffffff",
    titleColor: "#f2f2f2",
  }),
  card("rule-red", "竖线红条", "rule", RED, "split", {
    bandColor: RED,
    nameColor: "#f7f7f7",
    titleColor: "#ffffff",
  }),
  card("rule-gold", "竖线金条", "rule", GOLD, "split", {
    bandColor: GOLD,
    nameColor: "#f7f7f7",
    titleColor: "#1a1408",
  }),
  card("slash-gold", "斜杠金", "ceremony", GOLD, "slash"),
  card("slash-blue", "斜杠蓝", "ceremony", "#4f8cff", "slash", { bandColor: "rgba(8,14,28,0.5)" }),
];

export const STYLE_CARDS: StyleCard[] = [...PREMIUM_CARDS, ...CLASSIC_CARDS];
