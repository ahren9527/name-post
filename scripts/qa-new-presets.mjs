import { chromium } from "playwright";
import fs from "node:fs";

const out = "/workspace/screenshots";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

await page.evaluate(() => {
  for (const k of [
    "nameplate-studio-v10",
    "nameplate-studio-v11",
    "nameplate-studio-v12",
    "nameplate-studio-v13",
  ]) {
    localStorage.removeItem(k);
  }
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1600);

const canvas = page.locator("canvas").first();
await canvas.waitFor();

const inspector = page.locator("aside.w-\\[19rem\\]");

async function apply(patch) {
  await page.evaluate(async (state) => {
    const mod = await import("/src/lib/nameplates/store.ts");
    mod.useStudio.setState(state);
  }, patch);
  await page.waitForTimeout(280);
}

const variants = [
  ["horizontal", "left", "横左"],
  ["horizontal", "right", "横右"],
  ["vertical", "left", "竖左"],
  ["vertical", "right", "竖右"],
];

const families = [
  ["duo", "双斜杠"],
  ["hook", "勾线"],
  ["fold", "叠字"],
  ["split", "双栏"],
  ["underline", "下划线"],
  ["block", "方块"],
  ["ledge", "侧勾"],
  ["wave", "光弧"],
  ["bracket", "括号"],
  ["skew", "斜切条"],
  ["rule", "竖线条"],
  ["ceremony", "斜杠"],
];

await apply({
  style: "duo",
  orient: "horizontal",
  side: "left",
  align: "left",
  layout: "sequence",
  currentTime: 1.8,
  playing: false,
  previewBg: "stage",
  people: [{ id: "p1", name: "熊义志", title: "吕梁市委副书记、市长", titleLines: 1 }],
});

await inspector.screenshot({ path: `${out}/qa-compose-panel.png` });

for (const [style, label] of families) {
  for (const [orient, side, tag] of variants) {
    await apply({
      style,
      orient,
      side,
      align: orient === "vertical" ? "top" : side === "right" ? "right" : "left",
      layout: "sequence",
      currentTime: 1.8,
      playing: false,
      previewBg: "stage",
      people: [{ id: "p1", name: "熊义志", title: "吕梁市委副书记、市长", titleLines: 1 }],
    });
    await canvas.screenshot({ path: `${out}/qa-var-${label}-${tag}.png` });
  }
}

await apply({
  style: "duo",
  orient: "vertical",
  side: "left",
  align: "top",
  people: [{ id: "p2", name: "武跃飞", title: "汾酒集团党委副书记、副董事长、总经理", titleLines: 2 }],
});
await canvas.screenshot({ path: `${out}/qa-var-双斜杠-竖左-wu.png` });

await apply({
  style: "hook",
  orient: "vertical",
  side: "right",
  align: "top",
  people: [{ id: "p4", name: "圣地亚哥·托莱多", title: "墨西哥驻华使馆贸易与投资参赞", titleLines: 1 }],
});
await canvas.screenshot({ path: `${out}/qa-var-勾线-竖右-long.png` });

await apply({
  style: "fold",
  orient: "horizontal",
  side: "left",
  align: "left",
  people: [{ id: "p1", name: "熊义志", title: "吕梁市委副书记、市长", titleLines: 1 }],
});

const desktop = page.locator("aside.w-\\[19rem\\]");
for (const label of ["横版右侧", "竖版左侧", "竖版右侧", "横版左侧"]) {
  await desktop.getByRole("button", { name: label }).click();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: `${out}/qa-compose-live.png`, fullPage: false });
await canvas.screenshot({ path: `${out}/qa-compose-canvas.png` });

console.log("qa-new-presets done");
await browser.close();
