import { chromium } from "playwright";
import fs from "node:fs";

const out = "/workspace/screenshots";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.evaluate(() => localStorage.removeItem("nameplate-studio-v8"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);

async function apply(patch) {
  await page.evaluate(async (state) => {
    const mod = await import("/src/lib/nameplates/store.ts");
    mod.useStudio.setState(state);
  }, patch);
  await page.waitForTimeout(350);
}

const song = {
  people: [{ id: "p2", name: "宋书玉", title: "中国酒业协会理事长", titleLines: 1 }],
  layout: "sequence",
  currentTime: 1.8,
  playing: false,
  scale: 1,
  side: "left",
  align: "left",
  previewBg: "stage",
};

const longName = {
  ...song,
  people: [{ id: "p4", name: "圣地亚哥·托莱多", title: "墨西哥驻华使馆贸易与投资参赞", titleLines: 1 }],
};

const wu = {
  ...song,
  people: [{ id: "p3", name: "武跃飞", title: "汾酒集团党委副书记、副董事长、总经理", titleLines: 2 }],
};

const styles = [
  ["wave", "光弧"],
  ["underline", "下划线"],
  ["block", "方块"],
  ["skew", "斜切条"],
  ["ceremony", "斜杠"],
  ["vsplit", "竖排分隔"],
];

for (const [style, label] of styles) {
  await apply({ ...song, style, side: style === "vsplit" ? "right" : "left" });
  await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-${label}-song.png` });
  await apply({ ...longName, style, side: style === "vsplit" ? "right" : "left" });
  await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-${label}-long.png` });
}

await apply({ ...wu, style: "wave", side: "left" });
await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-光弧-wu.png` });
await apply({ ...wu, style: "underline", side: "left" });
await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-下划线-wu.png` });
await apply({ ...wu, style: "block", side: "left" });
await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-方块-wu.png` });

await apply({ ...song, style: "wave", side: "left" });
await page.screenshot({ path: `${out}/qa-line-main.png` });

await browser.close();
console.log("ok");
