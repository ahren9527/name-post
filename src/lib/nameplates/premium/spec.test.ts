import assert from "node:assert/strict";
import { test } from "node:test";
import { packTitle } from "../text.ts";
import { DEFAULT_CONFIG, STYLE_META, normalizeFamily } from "../types.ts";
import { PREMIUM_IDS, TEMPLATES, TEMPLATE_BY_ID, isPremiumId, supportsVertical } from "./spec.ts";

test("ships the 12 flagship templates with unique ids and metadata", () => {
  assert.equal(TEMPLATES.length, 12);
  assert.equal(new Set(PREMIUM_IDS).size, 12);
  for (const t of TEMPLATES) {
    assert.ok(STYLE_META[t.id], `STYLE_META missing ${t.id}`);
    assert.equal(TEMPLATE_BY_ID[t.id], t);
    assert.ok(t.type.name / t.type.title >= 2 && t.type.name / t.type.title <= 2.6, `${t.id}: name:title ratio`);
    assert.ok(t.type.titleTracking >= 0.08, `${t.id}: title tracking`);
  }
});

test("vertical support is declared per template", () => {
  for (const id of ["goldnavy", "blackgold", "keynote", "seal", "xuan"]) assert.ok(supportsVertical(id), id);
  for (const id of ["glass", "newsduo", "techedge", "bizblue", "redcarpet", "sport", "dialog"]) assert.ok(!supportsVertical(id), id);
  // classic families keep their four variants
  assert.ok(supportsVertical("duo"));
});

test("old saved style ids still resolve", () => {
  assert.deepEqual(normalizeFamily("vduo"), { style: "duo", orient: "vertical" });
  assert.deepEqual(normalizeFamily("cut"), { style: "fold", orient: "horizontal" });
  assert.deepEqual(normalizeFamily("goldnavy"), { style: "goldnavy" });
  assert.ok(!isPremiumId("duo"));
  assert.ok(isPremiumId(DEFAULT_CONFIG.style));
});

test("title packing splits at separators", () => {
  assert.deepEqual(packTitle("吕梁市委副书记、市长", 1), ["吕梁市委副书记、市长"]);
  const two = packTitle("汾酒集团党委副书记、副董事长、总经理", 2);
  assert.equal(two.length, 2);
  assert.equal(two.join(""), "汾酒集团党委副书记、副董事长、总经理");
});
