import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const OUT = "/workspace/screenshots/qa-alpha.mov";
const DIALOG = "/workspace/screenshots/qa-export-mov.png";

await mkdir("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(120_000);
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");

await page.getByRole("button", { name: "导出视频" }).click();
await page.getByText("MOV 透明").waitFor();
await page.screenshot({ path: DIALOG, fullPage: false });
await page.keyboard.press("Escape");

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 120_000 }),
  page.evaluate(async () => {
    const { exportMovAlpha } = await import("/src/lib/nameplates/export.ts");
    await exportMovAlpha({
      config: {
        people: [{ id: "p1", name: "熊义志", title: "吕梁市委副书记、市长" }],
        style: "ceremony",
        layout: "sequence",
        side: "left",
        scale: 1,
        sectionLabel: "",
        inDuration: 0.2,
        holdDuration: 0.35,
        outDuration: 0.15,
        stagger: 0,
      },
      width: 1280,
      height: 720,
      fps: 29.97,
      filename: "qa-alpha.mov",
    });
  }),
]);
await download.saveAs(OUT);
await browser.close();

const probe = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-i", OUT],
  { encoding: "utf8" },
);
const probeText = `${probe.stdout}\n${probe.stderr}`;
console.log(probeText);

const extract = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-y",
    "-i",
    OUT,
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgba",
    "/workspace/screenshots/qa-alpha-frame.png",
  ],
  { encoding: "utf8" },
);
console.log(extract.stderr);
await writeFile("/workspace/screenshots/qa-alpha-probe.txt", probeText);
console.log("saved", OUT);
