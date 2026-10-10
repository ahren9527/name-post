import assert from "node:assert/strict";
import { test } from "node:test";
import { packTitle } from "../text.ts";
import { DEFAULT_CONFIG, STYLE_META, normalizeFamily } from "../types.ts";
import { PREMIUM_IDS, TEMPLATES, TEMPLATE_BY_ID, TEMPLATE_CATEGORIES, isPremiumId, supportsVertical } from "./spec.ts";

test("ships the 36 flagship templates with unique ids and metadata", () => {
  assert.equal(TEMPLATES.length, 36);
  assert.equal(new Set(PREMIUM_IDS).size, 36);
  for (const t of TEMPLATES) {
    assert.ok(STYLE_META[t.id], `STYLE_META missing ${t.id}`);
    assert.equal(TEMPLATE_BY_ID[t.id], t);
    assert.ok(t.type.name / t.type.title >= 2 && t.type.name / t.type.title <= 2.6, `${t.id}: name:title ratio`);
    assert.ok(t.type.titleTracking >= 0.08, `${t.id}: title tracking`);
    assert.ok(TEMPLATE_CATEGORIES.some((c) => c.id === t.category), `${t.id}: category`);
    assert.equal(STYLE_META[t.id].label, t.label, `${t.id}: label matches STYLE_META`);
  }
  // every gallery sub-category has templates in it
  for (const c of TEMPLATE_CATEGORIES) assert.ok(TEMPLATES.some((t) => t.category === c.id), c.id);
});

test("templates that print the tag field say so in the inspector", () => {
  for (const id of ["sport", "newsduo", "bizblue", "variety", "finance", "lecture", "capsule", "comic", "serial"] as const) {
    assert.ok(TEMPLATE_BY_ID[id].tagHint, id);
  }
});

test("every flagship template ships a designed vertical layout", () => {
  for (const t of TEMPLATES) {
    assert.ok(supportsVertical(t.id), t.id);
    assert.ok(t.vertical, `${t.id}: vertical spec`);
    assert.ok(t.vertical.plate.length + t.vertical.ornaments.length > 0, `${t.id}: vertical has a plate or ornaments`);
    // split compositions need both blocks drawn
    if (t.vertical.form === "split") {
      const regions = t.vertical.plate.map((l) => ("region" in l ? l.region : undefined));
      assert.ok(regions.includes("name") && regions.includes("title"), `${t.id}: split blocks`);
    }
  }
  // classic families keep their four variants
  assert.ok(supportsVertical("duo"));
});

test("the v3 set covers new composition types", () => {
  const v3 = ["redsun", "strips", "lightline", "silk", "techblue", "viewfinder", "goldink", "comic", "flare", "metal", "serial", "scroll"] as const;
  for (const id of v3) assert.ok(isPremiumId(id), id);
  const kinds = new Set(TEMPLATES.flatMap((t) => [...t.plate.map((l) => l.kind), ...t.ornaments.map((o) => o.kind)]));
  for (const k of ["strips", "ribbon", "metal", "mountains", "disc", "beam", "flare", "brackets", "chevrons", "rollers"]) assert.ok(kinds.has(k as never), k);
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
