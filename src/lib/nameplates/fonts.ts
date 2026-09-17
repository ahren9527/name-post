export const FONT_SERIF =
  '"Noto Serif SC", "Songti SC", "STSong", "WenQuanYi Zen Hei", serif';
export const FONT_SANS =
  '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif';

export type FontId = string;

export interface FontPreset {
  id: FontId;
  label: string;
  family: string;
  fallback: "serif" | "sans-serif";
  google?: string;
}

export interface CustomFontMeta {
  id: FontId;
  label: string;
  family: string;
}

export const BUILTIN_FONTS: FontPreset[] = [
  {
    id: "sans",
    label: "思源黑体",
    family: "Noto Sans SC",
    fallback: "sans-serif",
    google: "Noto+Sans+SC:wght@400;500;600;700",
  },
  {
    id: "serif",
    label: "思源宋体",
    family: "Noto Serif SC",
    fallback: "serif",
    google: "Noto+Serif+SC:wght@500;600;700",
  },
  {
    id: "wenkai",
    label: "霞鹜文楷",
    family: "LXGW WenKai",
    fallback: "serif",
    google: "LXGW+WenKai:wght@400;700",
  },
  {
    id: "yuan",
    label: "站酷圆体",
    family: "ZCOOL QingKe HuangYou",
    fallback: "sans-serif",
    google: "ZCOOL+QingKe+HuangYou",
  },
];

export const DEFAULT_NAME_FONT = "serif";
export const DEFAULT_TITLE_FONT = "sans";
const MAX_FONT_BYTES = 20 * 1024 * 1024;
const DB_NAME = "nameplate-fonts";
const STORE = "files";

const customRegistry = new Map<string, CustomFontMeta>();
const googleLoaded = new Set<string>();

export function fontStack(family: string, fallback: "serif" | "sans-serif"): string {
  return `"${family}", "Noto Serif SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ${fallback}`;
}

const FONT_ALIAS: Record<string, string> = {
  qingke: "yuan",
  xiaowei: "serif",
  mashan: "serif",
};

function normalizeFontId(id: FontId): FontId {
  return FONT_ALIAS[id] ?? id;
}

export function resolveFontStack(
  id: FontId | undefined,
  slot: "name" | "title",
): string {
  const fallback = slot === "name" ? FONT_SERIF : FONT_SANS;
  if (!id) return fallback;
  const builtin = BUILTIN_FONTS.find((f) => f.id === normalizeFontId(id));
  if (builtin) return fontStack(builtin.family, builtin.fallback);
  const custom = customRegistry.get(id);
  if (custom) return fontStack(custom.family, slot === "name" ? "serif" : "sans-serif");
  return fallback;
}

export function listCustomFonts(): CustomFontMeta[] {
  return [...customRegistry.values()];
}

function openDb(): Promise<IDBDatabase> {
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

async function idbPut(record: CustomFontMeta & { buffer: ArrayBuffer }) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbDelete(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbAll(): Promise<Array<CustomFontMeta & { buffer: ArrayBuffer }>> {
  const db = await openDb();
  const rows = await new Promise<Array<CustomFontMeta & { buffer: ArrayBuffer }>>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    },
  );
  db.close();
  return rows;
}

async function registerFace(family: string, buffer: ArrayBuffer) {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const face = new FontFace(family, buffer, { display: "swap" });
  await face.load();
  document.fonts.add(face);
}

export async function restoreCustomFonts(): Promise<CustomFontMeta[]> {
  if (typeof indexedDB === "undefined") return listCustomFonts();
  try {
    const rows = await idbAll();
    for (const row of rows) {
      customRegistry.set(row.id, { id: row.id, label: row.label, family: row.family });
      try {
        await registerFace(row.family, row.buffer);
      } catch {
        /* still listed; canvas falls back */
      }
    }
  } catch {
    /* private mode */
  }
  return listCustomFonts();
}

export async function uploadCustomFont(file: File): Promise<CustomFontMeta> {
  if (file.size > MAX_FONT_BYTES) {
    throw new Error("字体文件不能超过 20 MB");
  }
  const ok = /\.(ttf|otf|woff2?)$/i.test(file.name);
  if (!ok) throw new Error("请上传 ttf / otf / woff / woff2 字体");
  const buffer = await file.arrayBuffer();
  const id = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
  const family = `NPCustom-${id}`;
  const label = file.name.replace(/\.(ttf|otf|woff2?)$/i, "");
  await registerFace(family, buffer);
  const meta: CustomFontMeta = { id, label, family };
  customRegistry.set(id, meta);
  try {
    await idbPut({ ...meta, buffer });
  } catch {
    /* in-session only */
  }
  return meta;
}

export async function removeCustomFont(id: string): Promise<void> {
  customRegistry.delete(id);
  try {
    await idbDelete(id);
  } catch {
    /* ignore */
  }
}

export async function ensureFontReady(id: FontId | undefined): Promise<void> {
  if (!id || typeof document === "undefined") return;
  const builtin = BUILTIN_FONTS.find((f) => f.id === normalizeFontId(id));
  if (builtin?.google) {
    const href = `https://fonts.googleapis.com/css2?family=${builtin.google}&display=swap`;
    if (!googleLoaded.has(href)) {
      googleLoaded.add(href);
      await new Promise<void>((resolve) => {
        const existing = [...document.querySelectorAll("link")].some((l) => l.href === href);
        if (existing) {
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
    } catch {
      /* system fallback */
    }
    return;
  }
  const custom = customRegistry.get(id);
  if (custom) {
    try {
      await document.fonts.load(`500 88px ${fontStack(custom.family, "serif")}`);
    } catch {
      /* ignore */
    }
  }
}

export async function loadNameplateFonts(ids?: FontId[]): Promise<void> {
  if (typeof document === "undefined") return;
  await restoreCustomFonts();
  const wanted = ids?.length ? ids : [DEFAULT_NAME_FONT, DEFAULT_TITLE_FONT];
  try {
    await Promise.race([
      Promise.all([
        ...wanted.map((id) => ensureFontReady(id)),
        document.fonts.load(`600 92px ${FONT_SERIF}`),
        document.fonts.load(`400 28px ${FONT_SANS}`),
        document.fonts.ready,
      ]),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 4000);
      }),
    ]);
  } catch {
    /* system fallbacks still paint CJK */
  }
}
