// usage: node scripts/qa-backing-glow.mjs <port> <outdir> — renders the plate-less flagship
// templates, glow/light templates and classic v3 styles over a bright window, a
// near-white frame and a dark frame (horizontal + vertical), plus the two user
// screenshot cases. Needs the dev server. Writes <outdir>/<case>.png crops + index.json.
import { chromium } from "playwright";
import fs from "node:fs";
const [port, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const px = process.env.HTTPS_PROXY || process.env.https_proxy;
let proxy;
if (px) { const u = new URL(px); proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username), password: decodeURIComponent(u.password), bypass: "127.0.0.1,localhost" }; }
const browser = await chromium.launch({ args: ["--no-sandbox", "--ignore-certificate-errors"], proxy });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const PREMIUM = ["keynote", "docu", "redsun", "strips", "lightline", "goldink", "flare", "serial", "xuan", "aurora", "neon", "techedge", "metal", "glass"];
const BGS = ["window", "white", "dark"];
const cases = [];
// user screenshot 1: vertical 发布会极简, white text, 柔和投影, 底板 #FFF @ 74%
cases.push({ id: "shot1-keynote-v-white74", style: "keynote", orient: "vertical", bg: "window", band: "rgba(255,255,255,0.74)", big: true });
// user screenshot 2: vertical 流光光晕 over the bright window
cases.push({ id: "shot2-flare-v", style: "flare", orient: "vertical", bg: "window", big: true });
for (const s of PREMIUM) for (const o of ["horizontal", "vertical"]) for (const bg of BGS) cases.push({ id: `p-${s}-${o[0]}-${bg}`, style: s, orient: o, bg });
// alpha export check (transparent, no background)
for (const s of ["keynote", "flare", "lightline"]) cases.push({ id: `alpha-${s}-v`, style: s, orient: "vertical", bg: "alpha" });
// 衬底 option: 实底 / 无
for (const b of ["solid", "none"]) {
  cases.push({ id: `backing-${b}-keynote-v`, style: "keynote", orient: "vertical", bg: "window", backing: b });
  cases.push({ id: `backing-${b}-docu-h`, style: "docu", orient: "horizontal", bg: "window", backing: b });
  cases.push({ id: `backing-${b}-redsun-v`, style: "redsun", orient: "vertical", bg: "white", backing: b });
}
// flare / beam mid-animation frames
for (const s of ["flare", "lightline"]) for (const tt of [0.35, 0.7, 1.4]) cases.push({ id: `anim-${s}-v-${tt}`, style: s, orient: "vertical", bg: "window", t: tt });

const res = await page.evaluate(async ({ cases }) => {
  const presets = await import("/src/lib/nameplates/presets.ts");
  const R = await import("/src/lib/nameplates/renderer.ts");
  const T = await import("/src/lib/nameplates/types.ts");
  for (const href of ["https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&display=swap", "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"]) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
    await new Promise((r) => { l.onload = r; l.onerror = r; });
  }
  for (const fam of ["Noto Serif SC", "Noto Sans SC"]) for (const w of [400, 500, 600, 700]) { try { await document.fonts.load(`${w} 40px "${fam}"`, "熊义志吕梁市委副书记、市长"); } catch { /* subset */ } }
  const img = new Image(); img.src = "/bg/live-interview.jpg"; await img.decode();
  const seen = new Set();
  const classic = [];
  for (const c of presets.CLASSIC_CARDS) { if (seen.has(c.style)) continue; seen.add(c.style); classic.push(c); }
  const all = [...cases];
  for (const c of classic) for (const o of ["horizontal", "vertical"]) for (const bg of ["window", "white"]) all.push({ id: `c-${c.style}-${o[0]}-${bg}`, classic: c, style: c.style, orient: o, bg });
  const hook = classic.find((c) => c.style === "hook");
  if (hook) for (const b of ["solid", "none"]) all.push({ id: `backing-${b}-classic-hook-h`, classic: hook, style: "hook", orient: "horizontal", bg: "window", backing: b });
  const out = [];
  for (const k of all) {
    const card = k.classic ?? presets.PREMIUM_CARDS.find((c) => c.style === k.style);
    const v = card.variants ? { ...card, ...card.variants[0] } : card;
    const cfg = R.renderConfigFromState({
      ...T.DEFAULT_CONFIG,
      people: [{ id: "a", name: "熊义志", title: "吕梁市委副书记、市长", titleLines: 1, en: "XIONG YIZHI" }],
      style: v.style, layout: "sequence", side: "left", orient: k.orient, align: k.orient === "vertical" ? "top" : "left",
      scale: 1, nameFontId: v.nameFontId ?? "serif", titleFontId: v.titleFontId ?? "sans",
      accentColor: v.accentColor, bandColor: k.band ?? v.bandColor, nameColor: v.nameColor ?? "#F7F2E8", titleColor: v.titleColor ?? "#E9E4DA",
      sectionLabel: "", animIn: "left", ease: "smooth", textFx: k.textFx ?? "soft", backing: k.backing ?? "soft", sweep: false,
    });
    const t = k.t ?? cfg.inDuration + 1.5;
    const fg = document.createElement("canvas"); fg.width = 1920; fg.height = 1080;
    R.drawFrame(fg.getContext("2d"), 1920, 1080, t, cfg);
    const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080;
    const ctx = cv.getContext("2d");
    if (k.bg === "window") ctx.drawImage(img, 0, 0, 1920, 1080);
    else if (k.bg === "white") { const g = ctx.createLinearGradient(0, 0, 1920, 1080); g.addColorStop(0, "#F7F7F5"); g.addColorStop(1, "#ECEDEE"); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); }
    else if (k.bg === "dark") { ctx.fillStyle = "#15181D"; ctx.fillRect(0, 0, 1920, 1080); }
    else { ctx.fillStyle = "#808080"; for (let y = 0; y < 1080; y += 24) for (let x = (y / 24) % 2 ? 24 : 0; x < 1920; x += 48) ctx.fillRect(x, y, 24, 24); }
    ctx.drawImage(fg, 0, 0);
    const crop = k.orient === "vertical" ? [0, 0, 760, 1080] : [0, 560, 1240, 520];
    const c2 = document.createElement("canvas"); c2.width = crop[2]; c2.height = crop[3];
    c2.getContext("2d").drawImage(cv, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3]);
    out.push({ id: k.id, label: card.label, png: c2.toDataURL("image/png") });
  }
  return out;
}, { cases });
for (const s of res) fs.writeFileSync(`${out}/${s.id}.png`, Buffer.from(s.png.split(",")[1], "base64"));
fs.writeFileSync(`${out}/index.json`, JSON.stringify(res.map(({ png: _png, ...r }) => r)));
await browser.close();
console.log(res.length, "rendered");
