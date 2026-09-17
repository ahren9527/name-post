import { i as __toESM } from "../_runtime.mjs";
import { o as require_jsx_runtime, s as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { A as Film, E as Image, M as Download, P as Clapperboard, T as Layers, r as X } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as soloConfig, c as personSlotDuration, d as Button, f as cn, i as renderConfigFromState, l as totalDuration, n as useStudio, o as frameTiming, r as drawFrame, s as isNtscFps, u as loadNameplateFonts } from "./routes-Cr75hsFn.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { t as require_lib } from "../_libs/jszip+[...].mjs";
import { a as BufferTarget, i as CanvasSource, n as MovOutputFormat, o as Quality, r as WebMOutputFormat, s as canEncodeVideo, t as Output } from "../_libs/mediabunny.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ExportDialog-DPPTMde7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-background/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_24px_64px_rgb(0_0_0/0.5)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute top-3 right-3 rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "关闭"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5", className),
		...props
	});
}
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-medium tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
var Label = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn("text-xs font-medium tracking-wide text-muted-foreground", className),
	...props
}));
Label.displayName = Root.displayName;
/** Mux PNG frames into a QuickTime MOV with 32-bit alpha (codec 'png '). */
function concat(parts) {
	let total = 0;
	for (const p of parts) total += p.length;
	const out = new Uint8Array(total);
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}
function u16(n) {
	const b = /* @__PURE__ */ new Uint8Array(2);
	new DataView(b.buffer).setUint16(0, n & 65535);
	return b;
}
function u32(n) {
	const b = /* @__PURE__ */ new Uint8Array(4);
	new DataView(b.buffer).setUint32(0, n >>> 0);
	return b;
}
function i16(n) {
	const b = /* @__PURE__ */ new Uint8Array(2);
	new DataView(b.buffer).setInt16(0, n);
	return b;
}
function fourcc(s) {
	return new Uint8Array([
		s.charCodeAt(0),
		s.charCodeAt(1),
		s.charCodeAt(2),
		s.charCodeAt(3)
	]);
}
function zeros(n) {
	return new Uint8Array(n);
}
function box(type, ...payloads) {
	const payload = concat(payloads);
	return concat([
		u32(8 + payload.length),
		fourcc(type),
		payload
	]);
}
function pascal32(text) {
	const buf = /* @__PURE__ */ new Uint8Array(32);
	const str = text.slice(0, 31);
	buf[0] = str.length;
	for (let i = 0; i < str.length; i++) buf[i + 1] = str.charCodeAt(i) & 255;
	return buf;
}
function identityMatrix() {
	return concat([
		u32(65536),
		u32(0),
		u32(0),
		u32(0),
		u32(65536),
		u32(0),
		u32(0),
		u32(0),
		u32(1073741824)
	]);
}
function cString(text) {
	const out = new Uint8Array(text.length + 1);
	for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 255;
	return out;
}
function muxPngMov(opts) {
	const { frames, width, height, timescale, sampleDuration } = opts;
	if (frames.length === 0) throw new Error("没有可封装的帧");
	const n = frames.length;
	const duration = n * sampleDuration;
	const ftyp = box("ftyp", fourcc("qt  "), u32(512), fourcc("qt  "));
	const payloadSize = frames.reduce((s, f) => s + f.length, 0);
	const mdatHeader = 8;
	const mdatSize = mdatHeader + payloadSize;
	const chunkOffset = ftyp.length + mdatHeader;
	const pngDesc = concat([
		u32(86),
		fourcc("png "),
		zeros(6),
		u16(1),
		u16(0),
		u16(0),
		u32(0),
		u32(0),
		u32(1024),
		u16(width),
		u16(height),
		u32(4718592),
		u32(4718592),
		u32(0),
		u16(1),
		pascal32("PNG"),
		u16(32),
		i16(-1)
	]);
	const stbl = box("stbl", box("stsd", u32(0), u32(1), pngDesc), box("stts", u32(0), u32(1), u32(n), u32(sampleDuration)), box("stsc", u32(0), u32(1), u32(1), u32(n), u32(1)), box("stsz", u32(0), u32(0), u32(n), ...frames.map((f) => u32(f.length))), box("stco", u32(0), u32(1), u32(chunkOffset)), box("stss", u32(0), u32(n), ...frames.map((_, i) => u32(i + 1))));
	const dinf = box("dinf", box("dref", u32(0), u32(1), concat([
		u32(12),
		fourcc("url "),
		u32(1)
	])));
	const minf = box("minf", box("vmhd", u32(1), u16(0), u16(0), u16(0), u16(0)), dinf, stbl);
	const hdlr = box("hdlr", u32(0), fourcc("mhlr"), fourcc("vide"), u32(0), u32(0), u32(0), cString("VideoHandler"));
	const mdia = box("mdia", box("mdhd", u32(0), u32(0), u32(0), u32(timescale), u32(duration), u16(21956), u16(0)), hdlr, minf);
	const trak = box("trak", box("tkhd", u32(7), u32(0), u32(0), u32(1), u32(0), u32(duration), zeros(8), u16(0), u16(0), u16(0), u16(0), identityMatrix(), u32(width << 16), u32(height << 16)), mdia);
	const moov = box("moov", box("mvhd", u32(0), u32(0), u32(0), u32(timescale), u32(duration), u32(65536), u16(256), zeros(10), identityMatrix(), u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(2)), trak);
	return concat([
		ftyp,
		concat([
			u32(mdatSize),
			fourcc("mdat"),
			...frames
		]),
		moov
	]);
}
function movTimebase(fps) {
	if (Math.abs(fps - 29.97) < .05) return {
		timescale: 3e4,
		sampleDuration: 1001
	};
	if (fps === 25) return {
		timescale: 25,
		sampleDuration: 1
	};
	if (fps === 30) return {
		timescale: 30,
		sampleDuration: 1
	};
	return {
		timescale: Math.round(fps * 1e3),
		sampleDuration: 1e3
	};
}
function makeCanvas(width, height) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", {
		alpha: true,
		colorSpace: "srgb"
	});
	if (!ctx) throw new Error("无法创建画布");
	return {
		canvas,
		ctx
	};
}
function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 4e3);
}
function canvasToPng(canvas) {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) reject(/* @__PURE__ */ new Error("PNG 编码失败"));
			else resolve(blob);
		}, "image/png");
	});
}
function namedPeople(config) {
	return config.people.filter((p) => p.name.trim().length > 0);
}
function safeName(name, index) {
	const trimmed = name.replace(/[\\/:*?"<>|]+/g, "").trim() || `嘉宾${index + 1}`;
	return `${String(index + 1).padStart(2, "0")}_${trimmed}`;
}
async function pickAlphaWebmCodec() {
	const options = {
		width: 1920,
		height: 1080,
		alpha: "keep"
	};
	if (await canEncodeVideo("vp9", options)) return "vp9";
	if (await canEncodeVideo("vp8", options)) return "vp8";
	if (await canEncodeVideo("av1", options)) return "av1";
	throw new Error("当前浏览器无法编码带透明通道的视频，请改用 PNG 序列。");
}
async function pickMovKind() {
	const options = {
		width: 1920,
		height: 1080,
		alpha: "keep"
	};
	if (await canEncodeVideo("prores", options)) return "prores";
	if (await canEncodeVideo("hevc", options)) return "hevc";
	return "png";
}
async function encodeWithContainer(opts) {
	const { config, width, height, fps, codec, format, mime, onProgress } = opts;
	const duration = totalDuration(config);
	const { rate, dur } = frameTiming(fps);
	const frameCount = Math.max(2, Math.round(duration * rate));
	const { canvas, ctx } = makeCanvas(width, height);
	const target = new BufferTarget();
	const output = new Output({
		format,
		target
	});
	const source = new CanvasSource(canvas, {
		codec,
		quality: new Quality("high"),
		alpha: "keep",
		latencyMode: "quality",
		keyFrameInterval: 1,
		...opts.fullCodecString ? { fullCodecString: opts.fullCodecString } : {}
	});
	output.addVideoTrack(source);
	await output.start();
	try {
		for (let i = 0; i < frameCount; i++) {
			const t = i * dur;
			drawFrame(ctx, width, height, t, config);
			await source.add(t, dur);
			if (i % 2 === 0) {
				onProgress?.(i / frameCount, `编码 ${i + 1} / ${frameCount}`);
				await new Promise((r) => setTimeout(r, 0));
			}
		}
		source.close();
		onProgress?.(.97, "封装文件…");
		await output.finalize();
	} catch (err) {
		try {
			source.close();
			await output.cancel();
		} catch {}
		throw err;
	}
	const buffer = target.buffer;
	if (!buffer) throw new Error("编码完成但未得到文件");
	return new Blob([buffer], { type: mime });
}
async function encodePngMov(opts) {
	const { config, width, height, fps, onProgress } = opts;
	const duration = totalDuration(config);
	const { rate, dur } = frameTiming(fps);
	const frameCount = Math.max(2, Math.round(duration * rate));
	const { timescale, sampleDuration } = movTimebase(fps);
	const { canvas, ctx } = makeCanvas(width, height);
	const frames = [];
	for (let i = 0; i < frameCount; i++) {
		drawFrame(ctx, width, height, i * dur, config);
		const blob = await canvasToPng(canvas);
		frames.push(new Uint8Array(await blob.arrayBuffer()));
		if (i % 2 === 0) {
			onProgress?.(i / (frameCount + 4), `帧 ${i + 1} / ${frameCount}`);
			await new Promise((r) => setTimeout(r, 0));
		}
	}
	onProgress?.(.94, "封装 MOV…");
	const bytes = muxPngMov({
		frames,
		width,
		height,
		timescale,
		sampleDuration
	});
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return new Blob([copy], { type: "video/quicktime" });
}
async function encodeWebmAlpha(opts) {
	const codec = await pickAlphaWebmCodec();
	return encodeWithContainer({
		...opts,
		codec,
		format: new WebMOutputFormat(),
		mime: "video/webm"
	});
}
async function encodeMovAlpha(opts) {
	const kind = await pickMovKind();
	if (kind === "prores") return encodeWithContainer({
		...opts,
		codec: "prores",
		format: new MovOutputFormat({ fastStart: "in-memory" }),
		mime: "video/quicktime",
		fullCodecString: "ap4h"
	});
	if (kind === "hevc") return encodeWithContainer({
		...opts,
		codec: "hevc",
		format: new MovOutputFormat({ fastStart: "in-memory" }),
		mime: "video/quicktime"
	});
	return encodePngMov(opts);
}
async function encodePngSequence(opts) {
	const { config, width, height, fps, folder, onProgress } = opts;
	const duration = totalDuration(config);
	const { rate, dur } = frameTiming(fps);
	const frameCount = Math.max(2, Math.round(duration * rate));
	const { canvas, ctx } = makeCanvas(width, height);
	for (let i = 0; i < frameCount; i++) {
		drawFrame(ctx, width, height, i * dur, config);
		const blob = await canvasToPng(canvas);
		folder.file(`frame_${String(i + 1).padStart(5, "0")}.png`, blob);
		if (i % 2 === 0) {
			onProgress?.(i / frameCount, `帧 ${i + 1} / ${frameCount}`);
			await new Promise((r) => setTimeout(r, 0));
		}
	}
}
async function exportPerPerson(opts) {
	const { config, width, height, fps, onProgress } = opts;
	await loadNameplateFonts([useStudio.getState().nameFontId, useStudio.getState().titleFontId]);
	const people = namedPeople(config);
	if (people.length === 0) throw new Error("请先填写至少一位嘉宾姓名");
	if (people.length === 1) {
		const blob = await opts.encode({
			config: soloConfig(config, people[0]),
			width,
			height,
			fps,
			onProgress
		});
		downloadBlob(blob, opts.filename ?? `${safeName(people[0].name, 0)}_透明.${opts.ext}`);
		onProgress?.(1, "完成");
		return blob;
	}
	const zip = new import_lib.default();
	for (let i = 0; i < people.length; i++) {
		const person = people[i];
		const blob = await opts.encode({
			config: soloConfig(config, person),
			width,
			height,
			fps,
			onProgress: (r, label) => {
				onProgress?.((i + r) / people.length, `${person.name} · ${label}`);
			}
		});
		zip.file(`${safeName(person.name, i)}_透明.${opts.ext}`, blob);
	}
	onProgress?.(.98, "打包 ZIP…");
	const zipBlob = await zip.generateAsync({
		type: "blob",
		compression: "STORE"
	});
	downloadBlob(zipBlob, opts.filename ?? opts.zipName);
	onProgress?.(1, "完成");
	return zipBlob;
}
async function exportWebmAlpha(opts) {
	return exportPerPerson({
		...opts,
		ext: "webm",
		zipName: "人名条_每人一条_WebM.zip",
		encode: encodeWebmAlpha
	});
}
async function exportMovAlpha(opts) {
	return exportPerPerson({
		...opts,
		ext: "mov",
		zipName: "人名条_每人一条_MOV.zip",
		encode: encodeMovAlpha
	});
}
async function exportPngSequence(opts) {
	const { config, width, height, fps, onProgress } = opts;
	await loadNameplateFonts([useStudio.getState().nameFontId, useStudio.getState().titleFontId]);
	const people = namedPeople(config);
	if (people.length === 0) throw new Error("请先填写至少一位嘉宾姓名");
	const zip = new import_lib.default();
	for (let i = 0; i < people.length; i++) {
		const person = people[i];
		const folder = zip.folder(safeName(person.name, i)) ?? zip;
		await encodePngSequence({
			config: soloConfig(config, person),
			width,
			height,
			fps,
			folder,
			onProgress: (r, label) => {
				onProgress?.((i + r) / (people.length + .15), `${person.name} · ${label}`);
			}
		});
	}
	onProgress?.(.92, "打包 ZIP…");
	const zipBlob = await zip.generateAsync({
		type: "blob",
		compression: "STORE"
	});
	downloadBlob(zipBlob, opts.filename ?? "人名条_每人一条_PNG序列.zip");
	onProgress?.(1, "完成");
	return zipBlob;
}
async function exportCurrentPng(opts) {
	await loadNameplateFonts([useStudio.getState().nameFontId, useStudio.getState().titleFontId]);
	const { canvas, ctx } = makeCanvas(opts.width, opts.height);
	drawFrame(ctx, opts.width, opts.height, opts.time, opts.config);
	const blob = await canvasToPng(canvas);
	downloadBlob(blob, opts.filename ?? "人名条_当前帧.png");
	return blob;
}
async function canExportWebm() {
	try {
		await pickAlphaWebmCodec();
		return true;
	} catch {
		return false;
	}
}
function parseFps(raw) {
	const n = Number(raw);
	if (n === 25) return 25;
	if (n === 30) return 30;
	return 29.97;
}
function movCaption(kind) {
	if (kind === "prores") return "ProRes 4444 · Alpha";
	if (kind === "hevc") return "HEVC · 透明通道";
	return "PNG 编码 · 透明通道";
}
function ExportDialog({ open, onOpenChange }) {
	const exportWidth = useStudio((s) => s.exportWidth);
	const exportFps = useStudio((s) => s.exportFps);
	const people = useStudio((s) => s.people);
	const [format, setFormat] = (0, import_react.useState)("mov");
	const [who, setWho] = (0, import_react.useState)("all");
	const [webmOk, setWebmOk] = (0, import_react.useState)(true);
	const [movKind, setMovKind] = (0, import_react.useState)("png");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [progress, setProgress] = (0, import_react.useState)(0);
	const [status, setStatus] = (0, import_react.useState)("");
	const [previewUrl, setPreviewUrl] = (0, import_react.useState)(null);
	const named = people.filter((p) => p.name.trim().length > 0);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		canExportWebm().then(setWebmOk);
		pickMovKind().then(setMovKind);
		const st = useStudio.getState();
		const cfg = renderConfigFromState(st);
		const list = cfg.people.filter((p) => p.name.trim());
		if (cfg.layout === "sequence" && list.length > 1) {
			const slot = personSlotDuration(cfg);
			const i = Math.max(0, Math.min(list.length - 1, Math.floor(st.currentTime / slot)));
			setWho(list[i].id);
		} else setWho("all");
	}, [open]);
	(0, import_react.useEffect)(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);
	async function run() {
		const st = useStudio.getState();
		const full = renderConfigFromState(st);
		const picked = named.find((p) => p.id === who);
		const config = who !== "all" && picked ? soloConfig(full, picked) : full;
		if (config.people.every((p) => !p.name.trim())) {
			toast.error("请先填写至少一位嘉宾姓名");
			return;
		}
		const width = st.exportWidth;
		const height = width === 1920 ? 1080 : 720;
		const soloName = config.people.length === 1 ? config.people[0].name.trim() : "";
		setBusy(true);
		setProgress(0);
		setStatus("准备编码…");
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
		try {
			if (format === "mov") {
				await exportMovAlpha({
					config,
					width,
					height,
					fps: st.exportFps,
					onProgress: (r, label) => {
						setProgress(r);
						setStatus(label);
					}
				});
				toast.success(soloName ? `已下载：${soloName} 透明 MOV` : "已下载：每人一条透明 MOV");
			} else if (format === "webm") {
				const blob = await exportWebmAlpha({
					config,
					width,
					height,
					fps: st.exportFps,
					onProgress: (r, label) => {
						setProgress(r);
						setStatus(label);
					}
				});
				if (blob.type === "video/webm") setPreviewUrl(URL.createObjectURL(blob));
				toast.success(soloName ? `已下载：${soloName} 透明 WebM` : "已下载：每人一条透明 WebM");
			} else if (format === "pngseq") {
				await exportPngSequence({
					config,
					width,
					height,
					fps: st.exportFps,
					onProgress: (r, label) => {
						setProgress(r);
						setStatus(label);
					}
				});
				toast.success(soloName ? `已下载：${soloName} PNG 序列` : "已下载：每人一条 PNG 序列");
			} else {
				await exportCurrentPng({
					config,
					time: soloName ? personSlotDuration(config) * .45 : st.currentTime,
					width,
					height,
					filename: soloName ? `${soloName}_当前帧.png` : void 0
				});
				toast.success(soloName ? `已下载：${soloName} 当前帧` : "已下载当前帧透明 PNG");
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "导出失败";
			toast.error(message);
			setStatus(message);
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "导出设置" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "MOV / WebM 透明通道，可按人单独导出。默认 29.97 fps。" })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormatCard, {
							active: format === "mov",
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clapperboard, {}),
							title: "MOV 透明",
							caption: movCaption(movKind),
							onClick: () => setFormat("mov")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormatCard, {
							active: format === "webm",
							disabled: !webmOk,
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, {}),
							title: "WebM 透明",
							caption: webmOk ? "VP9 · 网页预览" : "浏览器不支持",
							onClick: () => webmOk && setFormat("webm")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormatCard, {
							active: format === "pngseq",
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {}),
							title: "PNG 序列",
							caption: "每人一个文件夹",
							onClick: () => setFormat("pngseq")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormatCard, {
							active: format === "frame",
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, {}),
							title: "当前帧",
							caption: "单张透明 PNG",
							onClick: () => setFormat("frame")
						})
					]
				}),
				named.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "导出对象" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "h-10 rounded-md border border-input bg-secondary px-3 text-sm",
						value: who,
						onChange: (e) => setWho(e.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "all",
							children: "全部嘉宾（每人一条）"
						}), named.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: p.id,
							children: p.name
						}, p.id))]
					})]
				}) : null,
				format !== "frame" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "分辨率" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "h-10 rounded-md border border-input bg-secondary px-3 text-sm",
							value: exportWidth,
							onChange: (e) => useStudio.getState().setExportWidth(Number(e.target.value)),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: 1920,
								children: "1920 × 1080"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: 1280,
								children: "1280 × 720"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "帧率" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "h-10 rounded-md border border-input bg-secondary px-3 text-sm",
							value: isNtscFps(exportFps) ? "29.97" : String(exportFps),
							onChange: (e) => useStudio.getState().setExportFps(parseFps(e.target.value)),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "29.97",
									children: "29.97 fps"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "25",
									children: "25 fps"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "30",
									children: "30 fps"
								})
							]
						})]
					})]
				}) : null,
				busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-1 overflow-hidden rounded-full bg-secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-primary transition-[width] duration-150",
							style: { width: `${Math.round(progress * 100)}%` }
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: status
					})]
				}) : null,
				previewUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-hidden rounded-lg bg-checker",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						src: previewUrl,
						className: "aspect-video w-full",
						autoPlay: true,
						loop: true,
						muted: true,
						playsInline: true
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					disabled: busy,
					onClick: () => void run(),
					className: "w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), busy ? "导出中…" : who !== "all" && named.find((p) => p.id === who) ? `开始导出 · ${named.find((p) => p.id === who).name}` : "开始导出"]
				})
			]
		})
	});
}
function FormatCard({ active, disabled, icon, title, caption, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled,
		onClick,
		className: cn("flex flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-[border-color,background-color] duration-150", active ? "border-primary/40 bg-secondary" : "border-border hover:bg-accent", disabled && "cursor-not-allowed opacity-40"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground [&_svg]:size-4",
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[11px] text-muted-foreground",
				children: caption
			})
		]
	});
}
//#endregion
export { ExportDialog };
