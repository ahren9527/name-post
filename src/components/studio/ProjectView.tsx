import { Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeFamily, STYLE_META } from "@/lib/nameplates/types";
import {
  deleteProject,
  downloadJson,
  listProjects,
  saveProject,
  type ProjectSnapshot,
  type SavedProject,
} from "@/lib/nameplates/projects";
import { drawFrame, renderConfigFromState } from "@/lib/nameplates/renderer";
import { currentSnapshot, useStudio } from "@/lib/nameplates/store";

/** Hold-frame render of a saved project, on the live photo backdrop. */
function ProjectThumb({ snap }: { snap: ProjectSnapshot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fontEpoch = useStudio((s) => s.fontEpoch);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const fam = normalizeFamily(snap.style);
    const first = snap.people.find((p) => p.name.trim());
    if (!first) {
      ctx.clearRect(0, 0, c.width, c.height);
      return;
    }
    const cfg = renderConfigFromState({
      ...snap,
      style: fam.style,
      orient: snap.orient ?? fam.orient ?? "horizontal",
      people: [first],
      layout: "sequence",
      sectionLabel: "",
      textFx: snap.textFx ?? "outline",
    });
    drawFrame(ctx, c.width, c.height, cfg.inDuration + 1.8, cfg);
  }, [snap, fontEpoch]);
  return <canvas ref={ref} width={640} height={360} className="absolute inset-0 size-full" aria-hidden />;
}

export function ProjectView() {
  const projectName = useStudio((s) => s.projectName);
  const [list, setList] = useState<SavedProject[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setList(listProjects());
  }

  useEffect(() => {
    refresh();
  }, []);

  function persistCurrent() {
    const st = useStudio.getState();
    const rec = saveProject({ ...currentSnapshot(), projectName: st.projectName });
    refresh();
    return rec;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">项目</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">保存在本机浏览器 · 可导出为 JSON 文件在其他电脑打开</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then((text) => {
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
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs ring-1 ring-border hover:bg-accent"
          >
            <Upload className="size-3.5" /> 导入
          </button>
          <button
            type="button"
            onClick={() => {
              const rec = persistCurrent();
              downloadJson(`${rec.name}.json`, rec);
              toast.success("已导出项目文件");
            }}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs ring-1 ring-border hover:bg-accent"
          >
            <Download className="size-3.5" /> 导出当前
          </button>
          <button
            type="button"
            onClick={() => {
              toast("新建将恢复默认名单与样式", {
                action: {
                  label: "新建",
                  onClick: () => {
                    useStudio.getState().restoreDefaults();
                    useStudio.getState().setWorkspace("editor");
                    toast.success("已新建项目");
                  },
                },
              });
            }}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:brightness-105"
          >
            <Plus className="size-3.5" /> 新建
          </button>
        </div>
      </div>
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              persistCurrent();
              toast.success("当前项目已保存");
            }}
            className="group text-left"
          >
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-live ring-2 ring-brand/70">
              <ProjectThumb snap={currentSnapshot()} />
              <span className="relative flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Save className="size-3.5" /> 保存当前
              </span>
            </div>
            <div className="mt-2 px-0.5">
              <div className="truncate text-[13px] font-medium">{projectName}</div>
              <div className="text-[11px] text-muted-foreground">正在编辑</div>
            </div>
          </button>
          {list.map((p) => (
            <div key={p.id} className="group">
              <button
                type="button"
                className="relative block aspect-video w-full overflow-hidden rounded-xl bg-live ring-1 ring-border transition-shadow hover:ring-white/25"
                onClick={() => {
                  useStudio.getState().applySnapshot(p.snapshot);
                  toast.success(`已打开「${p.name}」`);
                }}
              >
                <ProjectThumb snap={p.snapshot} />
              </button>
              <div className="mt-2 flex items-start gap-2 px-0.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {STYLE_META[normalizeFamily(p.snapshot.style).style]?.label ?? p.snapshot.style} · {p.snapshot.people.length} 人 ·{" "}
                    {new Date(p.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="删除项目"
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  onClick={() => {
                    deleteProject(p.id);
                    refresh();
                    toast.success("已删除");
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="mt-8 text-center text-xs text-faint">还没有保存的项目。⌘S 随时保存当前编辑。</p>
        ) : null}
      </div>
    </div>
  );
}
