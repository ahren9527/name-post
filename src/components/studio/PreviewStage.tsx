import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { FONT_SANS, FONT_SERIF, loadNameplateFonts, loadTextGlyphs, resolveFontStack } from "@/lib/nameplates/fonts";
import { drawFrame, renderConfigFromState } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import type { PreviewBg } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

const PREVIEW_W = 1920;
const PREVIEW_H = 1080;

const BGS: { id: PreviewBg; label: string; swatch: string }[] = [
  { id: "checker", label: "透明", swatch: "bg-checker" },
  { id: "stage", label: "暗场", swatch: "bg-stage" },
  { id: "light", label: "亮场", swatch: "bg-light" },
  { id: "live", label: "现场", swatch: "bg-live" },
];

export function PreviewStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewBg = useStudio((s) => s.previewBg);
  const showSafe = useStudio((s) => s.showSafe);
  // every field that changes the picture
  const snapshot = useStudio(
    useShallow((s) => [
    s.currentTime,
    s.people,
    s.style,
    s.layout,
    s.side,
    s.orient,
    s.align,
    s.scale,
    s.textSize,
    s.titleSize,
    s.nameFontId,
    s.titleFontId,
    s.fontEpoch,
    s.nameColor,
    s.titleColor,
    s.accentColor,
    s.bandColor,
    s.inDuration,
    s.holdDuration,
    s.outDuration,
    s.stagger,
    s.animIn,
    s.ease,
    s.sweep,
    s.textFx,
    s.backing,
  ]),
  );
  const people = useStudio((s) => s.people);
  const nameFontId = useStudio((s) => s.nameFontId);
  const titleFontId = useStudio((s) => s.titleFontId);

  useEffect(() => {
    let cancelled = false;
    void loadNameplateFonts([useStudio.getState().nameFontId, useStudio.getState().titleFontId]).then(() => {
      if (!cancelled) useStudio.getState().bumpFontEpoch();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch the exact CJK glyphs in use so the first frames are not a fallback face
  useEffect(() => {
    const texts = people.flatMap((p) => [p.name, p.title, p.tag ?? ""]);
    const stacks = [resolveFontStack(nameFontId, "name"), resolveFontStack(titleFontId, "title"), FONT_SERIF, FONT_SANS];
    let cancelled = false;
    void loadTextGlyphs(texts, stacks).then((loaded) => {
      if (loaded && !cancelled) useStudio.getState().bumpFontEpoch();
    });
    return () => {
      cancelled = true;
    };
  }, [people, nameFontId, titleFontId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    const st = useStudio.getState();
    drawFrame(ctx, canvas.width, canvas.height, st.currentTime, renderConfigFromState(st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, snapshot);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
        <div className="flex items-center gap-1 rounded-md bg-black/30 p-0.5 ring-1 ring-hairline" role="radiogroup" aria-label="预览背景">
          {BGS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={previewBg === b.id}
              onClick={() => useStudio.getState().setPreviewBg(b.id)}
              className={cn(
                "flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-[11px] transition-colors",
                previewBg === b.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("size-3 rounded-[3px] ring-1 ring-white/15", b.swatch)} />
              {b.label}
            </button>
          ))}
        </div>
        <span className="hidden font-mono text-[11px] text-faint lg:inline">16:9 · 1920×1080 · 透明通道</span>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground select-none">
          <span>安全框</span>
          <button
            type="button"
            role="switch"
            aria-checked={showSafe}
            aria-label="显示安全框"
            onClick={() => useStudio.getState().setShowSafe(!showSafe)}
            className={cn("relative h-4 w-7 rounded-full transition-colors", showSafe ? "bg-brand" : "bg-white/15")}
          >
            <span className={cn("absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform", showSafe && "translate-x-3")} />
          </button>
        </label>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,#17181b_0%,#0d0e10_70%)] p-4 [container-type:size] md:p-6">
        <div
          className={cn(
            "relative overflow-hidden rounded-[10px] shadow-[0_0_0_1px_rgb(255_255_255/0.07),0_30px_80px_rgb(0_0_0/0.55)]",
            previewBg === "checker"
              ? "bg-checker"
              : previewBg === "live"
                ? "bg-live"
                : previewBg === "light"
                  ? "bg-light"
                  : "bg-stage",
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
            <>
              <div className="pointer-events-none absolute inset-[5%] rounded-[2px] border border-white/15" aria-hidden />
              <div className="pointer-events-none absolute inset-[10%] rounded-[2px] border border-dashed border-brand/35" aria-hidden />
              <span className="pointer-events-none absolute top-[10%] left-[10%] -translate-y-full pb-0.5 font-mono text-[9px] tracking-wider text-brand/60" aria-hidden>
                TITLE SAFE 80%
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
