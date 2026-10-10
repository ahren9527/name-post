import assert from "node:assert/strict";
import test from "node:test";
import { backingTone, deepTint, luma } from "./backing.ts";

const WHITE: [number, number, number, number] = [255, 255, 255, 1];

test("light 底板 behind light type drops the backing (no grey haze)", () => {
  const t = backingTone([255, 255, 255, 0.74], WHITE, WHITE, 0.42);
  assert.equal(t.alpha, 0);
});

test("stock neutral-black 底板 is tinted from the palette, never neutral grey", () => {
  const gold: [number, number, number, number] = [217, 180, 108, 1];
  const t = backingTone([0, 0, 0, 0.5], [243, 221, 166, 1], gold, 0.5);
  assert.ok(t.alpha > 0.5);
  assert.ok(t.color[0] > t.color[2], "warm tint for a gold palette");
  assert.ok(luma(t.color) < 0.12, "stays a deep shade");
});

test("custom 底板 colour and 不透明 are followed", () => {
  const navy: [number, number, number, number] = [14, 30, 58, 0.84];
  const t = backingTone(navy, WHITE, WHITE, 0.42);
  assert.deepEqual(t.color.slice(0, 3), [14, 30, 58]);
  assert.ok(t.alpha > 1.5);
});

test("deepTint keeps hue, neutral stays neutral", () => {
  const n = deepTint(WHITE);
  assert.ok(Math.abs(n[0] - n[2]) < 1);
  const blue = deepTint([63, 208, 255, 1]);
  assert.ok(blue[2] > blue[0]);
});
