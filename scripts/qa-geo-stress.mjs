import { chromium } from "playwright";
import fs from "node:fs";

const out = "/workspace/screenshots";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.evaluate(() => {
  localStorage.removeItem("nameplate-studio-v8");
  localStorage.removeItem("nameplate-studio-v9");
  localStorage.removeItem("nameplate-studio-v12");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);

async function apply(patch) {
  await page.evaluate(async (state) => {
    const mod = await import("/src/lib/nameplates/store.ts");
    mod.useStudio.setState(state);
  }, patch);
  await page.waitForTimeout(380);
}

const song = {
  people: [{ id: "p2", name: "宋书玉", title: "中国酒业协会理事长", titleLines: 1 }],
  layout: "sequence",
  currentTime: 1.8,
  playing: false,
  scale: 1,
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
  ["duo", "left", "双斜杠"],
  ["fold", "left", "叠字"],
  ["ledge", "left", "侧勾"],
  ["lrail", "right", "L轨"],
  ["lintel", "right", "顶梁"],
  ["vgap", "right", "对开"],
  ["hook", "left", "勾线"],
];

for (const [style, side, label] of styles) {
  await apply({ ...song, style, side, align: side === "right" ? "top" : "left" });
  await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-${label}-song.png` });
  await apply({ ...wu, style, side, align: side === "right" ? "top" : "left" });
  await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-${label}-wu.png` });
  await apply({ ...longName, style, side, align: side === "right" ? "top" : "left" });
  await page.locator("canvas").first().screenshot({ path: `${out}/qa-line-${label}-long.png` });
}

await browser.close();
console.log("ok");
