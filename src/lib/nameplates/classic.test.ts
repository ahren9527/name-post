import assert from "node:assert/strict";
import { test } from "node:test";
import { CLASSIC_COLORS, isClassicStyle, refineClassicColor } from "./classic.ts";
import {
  CLASSIC_CARDS,
  PREMIUM_CARDS,
  activeVariant,
  cardWithVariant,
  migrateFavorites,
  resolveLegacyCardId,
} from "./presets.ts";

const LEGACY_IDS = [
  "duo-gold", "hook-white", "fold-white", "split-white", "underline-white", "block-white", "ledge-white",
  "wave-cyan", "bracket-red", "skew-white", "rule-white", "slash-white", "duo-white", "hook-gold", "fold-gold",
  "split-gold", "underline-gold", "underline-red", "block-gold", "block-red", "ledge-gold", "wave-gold",
  "wave-blue", "bracket-white", "bracket-gold", "skew-gold", "skew-red", "rule-red", "rule-gold", "slash-gold",
  "slash-blue",
];

test("one classic card per style, each a classic-v3 style with swatch variants", () => {
  assert.equal(CLASSIC_CARDS.length, 12);
  assert.equal(new Set(CLASSIC_CARDS.map((c) => c.style)).size, 12);
  for (const c of CLASSIC_CARDS) {
    assert.ok(isClassicStyle(c.style), c.style);
    assert.ok(c.variants && c.variants.length >= 2, `${c.id} has colourways`);
    assert.notEqual(c.caption, c.label, `${c.id} caption should not repeat the label`);
  }
});

test("every pre-v3 classic card id maps to its merged card + colourway", () => {
  for (const id of LEGACY_IDS) {
    const r = resolveLegacyCardId(id);
    const card = CLASSIC_CARDS.find((c) => c.id === r.cardId);
    assert.ok(card, `${id} → ${r.cardId}`);
    assert.ok(card!.variants!.some((v) => v.key === r.variant), `${id} variant ${r.variant}`);
  }
  assert.deepEqual(resolveLegacyCardId("pro-goldnavy"), { cardId: "pro-goldnavy" });
  assert.deepEqual(migrateFavorites(["underline-gold", "underline-red", "pro-keynote", "custom-1"]), [
    "classic-underline",
    "pro-keynote",
    "custom-1",
  ]);
});

test("colourways apply refined colours and legacy accents resolve to them", () => {
  const ul = CLASSIC_CARDS.find((c) => c.style === "underline")!;
  assert.equal(cardWithVariant(ul, "red").accentColor, CLASSIC_COLORS.red);
  assert.equal(activeVariant(ul, "#C8102E"), "red");
  assert.equal(activeVariant(ul, "#CFAA66"), "gold");
  assert.equal(refineClassicColor("#C8102E"), CLASSIC_COLORS.red);
  assert.equal(refineClassicColor("#3EC6E0"), CLASSIC_COLORS.blue);
  assert.equal(refineClassicColor("rgba(10,10,10,0.5)"), "rgba(10,10,10,0.5)");
});

test("flagship cards are untouched by the classic merge", () => {
  assert.equal(PREMIUM_CARDS.length, 24);
  for (const c of PREMIUM_CARDS) assert.equal(c.variants, undefined);
});
