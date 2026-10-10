import type { AnimIn, EaseKind, LayoutMode, NameplateStyle, Orient, Person, Side, TextAlign, TextBacking, TextFx } from "./types";

export interface ProjectSnapshot {
  name: string;
  people: Person[];
  style: NameplateStyle;
  layout: LayoutMode;
  side: Side;
  orient?: Orient;
  align: TextAlign;
  scale: number;
  textSize: number;
  titleSize: number;
  nameFontId: string;
  titleFontId: string;
  nameColor: string;
  titleColor: string;
  accentColor: string;
  bandColor: string;
  inDuration: number;
  holdDuration: number;
  outDuration: number;
  stagger: number;
  animIn: AnimIn;
  ease: EaseKind;
  /** Added with the flagship templates; absent in older projects. */
  sweep?: boolean;
  textFx?: TextFx;
  /** 衬底; absent in older projects (= "soft"). */
  backing?: TextBacking;
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  snapshot: ProjectSnapshot;
}

const KEY = "nameplate-projects-v1";

function readAll(): SavedProject[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedProject[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 24)));
}

export function listProjects(): SavedProject[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function snapshotFromState(s: ProjectSnapshot): ProjectSnapshot {
  return {
    name: s.name,
    people: s.people.map((p) => ({ ...p })),
    style: s.style,
    layout: s.layout,
    side: s.side,
    orient: s.orient ?? "horizontal",
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
    ease: s.ease,
    sweep: s.sweep ?? true,
    textFx: s.textFx,
    backing: s.backing ?? "soft",
  };
}

export function saveProject(s: ProjectSnapshot & { projectName: string }, id?: string): SavedProject {
  const list = readAll();
  const existing = id ? list.find((p) => p.id === id) : list.find((p) => p.name === s.projectName);
  const rec: SavedProject = {
    id: existing?.id ?? `proj-${Date.now()}`,
    name: s.projectName || s.name || "未命名项目",
    updatedAt: Date.now(),
    snapshot: snapshotFromState({ ...s, name: s.projectName || s.name }),
  };
  writeAll([rec, ...list.filter((p) => p.id !== rec.id)]);
  return rec;
}

export function deleteProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
