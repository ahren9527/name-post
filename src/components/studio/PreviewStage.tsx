import { useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { loadNameplateFonts } from "@/lib/nameplates/fonts";
import { drawFrame, renderConfigFromState } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import { cn } from "@/lib/utils";

const PREVIEW_W = 1280;
const PREVIEW_H = 720;

export function PreviewStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentTime = useStudio((s) => s.currentTime);
  const previewBg = useStudio((s) => s.previewBg);
  const showSafe = useStudio((s) => s.showSafe);
  const people = useStudio((s) => s.people);
  const style = useStudio((s) => s.style);
  const layout = useStudio((s) => s.layout);
  const side = useStudio((s) => s.side);
  const align = useStudio((s) => s.align);
  const scale = useStudio((s) => s.scale);
  const textSize = useStudio((s) => s.textSize);
  const titleSize = useStudio((s) => s.titleSize);
  const nameFontId = useStudio((s) => s.nameFontId);
  const titleFontId = useStudio((s) => s.titleFontId);
  const fontEpoch = useStudio((s) => s.fontEpoch);
  const nameColor = useStudio((s) => s.nameColor);
  const titleColor = useStudio((s) => s.titleColor);
  const accentColor = useStudio((s) => s.accentColor);
  const bandColor = useStudio((s) => s.bandColor);
  const sectionLabel = useStudio((s) => s.sectionLabel);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);
  const animIn = useStudio((s) => s.animIn);
  const ease = useStudio((s) => s.ease);

  useEffect(() => {
    let cancelled = false;
    void loadNameplateFonts([
      useStudio.getState().nameFontId,
      useStudio.getState().titleFontId,
    ]).then(() => {
      if (cancelled) return;
      useStudio.getState().bumpFontEpoch();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    drawFrame(ctx, canvas.width, canvas.height, currentTime, renderConfigFromState(useStudio.getState()));
  }, [
    currentTime,
    people,
    style,
    layout,
    side,
    align,
    scale,
    textSize,
    titleSize,
    nameFontId,
    titleFontId,
    fontEpoch,
    nameColor,
    titleColor,
    accentColor,
    bandColor,
    sectionLabel,
    inDuration,
    holdDuration,
    outDuration,
    stagger,
    animIn,
    ease,
  ]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="text-xs text-muted-foreground">预览模式</span>
        {(
          [
            ["checker", "透明"],
            ["stage", "暗场"],
            ["live", "现场"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => useStudio.getState().setPreviewBg(key)}
            className={cn(
              "h-6 rounded-sm px-2 text-xs",
              previewBg === key ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          安全框
          <Switch
            checked={showSafe}
            onCheckedChange={(v) => useStudio.getState().setShowSafe(v)}
            aria-label="显示安全框"
          />
        </label>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 [container-type:size]">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_24px_64px_rgb(0_0_0/0.45)]",
            previewBg === "checker" ? "bg-checker" : previewBg === "live" ? "bg-live" : "bg-stage",
          )}
          style={{
            width: "min(100cqw, calc(100cqh * 16 / 9))",
            height: "min(100cqh, calc(100cqw * 9 / 16))",
          }}
        >
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            className="absolute inset-0 size-full"
            aria-label="16:9 人名条预览"
          />
          {showSafe ? (
            <div
              className="pointer-events-none absolute inset-[8%] border border-dashed border-white/25"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}