import type { NameplateStyle, Side } from "./types";

export type PresetGroup =
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
}

export function groupOf(style: NameplateStyle): PresetGroup {
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
    bandColor: extra?.bandColor ?? (accent === "#e8b423" || accent === "#d4a017" ? "rgba(12,10,6,0.45)" : "rgba(10,10,10,0.5)"),
    group,
    ...extra,
  };
}

export const STYLE_CARDS: StyleCard[] = [
  card("duo-gold", "双斜杠", "duo", "#e8b423", "slash"),
  card("hook-white", "勾线", "hook", "#f4f4f4", "line"),
  card("fold-white", "叠字", "fold", "#f4f4f4", "slash"),
  card("split-white", "双栏", "split", "#f2f2f2", "split"),
  card("underline-white", "下划线", "underline", "#f2f2f2", "line"),
  card("block-white", "方块", "block", "#f4f4f4", "block"),
  card("ledge-white", "侧勾", "ledge", "#f4f4f4", "line"),
  card("wave-cyan", "光弧", "wave", "#2ec8e0", "wave", { bandColor: "rgba(8,18,28,0.4)" }),
  card("bracket-red", "括号", "bracket", "#e23b3b", "bracket", { bandColor: "rgba(20,8,8,0.4)" }),
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
  card("hook-gold", "勾线金", "hook", "#e8b423", "line"),
  card("fold-gold", "叠字金", "fold", "#e8b423", "slash"),
  card("split-gold", "双栏金", "split", "#d4a017", "split"),
  card("underline-gold", "下划线金", "underline", "#d4a017", "line"),
  card("underline-red", "下划线红", "underline", "#e23b3b", "line", { bandColor: "rgba(20,8,8,0.5)" }),
  card("block-gold", "方块金", "block", "#d4a017", "block"),
  card("block-red", "方块红", "block", "#e23b3b", "block", { bandColor: "rgba(20,8,8,0.5)" }),
  card("ledge-gold", "侧勾金", "ledge", "#e8b423", "line"),
  card("wave-gold", "光弧金", "wave", "#e2b13c", "wave", { bandColor: "rgba(18,12,4,0.4)" }),
  card("wave-blue", "光弧蓝", "wave", "#4f8cff", "wave", { bandColor: "rgba(8,14,28,0.4)" }),
  card("bracket-white", "括号白", "bracket", "#f2f2f2", "bracket"),
  card("bracket-gold", "括号金", "bracket", "#d4a017", "bracket"),
  card("skew-gold", "斜切金", "skew", "#d4a017", "slash", {
    bandColor: "#d4a017",
    nameColor: "#1a1408",
    titleColor: "#f3e6c0",
  }),
  card("skew-red", "斜切红", "skew", "#c41e3a", "slash", {
    bandColor: "#c41e3a",
    nameColor: "#ffffff",
    titleColor: "#f2f2f2",
  }),
  card("rule-red", "竖线红条", "rule", "#e23b3b", "split", {
    bandColor: "#e23b3b",
    nameColor: "#f7f7f7",
    titleColor: "#ffffff",
  }),
  card("rule-gold", "竖线金条", "rule", "#d4a017", "split", {
    bandColor: "#d4a017",
    nameColor: "#f7f7f7",
    titleColor: "#1a1408",
  }),
  card("slash-gold", "斜杠金", "ceremony", "#d4a017", "slash"),
  card("slash-blue", "斜杠蓝", "ceremony", "#4f8cff", "slash", { bandColor: "rgba(8,14,28,0.5)" }),
];
