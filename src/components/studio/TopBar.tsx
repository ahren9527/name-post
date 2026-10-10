import { Download, Redo2, Save, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { persistProject } from "@/lib/nameplates/persist";
import { useStudio } from "@/lib/nameplates/store";
import { isNtscFps } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

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
        persistProject();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        onExport();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExport]);

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-3 border-b border-border bg-rail px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex size-7 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#ecd39b] to-[#b8893e] shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_2px_6px_rgb(0_0_0/0.4)]"
          aria-hidden
        >
          <span className="block h-3 w-3.5 rounded-[2px] border-l-[3px] border-[#1b160c] bg-[#1b160c]/20" />
        </span>
        <span className="hidden text-[13px] font-semibold tracking-wide sm:inline">人名条工坊</span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <input
          value={projectName}
          onChange={(e) => useStudio.getState().setProjectName(e.target.value)}
          className="h-7 w-40 min-w-0 truncate rounded-md bg-transparent px-2 text-[13px] text-muted-foreground outline-none hover:bg-white/[0.04] focus:bg-black/30 focus:text-foreground focus:ring-1 focus:ring-input"
          aria-label="项目名称"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <IconBtn label="撤销 (⌘Z)" disabled={!past.length} onClick={() => useStudio.getState().undo()}>
          <Undo2 className="size-4" />
        </IconBtn>
        <IconBtn label="重做 (⇧⌘Z)" disabled={!future.length} onClick={() => useStudio.getState().redo()}>
          <Redo2 className="size-4" />
        </IconBtn>
        <span className="mx-2 hidden h-5 w-px bg-border md:block" />
        <div className="hidden items-center gap-1 rounded-md bg-black/30 px-1 py-0.5 ring-1 ring-hairline md:flex">
          <span className="px-1.5 font-mono text-[11px] text-muted-foreground">
            {exportWidth === 1920 ? "1080p" : "720p"}
          </span>
          <select
            className="h-6 rounded bg-transparent pr-1 font-mono text-[11px] text-muted-foreground outline-none hover:text-foreground"
            value={isNtscFps(exportFps) ? "29.97" : String(exportFps)}
            aria-label="帧率"
            onChange={(e) => {
              const v = e.target.value;
              useStudio.getState().setExportFps(v === "25" ? 25 : v === "30" ? 30 : 29.97);
            }}
          >
            <option value="29.97">29.97 fps</option>
            <option value="25">25 fps</option>
            <option value="30">30 fps</option>
          </select>
        </div>
        <button
          type="button"
          onClick={persistProject}
          className="ml-1 hidden h-8 items-center gap-1.5 rounded-md px-3 text-xs text-foreground/85 ring-1 ring-border transition-colors hover:bg-accent sm:flex"
        >
          <Save className="size-3.5" />
          保存
        </button>
        <button
          type="button"
          onClick={onExport}
          title="导出 (⌘E)"
          className={cn(
            "ml-1 flex h-8 items-center gap-1.5 rounded-md bg-brand px-3.5 text-xs font-semibold text-brand-foreground",
            "shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_4px_14px_rgb(217_181_108/0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.97]",
          )}
        >
          <Download className="size-3.5" strokeWidth={2.25} />
          导出
        </button>
      </div>
    </header>
  );
}
