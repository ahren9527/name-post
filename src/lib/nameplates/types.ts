export const BASE_W = 1920;
export const BASE_H = 1080;

/** NTSC drop-frame: 30000/1001 ≈ 29.970 */
export const NTSC_FPS = 30000 / 1001;
export const NTSC_FRAME_DUR = 1001 / 30000;

export type NameplateStyle =
  | "ceremony"
  | "qinghua"
  | "news"
  | "card"
  | "pill"
  | "stack"
  | "rail"
  | "badge"
  | "underline"
  | "block"
  | "rule"
  | "split"
  | "skew"
  | "wave"
  | "bracket"
  | "duo"
  | "hook"
  | "ledge"
  | "fold";
export type LayoutMode = "stack" | "sequence";
export type Side = "left" | "right";
export type Orient = "horizontal" | "vertical";
export type TextAlign = "left" | "right" | "top";
export type PreviewBg = "checker" | "stage" | "live";
export type Workspace = "editor" | "presets" | "projects";
export type EditorNav = "style" | "guests" | "anim";
export type ExportFps = 25 | 30 | 29.97;
export type TitleLines = 1 | 2 | 3;
export type AnimIn = "none" | "fade" | "up" | "down" | "left" | "right" | "scale";
export type EaseKind = "smooth" | "linear" | "snap";

export type ClipLayer = "name" | "title" | "slash" | "band";

export const CLIP_LAYER_META: Record<ClipLayer, { label: string }> = {
  name: { label: "姓名" },
  title: { label: "职务" },
  slash: { label: "装饰" },
  band: { label: "色带" },
};

export interface LayerXform {
  x: number;
  y: number;
  rotation: number;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  titleLines?: TitleLines;
  xform?: Partial<Record<ClipLayer, LayerXform>>;
}

export interface RenderConfig {
  people: Person[];
  style: NameplateStyle;
  layout: LayoutMode;
  side: Side;
  orient: Orient;
  align: TextAlign;
  scale: number;
  textSize: number;
  titleSize: number;
  nameFont: string;
  titleFont: string;
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
}

export const STYLE_META: Record<
  NameplateStyle,
  { label: string; caption: string }
> = {
  ceremony: { label: "斜杠", caption: "斜切色块 · 四种构图" },
  qinghua: { label: "色带", caption: "职务斜切色带" },
  news: { label: "横条", caption: "职务横条衬底" },
  card: { label: "卡片", caption: "圆角底板 + 侧色条" },
  pill: { label: "胶囊", caption: "圆角胶囊包住姓名职务" },
  stack: { label: "双层", caption: "姓名条叠职务条" },
  rail: { label: "侧轨", caption: "竖色轨 + 横排文字" },
  badge: { label: "字标", caption: "首字色块 + 姓名职务" },
  underline: { label: "下划线", caption: "细线衬底 · 四种构图" },
  block: { label: "方块", caption: "色块方标 · 四种构图" },
  rule: { label: "竖线条", caption: "侧竖线 · 四种构图" },
  split: { label: "双栏", caption: "中线分隔 · 四种构图" },
  skew: { label: "斜切条", caption: "斜切色块 · 四种构图" },
  wave: { label: "光弧", caption: "渐变弧线 · 四种构图" },
  bracket: { label: "括号", caption: "L 形括号 · 四种构图" },
  duo: { label: "双斜杠", caption: "双斜杠端点 · 四种构图" },
  hook: { label: "勾线", caption: "侧斜勾线 · 四种构图" },
  ledge: { label: "侧勾", caption: "侧竖勾 · 四种构图" },
  fold: { label: "叠字", caption: "首尾叠字 · 四种构图" },
};

export function isColumnStyle(orient: Orient) {
  return orient === "vertical";
}

/** Old geometry ids → family + orient, so saved projects still open. */
export function normalizeFamily(style: string): { style: NameplateStyle; orient?: Orient } {
  switch (style) {
    case "lrail":
    case "vertical":
    case "vduo":
    case "vcut":
      return { style: "duo", orient: "vertical" };
    case "vbar":
      return { style: "split", orient: "vertical" };
    case "lintel":
      return { style: "hook", orient: "vertical" };
    case "vgap":
      return { style: "fold", orient: "vertical" };
    case "flag":
      return { style: "block", orient: "vertical" };
    case "vsplit":
      return { style: "underline", orient: "vertical" };
    case "cut":
      return { style: "fold", orient: "horizontal" };
    default:
      return { style: style as NameplateStyle };
  }
}

export const DEFAULT_PEOPLE: Person[] = [
  { id: "p1", name: "熊义志", title: "吕梁市委副书记、市长", titleLines: 1 },
  { id: "p2", name: "宋书玉", title: "中国酒业协会理事长", titleLines: 1 },
  { id: "p3", name: "武跃飞", title: "汾酒集团党委副书记、副董事长、总经理", titleLines: 2 },
  { id: "p4", name: "圣地亚哥·托莱多", title: "墨西哥驻华使馆贸易与投资参赞", titleLines: 1 },
];

export const DEFAULT_CONFIG: Omit<RenderConfig, "people"> = {
  style: "duo",
  layout: "sequence",
  side: "left",
  orient: "horizontal",
  align: "left",
  scale: 1,
  textSize: 1,
  titleSize: 1,
  nameFont: '"Noto Serif SC", "Songti SC", "STSong", "WenQuanYi Zen Hei", serif',
  titleFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif',
  nameColor: "#f7f7f7",
  titleColor: "#e8e8e8",
  accentColor: "#e8b423",
  bandColor: "rgba(12,10,6,0.5)",
  sectionLabel: "",
  inDuration: 0.7,
  holdDuration: 4.2,
  outDuration: 0.55,
  stagger: 0.16,
  animIn: "left",
  ease: "smooth",
};

export function totalDuration(cfg: RenderConfig): number {
  const n = Math.max(cfg.people.length, 1);
  if (cfg.layout === "sequence") {
    return n * (cfg.inDuration + cfg.holdDuration + cfg.outDuration);
  }
  return (
    cfg.inDuration +
    cfg.stagger * Math.max(n - 1, 0) +
    cfg.holdDuration +
    cfg.outDuration
  );
}

export function personSlotDuration(cfg: RenderConfig): number {
  return cfg.inDuration + cfg.holdDuration + cfg.outDuration;
}

export function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const whole = Math.floor(rest);
  const tenth = Math.floor((rest - whole) * 10);
  return `${m}:${String(whole).padStart(2, "0")}.${tenth}`;
}

export function isNtscFps(fps: number): boolean {
  return Math.abs(fps - 29.97) < 0.05;
}

export function frameTiming(fps: number): { rate: number; dur: number } {
  if (isNtscFps(fps)) return { rate: NTSC_FPS, dur: NTSC_FRAME_DUR };
  return { rate: fps, dur: 1 / fps };
}
