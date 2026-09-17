import { FolderOpen, Plus, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteProject,
  downloadJson,
  listProjects,
  saveProject,
  snapshotFromState,
  type SavedProject,
} from "@/lib/nameplates/projects";
import { useStudio } from "@/lib/nameplates/store";

export function ProjectView() {
  const projectName = useStudio((s) => s.projectName);
  const favorited = useStudio((s) => s.favorited);
  const [list, setList] = useState<SavedProject[]>([]);
  const [filterFav, setFilterFav] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setList(listProjects());
  }

  useEffect(() => {
    refresh();
  }, []);

  function persistCurrent() {
    const st = useStudio.getState();
    const rec = saveProject({ ...snapshotFromState({
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
      ease: st.ease,
    }), projectName: st.projectName });
    refresh();
    return rec;
  }

  const shown = filterFav ? list.filter((p) => favorited.includes(p.id)) : list;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">最近项目</h2>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setFilterFav(false)}
        >
          全部
        </button>
        <button
          type="button"
          aria-label="只看收藏"
          onClick={() => setFilterFav((v) => !v)}
        >
          <Star className={filterFav ? "size-3.5 fill-brand text-brand" : "size-3.5 text-muted-foreground"} />
        </button>
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
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            导入项目
          </Button>
          <Button
            size="sm"
            onClick={() => {
              toast("新建将恢复默认名单", {
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
          >
            <Plus />
            新建项目
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              persistCurrent();
              useStudio.getState().setWorkspace("editor");
              toast.success("当前项目已保存");
            }}
            className="overflow-hidden rounded-lg border border-brand text-left"
          >
            <div className="flex h-28 items-center justify-center bg-live text-xs text-background/80">
              点击保存
            </div>
            <div className="px-2 py-2">
              <div className="truncate text-xs">{projectName}</div>
              <div className="text-[10px] text-muted-foreground">当前项目 · 点此保存</div>
            </div>
          </button>
          {shown.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border hover:border-brand/40">
              <button
                type="button"
                className="block h-28 w-full bg-stage"
                onClick={() => {
                  useStudio.getState().applySnapshot(p.snapshot);
                  toast.success(`已打开「${p.name}」`);
                }}
              />
              <div className="flex items-start justify-between gap-1 px-2 py-2">
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => useStudio.getState().applySnapshot(p.snapshot)}
                >
                  <div className="truncate text-xs">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="删除项目"
                  onClick={() => {
                    deleteProject(p.id);
                    refresh();
                    toast.success("已删除");
                  }}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const rec = persistCurrent();
              downloadJson(`${rec.name}.json`, rec);
              toast.success("已导出项目文件");
            }}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground"
          >
            <FolderOpen className="size-6" />
            导出当前项目
          </button>
        </div>
      </div>
    </div>
  );
}