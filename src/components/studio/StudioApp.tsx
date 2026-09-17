import { useEffect, useState, type ComponentType } from "react";
import { Toaster } from "sonner";
import { AnimPanel } from "@/components/studio/AnimPanel";
import { GuestPanel } from "@/components/studio/GuestPanel";
import { Inspector } from "@/components/studio/Inspector";
import { LeftRail } from "@/components/studio/LeftRail";
import { PresetView } from "@/components/studio/PresetView";
import { PreviewStage } from "@/components/studio/PreviewStage";
import { ProjectView } from "@/components/studio/ProjectView";
import { StylePanel } from "@/components/studio/StylePanel";
import { ClipTransformBar } from "@/components/studio/ClipTransformBar";
import { Timeline } from "@/components/studio/Timeline";
import { TopBar } from "@/components/studio/TopBar";
import { loadNameplateFonts, restoreCustomFonts } from "@/lib/nameplates/fonts";
import { useStudio } from "@/lib/nameplates/store";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function StudioApp() {
  const [exportOpen, setExportOpen] = useState(false);
  const [ExportDialog, setExportDialog] = useState<ComponentType<ExportDialogProps> | null>(
    null,
  );
  const workspace = useStudio((s) => s.workspace);
  const editorNav = useStudio((s) => s.editorNav);

  useEffect(() => {
    void Promise.resolve(useStudio.persist.rehydrate()).then(async () => {
      const restored = await restoreCustomFonts();
      if (restored.length) useStudio.getState().setCustomFonts(restored);
      const st = useStudio.getState();
      await loadNameplateFonts([st.nameFontId, st.titleFontId]);
      st.bumpFontEpoch();
    });
    void import("@/components/studio/ExportDialog").then((mod) => {
      setExportDialog(() => mod.ExportDialog);
    });
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar onExport={() => setExportOpen(true)} />
      {workspace === "projects" ? (
        <div className="flex min-h-0 flex-1">
          <LeftRail />
          <ProjectView />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <LeftRail />
          <aside
            className={
              workspace === "presets"
                ? "hidden w-80 shrink-0 overflow-y-auto border-r border-border bg-panel md:block"
                : "hidden w-[16.5rem] shrink-0 overflow-y-auto border-r border-border bg-panel md:block"
            }
          >
            {workspace === "presets" ? (
              <PresetView />
            ) : editorNav === "guests" ? (
              <GuestPanel />
            ) : editorNav === "anim" ? (
              <AnimPanel />
            ) : (
              <StylePanel />
            )}
          </aside>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PreviewStage />
            <ClipTransformBar />
            <Timeline />
          </main>
          <aside className="hidden w-[19rem] shrink-0 overflow-y-auto border-l border-border bg-panel md:block">
            <Inspector />
          </aside>
          <div className="max-h-[36%] overflow-y-auto border-t border-border bg-panel md:hidden">
            {workspace === "presets" ? (
              <PresetView />
            ) : editorNav === "guests" ? (
              <GuestPanel />
            ) : editorNav === "anim" ? (
              <AnimPanel />
            ) : (
              <Inspector />
            )}
          </div>
        </div>
      )}
      {ExportDialog ? <ExportDialog open={exportOpen} onOpenChange={setExportOpen} /> : null}
      <Toaster theme="dark" position="bottom-right" richColors={false} />
    </div>
  );
}