import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Toaster } from "sonner";
import { ClipTransformBar } from "@/components/studio/ClipTransformBar";
import { GuestPanel } from "@/components/studio/GuestPanel";
import { Inspector } from "@/components/studio/Inspector";
import { LeftRail } from "@/components/studio/LeftRail";
import { PreviewStage } from "@/components/studio/PreviewStage";
import { ProjectView } from "@/components/studio/ProjectView";
import { TemplateGallery } from "@/components/studio/TemplateGallery";
import { Timeline } from "@/components/studio/Timeline";
import { TopBar } from "@/components/studio/TopBar";
import { loadNameplateFonts, restoreCustomFonts } from "@/lib/nameplates/fonts";
import { useStudio } from "@/lib/nameplates/store";
import { cn } from "@/lib/utils";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function StudioApp() {
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"left" | "inspector">("inspector");
  const [ExportDialog, setExportDialog] = useState<ComponentType<ExportDialogProps> | null>(null);
  const workspace = useStudio((s) => s.workspace);
  const editorNav = useStudio((s) => s.editorNav);
  const openExport = useCallback(() => setExportOpen(true), []);

  useEffect(() => {
    void Promise.resolve(useStudio.persist.rehydrate()).then(async () => {
      const restored = await restoreCustomFonts();
      if (restored.length) useStudio.getState().setCustomFonts(restored);
      const st = useStudio.getState();
      if (st.workspace === "presets") st.setWorkspace("editor");
      await loadNameplateFonts([st.nameFontId, st.titleFontId]);
      st.bumpFontEpoch();
    });
    void import("@/components/studio/ExportDialog").then((mod) => {
      setExportDialog(() => mod.ExportDialog);
    });
  }, []);

  const leftPanel = editorNav === "guests" ? <GuestPanel /> : <TemplateGallery />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar onExport={openExport} />
      {workspace === "projects" ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <LeftRail />
          <ProjectView />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <LeftRail />
          <aside className="hidden w-[18.5rem] shrink-0 border-r border-border bg-panel md:block 2xl:w-[25rem]">
            {leftPanel}
          </aside>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PreviewStage />
            <ClipTransformBar />
            <Timeline />
          </main>
          <aside className="scroll-quiet hidden w-[20rem] shrink-0 overflow-y-auto border-l border-border bg-panel md:block">
            <Inspector />
          </aside>
          {/* small screens: one panel below the stage */}
          <div className="flex max-h-[42%] min-h-0 flex-col border-t border-border bg-panel md:hidden">
            <div className="flex shrink-0 gap-1 border-b border-border p-1.5">
              {(
                [
                  ["left", editorNav === "guests" ? "嘉宾" : "模板"],
                  ["inspector", "属性"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMobileTab(id)}
                  className={cn(
                    "h-7 flex-1 rounded-md text-xs",
                    mobileTab === id ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{mobileTab === "left" ? leftPanel : <Inspector />}</div>
          </div>
        </div>
      )}
      {ExportDialog ? <ExportDialog open={exportOpen} onOpenChange={setExportOpen} /> : null}
      <Toaster theme="dark" position="bottom-right" richColors={false} />
    </div>
  );
}
