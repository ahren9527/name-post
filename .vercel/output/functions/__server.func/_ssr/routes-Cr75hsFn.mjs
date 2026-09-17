import { i as __toESM } from "../_runtime.mjs";
import { o as require_jsx_runtime, r as Slot, s as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { B as Check, C as Pause, D as GripVertical, F as Circle, H as ArrowRight, I as ChevronsRight, L as ChevronsLeft, M as Download, N as Copy, O as Folder, R as ChevronRight, S as Pencil, U as ArrowLeft, V as ArrowUp, W as ArrowDown, _ as RotateCcw, a as Upload, b as Plus, d as Sparkles, f as SkipForward, g as RotateCw, h as Save, i as Users, j as FilePlus, k as FolderOpen, l as Trash2, m as Search, n as ZoomOut, o as Undo2, p as SkipBack, r as X, s as Type, t as ZoomIn, u as Star, v as Repeat, w as Maximize2, x as Play, y as Redo2, z as ChevronLeft } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cr75hsFn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-brand text-brand-foreground hover:bg-brand/90",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
			destructive: "bg-destructive text-foreground hover:bg-destructive/90"
		},
		size: {
			default: "h-10 px-4",
			sm: "h-8 rounded-sm px-3 text-xs",
			lg: "h-11 rounded-lg px-5",
			icon: "size-10",
			"icon-sm": "size-8"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var FONT_SERIF = "\"Noto Serif SC\", \"Songti SC\", \"STSong\", \"WenQuanYi Zen Hei\", serif";
var FONT_SANS = "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", \"WenQuanYi Zen Hei\", sans-serif";
var BUILTIN_FONTS = [
	{
		id: "sans",
		label: "思源黑体",
		family: "Noto Sans SC",
		fallback: "sans-serif",
		google: "Noto+Sans+SC:wght@400;500;600;700"
	},
	{
		id: "serif",
		label: "思源宋体",
		family: "Noto Serif SC",
		fallback: "serif",
		google: "Noto+Serif+SC:wght@500;600;700"
	},
	{
		id: "wenkai",
		label: "霞鹜文楷",
		family: "LXGW WenKai",
		fallback: "serif",
		google: "LXGW+WenKai:wght@400;700"
	},
	{
		id: "yuan",
		label: "站酷圆体",
		family: "ZCOOL QingKe HuangYou",
		fallback: "sans-serif",
		google: "ZCOOL+QingKe+HuangYou"
	}
];
var DEFAULT_NAME_FONT = "serif";
var DEFAULT_TITLE_FONT = "sans";
var MAX_FONT_BYTES = 20971520;
var DB_NAME = "nameplate-fonts";
var STORE = "files";
var customRegistry = /* @__PURE__ */ new Map();
var googleLoaded = /* @__PURE__ */ new Set();
function fontStack(family, fallback) {
	return `"${family}", "Noto Serif SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ${fallback}`;
}
var FONT_ALIAS = {
	qingke: "yuan",
	xiaowei: "serif",
	mashan: "serif"
};
function normalizeFontId(id) {
	return FONT_ALIAS[id] ?? id;
}
function resolveFontStack(id, slot) {
	const fallback = slot === "name" ? FONT_SERIF : FONT_SANS;
	if (!id) return fallback;
	const builtin = BUILTIN_FONTS.find((f) => f.id === normalizeFontId(id));
	if (builtin) return fontStack(builtin.family, builtin.fallback);
	const custom = customRegistry.get(id);
	if (custom) return fontStack(custom.family, slot === "name" ? "serif" : "sans-serif");
	return fallback;
}
function listCustomFonts() {
	return [...customRegistry.values()];
}
function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function idbPut(record) {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(record);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}
async function idbDelete(id) {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}
async function idbAll() {
	const db = await openDb();
	const rows = await new Promise((resolve, reject) => {
		const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
		req.onsuccess = () => resolve(req.result ?? []);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return rows;
}
async function registerFace(family, buffer) {
	if (typeof document === "undefined" || typeof FontFace === "undefined") return;
	const face = new FontFace(family, buffer, { display: "swap" });
	await face.load();
	document.fonts.add(face);
}
async function restoreCustomFonts() {
	if (typeof indexedDB === "undefined") return listCustomFonts();
	try {
		const rows = await idbAll();
		for (const row of rows) {
			customRegistry.set(row.id, {
				id: row.id,
				label: row.label,
				family: row.family
			});
			try {
				await registerFace(row.family, row.buffer);
			} catch {}
		}
	} catch {}
	return listCustomFonts();
}
async function uploadCustomFont(file) {
	if (file.size > MAX_FONT_BYTES) throw new Error("字体文件不能超过 20 MB");
	if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("请上传 ttf / otf / woff / woff2 字体");
	const buffer = await file.arrayBuffer();
	const id = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
	const family = `NPCustom-${id}`;
	const label = file.name.replace(/\.(ttf|otf|woff2?)$/i, "");
	await registerFace(family, buffer);
	const meta = {
		id,
		label,
		family
	};
	customRegistry.set(id, meta);
	try {
		await idbPut({
			...meta,
			buffer
		});
	} catch {}
	return meta;
}
async function removeCustomFont(id) {
	customRegistry.delete(id);
	try {
		await idbDelete(id);
	} catch {}
}
async function ensureFontReady(id) {
	if (!id || typeof document === "undefined") return;
	const builtin = BUILTIN_FONTS.find((f) => f.id === normalizeFontId(id));
	if (builtin?.google) {
		const href = `https://fonts.googleapis.com/css2?family=${builtin.google}&display=swap`;
		if (!googleLoaded.has(href)) {
			googleLoaded.add(href);
			await new Promise((resolve) => {
				if ([...document.querySelectorAll("link")].some((l) => l.href === href)) {
					resolve();
					return;
				}
				const link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = href;
				link.onload = () => resolve();
				link.onerror = () => resolve();
				document.head.appendChild(link);
			});
		}
		const stack = fontStack(builtin.family, builtin.fallback);
		try {
			await document.fonts.load(`500 88px ${stack}`);
			await document.fonts.load(`400 28px ${stack}`);
		} catch {}
		return;
	}
	const custom = customRegistry.get(id);
	if (custom) try {
		await document.fonts.load(`500 88px ${fontStack(custom.family, "serif")}`);
	} catch {}
}
async function loadNameplateFonts(ids) {
	if (typeof document === "undefined") return;
	await restoreCustomFonts();
	const wanted = ids?.length ? ids : [DEFAULT_NAME_FONT, DEFAULT_TITLE_FONT];
	try {
		await Promise.race([Promise.all([
			...wanted.map((id) => ensureFontReady(id)),
			document.fonts.load(`600 92px ${FONT_SERIF}`),
			document.fonts.load(`400 28px ${FONT_SANS}`),
			document.fonts.ready
		]), new Promise((resolve) => {
			window.setTimeout(resolve, 4e3);
		})]);
	} catch {}
}
var BASE_W = 1920;
var BASE_H = 1080;
/** NTSC drop-frame: 30000/1001 ≈ 29.970 */
var NTSC_FPS = 3e4 / 1001;
var NTSC_FRAME_DUR = 1001 / 3e4;
var CLIP_LAYER_META = {
	name: { label: "姓名" },
	title: { label: "职务" },
	slash: { label: "装饰" },
	band: { label: "色带" }
};
var DEFAULT_PEOPLE = [
	{
		id: "p1",
		name: "熊义志",
		title: "吕梁市委副书记、市长",
		titleLines: 1
	},
	{
		id: "p2",
		name: "宋书玉",
		title: "中国酒业协会理事长",
		titleLines: 1
	},
	{
		id: "p3",
		name: "武跃飞",
		title: "汾酒集团党委副书记、副董事长、总经理",
		titleLines: 2
	},
	{
		id: "p4",
		name: "圣地亚哥·托莱多",
		title: "墨西哥驻华使馆贸易与投资参赞",
		titleLines: 1
	}
];
var DEFAULT_CONFIG = {
	style: "ceremony",
	layout: "sequence",
	side: "left",
	align: "left",
	scale: 1,
	textSize: 1,
	titleSize: 1,
	nameFont: "\"Noto Serif SC\", \"Songti SC\", \"STSong\", \"WenQuanYi Zen Hei\", serif",
	titleFont: "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", \"WenQuanYi Zen Hei\", sans-serif",
	nameColor: "#f7f7f7",
	titleColor: "#e8e8e8",
	accentColor: "#4f8cff",
	bandColor: "rgba(10, 10, 10, 0.8)",
	sectionLabel: "",
	inDuration: .7,
	holdDuration: 4.2,
	outDuration: .55,
	stagger: .16,
	animIn: "left",
	ease: "smooth"
};
function totalDuration(cfg) {
	const n = Math.max(cfg.people.length, 1);
	if (cfg.layout === "sequence") return n * (cfg.inDuration + cfg.holdDuration + cfg.outDuration);
	return cfg.inDuration + cfg.stagger * Math.max(n - 1, 0) + cfg.holdDuration + cfg.outDuration;
}
function personSlotDuration(cfg) {
	return cfg.inDuration + cfg.holdDuration + cfg.outDuration;
}
function formatTimecode(seconds) {
	const s = Math.max(0, seconds);
	const m = Math.floor(s / 60);
	const rest = s - m * 60;
	const whole = Math.floor(rest);
	const tenth = Math.floor((rest - whole) * 10);
	return `${m}:${String(whole).padStart(2, "0")}.${tenth}`;
}
function isNtscFps(fps) {
	return Math.abs(fps - 29.97) < .05;
}
function frameTiming(fps) {
	if (isNtscFps(fps)) return {
		rate: NTSC_FPS,
		dur: NTSC_FRAME_DUR
	};
	return {
		rate: fps,
		dur: 1 / fps
	};
}
var THEME = {
	name: "#f7f7f7",
	title: "#e8e8e8",
	accent: "#2A8CFF",
	band: "rgba(18, 22, 28, 0.72)",
	line: "rgba(236, 236, 236, 0.92)"
};
var PALETTE = { ...THEME };
function applyPalette(cfg) {
	PALETTE = {
		name: cfg.nameColor || THEME.name,
		title: cfg.titleColor || THEME.title,
		accent: cfg.accentColor || THEME.accent,
		band: cfg.bandColor || THEME.band,
		line: THEME.line
	};
}
function nameFace(cfg) {
	return cfg.nameFont || "\"Noto Serif SC\", \"Songti SC\", \"STSong\", \"WenQuanYi Zen Hei\", serif";
}
function titleFace(cfg) {
	return cfg.titleFont || "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", \"WenQuanYi Zen Hei\", sans-serif";
}
function clamp$1(n, a = 0, b = 1) {
	return Math.min(b, Math.max(a, n));
}
function easeOut(t) {
	const x = clamp$1(t);
	return 1 - (1 - x) * (1 - x) * (1 - x);
}
function easeIn(t) {
	const x = clamp$1(t);
	return x * x * x;
}
function easeLinear(t) {
	return clamp$1(t);
}
function easeOf(cfg) {
	if (cfg.ease === "linear") return easeLinear;
	if (cfg.ease === "snap") return (t) => easeOut(easeOut(t));
	return easeOut;
}
function animOffset(cfg) {
	switch (cfg.animIn) {
		case "none":
		case "fade":
		case "scale": return {
			x: 0,
			y: 0
		};
		case "up": return {
			x: 0,
			y: 42
		};
		case "down": return {
			x: 0,
			y: -42
		};
		case "right": return {
			x: 56,
			y: 0
		};
		default: return {
			x: -56,
			y: 0
		};
	}
}
function plateMotion(index, count, time, cfg) {
	const from = animOffset(cfg);
	const ez = easeOf(cfg);
	const empty = {
		opacity: 0,
		x: from.x,
		y: from.y,
		bar: 0,
		nameClip: 0,
		titleClip: 0,
		label: 0
	};
	const finish = (local, enterRaw, exit) => {
		if (cfg.animIn === "none") {
			const on = local >= 0 && exit > .02;
			return {
				opacity: on ? exit : 0,
				x: 0,
				y: 0,
				bar: on ? 1 : 0,
				nameClip: on ? 1 : 0,
				titleClip: on ? 1 : 0,
				label: 0
			};
		}
		const enter = ez(enterRaw);
		const t = enter * exit;
		const fade = cfg.animIn === "fade" || cfg.animIn === "scale";
		return {
			opacity: t,
			x: fade ? 0 : from.x * (1 - enter) + from.x * .18 * (1 - exit),
			y: fade ? 0 : from.y * (1 - enter),
			bar: enter,
			nameClip: ez(clamp$1((local - cfg.inDuration * .08) / Math.max(cfg.inDuration * .72, .05))),
			titleClip: ez(clamp$1((local - cfg.inDuration * .28) / Math.max(cfg.inDuration * .72, .05))),
			label: 0
		};
	};
	if (cfg.layout === "sequence") {
		const slot = cfg.inDuration + cfg.holdDuration + cfg.outDuration;
		const local = time - index * slot;
		if (local < 0 || local > slot) return empty;
		return finish(local, clamp$1(local / Math.max(cfg.inDuration, .04)), easeIn(1 - clamp$1((local - cfg.inDuration - cfg.holdDuration) / Math.max(cfg.outDuration, .04))));
	}
	const local = time - index * cfg.stagger;
	const exitStart = totalDuration(cfg) - cfg.outDuration;
	return finish(local, clamp$1(local / Math.max(cfg.inDuration, .04)), easeIn(1 - clamp$1((time - exitStart) / Math.max(cfg.outDuration, .04))));
}
function splitTitleParts(text) {
	const parts = [];
	let buf = "";
	for (const ch of text) {
		buf += ch;
		if (ch === "、" || ch === "，") {
			parts.push(buf);
			buf = "";
		}
	}
	if (buf) parts.push(buf);
	return parts;
}
function splitEvenChars(text, n) {
	const chars = [...text];
	if (chars.length === 0) return [];
	const count = Math.min(Math.max(n, 1), chars.length);
	const size = Math.ceil(chars.length / count);
	const lines = [];
	for (let i = 0; i < count; i++) {
		const chunk = chars.slice(i * size, (i + 1) * size).join("");
		if (chunk) lines.push(chunk);
	}
	return lines;
}
function balanceParts(parts, n) {
	if (parts.length === 0) return [];
	if (parts.length === n) return parts;
	if (parts.length < n) {
		const buckets = [...parts];
		while (buckets.length < n) {
			let maxI = 0;
			for (let i = 1; i < buckets.length; i++) if ([...buckets[i]].length > [...buckets[maxI]].length) maxI = i;
			const chars = [...buckets[maxI]];
			if (chars.length < 2) break;
			const mid = Math.ceil(chars.length / 2);
			buckets.splice(maxI, 1, chars.slice(0, mid).join(""), chars.slice(mid).join(""));
		}
		return buckets;
	}
	const lines = [];
	let i = 0;
	for (let k = 0; k < n && i < parts.length; k++) {
		const remainBuckets = n - k;
		const want = parts.slice(i).reduce((s, p) => s + [...p].length, 0) / remainBuckets;
		let acc = "";
		let accLen = 0;
		while (i < parts.length) {
			const nextLen = [...parts[i]].length;
			if (k === n - 1) {
				acc += parts[i++];
				continue;
			}
			if (acc && accLen + nextLen > want * 1.2) break;
			acc += parts[i++];
			accLen += nextLen;
			if (accLen >= want * .8) break;
		}
		if (acc) lines.push(acc);
	}
	return lines;
}
function packTitle(text, n) {
	const t = text.trim();
	if (!t) return [];
	const count = Math.max(1, Math.min(3, Math.round(n) || 1));
	if (count === 1) return [t];
	const parts = splitTitleParts(t);
	if (parts.length === 1) return splitEvenChars(t, count);
	return balanceParts(parts, count);
}
function nameTracking(name) {
	if (name.length <= 2) return 14;
	if (name.length <= 3) return 10;
	if (name.length <= 4) return 5;
	return 1.5;
}
function fillTracked(ctx, text, x, y, tracking) {
	let cx = x;
	for (const ch of text) {
		ctx.fillText(ch, cx, y);
		cx += ctx.measureText(ch).width + tracking;
	}
	return cx - x - tracking;
}
function strokeTracked(ctx, text, x, y, tracking) {
	let cx = x;
	for (const ch of text) {
		ctx.strokeText(ch, cx, y);
		cx += ctx.measureText(ch).width + tracking;
	}
}
function trackedWidth(ctx, text, tracking) {
	if (!text) return 0;
	return ctx.measureText(text).width + Math.max(text.length - 1, 0) * tracking;
}
var HALO = "rgba(0, 0, 0, 0.92)";
var STROKE_OUTER = "rgba(0,0,0,0.58)";
var STROKE_CORE = "rgba(6, 8, 12, 0.96)";
function beginStroke(ctx) {
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.miterLimit = 2;
}
function paintTracked(ctx, text, x, y, tracking, fill, strokeWidth) {
	ctx.save();
	beginStroke(ctx);
	ctx.shadowColor = HALO;
	ctx.shadowBlur = strokeWidth * 2.8;
	ctx.shadowOffsetY = strokeWidth * .28;
	ctx.fillStyle = "rgba(0,0,0,0.48)";
	fillTracked(ctx, text, x, y, tracking);
	ctx.shadowColor = "transparent";
	ctx.shadowBlur = 0;
	ctx.shadowOffsetY = 0;
	ctx.lineWidth = strokeWidth + 2.8;
	ctx.strokeStyle = STROKE_OUTER;
	strokeTracked(ctx, text, x, y, tracking);
	ctx.lineWidth = strokeWidth;
	ctx.strokeStyle = STROKE_CORE;
	strokeTracked(ctx, text, x, y, tracking);
	ctx.fillStyle = fill;
	fillTracked(ctx, text, x, y, tracking);
	ctx.restore();
}
function paintGlyph(ctx, ch, x, y, fill, strokeWidth) {
	ctx.save();
	beginStroke(ctx);
	ctx.shadowColor = HALO;
	ctx.shadowBlur = strokeWidth * 2.8;
	ctx.shadowOffsetY = strokeWidth * .28;
	ctx.fillStyle = "rgba(0,0,0,0.48)";
	ctx.fillText(ch, x, y);
	ctx.shadowColor = "transparent";
	ctx.shadowBlur = 0;
	ctx.shadowOffsetY = 0;
	ctx.lineWidth = strokeWidth + 2.6;
	ctx.strokeStyle = STROKE_OUTER;
	ctx.strokeText(ch, x, y);
	ctx.lineWidth = strokeWidth;
	ctx.strokeStyle = STROKE_CORE;
	ctx.strokeText(ch, x, y);
	ctx.fillStyle = fill;
	ctx.fillText(ch, x, y);
	ctx.restore();
}
var ZERO_XFORM = {
	x: 0,
	y: 0,
	rotation: 0
};
function layerXform(person, layer) {
	const t = person.xform?.[layer];
	return t ? {
		x: t.x ?? 0,
		y: t.y ?? 0,
		rotation: t.rotation ?? 0
	} : ZERO_XFORM;
}
function withXform(ctx, person, layer, px, py, draw) {
	const t = layerXform(person, layer);
	if (!t.x && !t.y && !t.rotation) {
		draw();
		return;
	}
	ctx.save();
	ctx.translate(t.x, t.y);
	if (t.rotation) {
		ctx.translate(px, py);
		ctx.rotate(t.rotation * Math.PI / 180);
		ctx.translate(-px, -py);
	}
	draw();
	ctx.restore();
}
function nameU(cfg) {
	return cfg.scale * Math.max(cfg.textSize, .4);
}
function titleU(cfg) {
	return cfg.scale * Math.max(cfg.titleSize ?? 1, .35);
}
function isRightAlign(cfg) {
	return (cfg.align ?? "left") === "right";
}
function isTopAlign(cfg) {
	return cfg.style === "vertical" || (cfg.align ?? "left") === "top";
}
function titleBlockH(lines, size) {
	return size * 1.28 * Math.max(lines, 1);
}
/** Inner left/right of a parallelogram at yFromTop, with stroke inset. */
function paraInner(x, w, h, skew, yFromTop, inset) {
	const shift = skew * (1 - Math.max(0, Math.min(1, yFromTop / Math.max(h, 1))));
	return {
		left: x + shift + inset,
		right: x + w + shift - inset
	};
}
function fillSkew(ctx, x, y, w, h, skew) {
	ctx.beginPath();
	ctx.moveTo(x + skew, y);
	ctx.lineTo(x + w + skew, y);
	ctx.lineTo(x + w, y + h);
	ctx.lineTo(x, y + h);
	ctx.closePath();
	ctx.fill();
}
function fillRound(ctx, x, y, w, h, r) {
	const rr = Math.max(0, Math.min(r, w / 2, h / 2));
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, rr);
	ctx.fill();
}
function clipRound(ctx, x, y, w, h, r) {
	const rr = Math.max(0, Math.min(r, w / 2, h / 2));
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, rr);
	ctx.clip();
}
function drawBlueSlash(ctx, x, y, w, h, t, flip, skewRatio = .38) {
	if (t <= .01) return;
	const hh = Math.max(h * t, 1);
	const skew = (flip ? -1 : 1) * hh * skewRatio;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.7)";
	ctx.shadowBlur = 8;
	ctx.fillStyle = PALETTE.accent;
	fillSkew(ctx, x, y, w, hh, skew);
	ctx.restore();
}
function drawBlueSquare(ctx, x, y, s, t) {
	if (t <= .01) return;
	ctx.save();
	ctx.globalAlpha *= t;
	ctx.shadowColor = "rgba(0,0,0,0.65)";
	ctx.shadowBlur = 6;
	ctx.fillStyle = PALETTE.accent;
	ctx.fillRect(x, y, s, s);
	ctx.restore();
}
function drawHairline(ctx, x1, x2, y, t, thick, side) {
	if (t <= .01) return;
	const span = x2 - x1;
	const drawn = side === "left" ? x1 + span * t : x2 - span * t;
	const a = side === "left" ? x1 : drawn;
	const b = side === "left" ? drawn : x2;
	ctx.save();
	ctx.lineCap = "butt";
	ctx.strokeStyle = "rgba(0,0,0,0.55)";
	ctx.lineWidth = thick + 2.2;
	ctx.beginPath();
	ctx.moveTo(a, y);
	ctx.lineTo(b, y);
	ctx.stroke();
	ctx.strokeStyle = PALETTE.line;
	ctx.lineWidth = thick;
	ctx.beginPath();
	ctx.moveTo(a, y);
	ctx.lineTo(b, y);
	ctx.stroke();
	ctx.restore();
}
function clipReveal(ctx, x, y, w, h, t, side) {
	ctx.beginPath();
	if (side === "left") ctx.rect(x, y, Math.max(w * t, 1), h);
	else ctx.rect(x + w * (1 - t), y, Math.max(w * t, 1), h);
	ctx.clip();
}
function clipSkew(ctx, x, y, w, h, skew) {
	ctx.beginPath();
	ctx.moveTo(x + skew, y);
	ctx.lineTo(x + w + skew, y);
	ctx.lineTo(x + w, y + h);
	ctx.lineTo(x, y + h);
	ctx.closePath();
	ctx.clip();
}
function nameStroke(u) {
	return Math.max(4.2, 6.364 * u);
}
function titleStroke(u) {
	return Math.max(2.8, .12 * 30 * u);
}
function measureSlash(ctx, person, cfg) {
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	let nameSize = 86 * nu;
	const titleSize = 30 * tu;
	const pad = 8 * nu;
	const gap = 14 * nu;
	ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
	let nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
	while (nameW > 720 * nu && nameSize > 48 * nu) {
		nameSize *= .94;
		ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
		nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
	}
	const slashW = Math.max(10, nameSize * .14);
	const slashH = nameSize;
	const ns = nameStroke(nu);
	ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
	const titleLines = packTitle(person.title, person.titleLines ?? 1);
	const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
	const titleH = titleBlockH(titleLines.length, titleSize);
	const top = isTopAlign(cfg);
	const topW = top ? nameW + 24 * nu + slashW + 22 * nu + titleW : nameW + 24 * nu + slashW + slashH * .38 + 20 * nu;
	const width = Math.max(topW, top ? topW : titleW) + pad * 2 + ns;
	const height = top ? pad + Math.max(nameSize, titleH) + 18 * nu + pad : pad + nameSize + ns + gap + gap + titleH + pad;
	return {
		person,
		titleLines,
		nameSize,
		titleSize,
		nameW,
		titleW,
		slashW,
		slashH,
		gap,
		pad,
		width,
		height
	};
}
function drawSlashPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const tsStroke = titleStroke(tu);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const flip = isRightAlign(cfg);
	const top = isTopAlign(cfg);
	const nameTop = m.pad;
	const titleH = titleBlockH(m.titleLines.length, m.titleSize);
	let nameX;
	let slashX;
	let titleAnchor;
	if (top) {
		if (cfg.side === "right") {
			titleAnchor = m.pad;
			slashX = titleAnchor + m.titleW + 22 * nu;
			nameX = slashX + m.slashW + 22 * nu;
		} else {
			nameX = m.pad;
			slashX = nameX + m.nameW + 22 * nu;
			titleAnchor = slashX + m.slashW + 22 * nu;
		}
	} else {
		nameX = flip ? m.width - m.pad - m.nameW : m.pad;
		slashX = flip ? nameX - 22 * nu - m.slashW : nameX + m.nameW + 22 * nu;
		titleAnchor = m.pad;
	}
	const slashY = nameTop + (m.nameSize - m.slashH) / 2;
	withXform(ctx, m.person, "name", nameX + m.nameW * .5, nameTop + m.nameSize * .5, () => {
		ctx.save();
		clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "slash", slashX + m.slashW * .5, slashY + m.slashH * .5, () => {
		drawBlueSlash(ctx, slashX, slashY, m.slashW, m.slashH, motion.bar, flip || top && cfg.side === "right");
	});
	const lineY = nameTop + (top ? Math.max(m.nameSize, titleH) : m.nameSize + ns * .35) + m.gap;
	const lineStart = flip ? Math.min(slashX, nameX) : nameX;
	const lineEnd = flip ? nameX + m.nameW : Math.max(nameX + m.nameW, slashX + m.slashW + m.slashH * .38);
	withXform(ctx, m.person, "band", (lineStart + lineEnd) * .5, lineY, () => {
		drawHairline(ctx, lineStart, lineEnd, lineY, motion.bar, Math.max(1.2, .018 * m.nameSize), flip ? "right" : "left");
	});
	withXform(ctx, m.person, "title", titleAnchor + m.titleW * .5, (top ? nameTop : lineY + m.gap) + m.titleSize * .5, () => {
		ctx.save();
		clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		let ty = top ? nameTop : lineY + m.gap;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, top ? titleAnchor : flip ? m.width - m.pad - lw : m.pad, ty, 0, PALETTE.title, tsStroke);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function measureBand(ctx, person, cfg) {
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const nameSize = 78 * nu;
	const titleSize = 28 * tu;
	const padX = Math.max(8, titleStroke(tu) + 5);
	const padY = 12 * tu;
	ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
	const nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
	ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
	const titleLines = packTitle(person.title, person.titleLines ?? 1);
	const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
	const bandH = padY + titleBlockH(titleLines.length, titleSize) - titleSize * .28 + padY;
	const slashW = Math.max(14, bandH * .28);
	const skew = bandH * .28;
	const bandW = titleW + padX * 2;
	return {
		person,
		titleLines,
		nameSize,
		titleSize,
		nameW,
		titleW,
		bandH,
		bandW,
		slashW,
		skew,
		padX,
		padY,
		width: Math.max(nameW, slashW + bandW + Math.abs(skew)) + 12 * nu,
		height: nameSize + 16 * nu + bandH
	};
}
function drawBandPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const tsStroke = titleStroke(tu);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const flip = isRightAlign(cfg);
	const skew = (flip ? -1 : 1) * m.skew * motion.bar;
	const bandY = m.nameSize + 16 * nu;
	const slashX = flip ? m.bandW : 0;
	const bandX = flip ? 0 : m.slashW;
	const inner = paraInner(bandX, m.bandW, m.bandH, skew, m.padY + m.titleSize * .15, m.padX);
	const nameX = flip ? inner.right - m.nameW : inner.left;
	withXform(ctx, m.person, "name", nameX + m.nameW * .5, m.nameSize * .5, () => {
		ctx.save();
		clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		paintTracked(ctx, m.person.name, nameX, 0, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "band", bandX + m.bandW * .5, bandY + m.bandH * .5, () => {
		ctx.save();
		ctx.globalAlpha *= motion.bar;
		ctx.fillStyle = PALETTE.band;
		ctx.shadowColor = "rgba(0,0,0,0.45)";
		ctx.shadowBlur = 12;
		fillSkew(ctx, bandX, bandY, m.bandW, m.bandH, skew);
		ctx.restore();
	});
	withXform(ctx, m.person, "slash", slashX + m.slashW * .5, bandY + m.bandH * .5, () => {
		drawBlueSlash(ctx, slashX, bandY + m.padY * .15, m.slashW, m.bandH - m.padY * .3, motion.bar, flip);
	});
	withXform(ctx, m.person, "title", bandX + m.bandW * .5, bandY + m.bandH * .5, () => {
		ctx.save();
		clipSkew(ctx, bandX, bandY, m.bandW, m.bandH, skew);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		let ty = bandY + m.padY;
		let yOff = m.padY;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			const edge = paraInner(bandX, m.bandW, m.bandH, skew, yOff + m.titleSize * .15, m.padX);
			paintTracked(ctx, line, flip ? edge.right - lw : edge.left, ty, 0, PALETTE.title, tsStroke);
			ty += m.titleSize * 1.28;
			yOff += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function measureBar(ctx, person, cfg) {
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const nameSize = 82 * nu;
	const titleSize = 28 * tu;
	const padX = Math.max(8, titleStroke(tu) + 5);
	const padY = 12 * tu;
	const slashW = Math.max(10, nameSize * .12);
	const slashH = nameSize * .32;
	ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
	const nameW = trackedWidth(ctx, person.name, nameTracking(person.name) * nu);
	ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
	const titleLines = packTitle(person.title, person.titleLines ?? 1);
	const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
	const titleH = titleBlockH(titleLines.length, titleSize);
	const top = isTopAlign(cfg);
	const barH = top ? Math.max(8 * nu, 10) : padY + titleH - titleSize * .28 + padY;
	const skew = barH * .32;
	const rowW = top ? nameW + 28 * nu + slashW * 2 + 18 * nu + titleW : nameW + 28 * nu + slashW * 2 + 18 * nu;
	const barW = top ? rowW + padX : titleW + padX * 2;
	return {
		person,
		titleLines,
		nameSize,
		titleSize,
		nameW,
		titleW,
		barH,
		barW,
		skew,
		padX,
		padY,
		slashW,
		slashH,
		width: Math.max(rowW, barW + Math.abs(skew)) + 8 * nu,
		height: top ? Math.max(nameSize, titleH) + 12 * nu + barH : nameSize + 16 * nu + barH
	};
}
function drawBarPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const tsStroke = titleStroke(tu);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const flip = isRightAlign(cfg);
	const top = isTopAlign(cfg);
	const nameOnRight = top && cfg.side === "right";
	const titleH = titleBlockH(m.titleLines.length, m.titleSize);
	let nameX;
	let slashX;
	let titleX0;
	const nameTop = 0;
	if (top) {
		if (nameOnRight) {
			titleX0 = 8 * nu;
			slashX = titleX0 + m.titleW + 18 * nu;
			nameX = slashX + m.slashW * 2 + 20 * nu;
		} else {
			nameX = 8 * nu;
			slashX = nameX + m.nameW + 20 * nu;
			titleX0 = slashX + m.slashW * 2 + 18 * nu;
		}
	} else {
		nameX = 0;
		slashX = 0;
		titleX0 = 0;
	}
	const barY = nameTop + (top ? Math.max(m.nameSize, titleH) + 12 * nu : m.nameSize + 16 * nu);
	const skew = (flip || nameOnRight ? -1 : 1) * m.skew * motion.bar;
	const barX = flip || nameOnRight ? m.width - m.barW : 0;
	const inner = paraInner(barX, m.barW, m.barH, skew, m.padY + m.titleSize * .15, m.padX);
	if (!top) {
		nameX = flip ? inner.right - m.nameW : inner.left;
		slashX = flip ? nameX - 22 * nu - m.slashW * 2 : nameX + m.nameW + 20 * nu;
	}
	withXform(ctx, m.person, "name", nameX + m.nameW * .5, nameTop + m.nameSize * .5, () => {
		ctx.save();
		clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		paintTracked(ctx, m.person.name, nameX, nameTop, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	const slashY = nameTop + (m.nameSize - m.slashH) / 2;
	withXform(ctx, m.person, "slash", slashX + m.slashW, slashY + m.slashH * .5, () => {
		drawBlueSlash(ctx, slashX, slashY, m.slashW, m.slashH, motion.bar, false);
		drawBlueSlash(ctx, slashX + m.slashW + 6 * nu, slashY, m.slashW, m.slashH, motion.bar, false);
	});
	if (top) withXform(ctx, m.person, "title", titleX0 + m.titleW * .5, nameTop + m.titleSize * .5, () => {
		ctx.save();
		clipReveal(ctx, -32, -32, m.width + 64, m.height + 64, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		let ty = nameTop;
		for (const line of m.titleLines) {
			paintTracked(ctx, line, titleX0, ty, 0, PALETTE.title, tsStroke);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	withXform(ctx, m.person, "band", barX + m.barW * .5, barY + m.barH * .5, () => {
		ctx.save();
		ctx.globalAlpha *= motion.titleClip;
		ctx.fillStyle = PALETTE.band;
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 10;
		fillSkew(ctx, barX, barY, m.barW, m.barH, skew);
		ctx.restore();
	});
	if (!top) withXform(ctx, m.person, "title", barX + m.barW * .5, barY + m.barH * .5, () => {
		ctx.save();
		clipSkew(ctx, barX, barY, m.barW, m.barH, skew);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		let ty = barY + m.padY;
		let yOff = m.padY;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			const edge = paraInner(barX, m.barW, m.barH, skew, yOff + m.titleSize * .15, m.padX);
			paintTracked(ctx, line, flip ? edge.right - lw : edge.left, ty, 0, PALETTE.title, tsStroke);
			ty += m.titleSize * 1.28;
			yOff += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function titleCharStep(ch, titleSize, titleGap, last) {
	if (ch === "、") return titleSize * .42;
	if (ch === "·" || ch === " ") return titleSize * .7;
	return last ? titleSize : titleSize + titleGap;
}
function columnHeight(text, titleSize, titleGap) {
	let h = 0;
	const chars = [...text];
	chars.forEach((ch, i) => {
		h += titleCharStep(ch, titleSize, titleGap, i === chars.length - 1);
	});
	return h;
}
function paintTitleColumn(ctx, text, cx, top, titleSize, titleGap, stroke, nudge) {
	let ty = top;
	const chars = [...text];
	chars.forEach((ch, i) => {
		const last = i === chars.length - 1;
		if (ch === "、") {
			paintGlyph(ctx, "、", cx + nudge, ty - titleSize * .82, PALETTE.title, stroke * .7);
			ty += titleSize * .42;
			return;
		}
		paintGlyph(ctx, ch === " " ? "·" : ch, cx, ty, PALETTE.title, stroke);
		ty += titleCharStep(ch, titleSize, titleGap, last);
	});
}
function measureColumn(person, cfg) {
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const nameSize = 72 * nu;
	const titleSize = 28 * tu;
	const nameGap = 10 * nu;
	const titleGap = 6 * tu;
	const pad = 8 * nu;
	const gap = 14 * nu;
	const colGap = 10 * tu;
	const slashW = Math.max(14, nameSize * .22);
	const slashH = nameSize * .5;
	const nameH = person.name.length * (nameSize + nameGap) - (person.name.length ? nameGap : 0);
	const titleCols = packTitle(person.title, person.titleLines ?? 1);
	const titleH = Math.max(0, ...titleCols.map((col) => columnHeight(col, titleSize, titleGap)));
	const cols = Math.max(titleCols.length, 1);
	const titleBlock = cols * titleSize * 1.15 + (cols - 1) * colGap;
	const sq = Math.max(6, .09 * nameSize);
	const nameStack = nameH + gap + slashH;
	return {
		person,
		titleCols,
		nameSize,
		titleSize,
		nameGap,
		titleGap,
		pad,
		nameH,
		titleH,
		slashH,
		slashW,
		gap,
		colGap,
		width: pad + nameSize + gap + 12 * nu + titleBlock + pad,
		height: pad + Math.max(nameStack, titleH) + 16 * nu + sq + pad
	};
}
function drawColumnPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const ns = nameStroke(nu);
	const tsStroke = titleStroke(tu);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x * .2, y + motion.y);
	const nameOnLeft = cfg.side === "right";
	const nameTop = m.pad;
	const titleTop = m.pad;
	const nameCx = nameOnLeft ? m.pad + m.nameSize * .5 : m.width - m.pad - m.nameSize * .5;
	const ruleX = nameOnLeft ? nameCx + m.nameSize * .5 + m.gap : nameCx - m.nameSize * .5 - m.gap;
	const colPitch = m.titleSize * 1.15 + m.colGap;
	const firstCx = nameOnLeft ? ruleX + 14 * tu + m.titleSize * .5 : ruleX - 14 * tu - m.titleSize * .5;
	const slashX = nameCx - m.slashW * .5;
	const slashY = nameTop + m.nameH + m.gap;
	withXform(ctx, m.person, "slash", nameCx, slashY + m.slashH * .5, () => {
		drawBlueSlash(ctx, slashX, slashY, m.slashW, m.slashH, motion.bar, !nameOnLeft, 1.12);
	});
	const colH = Math.max(m.nameH + m.gap + m.slashH, m.titleH);
	const lineTop = m.pad;
	const lineH = colH * motion.bar;
	withXform(ctx, m.person, "band", ruleX, lineTop + lineH * .5, () => {
		ctx.save();
		ctx.strokeStyle = "rgba(0,0,0,0.55)";
		ctx.lineWidth = 3 * nu;
		ctx.beginPath();
		ctx.moveTo(ruleX, lineTop);
		ctx.lineTo(ruleX, lineTop + lineH);
		ctx.stroke();
		ctx.strokeStyle = PALETTE.line;
		ctx.lineWidth = Math.max(1.1, .016 * m.nameSize);
		ctx.beginPath();
		ctx.moveTo(ruleX, lineTop);
		ctx.lineTo(ruleX, lineTop + lineH);
		ctx.stroke();
		ctx.restore();
		const sq = Math.max(6, .09 * m.nameSize);
		drawBlueSquare(ctx, ruleX - sq / 2, lineTop + lineH + 8 * nu, sq, motion.bar);
	});
	withXform(ctx, m.person, "name", nameCx, nameTop + m.nameH * .5, () => {
		ctx.save();
		ctx.beginPath();
		ctx.rect(-20, -20, m.width + 40, Math.max(m.height * motion.nameClip, m.pad + m.nameSize) + 20);
		ctx.clip();
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		let ny = nameTop;
		for (const ch of m.person.name) {
			paintGlyph(ctx, ch, nameCx, ny, PALETTE.name, ns);
			ny += m.nameSize + m.nameGap;
		}
		ctx.restore();
	});
	withXform(ctx, m.person, "title", firstCx, titleTop + m.titleH * .5, () => {
		ctx.save();
		ctx.beginPath();
		ctx.rect(-20, -20, m.width + 40, m.height * Math.max(motion.titleClip, .2) + 20);
		ctx.clip();
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		m.titleCols.forEach((col, i) => {
			paintTitleColumn(ctx, col, nameOnLeft ? firstCx + i * colPitch : firstCx - i * colPitch, titleTop, m.titleSize, m.titleGap, tsStroke, 3 * tu);
		});
		ctx.restore();
	});
	ctx.restore();
}
function measurePanel(ctx, person, cfg) {
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const nameSize = 68 * nu;
	const titleSize = 26 * tu;
	const pad = 18 * nu;
	const gap = 8 * nu;
	const radius = 14 * nu;
	const strip = 8 * nu;
	const chars = [...person.name];
	const first = chars[0] ?? "";
	const rest = chars.slice(1).join("");
	ctx.font = `500 ${nameSize}px ${nameFace(cfg)}`;
	const tracking = nameTracking(person.name) * nu;
	const nameW = trackedWidth(ctx, person.name, tracking);
	const restTrack = nameTracking(rest) * nu;
	const restW = rest ? trackedWidth(ctx, rest, restTrack) : 0;
	ctx.font = `400 ${titleSize}px ${titleFace(cfg)}`;
	const titleLines = packTitle(person.title, person.titleLines ?? 1);
	const titleW = titleLines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
	const titleH = titleBlockH(titleLines.length, titleSize);
	const box = nameSize * 1.18;
	let width = pad * 2 + Math.max(nameW, titleW);
	let height = pad + nameSize + gap + titleH + pad;
	if (cfg.style === "card") width = strip + pad + Math.max(nameW, titleW) + pad;
	else if (cfg.style === "pill") {
		height = pad * .85 + nameSize * .92 + gap + titleH + pad * .85;
		width = pad * 1.4 + Math.max(nameW, titleW) + pad * 1.4;
	} else if (cfg.style === "stack") {
		width = Math.max(nameW + pad * 2, titleW + pad * 2);
		height = nameSize * 1.22 + 5 * nu + pad * .7 + titleH + pad * .7;
	} else if (cfg.style === "rail") {
		width = 12 * nu + 16 * nu + Math.max(nameW, titleW);
		height = nameSize + gap + titleH;
	} else if (cfg.style === "badge") {
		width = box + 16 * nu + Math.max(restW, titleW, 8);
		height = Math.max(box, (box + nameSize) / 2 + gap + titleH);
	}
	return {
		person,
		titleLines,
		nameSize,
		titleSize,
		nameW,
		titleW,
		pad,
		gap,
		radius,
		strip,
		first,
		rest,
		restW,
		box,
		width,
		height
	};
}
function drawCardPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const ts = titleStroke(tu);
	const flip = isRightAlign(cfg);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const w = m.width * Math.max(motion.bar, .08);
	const cardX = flip ? m.width - w : 0;
	withXform(ctx, m.person, "band", cardX + w * .5, m.height * .5, () => {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.45)";
		ctx.shadowBlur = 16;
		ctx.fillStyle = PALETTE.band;
		fillRound(ctx, cardX, 0, w, m.height, m.radius);
		ctx.restore();
	});
	const stripX = flip ? cardX + w - m.strip : cardX;
	withXform(ctx, m.person, "slash", stripX + m.strip * .5, m.height * .5, () => {
		ctx.fillStyle = PALETTE.accent;
		ctx.fillRect(stripX, 0, m.strip, m.height);
	});
	const innerL = flip ? cardX + m.pad : cardX + m.strip + m.pad;
	const innerR = flip ? cardX + w - m.strip - m.pad : cardX + w - m.pad;
	withXform(ctx, m.person, "name", (innerL + innerR) * .5, m.pad + m.nameSize * .5, () => {
		ctx.save();
		clipRound(ctx, cardX, 0, w, m.height, m.radius);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		clipReveal(ctx, cardX, 0, w, m.height, motion.nameClip, side);
		const nx = flip ? innerR - m.nameW : innerL;
		paintTracked(ctx, m.person.name, nx, m.pad, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "title", (innerL + innerR) * .5, m.pad + m.nameSize + m.gap + m.titleSize * .5, () => {
		ctx.save();
		clipRound(ctx, cardX, 0, w, m.height, m.radius);
		clipReveal(ctx, cardX, 0, w, m.height, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		let ty = m.pad + m.nameSize + m.gap;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, flip ? innerR - lw : innerL, ty, 0, PALETTE.title, ts);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function drawPillPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const ts = titleStroke(tu);
	const flip = isRightAlign(cfg);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const w = m.width * Math.max(motion.bar, .12);
	const px = flip ? m.width - w : 0;
	const r = m.height / 2;
	withXform(ctx, m.person, "band", px + w * .5, m.height * .5, () => {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 14;
		ctx.fillStyle = PALETTE.band;
		fillRound(ctx, px, 0, w, m.height, r);
		ctx.restore();
	});
	const tick = Math.max(8, 10 * nu);
	const tickX = flip ? px + w - m.pad * .7 - tick : px + m.pad * .55;
	withXform(ctx, m.person, "slash", tickX + tick * .5, m.height * .5, () => {
		ctx.fillStyle = PALETTE.accent;
		fillRound(ctx, tickX, m.height * .28, tick, m.height * .44, tick / 2);
	});
	const innerL = px + m.pad * 1.15 + (flip ? 0 : tick * .2);
	const innerR = px + w - m.pad * 1.15;
	const ny = m.pad * .7;
	withXform(ctx, m.person, "name", (innerL + innerR) * .5, ny + m.nameSize * .5, () => {
		ctx.save();
		clipRound(ctx, px, 0, w, m.height, r);
		clipReveal(ctx, px, 0, w, m.height, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		const nx = flip ? innerR - m.nameW : innerL;
		paintTracked(ctx, m.person.name, nx, ny, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "title", (innerL + innerR) * .5, ny + m.nameSize, () => {
		ctx.save();
		clipRound(ctx, px, 0, w, m.height, r);
		clipReveal(ctx, px, 0, w, m.height, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		let ty = ny + m.nameSize * .92 + m.gap;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, flip ? innerR - lw : innerL, ty, 0, PALETTE.title, ts);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function drawStackPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const ts = titleStroke(tu);
	const flip = isRightAlign(cfg);
	const nameH = m.nameSize * 1.22;
	const titleH = m.pad * .7 + titleBlockH(m.titleLines.length, m.titleSize) + m.pad * .7;
	const nameW = Math.min(m.width, m.nameW + m.pad * 2);
	const titleW = Math.min(m.width, Math.max(m.titleW + m.pad * 2, nameW * .92));
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const nameBarW = nameW * Math.max(motion.bar, .1);
	const titleBarW = titleW * Math.max(motion.bar, .1);
	const nx0 = flip ? m.width - nameBarW : 0;
	const tx0 = flip ? m.width - titleBarW : 0;
	withXform(ctx, m.person, "slash", nx0 + nameBarW * .5, nameH * .5, () => {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.35)";
		ctx.shadowBlur = 10;
		ctx.fillStyle = PALETTE.accent;
		ctx.fillRect(nx0, 0, nameBarW, nameH);
		ctx.restore();
	});
	withXform(ctx, m.person, "band", tx0 + titleBarW * .5, nameH + 5 * nu + titleH * .5, () => {
		ctx.fillStyle = PALETTE.band;
		ctx.fillRect(tx0, nameH + 5 * nu, titleBarW, titleH);
	});
	withXform(ctx, m.person, "name", nx0 + nameBarW * .5, nameH * .5, () => {
		ctx.save();
		clipReveal(ctx, nx0, 0, nameBarW, nameH, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		const nameX = flip ? nx0 + nameBarW - m.pad - m.nameW : nx0 + m.pad;
		paintTracked(ctx, m.person.name, nameX, nameH / 2, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "title", tx0 + titleBarW * .5, nameH + 5 * nu + titleH * .5, () => {
		ctx.save();
		clipReveal(ctx, tx0, nameH + 5 * nu, titleBarW, titleH, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		let ty = nameH + 5 * nu + m.pad * .7;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, flip ? tx0 + titleBarW - m.pad - lw : tx0 + m.pad, ty, 0, PALETTE.title, ts);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function drawRailPlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const tracking = nameTracking(m.person.name) * nu;
	const ns = nameStroke(nu);
	const ts = titleStroke(tu);
	const flip = isRightAlign(cfg);
	const railW = 12 * nu;
	const gap = 16 * nu;
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const railH = m.height * Math.max(motion.bar, .08);
	const railX = flip ? m.width - railW : 0;
	withXform(ctx, m.person, "slash", railX + railW * .5, railH * .5, () => {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 8;
		ctx.fillStyle = PALETTE.accent;
		fillRound(ctx, railX, 0, railW, railH, 3);
		ctx.restore();
	});
	const textX0 = flip ? 0 : railW + gap;
	const textRight = flip ? m.width - railW - gap : m.width;
	withXform(ctx, m.person, "name", flip ? textRight - m.nameW * .5 : textX0 + m.nameW * .5, m.nameSize * .5, () => {
		ctx.save();
		clipReveal(ctx, 0, 0, m.width, m.height, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		const nx = flip ? textRight - m.nameW : textX0;
		paintTracked(ctx, m.person.name, nx, 0, tracking, PALETTE.name, ns);
		ctx.restore();
	});
	withXform(ctx, m.person, "title", flip ? textRight - m.titleW * .5 : textX0 + m.titleW * .5, m.nameSize + m.gap + m.titleSize * .5, () => {
		ctx.save();
		clipReveal(ctx, 0, 0, m.width, m.height, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		let ty = m.nameSize + m.gap;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, flip ? textRight - lw : textX0, ty, 0, PALETTE.title, ts);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function drawBadgePlate(ctx, m, x, y, motion, side, cfg) {
	if (motion.opacity <= .001) return;
	const nu = nameU(cfg);
	const tu = titleU(cfg);
	const restTrack = nameTracking(m.rest) * nu;
	const ns = nameStroke(nu);
	const ts = titleStroke(tu);
	const flip = isRightAlign(cfg);
	ctx.save();
	ctx.globalAlpha = motion.opacity;
	ctx.translate(x + motion.x, y + motion.y);
	const box = m.box;
	const gap = 16 * nu;
	const boxX = flip ? m.width - box : 0;
	const s = Math.max(motion.bar, .08);
	withXform(ctx, m.person, "slash", boxX + box * .5, box * .5, () => {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 10;
		ctx.fillStyle = PALETTE.accent;
		ctx.fillRect(boxX + (1 - s) * box * .5, (1 - s) * box * .5, box * s, box * s);
		ctx.restore();
	});
	const colX = flip ? 0 : box + gap;
	const colR = flip ? m.width - box - gap : m.width;
	withXform(ctx, m.person, "name", boxX + box * .5, box * .5, () => {
		ctx.save();
		clipReveal(ctx, boxX, 0, box, box, motion.nameClip, side);
		ctx.font = `600 ${m.nameSize * .78}px ${nameFace(cfg)}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		paintGlyph(ctx, m.first, boxX + box / 2, box / 2, PALETTE.name, ns);
		ctx.restore();
		ctx.save();
		clipReveal(ctx, 0, 0, m.width, m.height, motion.nameClip, side);
		ctx.font = `500 ${m.nameSize}px ${nameFace(cfg)}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		if (m.rest) {
			const rx = flip ? colR - m.restW : colX;
			paintTracked(ctx, m.rest, rx, (box - m.nameSize) / 2, restTrack, PALETTE.name, ns);
		}
		ctx.restore();
	});
	withXform(ctx, m.person, "title", flip ? colR - m.titleW * .5 : colX + m.titleW * .5, box, () => {
		ctx.save();
		clipReveal(ctx, 0, 0, m.width, m.height, motion.titleClip, side);
		ctx.font = `400 ${m.titleSize}px ${titleFace(cfg)}`;
		ctx.textBaseline = "top";
		let ty = Math.max(box - titleBlockH(m.titleLines.length, m.titleSize), m.nameSize + 6 * nu);
		if (!m.rest) ty = box + 8 * nu;
		for (const line of m.titleLines) {
			const lw = ctx.measureText(line).width;
			paintTracked(ctx, line, flip ? colR - lw : colX, ty, 0, PALETTE.title, ts);
			ty += m.titleSize * 1.28;
		}
		ctx.restore();
	});
	ctx.restore();
}
function placePlates(ctx, people, time, cfg, measured, draw, vertical) {
	const u = nameU(cfg);
	const edge = 160;
	const gap = vertical ? 56 * u : 36 * u;
	const maxH = Math.max(...measured.map((p) => p.height), 1);
	const groupH = cfg.layout === "sequence" ? maxH : measured.reduce((s, p) => s + p.height, 0) + gap * Math.max(measured.length - 1, 0);
	const available = BASE_H - 80;
	const fit = Math.min(1, available / groupH);
	const originY = vertical ? (BASE_H - groupH * fit) / 2 : Math.max(72, Math.min(BASE_H * .66 - groupH * fit / 2, BASE_H - groupH * fit - 72));
	if (cfg.layout === "sequence") {
		people.forEach((_, i) => {
			const plate = measured[i];
			const motion = plateMotion(i, people.length, time, cfg);
			const originX = cfg.side === "left" ? edge : BASE_W - edge - plate.width * fit;
			ctx.save();
			ctx.translate(originX, originY);
			ctx.scale(fit, fit);
			draw(plate, i, 0, 0, motion);
			ctx.restore();
		});
		return;
	}
	const groupW = vertical ? measured.reduce((s, p) => s + p.width, 0) + gap * Math.max(people.length - 1, 0) : Math.max(...measured.map((p) => p.width));
	const originX = cfg.side === "left" ? edge : BASE_W - edge - groupW * fit;
	ctx.save();
	ctx.translate(originX, originY);
	ctx.scale(fit, fit);
	if (vertical) {
		let px = 0;
		measured.forEach((plate, i) => {
			const motion = plateMotion(i, people.length, time, cfg);
			draw(plate, i, px, 0, motion);
			px += plate.width + gap;
		});
	} else {
		let py = 0;
		measured.forEach((plate, i) => {
			const motion = plateMotion(i, people.length, time, cfg);
			draw(plate, i, cfg.side === "left" ? 0 : groupW - plate.width, py, motion);
			py += plate.height + gap;
		});
	}
	ctx.restore();
}
function drawFrame(ctx, canvasW, canvasH, time, cfg) {
	applyPalette(cfg);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvasW, canvasH);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	const sx = canvasW / BASE_W;
	const sy = canvasH / BASE_H;
	ctx.setTransform(sx, 0, 0, sy, 0, 0);
	const people = cfg.people.filter((p) => p.name.trim().length > 0);
	if (people.length === 0) return;
	if (cfg.style === "vertical") {
		placePlates(ctx, people, time, cfg, people.map((p) => measureColumn(p, cfg)), (plate, i, x, y, motion) => {
			drawColumnPlate(ctx, plate, x, y, motion, cfg.side, cfg);
		}, true);
		return;
	}
	if (cfg.style === "qinghua") {
		placePlates(ctx, people, time, cfg, people.map((p) => measureBand(ctx, p, cfg)), (plate, i, x, y, motion) => {
			drawBandPlate(ctx, plate, x, y, motion, cfg.side, cfg);
		}, false);
		return;
	}
	if (cfg.style === "news") {
		placePlates(ctx, people, time, cfg, people.map((p) => measureBar(ctx, p, cfg)), (plate, i, x, y, motion) => {
			drawBarPlate(ctx, plate, x, y, motion, cfg.side, cfg);
		}, false);
		return;
	}
	if (cfg.style === "card" || cfg.style === "pill" || cfg.style === "stack" || cfg.style === "rail" || cfg.style === "badge") {
		const measured = people.map((p) => measurePanel(ctx, p, cfg));
		const draw = cfg.style === "card" ? drawCardPlate : cfg.style === "pill" ? drawPillPlate : cfg.style === "stack" ? drawStackPlate : cfg.style === "rail" ? drawRailPlate : drawBadgePlate;
		placePlates(ctx, people, time, cfg, measured, (plate, i, x, y, motion) => {
			draw(ctx, plate, x, y, motion, cfg.side, cfg);
		}, false);
		return;
	}
	placePlates(ctx, people, time, cfg, people.map((p) => measureSlash(ctx, p, cfg)), (plate, i, x, y, motion) => {
		drawSlashPlate(ctx, plate, x, y, motion, cfg.side, cfg);
	}, false);
}
function renderConfigFromState(state) {
	return {
		people: state.people,
		style: state.style,
		layout: state.layout,
		side: state.side,
		align: state.align ?? "left",
		scale: state.scale,
		textSize: state.textSize ?? 1,
		titleSize: state.titleSize ?? 1,
		nameFont: resolveFontStack(state.nameFontId, "name"),
		titleFont: resolveFontStack(state.titleFontId, "title"),
		nameColor: state.nameColor ?? THEME.name,
		titleColor: state.titleColor ?? THEME.title,
		accentColor: state.accentColor ?? THEME.accent,
		bandColor: state.bandColor ?? THEME.band,
		sectionLabel: "",
		inDuration: state.inDuration,
		holdDuration: state.holdDuration,
		outDuration: state.outDuration,
		stagger: state.stagger,
		animIn: state.animIn ?? "left",
		ease: state.ease ?? "smooth"
	};
}
function soloConfig(config, person) {
	return {
		...config,
		people: [person],
		layout: "sequence",
		sectionLabel: ""
	};
}
var KEY = "nameplate-projects-v1";
function readAll() {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function writeAll(list) {
	localStorage.setItem(KEY, JSON.stringify(list.slice(0, 24)));
}
function listProjects() {
	return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}
function snapshotFromState(s) {
	return {
		name: s.name,
		people: s.people.map((p) => ({ ...p })),
		style: s.style,
		layout: s.layout,
		side: s.side,
		align: s.align,
		scale: s.scale,
		textSize: s.textSize,
		titleSize: s.titleSize,
		nameFontId: s.nameFontId,
		titleFontId: s.titleFontId,
		nameColor: s.nameColor,
		titleColor: s.titleColor,
		accentColor: s.accentColor,
		bandColor: s.bandColor,
		inDuration: s.inDuration,
		holdDuration: s.holdDuration,
		outDuration: s.outDuration,
		stagger: s.stagger,
		animIn: s.animIn,
		ease: s.ease
	};
}
function saveProject(s, id) {
	const list = readAll();
	const rec = {
		id: (id ? list.find((p) => p.id === id) : list.find((p) => p.name === s.projectName))?.id ?? `proj-${Date.now()}`,
		name: s.projectName || s.name || "未命名项目",
		updatedAt: Date.now(),
		snapshot: snapshotFromState({
			...s,
			name: s.projectName || s.name
		})
	};
	writeAll([rec, ...list.filter((p) => p.id !== rec.id)]);
	return rec;
}
function deleteProject(id) {
	writeAll(readAll().filter((p) => p.id !== id));
}
function downloadJson(filename, data) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
var extra = 1;
function applyFont(id) {
	ensureFontReady(id).then(() => {
		useStudio.getState().bumpFontEpoch();
	});
}
function snapOf(s) {
	return snapshotFromState({
		name: s.projectName,
		people: s.people,
		style: s.style,
		layout: s.layout,
		side: s.side,
		align: s.align,
		scale: s.scale,
		textSize: s.textSize,
		titleSize: s.titleSize,
		nameFontId: s.nameFontId,
		titleFontId: s.titleFontId,
		nameColor: s.nameColor,
		titleColor: s.titleColor,
		accentColor: s.accentColor,
		bandColor: s.bandColor,
		inDuration: s.inDuration,
		holdDuration: s.holdDuration,
		outDuration: s.outDuration,
		stagger: s.stagger,
		animIn: s.animIn,
		ease: s.ease
	});
}
var useStudio = create()(persist((set, get) => {
	const commit = (patch) => {
		const past = [...get().past, snapOf(get())].slice(-40);
		set({
			...patch,
			past,
			future: []
		});
	};
	return {
		people: DEFAULT_PEOPLE,
		...DEFAULT_CONFIG,
		nameFontId: DEFAULT_NAME_FONT,
		titleFontId: DEFAULT_TITLE_FONT,
		customFonts: [],
		fontEpoch: 0,
		nameColor: "#f7f7f7",
		titleColor: "#e8e8e8",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,10,10,0.8)",
		animIn: "left",
		ease: "smooth",
		previewBg: "live",
		showSafe: true,
		currentTime: 1.6,
		playing: false,
		exportWidth: 1920,
		exportFps: 29.97,
		workspace: "editor",
		editorNav: "style",
		projectName: "Untitled Project",
		activePersonId: DEFAULT_PEOPLE[0].id,
		selectedClip: null,
		favorited: ["xuke"],
		customPresets: [],
		past: [],
		future: [],
		setPeople: (people) => commit({ people }),
		updatePerson: (id, patch) => commit({ people: get().people.map((p) => p.id === id ? {
			...p,
			...patch
		} : p) }),
		addPerson: () => {
			extra += 1;
			const id = `p-new-${extra}`;
			commit({
				people: [...get().people, {
					id,
					name: "嘉宾姓名",
					title: "职务",
					titleLines: 1
				}],
				activePersonId: id
			});
		},
		removePerson: (id) => {
			const people = get().people.filter((p) => p.id !== id);
			commit({
				people,
				activePersonId: get().activePersonId === id ? people[0]?.id ?? "" : get().activePersonId
			});
		},
		movePerson: (id, dir) => {
			const list = [...get().people];
			const i = list.findIndex((p) => p.id === id);
			const j = i + dir;
			if (i < 0 || j < 0 || j >= list.length) return;
			const tmp = list[i];
			list[i] = list[j];
			list[j] = tmp;
			commit({ people: list });
		},
		reorderPeople: (from, to) => {
			const list = [...get().people];
			if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return;
			const [item] = list.splice(from, 1);
			if (!item) return;
			list.splice(to, 0, item);
			commit({ people: list });
		},
		duplicatePerson: (id) => {
			const src = get().people.find((p) => p.id === id);
			if (!src) return;
			extra += 1;
			const copy = {
				...src,
				id: `p-new-${extra}`,
				name: `${src.name}`
			};
			const i = get().people.findIndex((p) => p.id === id);
			const people = [...get().people];
			people.splice(i + 1, 0, copy);
			commit({
				people,
				activePersonId: copy.id
			});
		},
		restoreDefaults: () => commit({
			people: DEFAULT_PEOPLE.map((p) => ({ ...p })),
			...DEFAULT_CONFIG,
			nameFontId: DEFAULT_NAME_FONT,
			titleFontId: DEFAULT_TITLE_FONT,
			nameColor: "#f7f7f7",
			titleColor: "#e8e8e8",
			accentColor: "#4f8cff",
			bandColor: "rgba(10,10,10,0.8)",
			animIn: "left",
			ease: "smooth",
			currentTime: 1.2,
			playing: false,
			exportFps: 29.97,
			activePersonId: DEFAULT_PEOPLE[0].id,
			projectName: "Untitled Project"
		}),
		resetStyle: () => commit({
			style: DEFAULT_CONFIG.style,
			layout: DEFAULT_CONFIG.layout,
			side: DEFAULT_CONFIG.side,
			align: DEFAULT_CONFIG.align,
			scale: DEFAULT_CONFIG.scale,
			textSize: DEFAULT_CONFIG.textSize,
			titleSize: DEFAULT_CONFIG.titleSize,
			nameFontId: DEFAULT_NAME_FONT,
			titleFontId: DEFAULT_TITLE_FONT,
			nameColor: "#f7f7f7",
			titleColor: "#e8e8e8",
			accentColor: "#4f8cff",
			bandColor: "rgba(10,10,10,0.8)",
			inDuration: DEFAULT_CONFIG.inDuration,
			holdDuration: DEFAULT_CONFIG.holdDuration,
			outDuration: DEFAULT_CONFIG.outDuration,
			stagger: DEFAULT_CONFIG.stagger,
			animIn: "left",
			ease: "smooth"
		}),
		setStyle: (style) => commit({
			style,
			align: style === "vertical" ? "top" : get().side === "right" ? "right" : "left"
		}),
		setLayout: (layout) => commit({ layout }),
		setSide: (side) => commit({
			side,
			align: get().style === "vertical" ? "top" : side === "right" ? "right" : "left",
			animIn: get().animIn === "left" || get().animIn === "right" ? side === "right" ? "right" : "left" : get().animIn
		}),
		setAlign: (align) => commit({ align }),
		setScale: (scale) => commit({ scale }),
		setTextSize: (textSize) => commit({ textSize }),
		setTitleSize: (titleSize) => commit({ titleSize }),
		setNameFontId: (nameFontId) => {
			commit({ nameFontId });
			applyFont(nameFontId);
		},
		setTitleFontId: (titleFontId) => {
			commit({ titleFontId });
			applyFont(titleFontId);
		},
		setCustomFonts: (customFonts) => set({ customFonts }),
		addCustomFont: (font) => set({ customFonts: [...get().customFonts.filter((f) => f.id !== font.id), font] }),
		bumpFontEpoch: () => set({ fontEpoch: get().fontEpoch + 1 }),
		setNameColor: (nameColor) => commit({ nameColor }),
		setTitleColor: (titleColor) => commit({ titleColor }),
		setAccentColor: (accentColor) => commit({ accentColor }),
		setBandColor: (bandColor) => commit({ bandColor }),
		setSectionLabel: (sectionLabel) => commit({ sectionLabel }),
		setInDuration: (inDuration) => commit({ inDuration }),
		setHoldDuration: (holdDuration) => commit({ holdDuration }),
		setOutDuration: (outDuration) => commit({ outDuration }),
		setStagger: (stagger) => commit({ stagger }),
		setAnimIn: (animIn) => commit({
			animIn,
			side: animIn === "right" ? "right" : animIn === "left" ? "left" : get().side,
			align: get().style === "vertical" ? "top" : animIn === "right" ? "right" : animIn === "left" ? "left" : get().align
		}),
		setEase: (ease) => commit({ ease }),
		setPreviewBg: (previewBg) => set({ previewBg }),
		setShowSafe: (showSafe) => set({ showSafe }),
		setCurrentTime: (currentTime) => set({ currentTime }),
		setPlaying: (playing) => set({ playing }),
		setExportWidth: (exportWidth) => set({ exportWidth }),
		setExportFps: (exportFps) => set({ exportFps }),
		setWorkspace: (workspace) => set({ workspace }),
		setEditorNav: (editorNav) => set({
			editorNav,
			workspace: "editor"
		}),
		setProjectName: (projectName) => set({ projectName }),
		setActivePersonId: (activePersonId) => set({ activePersonId }),
		selectClip: (personId, layer) => set({
			selectedClip: {
				personId,
				layer
			},
			activePersonId: personId
		}),
		clearClip: () => set({ selectedClip: null }),
		setLayerXform: (personId, layer, patch, live) => {
			const next = get().people.map((p) => {
				if (p.id !== personId) return p;
				const prev = p.xform?.[layer] ?? {
					x: 0,
					y: 0,
					rotation: 0
				};
				return {
					...p,
					xform: {
						...p.xform,
						[layer]: {
							...prev,
							...patch
						}
					}
				};
			});
			if (live) set({ people: next });
			else commit({ people: next });
		},
		resetLayerXform: (personId, layer) => {
			commit({ people: get().people.map((p) => {
				if (p.id !== personId) return p;
				const xform = { ...p.xform };
				delete xform[layer];
				return {
					...p,
					xform
				};
			}) });
		},
		focusPerson: (id, playIn) => {
			const st = get();
			const i = st.people.findIndex((p) => p.id === id);
			if (i < 0) return;
			const slot = st.inDuration + st.holdDuration + st.outDuration;
			set({
				activePersonId: id,
				currentTime: st.layout === "sequence" ? i * slot + (playIn ? .04 : st.inDuration + .12) : st.currentTime,
				playing: !!playIn
			});
		},
		applyPreset: (p) => {
			const st = get();
			const side = p.side ?? st.side;
			const slot = st.inDuration + st.holdDuration + st.outDuration;
			const idx = Math.max(0, st.people.findIndex((x) => x.id === st.activePersonId));
			const hold = (st.layout === "sequence" ? idx * slot : 0) + st.inDuration + .15;
			const t = st.currentTime < st.inDuration * .5 || st.playing ? hold : st.currentTime;
			commit({
				style: p.style,
				side,
				align: p.style === "vertical" ? "top" : side === "right" ? "right" : "left",
				accentColor: p.accentColor ?? st.accentColor,
				bandColor: p.bandColor ?? st.bandColor,
				nameColor: p.nameColor ?? st.nameColor,
				titleColor: p.titleColor ?? st.titleColor,
				animIn: st.animIn === "left" || st.animIn === "right" ? side === "right" ? "right" : "left" : st.animIn,
				currentTime: t,
				playing: false
			});
		},
		toggleFavorite: (id) => {
			set({ favorited: get().favorited.includes(id) ? get().favorited.filter((x) => x !== id) : [...get().favorited, id] });
		},
		saveCustomPreset: () => {
			const st = get();
			const card = {
				id: `custom-${Date.now()}`,
				label: `${st.projectName || "我的"}样式`,
				caption: "自定义",
				style: st.style,
				side: st.side,
				accentColor: st.accentColor,
				bandColor: st.bandColor,
				nameColor: st.nameColor,
				titleColor: st.titleColor,
				group: "simple"
			};
			set({
				customPresets: [...st.customPresets, card],
				favorited: [...st.favorited, card.id]
			});
			return card;
		},
		applySnapshot: (snap) => {
			commit({
				projectName: snap.name,
				people: snap.people.map((p) => ({ ...p })),
				style: snap.style,
				layout: snap.layout,
				side: snap.side,
				align: snap.align,
				scale: snap.scale,
				textSize: snap.textSize,
				titleSize: snap.titleSize,
				nameFontId: snap.nameFontId,
				titleFontId: snap.titleFontId,
				nameColor: snap.nameColor,
				titleColor: snap.titleColor,
				accentColor: snap.accentColor,
				bandColor: snap.bandColor,
				inDuration: snap.inDuration,
				holdDuration: snap.holdDuration,
				outDuration: snap.outDuration,
				stagger: snap.stagger,
				animIn: snap.animIn,
				ease: snap.ease,
				activePersonId: snap.people[0]?.id ?? "",
				currentTime: snap.inDuration + .15,
				playing: false,
				workspace: "editor"
			});
			applyFont(snap.nameFontId);
			applyFont(snap.titleFontId);
		},
		openPresetBrowse: () => {
			const st = get();
			const slot = st.inDuration + st.holdDuration + st.outDuration;
			const idx = Math.max(0, st.people.findIndex((p) => p.id === st.activePersonId));
			const hold = (st.layout === "sequence" ? idx * slot : 0) + st.inDuration + .15;
			set({
				workspace: "presets",
				currentTime: st.currentTime < st.inDuration * .5 ? hold : st.currentTime,
				playing: false
			});
		},
		undo: () => {
			const past = [...get().past];
			const prev = past.pop();
			if (!prev) return;
			const future = [...get().future, snapOf(get())];
			set({
				...prev,
				projectName: prev.name,
				past,
				future,
				currentTime: get().currentTime,
				playing: false
			});
		},
		redo: () => {
			const future = [...get().future];
			const next = future.pop();
			if (!next) return;
			const past = [...get().past, snapOf(get())];
			set({
				...next,
				projectName: next.name,
				past,
				future,
				currentTime: get().currentTime,
				playing: false
			});
		}
	};
}, {
	name: "nameplate-studio-v7",
	skipHydration: true,
	partialize: (s) => ({
		people: s.people,
		style: s.style,
		layout: s.layout,
		side: s.side,
		align: s.align,
		scale: s.scale,
		textSize: s.textSize,
		titleSize: s.titleSize,
		nameFontId: s.nameFontId,
		titleFontId: s.titleFontId,
		customFonts: s.customFonts,
		nameColor: s.nameColor,
		titleColor: s.titleColor,
		accentColor: s.accentColor,
		bandColor: s.bandColor,
		sectionLabel: s.sectionLabel,
		inDuration: s.inDuration,
		holdDuration: s.holdDuration,
		outDuration: s.outDuration,
		stagger: s.stagger,
		animIn: s.animIn,
		ease: s.ease,
		previewBg: s.previewBg,
		showSafe: s.showSafe,
		exportWidth: s.exportWidth,
		exportFps: s.exportFps,
		projectName: s.projectName,
		activePersonId: s.activePersonId,
		favorited: s.favorited,
		customPresets: s.customPresets
	}),
	merge: (persisted, current) => {
		const p = persisted ?? {};
		return {
			...current,
			...p,
			animIn: p.animIn ?? "left",
			ease: p.ease ?? "smooth",
			favorited: p.favorited ?? ["xuke"],
			customPresets: p.customPresets ?? [],
			selectedClip: null,
			past: [],
			future: []
		};
	}
}));
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
	ref,
	className: cn("relative flex h-5 w-full touch-none items-center select-none", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
		className: "relative h-1 w-full grow overflow-hidden rounded-full bg-secondary",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-primary/80" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full bg-primary shadow-[0_0_0_1px_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.4)] ring-offset-background transition-[box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50" })]
}));
Slider.displayName = Slider$1.displayName;
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-xs font-medium tracking-wide text-muted-foreground",
		children
	});
}
function SliderRow({ label, value, min, max, step, format, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between text-xs",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums text-foreground",
				children: format(value)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
			min,
			max,
			step,
			value: [value],
			onValueChange: ([v]) => onChange(v ?? min)
		})]
	});
}
function ColorRow({ label, value, onChange }) {
	const hex = value.startsWith("#") ? value : "#0a0a0a";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-16 shrink-0 text-xs text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "color",
				value: hex.length === 7 ? hex : "#4f8cff",
				"aria-label": label,
				onChange: (e) => onChange(e.target.value),
				className: "size-7 shrink-0 cursor-pointer rounded-sm border border-border bg-secondary p-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value,
				onChange: (e) => onChange(e.target.value),
				className: "h-7 min-w-0 flex-1 rounded-sm border border-input bg-secondary px-2 font-mono text-xs uppercase"
			})
		]
	});
}
function Chip({ active, onClick, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cn("h-7 rounded-sm border px-2 text-xs transition-[border-color,background-color,color] duration-150", active ? "border-brand/50 bg-brand text-brand-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground", className),
		children
	});
}
var IN_MOVES = [
	{
		id: "none",
		icon: Circle,
		label: "无动画"
	},
	{
		id: "fade",
		icon: Maximize2,
		label: "淡入"
	},
	{
		id: "up",
		icon: ArrowUp,
		label: "上滑入"
	},
	{
		id: "down",
		icon: ArrowDown,
		label: "下滑入"
	},
	{
		id: "left",
		icon: ArrowLeft,
		label: "左滑入"
	},
	{
		id: "right",
		icon: ArrowRight,
		label: "右滑入"
	},
	{
		id: "scale",
		icon: RotateCw,
		label: "展开入"
	}
];
function AnimPanel() {
	const [tab, setTab] = (0, import_react.useState)("in");
	const inDuration = useStudio((s) => s.inDuration);
	const holdDuration = useStudio((s) => s.holdDuration);
	const outDuration = useStudio((s) => s.outDuration);
	const stagger = useStudio((s) => s.stagger);
	const layout = useStudio((s) => s.layout);
	const animIn = useStudio((s) => s.animIn);
	const ease = useStudio((s) => s.ease);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "动画设置" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-1 rounded-md bg-muted p-1",
				children: [
					["in", "入场"],
					["hold", "停留"],
					["out", "出场"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab(id),
					className: cn("rounded-sm py-1.5 text-center text-xs", tab === id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"),
					children: label
				}, id))
			}),
			tab === "in" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-4 gap-1.5",
				children: IN_MOVES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoveBtn, {
					icon: m.icon,
					label: m.label,
					active: animIn === m.id,
					onClick: () => {
						const st = useStudio.getState();
						st.setAnimIn(m.id);
						if (st.activePersonId) st.focusPerson(st.activePersonId, true);
					}
				}, m.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
				label: "入场时长",
				value: inDuration,
				min: .05,
				max: 1.5,
				step: .05,
				format: (v) => `${v.toFixed(2)}s`,
				onChange: (v) => useStudio.getState().setInDuration(v)
			})] }) : null,
			tab === "hold" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-14 shrink-0 text-xs text-muted-foreground",
						children: "出场方式"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid flex-1 grid-cols-2 gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: layout === "sequence",
							onClick: () => useStudio.getState().setLayout("sequence"),
							children: "每人一条"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: layout === "stack",
							onClick: () => useStudio.getState().setLayout("stack"),
							children: "同时出场"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
					label: "停留",
					value: holdDuration,
					min: 1,
					max: 12,
					step: .1,
					format: (v) => `${v.toFixed(1)}s`,
					onChange: (v) => useStudio.getState().setHoldDuration(v)
				}),
				layout === "stack" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
					label: "错开",
					value: stagger,
					min: 0,
					max: .6,
					step: .02,
					format: (v) => `${v.toFixed(2)}s`,
					onChange: (v) => useStudio.getState().setStagger(v)
				}) : null
			] }) : null,
			tab === "out" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
				label: "出场",
				value: outDuration,
				min: .25,
				max: 1.4,
				step: .05,
				format: (v) => `${v.toFixed(2)}s`,
				onChange: (v) => useStudio.getState().setOutDuration(v)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "缓动曲线" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-1",
				children: [
					["smooth", "平滑"],
					["linear", "线性"],
					["snap", "急停"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: ease === id,
					onClick: () => useStudio.getState().setEase(id),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EasePreview, { kind: ease }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted-foreground",
				children: "点入场方式会从当前嘉宾开头预览一次。"
			})
		]
	});
}
function EasePreview({ kind }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 200 72",
		className: "h-20 w-full rounded-md border border-border bg-muted/40",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: kind === "linear" ? "M8 60 L192 12" : kind === "snap" ? "M8 60 C 28 60, 36 14, 80 12 S 140 12, 192 12" : "M8 60 C 40 60, 70 18, 120 16 S 170 14, 192 12",
			fill: "none",
			stroke: "var(--color-brand)",
			strokeWidth: "2"
		})
	});
}
function MoveBtn({ icon: Icon, label, active, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex flex-col items-center gap-1 rounded-md border py-2 text-[10px]", active ? "border-brand/50 bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-accent"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5" }), label]
	});
}
function GuestPanel() {
	const people = useStudio((s) => s.people);
	const activePersonId = useStudio((s) => s.activePersonId);
	const inDuration = useStudio((s) => s.inDuration);
	const holdDuration = useStudio((s) => s.holdDuration);
	const outDuration = useStudio((s) => s.outDuration);
	const [dragId, setDragId] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "嘉宾列表" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "outline",
					className: "h-7 text-xs",
					disabled: people.length >= 8,
					onClick: () => {
						useStudio.getState().addPerson();
						toast.success("已添加嘉宾");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "添加嘉宾"]
				})]
			}),
			people.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => useStudio.getState().addPerson(),
				className: "rounded-md border border-dashed border-border px-3 py-8 text-xs text-muted-foreground hover:bg-accent",
				children: "还没有嘉宾，点击添加"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-1.5",
				children: people.map((person, index) => {
					const active = person.id === activePersonId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						draggable: true,
						onDragStart: () => setDragId(person.id),
						onDragOver: (e) => e.preventDefault(),
						onDrop: () => {
							if (!dragId) return;
							const from = people.findIndex((p) => p.id === dragId);
							useStudio.getState().reorderPeople(from, index);
							setDragId(null);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("flex w-full items-center gap-1 rounded-md border px-1.5 py-1.5 transition-[border-color,background-color] duration-150", active ? "border-brand/50 bg-secondary" : "border-border hover:bg-accent", dragId === person.id && "opacity-50"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "cursor-grab text-muted-foreground active:cursor-grabbing",
									"aria-label": "拖动排序",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "flex min-w-0 flex-1 items-center gap-2 text-left",
									onClick: () => useStudio.getState().focusPerson(person.id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "w-5 font-mono text-[10px] text-muted-foreground",
										children: String(index + 1).padStart(2, "0")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate text-sm",
											children: person.name || "未命名"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate text-[11px] text-muted-foreground",
											children: person.title || "职务"
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon-sm",
									variant: "ghost",
									"aria-label": "复制嘉宾",
									onClick: () => {
										useStudio.getState().duplicatePerson(person.id);
										toast.success("已复制嘉宾");
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon-sm",
									variant: "ghost",
									"aria-label": "删除嘉宾",
									disabled: people.length <= 1,
									onClick: () => {
										useStudio.getState().removePerson(person.id);
										toast.success("已删除");
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
								})
							]
						})
					}, person.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[11px] leading-relaxed text-muted-foreground",
				children: [
					"点击跳到该人停留段。拖动手柄可排序。每人 ",
					(inDuration + holdDuration + outDuration).toFixed(1),
					"s。"
				]
			})
		]
	});
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.04)] transition-[box-shadow,border-color] duration-150 placeholder:text-muted-foreground/70 focus-visible:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
function Inspector() {
	const people = useStudio((s) => s.people);
	const activePersonId = useStudio((s) => s.activePersonId);
	const style = useStudio((s) => s.style);
	const textSize = useStudio((s) => s.textSize);
	const titleSize = useStudio((s) => s.titleSize);
	const scale = useStudio((s) => s.scale);
	const nameFontId = useStudio((s) => s.nameFontId);
	const titleFontId = useStudio((s) => s.titleFontId);
	const customFonts = useStudio((s) => s.customFonts);
	const nameColor = useStudio((s) => s.nameColor);
	const titleColor = useStudio((s) => s.titleColor);
	const accentColor = useStudio((s) => s.accentColor);
	const bandColor = useStudio((s) => s.bandColor);
	const side = useStudio((s) => s.side);
	const layout = useStudio((s) => s.layout);
	const person = people.find((p) => p.id === activePersonId) ?? people[0];
	const idx = Math.max(0, people.findIndex((p) => p.id === person?.id));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "样式" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] text-muted-foreground",
					children: "全局设置"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "当前嘉宾" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "field-select flex-1",
						value: person?.id ?? "",
						onChange: (e) => useStudio.getState().focusPerson(e.target.value),
						children: people.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: p.id,
							children: [
								String(i + 1).padStart(2, "0"),
								" ",
								p.name || "未命名"
							]
						}, p.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						disabled: idx <= 0,
						"aria-label": "上一位",
						onClick: () => people[idx - 1] && useStudio.getState().focusPerson(people[idx - 1].id),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						disabled: idx >= people.length - 1,
						"aria-label": "下一位",
						onClick: () => people[idx + 1] && useStudio.getState().focusPerson(people[idx + 1].id),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
					})
				]
			})] }),
			person ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 shrink-0 text-xs text-muted-foreground",
								children: "姓名"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: person.name,
								className: "h-8",
								maxLength: 10,
								onChange: (e) => useStudio.getState().updatePerson(person.id, { name: e.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "w-8 text-right font-mono text-[10px] text-muted-foreground",
								children: [person.name.length, "/10"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-10 shrink-0 text-xs text-muted-foreground",
							children: "职务"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: person.title,
							className: "h-8",
							onChange: (e) => useStudio.getState().updatePerson(person.id, { title: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-14 shrink-0 text-xs text-muted-foreground",
							children: "文字布局"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid flex-1 grid-cols-3 gap-1",
							children: [
								1,
								2,
								3
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Chip, {
								active: (person.titleLines ?? 1) === n,
								onClick: () => useStudio.getState().updatePerson(person.id, { titleLines: n }),
								children: [n, style === "vertical" ? "列" : "行"]
							}, n))
						})]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-14 shrink-0 text-xs text-muted-foreground",
					children: "滑入方向"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid flex-1 grid-cols-2 gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: side === "left",
						onClick: () => useStudio.getState().setSide("left"),
						children: "左侧"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: side === "right",
						onClick: () => useStudio.getState().setSide("right"),
						children: "右侧"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-14 shrink-0 text-xs text-muted-foreground",
					children: "出场"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid flex-1 grid-cols-2 gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: layout === "sequence",
						onClick: () => useStudio.getState().setLayout("sequence"),
						children: "每人一条"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
						active: layout === "stack",
						onClick: () => useStudio.getState().setLayout("stack"),
						children: "同时"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "字体设置" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontRow, {
						label: "姓名字体",
						value: nameFontId,
						customFonts,
						onChange: (id) => useStudio.getState().setNameFontId(id)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontRow, {
						label: "职务字体",
						value: titleFontId,
						customFonts,
						onChange: (id) => useStudio.getState().setTitleFontId(id)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "大小与缩放" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
						label: "姓名大小",
						value: textSize,
						min: .6,
						max: 1.8,
						step: .02,
						format: (v) => `${Math.round(v * 100)}%`,
						onChange: (v) => useStudio.getState().setTextSize(v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
						label: "职务大小",
						value: titleSize,
						min: .5,
						max: 1.8,
						step: .02,
						format: (v) => `${Math.round(v * 100)}%`,
						onChange: (v) => useStudio.getState().setTitleSize(v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRow, {
						label: "整体缩放",
						value: scale,
						min: .7,
						max: 1.6,
						step: .01,
						format: (v) => `${Math.round(v * 100)}%`,
						onChange: (v) => useStudio.getState().setScale(v)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "颜色设置" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorRow, {
						label: "姓名颜色",
						value: toHex(nameColor),
						onChange: (v) => useStudio.getState().setNameColor(v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorRow, {
						label: "职务颜色",
						value: toHex(titleColor),
						onChange: (v) => useStudio.getState().setTitleColor(v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorRow, {
						label: "装饰颜色",
						value: toHex(accentColor),
						onChange: (v) => useStudio.getState().setAccentColor(v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorRow, {
						label: "背景色带",
						value: toHex(bandColor),
						onChange: (v) => useStudio.getState().setBandColor(hexToRgba(v, .8))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					useStudio.getState().resetStyle();
					toast.success("已重置样式，嘉宾名单保留");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {}), "重置当前样式"]
			})
		]
	});
}
function toHex(c) {
	if (c.startsWith("#") && c.length >= 7) return c.slice(0, 7);
	const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!m) return "#0a0a0a";
	return "#" + [
		m[1],
		m[2],
		m[3]
	].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}
function hexToRgba(hex, a) {
	const n = hex.replace("#", "");
	if (n.length < 6) return `rgba(10,10,10,${a})`;
	return `rgba(${Number.parseInt(n.slice(0, 2), 16)},${Number.parseInt(n.slice(2, 4), 16)},${Number.parseInt(n.slice(4, 6), 16)},${a})`;
}
function FontRow({ label, value, customFonts, onChange }) {
	const fileRef = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-14 shrink-0 text-xs text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "field-select flex-1",
				value,
				onChange: (e) => onChange(e.target.value),
				children: [BUILTIN_FONTS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: f.id,
					children: f.label
				}, f.id)), customFonts.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: f.id,
					children: f.label
				}, f.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileRef,
				type: "file",
				accept: ".ttf,.otf,.woff,.woff2",
				className: "hidden",
				onChange: (e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (!file) return;
					(async () => {
						try {
							const meta = await uploadCustomFont(file);
							useStudio.getState().addCustomFont(meta);
							onChange(meta.id);
							toast.success(`已加载「${meta.label}」`);
						} catch (err) {
							toast.error(err instanceof Error ? err.message : "字体加载失败");
						}
					})();
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon-sm",
				variant: "ghost",
				"aria-label": "上传字体",
				onClick: () => fileRef.current?.click(),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {})
			}),
			customFonts.some((f) => f.id === value) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon-sm",
				variant: "ghost",
				"aria-label": "删除字体",
				onClick: () => {
					(async () => {
						await removeCustomFont(value);
						const next = useStudio.getState().customFonts.filter((f) => f.id !== value);
						useStudio.getState().setCustomFonts(next);
						const st = useStudio.getState();
						if (st.nameFontId === value) st.setNameFontId("serif");
						if (st.titleFontId === value) st.setTitleFontId("sans");
					})();
				},
				children: "×"
			}) : null
		]
	});
}
var ITEMS = [
	{
		id: "style",
		icon: Type,
		label: "风格"
	},
	{
		id: "guests",
		icon: Users,
		label: "嘉宾"
	},
	{
		id: "anim",
		icon: Sparkles,
		label: "动画"
	},
	{
		id: "projects",
		icon: Folder,
		label: "我的"
	}
];
function LeftRail() {
	const workspace = useStudio((s) => s.workspace);
	const editorNav = useStudio((s) => s.editorNav);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "order-last flex shrink-0 gap-1 border-t border-border bg-rail p-1 md:order-none md:w-16 md:flex-col md:border-t-0 md:border-r md:p-2",
		"aria-label": "工坊导航",
		children: ITEMS.map((item) => {
			const Icon = item.icon;
			const active = item.id === "projects" ? workspace === "projects" : workspace !== "projects" && (item.id === "style" ? editorNav === "style" || workspace === "presets" : editorNav === item.id && workspace !== "presets");
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => {
					if (item.id === "projects") useStudio.getState().setWorkspace("projects");
					else useStudio.getState().setEditorNav(item.id);
				},
				className: cn("flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] transition-[background-color,color] duration-150 md:flex-none md:py-3", active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }), item.label]
			}, item.id);
		})
	});
}
var STYLE_CARDS = [
	{
		id: "xuke",
		label: "徐克款",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,10,10,0.82)",
		group: "slash"
	},
	{
		id: "stack-news",
		label: "双层新闻",
		caption: "双层",
		style: "stack",
		side: "left",
		accentColor: "#1d4ed8",
		bandColor: "rgba(12,16,28,0.92)",
		nameColor: "#ffffff",
		titleColor: "#e8e8e8",
		group: "stack"
	},
	{
		id: "pill-dark",
		label: "胶囊访谈",
		caption: "胶囊",
		style: "pill",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(12,14,20,0.82)",
		group: "pill"
	},
	{
		id: "badge-red",
		label: "字标新闻",
		caption: "字标",
		style: "badge",
		side: "left",
		accentColor: "#c41e3a",
		bandColor: "rgba(12,8,8,0.8)",
		nameColor: "#ffffff",
		group: "badge"
	},
	{
		id: "rail-blue",
		label: "侧轨采访",
		caption: "侧轨",
		style: "rail",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,10,10,0.7)",
		group: "rail"
	},
	{
		id: "card-night",
		label: "夜间卡片",
		caption: "卡片",
		style: "card",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,14,22,0.88)",
		group: "card"
	},
	{
		id: "lixiaotong",
		label: "李晓桐款",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#d4a017",
		bandColor: "rgba(8,8,10,0.88)",
		group: "band"
	},
	{
		id: "wujing",
		label: "吴京款竖排",
		caption: "竖排",
		style: "vertical",
		side: "right",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,10,10,0.8)",
		group: "vertical"
	},
	{
		id: "bar",
		label: "现代简约横条",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(8,8,10,0.9)",
		group: "bar"
	},
	{
		id: "news-blue",
		label: "新闻蓝",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#1d4ed8",
		bandColor: "rgba(8,16,36,0.88)",
		group: "slash"
	},
	{
		id: "cctv-bar",
		label: "新闻红条",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#ffffff",
		bandColor: "rgba(176,24,28,0.94)",
		nameColor: "#f4f4f4",
		titleColor: "#ffffff",
		group: "bar"
	},
	{
		id: "night-news",
		label: "夜间新闻",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#93c5fd",
		bandColor: "rgba(8,18,40,0.92)",
		group: "bar"
	},
	{
		id: "gold",
		label: "金色晚会",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#d4a017",
		bandColor: "rgba(10,8,4,0.86)",
		group: "slash"
	},
	{
		id: "stack-gold",
		label: "晚会双层金",
		caption: "双层",
		style: "stack",
		side: "left",
		accentColor: "#c9a227",
		bandColor: "rgba(18,12,4,0.92)",
		nameColor: "#1a1408",
		titleColor: "#f3e6c0",
		group: "stack"
	},
	{
		id: "stack-red",
		label: "党建双层",
		caption: "双层",
		style: "stack",
		side: "left",
		accentColor: "#c41e3a",
		bandColor: "rgba(28,8,10,0.92)",
		nameColor: "#ffffff",
		titleColor: "#f3e6c0",
		group: "stack"
	},
	{
		id: "pill-white",
		label: "白胶囊",
		caption: "胶囊",
		style: "pill",
		side: "left",
		accentColor: "#2563eb",
		bandColor: "rgba(245,247,250,0.92)",
		nameColor: "#141414",
		titleColor: "#333333",
		group: "pill"
	},
	{
		id: "pill-gold",
		label: "香槟胶囊",
		caption: "胶囊",
		style: "pill",
		side: "left",
		accentColor: "#e8d5a3",
		bandColor: "rgba(22,16,8,0.86)",
		group: "pill"
	},
	{
		id: "card-gold",
		label: "金色卡片",
		caption: "卡片",
		style: "card",
		side: "left",
		accentColor: "#d4a017",
		bandColor: "rgba(16,12,6,0.9)",
		group: "card"
	},
	{
		id: "card-frost",
		label: "雾面卡片",
		caption: "卡片",
		style: "card",
		side: "left",
		accentColor: "#e8eef6",
		bandColor: "rgba(255,255,255,0.16)",
		group: "card"
	},
	{
		id: "rail-gold",
		label: "侧轨金",
		caption: "侧轨",
		style: "rail",
		side: "right",
		accentColor: "#d4a017",
		bandColor: "rgba(10,10,10,0.7)",
		group: "rail"
	},
	{
		id: "rail-red",
		label: "侧轨红",
		caption: "侧轨",
		style: "rail",
		side: "left",
		accentColor: "#e23b3b",
		bandColor: "rgba(10,10,10,0.7)",
		group: "rail"
	},
	{
		id: "badge-blue",
		label: "字标蓝",
		caption: "字标",
		style: "badge",
		side: "left",
		accentColor: "#1d4ed8",
		bandColor: "rgba(8,12,24,0.8)",
		nameColor: "#ffffff",
		group: "badge"
	},
	{
		id: "badge-gold",
		label: "字标金",
		caption: "字标",
		style: "badge",
		side: "left",
		accentColor: "#d4a017",
		bandColor: "rgba(16,12,6,0.8)",
		nameColor: "#1a1408",
		group: "badge"
	},
	{
		id: "champagne",
		label: "香槟金",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#e8d5a3",
		bandColor: "rgba(18,14,8,0.84)",
		group: "slash"
	},
	{
		id: "gala-band",
		label: "晚会金带",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#e2b13c",
		bandColor: "rgba(18,12,4,0.9)",
		group: "band"
	},
	{
		id: "party-red",
		label: "党建红金",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#d4a017",
		bandColor: "rgba(120,16,18,0.92)",
		group: "band"
	},
	{
		id: "red",
		label: "中国红",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#e23b3b",
		bandColor: "rgba(40,8,8,0.86)",
		group: "slash"
	},
	{
		id: "docu",
		label: "纪录片暖棕",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#c4a574",
		bandColor: "rgba(28,20,12,0.88)",
		group: "band"
	},
	{
		id: "finance",
		label: "财经金条",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#f0d48a",
		bandColor: "rgba(16,14,8,0.92)",
		group: "bar"
	},
	{
		id: "tech-cyan",
		label: "科技青",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#22d3ee",
		bandColor: "rgba(6,18,22,0.86)",
		group: "slash"
	},
	{
		id: "eco",
		label: "青绿环保",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#34d399",
		bandColor: "rgba(8,24,18,0.88)",
		group: "band"
	},
	{
		id: "sports",
		label: "体育橙",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#f97316",
		bandColor: "rgba(28,12,4,0.88)",
		group: "slash"
	},
	{
		id: "variety",
		label: "综艺紫",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#c4b5fd",
		bandColor: "rgba(24,12,40,0.88)",
		group: "band"
	},
	{
		id: "whitebar",
		label: "访谈白底",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#111111",
		bandColor: "rgba(245,245,245,0.92)",
		nameColor: "#f2f2f2",
		titleColor: "#222222",
		group: "simple"
	},
	{
		id: "ivory",
		label: "象牙细条",
		caption: "横条",
		style: "news",
		side: "left",
		accentColor: "#3f3a32",
		bandColor: "rgba(236,228,210,0.92)",
		nameColor: "#f4efe4",
		titleColor: "#3f3a32",
		group: "simple"
	},
	{
		id: "line",
		label: "极简白线",
		caption: "斜杠",
		style: "ceremony",
		side: "left",
		accentColor: "#f2f2f2",
		bandColor: "rgba(10,10,10,0.45)",
		group: "simple"
	},
	{
		id: "frost",
		label: "雾面玻璃",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#e8eef6",
		bandColor: "rgba(255,255,255,0.16)",
		group: "simple"
	},
	{
		id: "soft",
		label: "半透明色块",
		caption: "色带",
		style: "qinghua",
		side: "left",
		accentColor: "#8ab4ff",
		bandColor: "rgba(20,24,32,0.55)",
		group: "band"
	},
	{
		id: "right-gold",
		label: "右侧金带",
		caption: "色带",
		style: "qinghua",
		side: "right",
		accentColor: "#d4a017",
		bandColor: "rgba(12,10,6,0.9)",
		group: "band"
	},
	{
		id: "right-blue",
		label: "右侧新闻蓝",
		caption: "斜杠",
		style: "ceremony",
		side: "right",
		accentColor: "#4f8cff",
		bandColor: "rgba(8,14,28,0.86)",
		group: "slash"
	},
	{
		id: "ink-vert",
		label: "古风墨金",
		caption: "竖排",
		style: "vertical",
		side: "left",
		accentColor: "#c9a227",
		bandColor: "rgba(12,10,6,0.86)",
		group: "vertical"
	},
	{
		id: "vert-left",
		label: "竖排左侧",
		caption: "竖排",
		style: "vertical",
		side: "left",
		accentColor: "#4f8cff",
		bandColor: "rgba(10,10,10,0.8)",
		group: "vertical"
	},
	{
		id: "vert-red",
		label: "竖排中国红",
		caption: "竖排",
		style: "vertical",
		side: "right",
		accentColor: "#e23b3b",
		bandColor: "rgba(28,8,8,0.86)",
		group: "vertical"
	}
];
function StyleThumb({ style, accent, band, name = "张小兰", title = "主持人", nameColor, titleColor, className }) {
	const nameStyle = nameColor ? { color: nameColor } : void 0;
	const titleFill = titleColor ?? (accent === "#111111" || accent === "#3f3a32" ? "#222" : "#eee");
	if (style === "vertical") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-center justify-center overflow-hidden bg-rail", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-stretch gap-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-1 text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-col items-center text-sm font-medium leading-none tracking-widest",
						style: nameStyle,
						children: name.slice(0, 2).split("").map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ch }, ch))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "h-3 w-2 -skew-x-12",
						style: { background: accent }
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex w-1 flex-col items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-8 w-px bg-foreground/50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 size-1.5",
						style: { background: accent }
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col justify-center text-[10px] leading-tight text-muted-foreground",
					children: title.slice(0, 2).split("").map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ch }, ch))
				})
			]
		})
	});
	if (style === "card") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex overflow-hidden rounded-md",
			style: { background: band },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-1.5 self-stretch",
				style: { background: accent }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-2 py-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium text-foreground",
					style: nameStyle,
					children: name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] text-muted-foreground",
					style: { color: titleFill },
					children: title
				})]
			})]
		})
	});
	if (style === "pill") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5 rounded-full px-2.5 py-1.5",
			style: { background: band },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "h-4 w-1.5 rounded-full",
				style: { background: accent }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium leading-none text-foreground",
				style: nameStyle,
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-0.5 text-[10px]",
				style: { color: titleFill },
				children: title
			})] })]
		})
	});
	if (style === "stack") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-2 py-1 text-sm font-medium",
				style: {
					background: accent,
					color: nameColor ?? "#fff"
				},
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-0.5 px-2 py-0.5 text-[10px]",
				style: {
					background: band,
					color: titleFill
				},
				children: title
			})]
		})
	});
	if (style === "rail") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-stretch gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-1.5 self-stretch rounded-sm",
				style: { background: accent }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium text-foreground",
				style: nameStyle,
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] text-muted-foreground",
				style: { color: titleFill },
				children: title
			})] })]
		})
	});
	if (style === "badge") {
		const first = name.slice(0, 1);
		const rest = name.slice(1);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-7 items-center justify-center text-sm font-semibold",
					style: {
						background: accent,
						color: nameColor ?? "#fff"
					},
					children: first
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium leading-none text-foreground",
					style: nameStyle,
					children: rest
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 text-[10px] text-muted-foreground",
					style: { color: titleFill },
					children: title
				})] })]
			})
		});
	}
	if (style === "news") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium text-foreground",
				style: nameStyle,
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 h-5 px-2 py-0.5 text-[10px] leading-4",
				style: {
					background: band,
					color: titleFill
				},
				children: title
			})]
		})
	});
	if (style === "qinghua") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-1 text-sm font-medium text-foreground",
			style: nameStyle,
			children: name
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex items-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute -left-1.5 h-5 w-1.5 -skew-x-12",
				style: { background: accent }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "h-5 min-w-16 px-2 py-0.5 text-[10px] leading-4",
				style: {
					background: band,
					color: titleFill
				},
				children: title
			})]
		})] })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative flex h-full items-end overflow-hidden bg-rail p-3", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-stretch gap-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-1.5 -skew-x-12 self-stretch",
				style: { background: accent }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium text-foreground",
					style: nameStyle,
					children: name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-0.5 h-px w-16 bg-foreground/70" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 text-[10px] text-muted-foreground",
					children: title
				})
			] })]
		})
	});
}
var FILTERS = [
	{
		id: "all",
		label: "全部"
	},
	{
		id: "fav",
		label: "收藏"
	},
	{
		id: "slash",
		label: "斜杠"
	},
	{
		id: "band",
		label: "色带"
	},
	{
		id: "bar",
		label: "横条"
	},
	{
		id: "vertical",
		label: "竖排"
	},
	{
		id: "stack",
		label: "双层"
	},
	{
		id: "pill",
		label: "胶囊"
	},
	{
		id: "card",
		label: "卡片"
	},
	{
		id: "rail",
		label: "侧轨"
	},
	{
		id: "badge",
		label: "字标"
	},
	{
		id: "simple",
		label: "简约"
	}
];
function PresetView() {
	const [q, setQ] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("all");
	const fileRef = (0, import_react.useRef)(null);
	const style = useStudio((s) => s.style);
	const side = useStudio((s) => s.side);
	const accentColor = useStudio((s) => s.accentColor);
	const favorited = useStudio((s) => s.favorited);
	const customPresets = useStudio((s) => s.customPresets);
	const catalog = [...STYLE_CARDS, ...customPresets];
	const list = (0, import_react.useMemo)(() => {
		return catalog.filter((c) => {
			if (filter === "all") return true;
			if (filter === "fav") return favorited.includes(c.id);
			return c.group === filter;
		}).filter((c) => `${c.label}${c.caption}`.includes(q.trim()));
	}, [
		q,
		filter,
		catalog,
		favorited
	]);
	function apply(card) {
		useStudio.getState().applyPreset(card);
		toast.success(`已套用「${card.label}」`);
	}
	function close() {
		useStudio.getState().setEditorNav("style");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col bg-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 border-b border-border px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "ghost",
						className: "h-7 px-2 text-xs",
						onClick: close,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {}), "返回"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "全部预设"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto text-[11px] text-muted-foreground",
						children: "点卡片预览不关闭"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap items-center gap-1 border-b border-border px-3 py-2",
				children: FILTERS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setFilter(f.id),
					className: cn("h-7 rounded-sm px-2 text-xs", filter === f.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"),
					children: f.label
				}, f.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 border-b border-border px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-2 left-2 size-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value),
							placeholder: "搜索风格",
							className: "h-8 pl-7"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "application/json",
						className: "hidden",
						onChange: (e) => {
							const file = e.target.files?.[0];
							e.target.value = "";
							if (!file) return;
							file.text().then((text) => {
								try {
									const data = JSON.parse(text);
									if (!data.style) throw new Error("缺少 style");
									useStudio.getState().applyPreset({
										style: data.style,
										side: data.side,
										accentColor: data.accentColor,
										bandColor: data.bandColor,
										nameColor: data.nameColor,
										titleColor: data.titleColor
									});
									toast.success("已导入样式");
								} catch {
									toast.error("无法读取该预设文件");
								}
							});
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						className: "h-8 shrink-0",
						onClick: () => fileRef.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), "导入"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [list.map((card) => {
						const active = style === card.style && accentColor === card.accentColor && side === card.side;
						const starred = favorited.includes(card.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("overflow-hidden rounded-lg border text-left", active ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-border hover:border-brand/40"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "relative block h-24 w-full",
								onClick: () => apply(card),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StyleThumb, {
									style: card.style,
									accent: card.accentColor,
									band: card.bandColor,
									nameColor: card.nameColor,
									titleColor: card.titleColor,
									name: card.label.includes("吴京") || card.style === "vertical" ? "吴京" : card.label.includes("李") ? "李晓桐" : "张小兰",
									title: card.caption
								}), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-2.5" })
								}) : null]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between px-2 py-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "truncate text-xs",
									onClick: () => apply(card),
									children: card.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": starred ? "取消收藏" : "收藏",
									onClick: () => useStudio.getState().toggleFavorite(card.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: cn("size-3 shrink-0", starred ? "fill-brand text-brand" : "text-muted-foreground") })
								})]
							})]
						}, card.id);
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							const card = useStudio.getState().saveCustomPreset();
							toast.success(`已从当前画面保存「${card.label}」`);
						},
						className: "flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-accent",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-lg",
							children: "+"
						}), "保存当前"]
					})]
				})
			})
		]
	});
}
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-foreground shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-foreground" })
}));
Switch.displayName = Switch$1.displayName;
var PREVIEW_W = 1280;
var PREVIEW_H = 720;
function PreviewStage() {
	const canvasRef = (0, import_react.useRef)(null);
	const currentTime = useStudio((s) => s.currentTime);
	const previewBg = useStudio((s) => s.previewBg);
	const showSafe = useStudio((s) => s.showSafe);
	const people = useStudio((s) => s.people);
	const style = useStudio((s) => s.style);
	const layout = useStudio((s) => s.layout);
	const side = useStudio((s) => s.side);
	const align = useStudio((s) => s.align);
	const scale = useStudio((s) => s.scale);
	const textSize = useStudio((s) => s.textSize);
	const titleSize = useStudio((s) => s.titleSize);
	const nameFontId = useStudio((s) => s.nameFontId);
	const titleFontId = useStudio((s) => s.titleFontId);
	const fontEpoch = useStudio((s) => s.fontEpoch);
	const nameColor = useStudio((s) => s.nameColor);
	const titleColor = useStudio((s) => s.titleColor);
	const accentColor = useStudio((s) => s.accentColor);
	const bandColor = useStudio((s) => s.bandColor);
	const sectionLabel = useStudio((s) => s.sectionLabel);
	const inDuration = useStudio((s) => s.inDuration);
	const holdDuration = useStudio((s) => s.holdDuration);
	const outDuration = useStudio((s) => s.outDuration);
	const stagger = useStudio((s) => s.stagger);
	const animIn = useStudio((s) => s.animIn);
	const ease = useStudio((s) => s.ease);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		loadNameplateFonts([useStudio.getState().nameFontId, useStudio.getState().titleFontId]).then(() => {
			if (cancelled) return;
			useStudio.getState().bumpFontEpoch();
		});
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d", { alpha: true });
		if (!canvas || !ctx) return;
		drawFrame(ctx, canvas.width, canvas.height, currentTime, renderConfigFromState(useStudio.getState()));
	}, [
		currentTime,
		people,
		style,
		layout,
		side,
		align,
		scale,
		textSize,
		titleSize,
		nameFontId,
		titleFontId,
		fontEpoch,
		nameColor,
		titleColor,
		accentColor,
		bandColor,
		sectionLabel,
		inDuration,
		holdDuration,
		outDuration,
		stagger,
		animIn,
		ease
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-10 shrink-0 items-center gap-2 border-b border-border px-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted-foreground",
					children: "预览模式"
				}),
				[
					["checker", "透明"],
					["stage", "暗场"],
					["live", "现场"]
				].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => useStudio.getState().setPreviewBg(key),
					className: cn("h-6 rounded-sm px-2 text-xs", previewBg === key ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"),
					children: label
				}, key)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "ml-auto flex items-center gap-2 text-xs text-muted-foreground",
					children: ["安全框", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: showSafe,
						onCheckedChange: (v) => useStudio.getState().setShowSafe(v),
						"aria-label": "显示安全框"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex min-h-0 flex-1 items-center justify-center p-3 [container-type:size]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("relative overflow-hidden rounded-lg shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_24px_64px_rgb(0_0_0/0.45)]", previewBg === "checker" ? "bg-checker" : previewBg === "live" ? "bg-live" : "bg-stage"),
				style: {
					width: "min(100cqw, calc(100cqh * 16 / 9))",
					height: "min(100cqh, calc(100cqw * 9 / 16))"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					width: PREVIEW_W,
					height: PREVIEW_H,
					className: "absolute inset-0 size-full",
					"aria-label": "16:9 人名条预览"
				}), showSafe ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-[8%] border border-dashed border-white/25",
					"aria-hidden": true
				}) : null]
			})
		})]
	});
}
function ProjectView() {
	const projectName = useStudio((s) => s.projectName);
	const favorited = useStudio((s) => s.favorited);
	const [list, setList] = (0, import_react.useState)([]);
	const [filterFav, setFilterFav] = (0, import_react.useState)(false);
	const fileRef = (0, import_react.useRef)(null);
	function refresh() {
		setList(listProjects());
	}
	(0, import_react.useEffect)(() => {
		refresh();
	}, []);
	function persistCurrent() {
		const st = useStudio.getState();
		const rec = saveProject({
			...snapshotFromState({
				name: st.projectName,
				people: st.people,
				style: st.style,
				layout: st.layout,
				side: st.side,
				align: st.align,
				scale: st.scale,
				textSize: st.textSize,
				titleSize: st.titleSize,
				nameFontId: st.nameFontId,
				titleFontId: st.titleFontId,
				nameColor: st.nameColor,
				titleColor: st.titleColor,
				accentColor: st.accentColor,
				bandColor: st.bandColor,
				inDuration: st.inDuration,
				holdDuration: st.holdDuration,
				outDuration: st.outDuration,
				stagger: st.stagger,
				animIn: st.animIn,
				ease: st.ease
			}),
			projectName: st.projectName
		});
		refresh();
		return rec;
	}
	const shown = filterFav ? list.filter((p) => favorited.includes(p.id)) : list;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 border-b border-border px-4 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium",
					children: "最近项目"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-xs text-muted-foreground hover:text-foreground",
					onClick: () => setFilterFav(false),
					children: "全部"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "只看收藏",
					onClick: () => setFilterFav((v) => !v),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: filterFav ? "size-3.5 fill-brand text-brand" : "size-3.5 text-muted-foreground" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ml-auto flex gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileRef,
							type: "file",
							accept: "application/json",
							className: "hidden",
							onChange: (e) => {
								const file = e.target.files?.[0];
								e.target.value = "";
								if (!file) return;
								file.text().then((text) => {
									try {
										const data = JSON.parse(text);
										const snap = data.snapshot ?? data;
										if (!snap.people || !snap.style) throw new Error("bad");
										useStudio.getState().applySnapshot(snap);
										toast.success("已打开项目");
									} catch {
										toast.error("无法读取该项目文件");
									}
								});
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => fileRef.current?.click(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), "导入项目"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							onClick: () => {
								toast("新建将恢复默认名单", { action: {
									label: "新建",
									onClick: () => {
										useStudio.getState().restoreDefaults();
										useStudio.getState().setWorkspace("editor");
										toast.success("已新建项目");
									}
								} });
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "新建项目"]
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							persistCurrent();
							useStudio.getState().setWorkspace("editor");
							toast.success("当前项目已保存");
						},
						className: "overflow-hidden rounded-lg border border-brand text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-28 items-center justify-center bg-live text-xs text-background/80",
							children: "点击保存"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-2 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "truncate text-xs",
								children: projectName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-muted-foreground",
								children: "当前项目 · 点此保存"
							})]
						})]
					}),
					shown.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "overflow-hidden rounded-lg border border-border hover:border-brand/40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "block h-28 w-full bg-stage",
							onClick: () => {
								useStudio.getState().applySnapshot(p.snapshot);
								toast.success(`已打开「${p.name}」`);
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-1 px-2 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "min-w-0 text-left",
								onClick: () => useStudio.getState().applySnapshot(p.snapshot),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-xs",
									children: p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground",
									children: new Date(p.updatedAt).toLocaleString("zh-CN", {
										month: "numeric",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit"
									})
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "删除项目",
								onClick: () => {
									deleteProject(p.id);
									refresh();
									toast.success("已删除");
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5 text-muted-foreground" })
							})]
						})]
					}, p.id)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							const rec = persistCurrent();
							downloadJson(`${rec.name}.json`, rec);
							toast.success("已导出项目文件");
						},
						className: "flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-6" }), "导出当前项目"]
					})
				]
			})
		})]
	});
}
var MAIN = [
	"xuke",
	"stack-news",
	"pill-dark",
	"badge-red",
	"rail-blue",
	"card-night"
].map((id) => STYLE_CARDS.find((c) => c.id === id));
function StylePanel() {
	const style = useStudio((s) => s.style);
	const side = useStudio((s) => s.side);
	const accentColor = useStudio((s) => s.accentColor);
	const favorited = useStudio((s) => s.favorited);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "风格预设" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: MAIN.map((card) => {
					const active = style === card.style && (card.style === "vertical" ? side === card.side : true);
					const starred = favorited.includes(card.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150", active ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-border hover:border-brand/40"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "relative block h-24 w-full",
							onClick: () => useStudio.getState().applyPreset(card),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StyleThumb, {
								style: card.style,
								accent: card.accentColor,
								band: card.bandColor,
								nameColor: card.nameColor,
								titleColor: card.titleColor,
								name: card.style === "vertical" ? "吴京" : card.id === "lixiaotong" ? "李晓桐" : "张小兰",
								title: card.style === "vertical" ? "演员" : card.id === "lixiaotong" ? "制片人" : "主持人"
							}), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-2.5" })
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between px-2 py-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "text-xs text-foreground",
								onClick: () => useStudio.getState().applyPreset(card),
								children: card.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": starred ? "取消收藏" : "收藏",
								onClick: () => {
									useStudio.getState().toggleFavorite(card.id);
									toast.success(starred ? "已取消收藏" : "已加入收藏");
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: cn("size-3", starred ? "fill-brand text-brand" : "text-muted-foreground") })
							})]
						})]
					}, card.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => useStudio.getState().openPresetBrowse(),
				className: "h-8 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
				children: "更多预设"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "快速操作" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quick, {
						icon: FilePlus,
						label: "新建项目",
						onClick: () => {
							toast("将恢复默认嘉宾与样式", { action: {
								label: "新建",
								onClick: () => {
									useStudio.getState().restoreDefaults();
									toast.success("已新建项目");
								}
							} });
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quick, {
						icon: Upload,
						label: "导入样式",
						onClick: () => useStudio.getState().openPresetBrowse()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quick, {
						icon: Copy,
						label: "复制当前样式",
						onClick: () => {
							const card = useStudio.getState().saveCustomPreset();
							toast.success(`已保存「${card.label}」到预设`);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quick, {
						icon: Trash2,
						label: "清空画布",
						onClick: () => {
							toast("清空全部嘉宾？", { action: {
								label: "清空",
								onClick: () => {
									useStudio.getState().setPeople([]);
									toast.success("画布已清空");
								}
							} });
						}
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-md border border-border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground",
				children: [
					"点卡片套用样式。星标收入收藏。当前强调色 ",
					accentColor.toUpperCase(),
					"。"
				]
			})
		]
	});
}
function Quick({ icon: Icon, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "flex h-11 items-center gap-2 rounded-md border border-border px-2 text-left text-xs text-foreground hover:bg-accent",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5 text-muted-foreground" }), label]
	});
}
var LAYERS = [
	"name",
	"title",
	"slash",
	"band"
];
function Num({ label, value, step, min, max, suffix, onLive, onCommit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex items-center gap-1.5 text-[11px] text-muted-foreground",
		children: [
			label,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				step,
				min,
				max,
				value: Number.isFinite(value) ? Math.round(value * 10) / 10 : 0,
				onChange: (e) => {
					const n = Number(e.target.value);
					if (Number.isFinite(n)) onLive(Math.min(max, Math.max(min, n)));
				},
				onBlur: (e) => {
					const n = Number(e.target.value);
					if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
				},
				onKeyDown: (e) => {
					if (e.key === "Enter") e.target.blur();
				},
				className: "h-7 w-16 px-1.5 text-center font-mono text-xs"
			}),
			suffix ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[10px]",
				children: suffix
			}) : null
		]
	});
}
function ClipTransformBar() {
	const selected = useStudio((s) => s.selectedClip);
	const people = useStudio((s) => s.people);
	if (!selected) return null;
	const person = people.find((p) => p.id === selected.personId);
	if (!person) return null;
	const xf = layerXform(person, selected.layer);
	function live(patch) {
		useStudio.getState().setLayerXform(selected.personId, selected.layer, patch, true);
	}
	function commit(patch) {
		useStudio.getState().setLayerXform(selected.personId, selected.layer, patch);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2 border-t border-border bg-secondary/60 px-3 py-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-1",
				children: LAYERS.map((layer) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => useStudio.getState().selectClip(selected.personId, layer),
					className: cn("h-6 rounded-sm px-2 text-[11px]", layer === selected.layer ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"),
					children: CLIP_LAYER_META[layer].label
				}, layer))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden max-w-28 truncate text-xs text-foreground sm:inline",
				children: person.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-4 w-px bg-border sm:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
				label: "X",
				value: xf.x,
				step: 1,
				min: -600,
				max: 600,
				onLive: (n) => live({ x: n }),
				onCommit: (n) => commit({ x: n })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
				label: "Y",
				value: xf.y,
				step: 1,
				min: -400,
				max: 400,
				onLive: (n) => live({ y: n }),
				onCommit: (n) => commit({ y: n })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
				label: "旋转",
				value: xf.rotation,
				step: 1,
				min: -180,
				max: 180,
				suffix: "°",
				onLive: (n) => live({ rotation: n }),
				onCommit: (n) => commit({ rotation: n })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "ghost",
				className: "h-7 px-2 text-[11px]",
				onClick: () => useStudio.getState().resetLayerXform(selected.personId, selected.layer),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {}), "重置"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon-sm",
				variant: "ghost",
				className: "ml-auto",
				"aria-label": "关闭片段面板",
				onClick: () => useStudio.getState().clearClip(),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
			})
		]
	});
}
function fpsOf() {
	const f = useStudio.getState().exportFps;
	return Math.abs(f - 29.97) < .05 ? NTSC_FPS : f;
}
function clamp(n, a, b) {
	return Math.min(b, Math.max(a, n));
}
function usePlayback(loop) {
	const playing = useStudio((s) => s.playing);
	const people = useStudio((s) => s.people);
	const layout = useStudio((s) => s.layout);
	const inDuration = useStudio((s) => s.inDuration);
	const holdDuration = useStudio((s) => s.holdDuration);
	const outDuration = useStudio((s) => s.outDuration);
	const stagger = useStudio((s) => s.stagger);
	const duration = totalDuration(renderConfigFromState(useStudio.getState()));
	const lastRef = (0, import_react.useRef)(null);
	const loopRef = (0, import_react.useRef)(loop);
	loopRef.current = loop;
	(0, import_react.useEffect)(() => {
		if (!playing) {
			lastRef.current = null;
			return;
		}
		let raf = 0;
		const tick = (now) => {
			const last = lastRef.current ?? now;
			const dt = Math.min(.05, (now - last) / 1e3);
			lastRef.current = now;
			const st = useStudio.getState();
			const dur = totalDuration(renderConfigFromState(st));
			let next = st.currentTime + dt;
			if (next >= dur) {
				if (loopRef.current && dur > .05) {
					next = next % dur;
					st.setCurrentTime(next);
				} else {
					st.setCurrentTime(dur);
					st.setPlaying(false);
					return;
				}
			} else st.setCurrentTime(next);
			if (st.layout === "sequence" && st.people.length) {
				const slot = st.inDuration + st.holdDuration + st.outDuration;
				const i = Math.min(st.people.length - 1, Math.max(0, Math.floor(next / slot)));
				const id = st.people[i]?.id;
				if (id && id !== st.activePersonId) st.setActivePersonId(id);
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [
		playing,
		duration,
		people,
		layout,
		inDuration,
		holdDuration,
		outDuration,
		stagger
	]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const tag = e.target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
			const st = useStudio.getState();
			const dur = totalDuration(renderConfigFromState(st));
			const frame = 1 / fpsOf();
			if (e.code === "Space") {
				e.preventDefault();
				if (st.currentTime >= dur) {
					st.setCurrentTime(0);
					st.setPlaying(true);
				} else st.setPlaying(!st.playing);
				return;
			}
			if (e.code === "ArrowLeft" || e.code === "Comma") {
				e.preventDefault();
				st.setPlaying(false);
				st.setCurrentTime(clamp(st.currentTime - (e.shiftKey ? 1 : frame), 0, dur));
			}
			if (e.code === "ArrowRight" || e.code === "Period") {
				e.preventDefault();
				st.setPlaying(false);
				st.setCurrentTime(clamp(st.currentTime + (e.shiftKey ? 1 : frame), 0, dur));
			}
			if (e.code === "Home") {
				e.preventDefault();
				st.setCurrentTime(0);
				st.setPlaying(false);
			}
			if (e.code === "End") {
				e.preventDefault();
				st.setCurrentTime(dur);
				st.setPlaying(false);
			}
			if (e.key === "j" || e.key === "J") {
				st.setPlaying(false);
				st.setCurrentTime(clamp(st.currentTime - 1, 0, dur));
			}
			if (e.key === "l" || e.key === "L") {
				st.setPlaying(false);
				st.setCurrentTime(clamp(st.currentTime + 1, 0, dur));
			}
			if (e.key === "k" || e.key === "K") st.setPlaying(!st.playing);
			if (e.key === "Escape") st.clearClip();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	return duration;
}
function snapPoints(count, slot, inn, hold) {
	const pts = [0];
	for (let i = 0; i < count; i++) {
		const s = i * slot;
		pts.push(s, s + inn, s + inn + hold, s + slot);
	}
	return pts;
}
function snapTime(t, pts, thresh, enabled) {
	if (!enabled) return t;
	let best = t;
	let dist = thresh;
	for (const p of pts) {
		const d = Math.abs(p - t);
		if (d < dist) {
			dist = d;
			best = p;
		}
	}
	return best;
}
function Timeline() {
	const [loop, setLoop] = (0, import_react.useState)(false);
	const [zoom, setZoom] = (0, import_react.useState)(1);
	const [snap, setSnap] = (0, import_react.useState)(true);
	const [hover, setHover] = (0, import_react.useState)(null);
	const duration = usePlayback(loop);
	const currentTime = useStudio((s) => s.currentTime);
	const playing = useStudio((s) => s.playing);
	const people = useStudio((s) => s.people);
	const activePersonId = useStudio((s) => s.activePersonId);
	const selectedClip = useStudio((s) => s.selectedClip);
	const inDuration = useStudio((s) => s.inDuration);
	const holdDuration = useStudio((s) => s.holdDuration);
	const outDuration = useStudio((s) => s.outDuration);
	const layout = useStudio((s) => s.layout);
	const scrollRef = (0, import_react.useRef)(null);
	const trackRef = (0, import_react.useRef)(null);
	const dragging = (0, import_react.useRef)(false);
	const moved = (0, import_react.useRef)(false);
	const slot = inDuration + holdDuration + outDuration;
	const dur = Math.max(duration, .1);
	const pts = snapPoints(people.length, slot, inDuration, holdDuration);
	function timeFromClientX(clientX) {
		const el = trackRef.current;
		if (!el) return 0;
		const rect = el.getBoundingClientRect();
		return clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1) * dur;
	}
	function applySeek(t, altKey) {
		const pxPerSec = (trackRef.current?.getBoundingClientRect().width ?? 400) / dur;
		const thresh = 10 / Math.max(pxPerSec, 1);
		const snapped = snapTime(clamp(t, 0, dur), pts, thresh, snap && !altKey);
		const st = useStudio.getState();
		st.setCurrentTime(snapped);
		if (st.layout === "sequence" && st.people.length) {
			const i = Math.min(st.people.length - 1, Math.max(0, Math.floor(snapped / slot)));
			const id = st.people[i]?.id;
			if (id && id !== st.activePersonId) st.setActivePersonId(id);
		}
	}
	function onPointerDown(e) {
		if (e.button !== 0) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		dragging.current = true;
		moved.current = false;
		useStudio.getState().setPlaying(false);
		applySeek(timeFromClientX(e.clientX), e.altKey);
	}
	function onPointerMove(e) {
		const t = timeFromClientX(e.clientX);
		setHover(t);
		if (!dragging.current) return;
		if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) moved.current = true;
		applySeek(t, e.altKey);
	}
	function onPointerUp(e) {
		const wasDrag = moved.current;
		dragging.current = false;
		moved.current = false;
		if (wasDrag) return;
		const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-clip-layer]");
		const layer = hit?.getAttribute("data-clip-layer");
		const pid = hit?.getAttribute("data-clip-person");
		if (layer && pid) {
			useStudio.getState().selectClip(pid, layer);
			const p = useStudio.getState().people.find((x) => x.id === pid);
			if (p) useStudio.getState().focusPerson(p.id);
			return;
		}
		useStudio.getState().clearClip();
	}
	function skipPerson(dir) {
		const st = useStudio.getState();
		if (!st.people.length) return;
		const n = clamp(Math.max(0, st.people.findIndex((p) => p.id === st.activePersonId)) + dir, 0, st.people.length - 1);
		const p = st.people[n];
		if (p) st.focusPerson(p.id);
	}
	(0, import_react.useEffect)(() => {
		if (dragging.current || !playing) return;
		const scroller = scrollRef.current;
		const inner = trackRef.current;
		if (!scroller || !inner || zoom <= 1) return;
		const x = currentTime / dur * inner.scrollWidth;
		const view = scroller.clientWidth;
		if (x < scroller.scrollLeft + 48 || x > scroller.scrollLeft + view - 48) scroller.scrollLeft = x - view * .4;
	}, [
		currentTime,
		playing,
		zoom,
		dur
	]);
	(0, import_react.useEffect)(() => {
		const scroller = scrollRef.current;
		const inner = trackRef.current;
		if (!scroller || !inner) return;
		const x = currentTime / dur * inner.scrollWidth;
		scroller.scrollLeft = Math.max(0, x - scroller.clientWidth * .4);
	}, [zoom]);
	(0, import_react.useEffect)(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onWheel = (e) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			setZoom((z) => clamp(z + (e.deltaY > 0 ? -.25 : .25), 1, 4));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);
	const hoverPerson = hover == null ? null : layout === "sequence" ? people[clamp(Math.floor(hover / slot), 0, Math.max(people.length - 1, 0))] : people.find((p) => p.id === activePersonId);
	const tracks = [
		{
			id: "name",
			label: "姓名",
			color: "bg-track-name"
		},
		{
			id: "title",
			label: "职务",
			color: "bg-track-title"
		},
		{
			id: "slash",
			label: "装饰线条",
			color: "bg-track-deco"
		},
		{
			id: "band",
			label: "背景色带",
			color: "bg-track-band"
		}
	];
	const tickCount = Math.max(4, Math.round((zoom >= 2 ? 12 : 7) * Math.min(dur / 8, 2)));
	const playPct = currentTime / dur * 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-col border-t border-border bg-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-1 px-3 py-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "上一位移",
						onClick: () => skipPerson(-1),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipBack, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "secondary",
						"aria-label": playing ? "暂停" : "播放",
						onClick: () => {
							const st = useStudio.getState();
							if (st.currentTime >= duration - .01) st.setCurrentTime(0);
							st.setPlaying(!st.playing);
						},
						children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "ml-px" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "下一位移",
						onClick: () => skipPerson(1),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "回到开头",
						onClick: () => {
							useStudio.getState().setCurrentTime(0);
							useStudio.getState().setPlaying(false);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "跳到结尾",
						onClick: () => {
							useStudio.getState().setCurrentTime(duration);
							useStudio.getState().setPlaying(false);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsRight, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: loop ? "secondary" : "ghost",
						"aria-label": "循环播放",
						onClick: () => setLoop((v) => !v),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat, { className: loop ? "text-brand" : "" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-1 font-mono text-xs tabular-nums text-muted-foreground",
						children: [
							formatTimecode(currentTime),
							" / ",
							formatTimecode(duration)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSnap((v) => !v),
						className: cn("ml-2 hidden h-6 rounded-sm px-2 text-[11px] sm:inline", snap ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"),
						children: ["吸附 ", snap ? "开" : "关"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "缩小",
								disabled: zoom <= 1,
								onClick: () => setZoom((z) => clamp(z - .5, 1, 4)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomOut, {})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "w-10 text-center font-mono text-[11px] text-muted-foreground",
								children: [Math.round(zoom * 100), "%"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "放大",
								disabled: zoom >= 4,
								onClick: () => setZoom((z) => clamp(z + .5, 1, 4)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomIn, {})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex px-3 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-16 shrink-0 pt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-1",
						children: tracks.map((tr) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-7 items-center text-[11px] text-muted-foreground",
							children: tr.label
						}, tr.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scrollRef,
					className: "min-w-0 flex-1 overflow-x-auto select-none",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: trackRef,
						className: "relative cursor-ew-resize touch-none",
						style: {
							width: `${zoom * 100}%`,
							minWidth: "100%"
						},
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: () => {
							dragging.current = false;
							moved.current = false;
						},
						onPointerLeave: () => {
							if (!dragging.current) setHover(null);
						},
						onDoubleClick: () => useStudio.getState().setPlaying(true),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "relative mb-1 h-4",
								children: Array.from({ length: tickCount }, (_, i) => {
									const t = dur * i / Math.max(tickCount - 1, 1);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground",
										style: { left: `${t / dur * 100}%` },
										children: formatTimecode(t)
									}, i);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-1",
								children: tracks.map((tr, ti) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									"data-clip-layer": tr.id,
									className: "relative h-7 rounded-sm bg-muted",
									children: people.map((p, i) => {
										const start = layout === "sequence" ? i * slot : 0;
										const on = p.id === activePersonId;
										const picked = selectedClip?.personId === p.id && selectedClip.layer === tr.id;
										const left = start / dur * 100;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											"data-clip-layer": tr.id,
											"data-clip-person": p.id,
											className: cn("absolute top-0.5 bottom-0.5 flex overflow-hidden rounded-sm", picked ? "opacity-100 ring-2 ring-brand" : on ? "opacity-100 ring-1 ring-foreground/30" : "opacity-55"),
											style: {
												left: `${left}%`,
												width: `${slot / dur * 100}%`
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: cn("h-full", tr.color),
													style: {
														width: `${inDuration / slot * 100}%`,
														opacity: .65
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: cn("h-full", tr.color),
													style: { width: `${holdDuration / slot * 100}%` }
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: cn("h-full", tr.color),
													style: {
														width: `${outDuration / slot * 100}%`,
														opacity: .4
													}
												}),
												ti === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-[10px] text-primary-foreground",
													children: p.name
												}) : null
											]
										}, p.id + tr.id);
									})
								}, tr.id))
							}),
							hover != null && !dragging.current ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-foreground/35",
								style: { left: `${hover / dur * 100}%` },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-popover px-1.5 py-0.5 font-mono text-[10px] text-popover-foreground shadow-sm",
									children: [formatTimecode(hover), hoverPerson ? ` · ${hoverPerson.name}` : ""]
								})
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pointer-events-none absolute top-4 bottom-0 z-30",
								style: { left: `${playPct}%` },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1 rotate-45 bg-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground" })]
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-3 pb-2 text-[10px] text-muted-foreground",
				children: "单击片段打开变换条 · 拖动轨道擦洗 · 方向键逐帧 · 空格播放 · Esc 取消选中"
			})
		]
	});
}
function TopBar({ onExport }) {
	const projectName = useStudio((s) => s.projectName);
	const exportFps = useStudio((s) => s.exportFps);
	const exportWidth = useStudio((s) => s.exportWidth);
	const past = useStudio((s) => s.past);
	const future = useStudio((s) => s.future);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const tag = e.target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
				if (!(e.metaKey || e.ctrlKey)) return;
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) useStudio.getState().redo();
				else useStudio.getState().undo();
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				persist();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	function persist() {
		const st = useStudio.getState();
		saveProject({
			...snapshotFromState({
				name: st.projectName,
				people: st.people,
				style: st.style,
				layout: st.layout,
				side: st.side,
				align: st.align,
				scale: st.scale,
				textSize: st.textSize,
				titleSize: st.titleSize,
				nameFontId: st.nameFontId,
				titleFontId: st.titleFontId,
				nameColor: st.nameColor,
				titleColor: st.titleColor,
				accentColor: st.accentColor,
				bandColor: st.bandColor,
				inDuration: st.inDuration,
				holdDuration: st.holdDuration,
				outDuration: st.outDuration,
				stagger: st.stagger,
				animIn: st.animIn,
				ease: st.ease
			}),
			projectName: st.projectName
		});
		toast.success("已保存到本机项目库");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-12 shrink-0 items-center gap-3 border-b border-border bg-rail px-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-7 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground",
					children: "T"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-w-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "人名条工坊"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline",
							children: "专业版"
						})]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden min-w-0 items-center gap-1 md:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: projectName,
						onChange: (e) => useStudio.getState().setProjectName(e.target.value),
						className: "h-7 max-w-48 truncate rounded-sm border border-transparent bg-transparent px-2 text-sm text-muted-foreground outline-none hover:border-border focus:border-input focus:text-foreground",
						"aria-label": "项目名称"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-3 text-muted-foreground" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 hidden items-center gap-1 text-[11px] text-muted-foreground lg:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3 text-brand" }), "自动保存成功"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "撤销",
						disabled: !past.length,
						onClick: () => useStudio.getState().undo(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "重做",
						disabled: !future.length,
						onClick: () => useStudio.getState().redo(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Redo2, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mx-1 hidden h-5 w-px bg-border sm:block" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden h-7 items-center rounded-sm border border-border bg-secondary px-2 text-xs text-muted-foreground sm:flex",
						children: "16:9"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "hidden h-7 w-[6.25rem] rounded-sm border border-border bg-secondary px-1 text-xs md:block",
						value: isNtscFps(exportFps) ? "29.97" : String(exportFps),
						"aria-label": "帧率",
						onChange: (e) => {
							const v = e.target.value;
							useStudio.getState().setExportFps(v === "25" ? 25 : v === "30" ? 30 : 29.97);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "29.97",
								children: "29.97 FPS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "25",
								children: "25 FPS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "30",
								children: "30 FPS"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden text-xs text-muted-foreground lg:inline",
						children: exportWidth === 1920 ? "透明 PNG" : "720p"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						className: "hidden sm:inline-flex",
						onClick: persist,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, {}), "保存"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: onExport,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "导出视频"]
					})
				]
			})
		]
	});
}
function StudioApp() {
	const [exportOpen, setExportOpen] = (0, import_react.useState)(false);
	const [ExportDialog, setExportDialog] = (0, import_react.useState)(null);
	const workspace = useStudio((s) => s.workspace);
	const editorNav = useStudio((s) => s.editorNav);
	(0, import_react.useEffect)(() => {
		Promise.resolve(useStudio.persist.rehydrate()).then(async () => {
			const restored = await restoreCustomFonts();
			if (restored.length) useStudio.getState().setCustomFonts(restored);
			const st = useStudio.getState();
			await loadNameplateFonts([st.nameFontId, st.titleFontId]);
			st.bumpFontEpoch();
		});
		import("./ExportDialog-DPPTMde7.mjs").then((mod) => {
			setExportDialog(() => mod.ExportDialog);
		});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, { onExport: () => setExportOpen(true) }),
			workspace === "projects" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeftRail, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectView, {})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col md:flex-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeftRail, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: workspace === "presets" ? "hidden w-80 shrink-0 overflow-y-auto border-r border-border bg-panel md:block" : "hidden w-[16.5rem] shrink-0 overflow-y-auto border-r border-border bg-panel md:block",
						children: workspace === "presets" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetView, {}) : editorNav === "guests" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuestPanel, {}) : editorNav === "anim" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimPanel, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StylePanel, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
						className: "flex min-h-0 min-w-0 flex-1 flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewStage, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipTransformBar, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, {})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: "hidden w-[19rem] shrink-0 overflow-y-auto border-l border-border bg-panel md:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspector, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-[36%] overflow-y-auto border-t border-border bg-panel md:hidden",
						children: workspace === "presets" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetView, {}) : editorNav === "guests" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuestPanel, {}) : editorNav === "anim" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimPanel, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspector, {})
					})
				]
			}),
			ExportDialog ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExportDialog, {
				open: exportOpen,
				onOpenChange: setExportOpen
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "bottom-right",
				richColors: false
			})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioApp, {});
}
//#endregion
export { soloConfig as a, personSlotDuration as c, Button as d, cn as f, renderConfigFromState as i, totalDuration as l, useStudio as n, frameTiming as o, drawFrame as r, isNtscFps as s, routes_exports as t, loadNameplateFonts as u };
