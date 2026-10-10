// usage: node scripts/qa-classic-v3.mjs <port> <outdir> [orient] [extra-json] — renders every classic style over /bg/live-interview.jpg (needs the dev server)
import { chromium } from "playwright";
import fs from "node:fs";
const [port, out, orient = "horizontal", extra = "{}"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const px = process.env.HTTPS_PROXY || process.env.https_proxy;
let proxy;
if (px) { const u = new URL(px); proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username), password: decodeURIComponent(u.password), bypass: "127.0.0.1,localhost" }; }
const browser = await chromium.launch({ args: ["--no-sandbox", "--ignore-certificate-errors"], proxy });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const shots = await page.evaluate(async ({ orient, extra }) => {
  const presets = await import("/src/lib/nameplates/presets.ts");
  const R = await import("/src/lib/nameplates/renderer.ts");
  const T = await import("/src/lib/nameplates/types.ts");
  for (const href of ["https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&display=swap","https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"]) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
    await new Promise((r) => { l.onload = r; l.onerror = r; });
  }
  for (const fam of ["Noto Serif SC", "Noto Sans SC"]) {
    for (const w of [400, 500, 600, 700]) { try { await document.fonts.load(`${w} 40px "${fam}"`, "熊义志吕梁市委副书记、市长"); } catch { /* font subset may be missing */ } }
  }
  const img = new Image(); img.src = "/bg/live-interview.jpg"; await img.decode();
  const seen = new Set(); const cards = [];
  for (const c of presets.CLASSIC_CARDS) { if (seen.has(c.style)) continue; seen.add(c.style); cards.push(c); }
  const res = [];
  for (const card of cards) {
    const variants = card.variants ? card.variants : [card];
    for (const v of (extra.allColors ? variants : [variants[0]])) {
      const vc = { ...card, ...v };
      const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080;
      const ctx = cv.getContext("2d");
      const cfg = R.renderConfigFromState({
        ...T.DEFAULT_CONFIG, people: [{ id: "a", name: extra.name ?? "熊义志", title: extra.title ?? "吕梁市委副书记、市长", titleLines: extra.titleLines ?? 1 }],
        style: vc.style, layout: "sequence", side: extra.side ?? "left", orient, align: orient === "vertical" ? "top" : (extra.side === "right" ? "right" : "left"),
        scale: 1, nameFontId: vc.nameFontId ?? "serif", titleFontId: vc.titleFontId ?? "sans",
        accentColor: vc.accentColor, bandColor: vc.bandColor, nameColor: vc.nameColor ?? "#F7F2E8", titleColor: vc.titleColor ?? "#E9E4DA",
        sectionLabel: "", animIn: "left", ease: "smooth", textFx: extra.textFx ?? "soft",
      });
      const t = extra.t ?? cfg.inDuration + 1.5;
      const fg = document.createElement("canvas"); fg.width = 1920; fg.height = 1080;
      R.drawFrame(fg.getContext("2d"), 1920, 1080, t, cfg);
      if (!extra.alpha) ctx.drawImage(img, 0, 0, 1920, 1080);
      ctx.drawImage(fg, 0, 0);
      res.push({ id: (card.id) + (v.key ? "-" + v.key : ""), label: card.label, style: card.style, png: cv.toDataURL("image/png") });
    }
  }
  return res;
}, { orient, extra: JSON.parse(extra) });
for (const s of shots) fs.writeFileSync(`${out}/${s.style}-${s.id}.png`, Buffer.from(s.png.split(",")[1], "base64"));
fs.writeFileSync(`${out}/index.json`, JSON.stringify(shots.map(({ png, ...r }) => r)));
await browser.close();
console.log(shots.length, "rendered");
