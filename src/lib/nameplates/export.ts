import JSZip from "jszip";
import {
  BufferTarget,
  canEncodeVideo,
  CanvasSource,
  MovOutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  type VideoCodec,
} from "mediabunny";
import { loadNameplateFonts } from "./fonts";
import { movTimebase, muxPngMov } from "./mov";
import { drawFrame, soloConfig } from "./renderer";
import { useStudio } from "./store";
import {
  frameTiming,
  type Person,
  type RenderConfig,
  totalDuration,
} from "./types";

export type ExportProgress = (ratio: number, label: string) => void;
export type MovKind = "prores" | "hevc" | "png";

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!ctx) throw new Error("无法创建画布");
  return { canvas, ctx };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("PNG 编码失败"));
      else resolve(blob);
    }, "image/png");
  });
}

function namedPeople(config: RenderConfig): Person[] {
  return config.people.filter((p) => p.name.trim().length > 0);
}

function safeName(name: string, index: number): string {
  const trimmed = name.replace(/[\\/:*?"<>|]+/g, "").trim() || `嘉宾${index + 1}`;
  return `${String(index + 1).padStart(2, "0")}_${trimmed}`;
}

async function pickAlphaWebmCodec(): Promise<VideoCodec> {
  const options = { width: 1920, height: 1080, alpha: "keep" as const };
  if (await canEncodeVideo("vp9", options)) return "vp9";
  if (await canEncodeVideo("vp8", options)) return "vp8";
  if (await canEncodeVideo("av1", options)) return "av1";
  throw new Error("当前浏览器无法编码带透明通道的视频，请改用 PNG 序列。");
}

/**
 * MOV 一律用 PNG 编码（32 位 RGBA，无损真透明）。
 * 之前会优先用 ProRes / HEVC，但 WebCodecs 编出的透明通道是独立的旁路数据，
 * MOV 容器写不进去，结果在 Mac / iPhone / 装了 HEVC 的 Windows 上导出的是黑底不透明视频。
 */
export async function pickMovKind(): Promise<MovKind> {
  return "png";
}

async function encodeWithContainer(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  codec: VideoCodec;
  format: WebMOutputFormat | MovOutputFormat;
  mime: string;
  fullCodecString?: string;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  const { config, width, height, fps, codec, format, mime, onProgress } = opts;
  const duration = totalDuration(config);
  const { rate, dur } = frameTiming(fps);
  const frameCount = Math.max(2, Math.round(duration * rate));

  const { canvas, ctx } = makeCanvas(width, height);
  const target = new BufferTarget();
  const output = new Output({ format, target });
  const source = new CanvasSource(canvas, {
    codec,
    quality: new Quality("high"),
    alpha: "keep",
    latencyMode: "quality",
    keyFrameInterval: 1,
    ...(opts.fullCodecString ? { fullCodecString: opts.fullCodecString } : {}),
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
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    }
    source.close();
    onProgress?.(0.97, "封装文件…");
    await output.finalize();
  } catch (err) {
    try {
      source.close();
      await output.cancel();
    } catch {
      /* ignore */
    }
    throw err;
  }

  const buffer = target.buffer;
  if (!buffer) throw new Error("编码完成但未得到文件");
  return new Blob([buffer], { type: mime });
}

async function encodePngMov(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  const { config, width, height, fps, onProgress } = opts;
  const duration = totalDuration(config);
  const { rate, dur } = frameTiming(fps);
  const frameCount = Math.max(2, Math.round(duration * rate));
  const { timescale, sampleDuration } = movTimebase(fps);
  const { canvas, ctx } = makeCanvas(width, height);
  const frames: Uint8Array[] = [];

  for (let i = 0; i < frameCount; i++) {
    drawFrame(ctx, width, height, i * dur, config);
    const blob = await canvasToPng(canvas);
    frames.push(new Uint8Array(await blob.arrayBuffer()));
    if (i % 2 === 0) {
      onProgress?.(i / (frameCount + 4), `帧 ${i + 1} / ${frameCount}`);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(0.94, "封装 MOV…");
  const bytes = muxPngMov({
    frames,
    width,
    height,
    timescale,
    sampleDuration,
  });
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: "video/quicktime" });
}

async function encodeWebmAlpha(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  const codec = await pickAlphaWebmCodec();
  return encodeWithContainer({
    ...opts,
    codec,
    format: new WebMOutputFormat(),
    mime: "video/webm",
  });
}

async function encodeMovAlpha(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  return encodePngMov(opts);
}

async function encodePngSequence(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  folder: JSZip;
  onProgress?: ExportProgress;
}): Promise<void> {
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
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

async function exportPerPerson(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  ext: string;
  zipName: string;
  encode: (args: {
    config: RenderConfig;
    width: number;
    height: number;
    fps: number;
    onProgress?: ExportProgress;
  }) => Promise<Blob>;
  filename?: string;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  const { config, width, height, fps, onProgress } = opts;
  await loadNameplateFonts([
    useStudio.getState().nameFontId,
    useStudio.getState().titleFontId,
  ]);
  const people = namedPeople(config);
  if (people.length === 0) throw new Error("请先填写至少一位嘉宾姓名");

  if (people.length === 1) {
    const blob = await opts.encode({
      config: soloConfig(config, people[0]!),
      width,
      height,
      fps,
      onProgress,
    });
    downloadBlob(blob, opts.filename ?? `${safeName(people[0]!.name, 0)}_透明.${opts.ext}`);
    onProgress?.(1, "完成");
    return blob;
  }

  const zip = new JSZip();
  for (let i = 0; i < people.length; i++) {
    const person = people[i]!;
    const blob = await opts.encode({
      config: soloConfig(config, person),
      width,
      height,
      fps,
      onProgress: (r, label) => {
        onProgress?.((i + r) / people.length, `${person.name} · ${label}`);
      },
    });
    zip.file(`${safeName(person.name, i)}_透明.${opts.ext}`, blob);
  }
  onProgress?.(0.98, "打包 ZIP…");
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  downloadBlob(zipBlob, opts.filename ?? opts.zipName);
  onProgress?.(1, "完成");
  return zipBlob;
}

export async function exportWebmAlpha(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  filename?: string;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  return exportPerPerson({
    ...opts,
    ext: "webm",
    zipName: "人名条_每人一条_WebM.zip",
    encode: encodeWebmAlpha,
  });
}

export async function exportMovAlpha(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  filename?: string;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  return exportPerPerson({
    ...opts,
    ext: "mov",
    zipName: "人名条_每人一条_MOV.zip",
    encode: encodeMovAlpha,
  });
}

export async function exportPngSequence(opts: {
  config: RenderConfig;
  width: number;
  height: number;
  fps: number;
  filename?: string;
  onProgress?: ExportProgress;
}): Promise<Blob> {
  const { config, width, height, fps, onProgress } = opts;
  await loadNameplateFonts([
    useStudio.getState().nameFontId,
    useStudio.getState().titleFontId,
  ]);
  const people = namedPeople(config);
  if (people.length === 0) throw new Error("请先填写至少一位嘉宾姓名");

  const zip = new JSZip();
  for (let i = 0; i < people.length; i++) {
    const person = people[i]!;
    const folder = zip.folder(safeName(person.name, i)) ?? zip;
    await encodePngSequence({
      config: soloConfig(config, person),
      width,
      height,
      fps,
      folder,
      onProgress: (r, label) => {
        onProgress?.((i + r) / (people.length + 0.15), `${person.name} · ${label}`);
      },
    });
  }

  onProgress?.(0.92, "打包 ZIP…");
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "STORE",
  });
  downloadBlob(zipBlob, opts.filename ?? "人名条_每人一条_PNG序列.zip");
  onProgress?.(1, "完成");
  return zipBlob;
}

export async function exportCurrentPng(opts: {
  config: RenderConfig;
  time: number;
  width: number;
  height: number;
  filename?: string;
}): Promise<Blob> {
  await loadNameplateFonts([
    useStudio.getState().nameFontId,
    useStudio.getState().titleFontId,
  ]);
  const { canvas, ctx } = makeCanvas(opts.width, opts.height);
  drawFrame(ctx, opts.width, opts.height, opts.time, opts.config);
  const blob = await canvasToPng(canvas);
  downloadBlob(blob, opts.filename ?? "人名条_当前帧.png");
  return blob;
}

export async function canExportWebm(): Promise<boolean> {
  try {
    await pickAlphaWebmCodec();
    return true;
  } catch {
    return false;
  }
}
