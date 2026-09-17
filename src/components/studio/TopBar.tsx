import { Check, Download, Pencil, Redo2, Save, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveProject, snapshotFromState } from "@/lib/nameplates/projects";
import { useStudio } from "@/lib/nameplates/store";
import { isNtscFps } from "@/lib/nameplates/types";

export function TopBar({ onExport }: { onExport: () => void }) {
  const projectName = useStudio((s) => s.projectName);
  const exportFps = useStudio((s) => s.exportFps);
  const exportWidth = useStudio((s) => s.exportWidth);
  const past = useStudio((s) => s.past);
  const future = useStudio((s) => s.future);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
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
        ease: st.ease,
      }),
      projectName: st.projectName,
    });
    toast.success("已保存到本机项目库");
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-rail px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground">
          T
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">人名条工坊</span>
            <span className="hidden rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              专业版
            </span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-1 md:flex">
        <input
          value={projectName}
          onChange={(e) => useStudio.getState().setProjectName(e.target.value)}
          className="h-7 max-w-48 truncate rounded-sm border border-transparent bg-transparent px-2 text-sm text-muted-foreground outline-none hover:border-border focus:border-input focus:text-foreground"
          aria-label="项目名称"
        />
        <Pencil className="size-3 text-muted-foreground" />
        <span className="ml-2 hidden items-center gap-1 text-[11px] text-muted-foreground lg:flex">
          <Check className="size-3 text-brand" />
          自动保存成功
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="撤销"
          disabled={!past.length}
          onClick={() => useStudio.getState().undo()}
        >
          <Undo2 />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="重做"
          disabled={!future.length}
          onClick={() => useStudio.getState().redo()}
        >
          <Redo2 />
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <span className="hidden h-7 items-center rounded-sm border border-border bg-secondary px-2 text-xs text-muted-foreground sm:flex">
          16:9
        </span>
        <select
          className="hidden h-7 w-[6.25rem] rounded-sm border border-border bg-secondary px-1 text-xs md:block"
          value={isNtscFps(exportFps) ? "29.97" : String(exportFps)}
          aria-label="帧率"
          onChange={(e) => {
            const v = e.target.value;
            useStudio.getState().setExportFps(v === "25" ? 25 : v === "30" ? 30 : 29.97);
          }}
        >
          <option value="29.97">29.97 FPS</option>
          <option value="25">25 FPS</option>
          <option value="30">30 FPS</option>
        </select>
        <span className="hidden text-xs text-muted-foreground lg:inline">
          {exportWidth === 1920 ? "透明 PNG" : "720p"}
        </span>
        <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={persist}>
          <Save />
          保存
        </Button>
        <Button size="sm" onClick={onExport}>
          <Download />
          导出视频
        </Button>
      </div>
    </header>
  );
}