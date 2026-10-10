import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_NAME_FONT,
  DEFAULT_TITLE_FONT,
  ensureFontReady,
  type CustomFontMeta,
} from "./fonts";
import { groupOf, migrateFavorites, type StyleCard } from "./presets";
import { isPremiumId, supportsVertical } from "./premium/spec";
import { snapshotFromState, type ProjectSnapshot } from "./projects";
import {
  DEFAULT_CONFIG,
  DEFAULT_PEOPLE,
  type AnimIn,
  type ClipLayer,
  type EaseKind,
  type EditorNav,
  type ExportFps,
  type LayerXform,
  type LayoutMode,
  type NameplateStyle,
  type Orient,
  type Person,
  type PreviewBg,
  type Side,
  type TextAlign,
  type TextFx,
  type Workspace,
  isColumnStyle,
  normalizeFamily,
} from "./types";

type HistorySnap = ProjectSnapshot;

export interface StudioState {
  people: Person[];
  style: NameplateStyle;
  layout: LayoutMode;
  side: Side;
  orient: Orient;
  align: TextAlign;
  scale: number;
  textSize: number;
  titleSize: number;
  nameFontId: string;
  titleFontId: string;
  customFonts: CustomFontMeta[];
  fontEpoch: number;
  nameColor: string;
  titleColor: string;
  accentColor: string;
  bandColor: string;
  sectionLabel: string;
  inDuration: number;
  holdDuration: number;
  outDuration: number;
  stagger: number;
  animIn: AnimIn;
  ease: EaseKind;
  sweep: boolean;
  textFx: TextFx;
  previewBg: PreviewBg;
  showSafe: boolean;
  currentTime: number;
  playing: boolean;
  exportWidth: 1280 | 1920;
  exportFps: ExportFps;
  workspace: Workspace;
  editorNav: EditorNav;
  projectName: string;
  activePersonId: string;
  selectedClip: { personId: string; layer: ClipLayer } | null;
  favorited: string[];
  customPresets: StyleCard[];
  past: HistorySnap[];
  future: HistorySnap[];
  setPeople: (people: Person[]) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  addPerson: () => void;
  removePerson: (id: string) => void;
  movePerson: (id: string, dir: -1 | 1) => void;
  reorderPeople: (from: number, to: number) => void;
  duplicatePerson: (id: string) => void;
  restoreDefaults: () => void;
  resetStyle: () => void;
  setStyle: (style: NameplateStyle) => void;
  setLayout: (layout: LayoutMode) => void;
  setSide: (side: Side) => void;
  setOrient: (orient: Orient) => void;
  setVariant: (orient: Orient, side: Side) => void;
  setAlign: (align: TextAlign) => void;
  setScale: (scale: number) => void;
  setTextSize: (textSize: number) => void;
  setTitleSize: (titleSize: number) => void;
  setNameFontId: (id: string) => void;
  setTitleFontId: (id: string) => void;
  setCustomFonts: (fonts: CustomFontMeta[]) => void;
  addCustomFont: (font: CustomFontMeta) => void;
  bumpFontEpoch: () => void;
  setNameColor: (c: string) => void;
  setTitleColor: (c: string) => void;
  setAccentColor: (c: string) => void;
  setBandColor: (c: string) => void;
  setSectionLabel: (sectionLabel: string) => void;
  setInDuration: (n: number) => void;
  setHoldDuration: (n: number) => void;
  setOutDuration: (n: number) => void;
  setStagger: (n: number) => void;
  setAnimIn: (v: AnimIn) => void;
  setEase: (v: EaseKind) => void;
  setSweep: (v: boolean) => void;
  setTextFx: (v: TextFx) => void;
  setPreviewBg: (bg: PreviewBg) => void;
  setShowSafe: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setExportWidth: (w: 1280 | 1920) => void;
  setExportFps: (f: ExportFps) => void;
  setWorkspace: (w: Workspace) => void;
  setEditorNav: (n: EditorNav) => void;
  setProjectName: (n: string) => void;
  setActivePersonId: (id: string) => void;
  selectClip: (personId: string, layer: ClipLayer) => void;
  clearClip: () => void;
  setLayerXform: (personId: string, layer: ClipLayer, patch: Partial<LayerXform>, live?: boolean) => void;
  resetLayerXform: (personId: string, layer: ClipLayer) => void;
  focusPerson: (id: string, playIn?: boolean) => void;
  applyPreset: (p: {
    style: NameplateStyle;
    side?: Side;
    accentColor?: string;
    bandColor?: string;
    nameColor?: string;
    titleColor?: string;
    nameFontId?: string;
    titleFontId?: string;
    sweep?: boolean;
  }) => void;
  toggleFavorite: (id: string) => void;
  saveCustomPreset: () => StyleCard;
  applySnapshot: (snap: ProjectSnapshot) => void;
  openPresetBrowse: () => void;
  undo: () => void;
  redo: () => void;
}

