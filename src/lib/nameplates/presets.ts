import { TEMPLATES, type TemplateCategory } from "./premium/spec.ts";
import { CLASSIC_COLORS } from "./classic.ts";
import type { NameplateStyle, Side } from "./types.ts";

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
  /** Classic colour variants (swatch dots on one gallery card). First = default. */
  variants?: CardVariant[];
}

export type VariantKey = "white" | "gold" | "red" | "blue";

export interface CardVariant {
  key: VariantKey;
  label: string;
  /** Dot colour shown in the gallery. */
  swatch: string;
  accentColor: string;
  bandColor: string;
  nameColor: string;
  titleColor: string;
  /** Pre-v3 card ids that now resolve to this style + colour. */
  legacyIds: string[];
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

const C = CLASSIC_COLORS;
const TITLE_LIGHT = "#ECE6DA";

/** Scrim tint per colourway (translucent dark → tints the feathered backplate). */
const SCRIM: Record<VariantKey, string> = {
  white: "rgba(10,10,12,0.5)",
  gold: "rgba(16,12,6,0.5)",
  red: "rgba(24,8,9,0.5)",
  blue: "rgba(8,14,22,0.5)",
};

const VARIANT_LABEL: Record<VariantKey, string> = { white: "白", gold: "金", red: "朱红", blue: "青" };
const ACCENT: Record<VariantKey, string> = { white: C.white, gold: C.gold, red: C.red, blue: C.blue };

function line(key: VariantKey, legacyIds: string[]): CardVariant {
  return {
    key,
    label: VARIANT_LABEL[key],
    swatch: ACCENT[key],
    accentColor: ACCENT[key],
    bandColor: SCRIM[key],
    nameColor: C.white,
    titleColor: TITLE_LIGHT,
    legacyIds,
  };
}

function banded(key: VariantKey, legacyIds: string[], nameColor: string, titleColor: string): CardVariant {
  return { ...line(key, legacyIds), bandColor: ACCENT[key], nameColor, titleColor };
}

function classic(style: NameplateStyle, label: string, caption: string, variants: CardVariant[]): StyleCard {
  const v = variants[0]!;
  return {
    id: `classic-${style}`,
    label,
    caption,
    style,
    side: "left",
    accentColor: v.accentColor,
    bandColor: v.bandColor,
    nameColor: v.nameColor,
    titleColor: v.titleColor,
    nameFontId: "serif",
    titleFontId: "sans",
    group: groupOf(style),
    variants,
  };
}

/** One card per classic style; colourways are swatch dots on the card. */
export const CLASSIC_CARDS: StyleCard[] = [
  classic("duo", "双斜杠", "双斜杠 · 利落", [line("gold", ["duo-gold"]), line("white", ["duo-white"])]),
  classic("hook", "勾线", "斜勾引线", [line("white", ["hook-white"]), line("gold", ["hook-gold"])]),
  classic("fold", "叠字", "首尾叠字", [line("white", ["fold-white"]), line("gold", ["fold-gold"])]),
  classic("split", "双栏", "竖线分栏", [line("white", ["split-white"]), line("gold", ["split-gold"])]),
  classic("underline", "下划线", "渐隐细线", [
    line("white", ["underline-white"]),
    line("gold", ["underline-gold"]),
    line("red", ["underline-red"]),
  ]),
  classic("block", "方块", "方标齐字顶", [line("white", ["block-white"]), line("gold", ["block-gold"]), line("red", ["block-red"])]),
  classic("ledge", "侧勾", "侧竖线", [line("white", ["ledge-white"]), line("gold", ["ledge-gold"])]),
  classic("wave", "光弧", "渐细光弧", [line("blue", ["wave-cyan", "wave-blue"]), line("gold", ["wave-gold"])]),
  classic("bracket", "括号", "对角框线", [
    line("red", ["bracket-red"]),
    line("white", ["bracket-white"]),
    line("gold", ["bracket-gold"]),
  ]),
  classic("skew", "斜切条", "斜切色块", [
    banded("white", ["skew-white"], C.ink, TITLE_LIGHT),
    banded("gold", ["skew-gold"], C.goldInk, TITLE_LIGHT),
    banded("red", ["skew-red"], C.white, TITLE_LIGHT),
  ]),
  classic("rule", "竖线条", "竖条 + 底条", [
    banded("white", ["rule-white"], C.white, C.ink),
    banded("red", ["rule-red"], C.white, C.white),
    banded("gold", ["rule-gold"], C.white, C.goldInk),
  ]),
  classic("ceremony", "斜杠", "斜标 + 细线", [
    line("white", ["slash-white"]),
    line("gold", ["slash-gold"]),
    line("blue", ["slash-blue"]),
  ]),
];

/** Card + colourway → the flat preset the store applies. */
export function cardWithVariant(card: StyleCard, key?: VariantKey): StyleCard {
  const v = card.variants?.find((x) => x.key === key) ?? card.variants?.[0];
  if (!v) return card;
  return {
    ...card,
    accentColor: v.accentColor,
    bandColor: v.bandColor,
    nameColor: v.nameColor,
    titleColor: v.titleColor,
  };
}

const LEGACY_IDS = new Map<string, { cardId: string; variant: VariantKey }>(
  CLASSIC_CARDS.flatMap((c) => (c.variants ?? []).flatMap((v) => v.legacyIds.map((id) => [id, { cardId: c.id, variant: v.key }] as const))),
);

/** Map a pre-v3 classic card id (e.g. "underline-gold") to its merged card + colourway. */
export function resolveLegacyCardId(id: string): { cardId: string; variant?: VariantKey } {
  return LEGACY_IDS.get(id) ?? { cardId: id };
}

/** Migrate a favourites list: legacy colour-variant ids collapse onto their style card. */
export function migrateFavorites(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const next = resolveLegacyCardId(id).cardId;
    if (!out.includes(next)) out.push(next);
  }
  return out;
}

/** Which colourway of a classic card matches the current colours (legacy colours included). */
export function activeVariant(card: StyleCard, accentColor: string): VariantKey | undefined {
  if (!card.variants) return undefined;
  const norm = (c: string) => c.trim().toLowerCase();
  const legacy: Record<string, string> = {
    "#cfaa66": C.gold,
    "#c8102e": C.red,
    "#3ec6e0": C.blue,
    "#4f8cff": C.blue,
    "#f4f4f4": C.white,
    "#f2f2f2": C.white,
  };
  const a = norm(legacy[norm(accentColor)] ?? accentColor);
  return card.variants.find((v) => norm(v.accentColor) === a)?.key;
}

export const STYLE_CARDS: StyleCard[] = [...PREMIUM_CARDS, ...CLASSIC_CARDS];
