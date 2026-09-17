import { chromium } from "playwright";
import fs from "node:fs";

const out = "/workspace/screenshots";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

async function apply(patch) {
  await page.evaluate(async (state) => {
    const mod = await import("/src/lib/nameplates/store.ts");
    mod.useStudio.setState(state);
  }, patch);
  await page.waitForTimeout(400);
}

const song = {
  people: [{ id: "p2", name: "宋书玉", title: "中国酒业协会理事长" }],
  layout: "sequence",
  currentTime: 1.6,
  playing: false,
  scale: 1,
};

await apply({
  ...song,
  style: "lrail",
  side: "right",
  previewBg: "live",
});
await page.screenshot({ path: `${out}/qa-live-vertical.png` });

await apply({
  ...song,
  style: "ceremony",
  side: "left",
  previewBg: "live",
});
await page.screenshot({ path: `${out}/qa-live-ceremony.png` });

await apply({
  ...song,
  style: "lrail",
  side: "right",
  previewBg: "checker",
});
await page.screenshot({ path: `${out}/qa-checker-vertical.png` });

await apply({
  people: [
    { id: "p2", name: "宋书玉", title: "中国酒业协会理事长" },
  ],
  style: "news",
  side: "left",
  layout: "sequence",
  previewBg: "stage",
  currentTime: 1.6,
  playing: false,
});
await page.screenshot({ path: `${out}/qa-stage-news.png` });

await page.setViewportSize({ width: 390, height: 844 });
await apply({
  ...song,
  style: "lrail",
  side: "right",
  previewBg: "live",
});
await page.screenshot({ path: `${out}/qa-live-vertical-mobile.png` });

await browser.close();
console.log("ok");