let extra = 1;

function applyFont(id: string) {
  void ensureFontReady(id).then(() => {
    useStudio.getState().bumpFontEpoch();
  });
}

function snapOf(s: StudioState): HistorySnap {
  return snapshotFromState({
    name: s.projectName,
    people: s.people,
    style: s.style,
    layout: s.layout,
    side: s.side,
    orient: s.orient,
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
    sweep: s.sweep,
    textFx: s.textFx,
  });
}

/** Snapshot of the current studio state, for saving to the project library. */
export function currentSnapshot(): ProjectSnapshot {
  return snapOf(useStudio.getState());
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => {
      const commit = (patch: Partial<StudioState>) => {
        const past = [...get().past, snapOf(get())].slice(-40);
        set({ ...patch, past, future: [] });
      };
      return {
        people: DEFAULT_PEOPLE,
        ...DEFAULT_CONFIG,
        nameFontId: DEFAULT_NAME_FONT,
        titleFontId: DEFAULT_TITLE_FONT,
        customFonts: [],
        fontEpoch: 0,
        previewBg: "live",
        showSafe: true,
        currentTime: 1.6,
        playing: false,
        exportWidth: 1920,
        exportFps: 29.97,
        workspace: "editor",
        editorNav: "style",
        projectName: "未命名项目",
        activePersonId: DEFAULT_PEOPLE[0]!.id,
        selectedClip: null,
        favorited: ["pro-goldnavy", "pro-blackgold", "pro-keynote"],
        customPresets: [],
        past: [],
        future: [],
        setPeople: (people) => commit({ people }),
        updatePerson: (id, patch) =>
          commit({
            people: get().people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          }),
        addPerson: () => {
          extra += 1;
          const id = `p-new-${extra}`;
          commit({
            people: [
              ...get().people,
              { id, name: "嘉宾姓名", title: "职务", titleLines: 1 },
            ],
            activePersonId: id,
          });
        },
        removePerson: (id) => {
          const people = get().people.filter((p) => p.id !== id);
          commit({
            people,
            activePersonId:
              get().activePersonId === id ? (people[0]?.id ?? "") : get().activePersonId,
          });
        },
        movePerson: (id, dir) => {
          const list = [...get().people];
          const i = list.findIndex((p) => p.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return;
          const tmp = list[i]!;
          list[i] = list[j]!;
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
          const copy: Person = { ...src, id: `p-new-${extra}`, name: `${src.name}` };
          const i = get().people.findIndex((p) => p.id === id);
          const people = [...get().people];
          people.splice(i + 1, 0, copy);
          commit({ people, activePersonId: copy.id });
        },
        restoreDefaults: () =>
          commit({
            people: DEFAULT_PEOPLE.map((p) => ({ ...p })),
            ...DEFAULT_CONFIG,
            nameFontId: DEFAULT_NAME_FONT,
            titleFontId: DEFAULT_TITLE_FONT,
            currentTime: DEFAULT_CONFIG.inDuration + 0.6,
            playing: false,
            exportFps: 29.97,
            activePersonId: DEFAULT_PEOPLE[0]!.id,
            projectName: "未命名项目",
          }),
        resetStyle: () =>
          commit({
            style: DEFAULT_CONFIG.style,
            layout: DEFAULT_CONFIG.layout,
            side: DEFAULT_CONFIG.side,
            orient: DEFAULT_CONFIG.orient,
            align: DEFAULT_CONFIG.align,
            scale: DEFAULT_CONFIG.scale,
            textSize: DEFAULT_CONFIG.textSize,
            titleSize: DEFAULT_CONFIG.titleSize,
            nameFontId: DEFAULT_NAME_FONT,
            titleFontId: DEFAULT_TITLE_FONT,
            nameColor: DEFAULT_CONFIG.nameColor,
            titleColor: DEFAULT_CONFIG.titleColor,
            accentColor: DEFAULT_CONFIG.accentColor,
            bandColor: DEFAULT_CONFIG.bandColor,
            sweep: DEFAULT_CONFIG.sweep,
            textFx: DEFAULT_CONFIG.textFx,
            inDuration: DEFAULT_CONFIG.inDuration,
            holdDuration: DEFAULT_CONFIG.holdDuration,
            outDuration: DEFAULT_CONFIG.outDuration,
            stagger: DEFAULT_CONFIG.stagger,
            animIn: DEFAULT_CONFIG.animIn,
            ease: DEFAULT_CONFIG.ease,
          }),
        setStyle: (style) =>
          commit({
            style,
            align: isColumnStyle(get().orient) ? "top" : get().side === "right" ? "right" : "left",
          }),
        setLayout: (layout) => commit({ layout }),
        setSide: (side) =>
          commit({
            side,
            align: isColumnStyle(get().orient) ? "top" : side === "right" ? "right" : "left",
            animIn:
              get().animIn === "left" || get().animIn === "right"
                ? side === "right"
                  ? "right"
                  : "left"
                : get().animIn,
          }),
        setOrient: (want) => {
          const orient = supportsVertical(get().style) ? want : "horizontal";
          commit({
            orient,
            align: isColumnStyle(orient) ? "top" : get().side === "right" ? "right" : "left",
          });
        },
        setVariant: (want, side) => {
          const orient = supportsVertical(get().style) ? want : "horizontal";
          commit({
            orient,
            side,
            align: isColumnStyle(orient) ? "top" : side === "right" ? "right" : "left",
            animIn:
              get().animIn === "left" || get().animIn === "right"
                ? side === "right"
                  ? "right"
                  : "left"
                : get().animIn,
          });
        },
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
        addCustomFont: (font) =>
          set({ customFonts: [...get().customFonts.filter((f) => f.id !== font.id), font] }),
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
        setAnimIn: (animIn) =>
          commit({
            animIn,
            side: animIn === "right" ? "right" : animIn === "left" ? "left" : get().side,
            align:
              isColumnStyle(get().orient)
                ? "top"
                : animIn === "right"
                  ? "right"
                  : animIn === "left"
                    ? "left"
                    : get().align,
          }),
        setEase: (ease) => commit({ ease }),
        setSweep: (sweep) => commit({ sweep }),
        setTextFx: (textFx) => commit({ textFx }),
        setPreviewBg: (previewBg) => set({ previewBg }),
        setShowSafe: (showSafe) => set({ showSafe }),
        setCurrentTime: (currentTime) => set({ currentTime }),
        setPlaying: (playing) => set({ playing }),
        setExportWidth: (exportWidth) => set({ exportWidth }),
        setExportFps: (exportFps) => set({ exportFps }),
        setWorkspace: (workspace) => set({ workspace }),
        setEditorNav: (editorNav) => set({ editorNav, workspace: "editor" }),
        setProjectName: (projectName) => set({ projectName }),
        setActivePersonId: (activePersonId) => set({ activePersonId }),
        selectClip: (personId, layer) => set({ selectedClip: { personId, layer }, activePersonId: personId }),
        clearClip: () => set({ selectedClip: null }),
        setLayerXform: (personId, layer, patch, live) => {
          const next = get().people.map((p) => {
            if (p.id !== personId) return p;
            const prev = p.xform?.[layer] ?? { x: 0, y: 0, rotation: 0 };
            return {
              ...p,
              xform: { ...p.xform, [layer]: { ...prev, ...patch } },
            };
          });
          if (live) set({ people: next });
          else commit({ people: next });
        },
        resetLayerXform: (personId, layer) => {
          commit({
            people: get().people.map((p) => {
              if (p.id !== personId) return p;
              const xform = { ...p.xform };
              delete xform[layer];
              return { ...p, xform };
            }),
          });
        },
        focusPerson: (id, playIn) => {
          const st = get();
          const i = st.people.findIndex((p) => p.id === id);
          if (i < 0) return;
          const slot = st.inDuration + st.holdDuration + st.outDuration;
          const t = st.layout === "sequence" ? i * slot + (playIn ? 0.04 : st.inDuration + 0.12) : st.currentTime;
          set({ activePersonId: id, currentTime: t, playing: !!playIn });
        },
        applyPreset: (p) => {
          const st = get();
          const side = st.side;
          const slot = st.inDuration + st.holdDuration + st.outDuration;
          const idx = Math.max(0, st.people.findIndex((x) => x.id === st.activePersonId));
          const hold =
            (st.layout === "sequence" ? idx * slot : 0) + st.inDuration + 0.15;
          const t =
            st.currentTime < st.inDuration * 0.5 || st.playing ? hold : st.currentTime;
          const family = normalizeFamily(p.style);
          const orient = supportsVertical(family.style) ? st.orient : "horizontal";
          if (p.nameFontId) applyFont(p.nameFontId);
          if (p.titleFontId) applyFont(p.titleFontId);
          commit({
            style: family.style,
            side,
            orient,
            align: isColumnStyle(orient) ? "top" : side === "right" ? "right" : "left",
            nameFontId: p.nameFontId ?? st.nameFontId,
            titleFontId: p.titleFontId ?? st.titleFontId,
            sweep: p.sweep ?? st.sweep,
            // gallery templates are designed around the soft shadow + scrim; the legacy outline stays opt-in
            textFx: st.textFx === "outline" ? "soft" : st.textFx,
            accentColor: p.accentColor ?? st.accentColor,
            bandColor: p.bandColor ?? st.bandColor,
            nameColor: p.nameColor ?? st.nameColor,
            titleColor: p.titleColor ?? st.titleColor,
            animIn:
              st.animIn === "left" || st.animIn === "right"
                ? side === "right"
                  ? "right"
                  : "left"
                : st.animIn,
            currentTime: t,
            playing: false,
          });
        },
        toggleFavorite: (id) => {
          const has = get().favorited.includes(id);
          set({ favorited: has ? get().favorited.filter((x) => x !== id) : [...get().favorited, id] });
        },
        saveCustomPreset: () => {
          const st = get();
          const card: StyleCard = {
            id: `custom-${Date.now()}`,
            label: `${st.projectName || "我的"}样式`,
            caption: "自定义",
            style: st.style,
            side: st.side,
            accentColor: st.accentColor,
            bandColor: st.bandColor,
            nameColor: st.nameColor,
            titleColor: st.titleColor,
            nameFontId: st.nameFontId,
            titleFontId: st.titleFontId,
            sweep: st.sweep,
            group: groupOf(st.style),
          };
          set({
            customPresets: [...st.customPresets, card],
            favorited: [...st.favorited, card.id],
          });
          return card;
        },
        applySnapshot: (snap) => {
          const fam = normalizeFamily(snap.style);
          commit({
            projectName: snap.name,
            people: snap.people.map((p) => ({ ...p })),
            style: fam.style,
            layout: snap.layout,
            side: snap.side,
            orient: snap.orient ?? fam.orient ?? "horizontal",
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
            sweep: snap.sweep ?? true,
            // projects saved before the redesign used the outlined look
            textFx: snap.textFx ?? (isPremiumId(fam.style) ? "soft" : "outline"),
            activePersonId: snap.people[0]?.id ?? "",
            currentTime: snap.inDuration + 0.15,
            playing: false,
            workspace: "editor",
          });
          applyFont(snap.nameFontId);
          applyFont(snap.titleFontId);
        },
        openPresetBrowse: () => {
          const st = get();
          const slot = st.inDuration + st.holdDuration + st.outDuration;
          const idx = Math.max(0, st.people.findIndex((p) => p.id === st.activePersonId));
          const hold = (st.layout === "sequence" ? idx * slot : 0) + st.inDuration + 0.15;
          set({
            workspace: "presets",
            currentTime: st.currentTime < st.inDuration * 0.5 ? hold : st.currentTime,
            playing: false,
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
            playing: false,
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
            playing: false,
          });
        },
      };
    },
    {
      name: "nameplate-studio-v13",
      skipHydration: true,
      partialize: (s) => ({
        people: s.people,
        style: s.style,
        layout: s.layout,
        side: s.side,
        orient: s.orient,
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
        sweep: s.sweep,
        textFx: s.textFx,
        previewBg: s.previewBg,
        showSafe: s.showSafe,
        exportWidth: s.exportWidth,
        exportFps: s.exportFps,
        projectName: s.projectName,
        activePersonId: s.activePersonId,
        favorited: s.favorited,
        customPresets: s.customPresets,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StudioState>;
        const fam = normalizeFamily((p.style as string) ?? current.style);
        return {
          ...current,
          ...p,
          style: fam.style,
          orient: p.orient ?? fam.orient ?? "horizontal",
          animIn: p.animIn ?? "left",
          ease: p.ease ?? "smooth",
          sweep: p.sweep ?? true,
          // returning users keep the legacy outlined text on classic styles
          textFx: p.textFx ?? (p.style && !isPremiumId(p.style as string) ? "outline" : "soft"),
          // pre-v3 colour-variant card ids collapse onto their merged classic card
          favorited: migrateFavorites(p.favorited ?? ["classic-duo", "classic-hook", "classic-fold"]),
          customPresets: p.customPresets ?? [],
          selectedClip: null,
          past: [],
          future: [],
        };
      },
    },
  ),
);
