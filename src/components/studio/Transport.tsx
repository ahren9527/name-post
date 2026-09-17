import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { renderConfigFromState } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import { formatTimecode, totalDuration } from "@/lib/nameplates/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function Transport() {
  const playing = useStudio((s) => s.playing);
  const currentTime = useStudio((s) => s.currentTime);
  const people = useStudio((s) => s.people);
  const style = useStudio((s) => s.style);
  const layout = useStudio((s) => s.layout);
  const side = useStudio((s) => s.side);
  const align = useStudio((s) => s.align);
  const scale = useStudio((s) => s.scale);
  const textSize = useStudio((s) => s.textSize);
  const titleSize = useStudio((s) => s.titleSize);
  const sectionLabel = useStudio((s) => s.sectionLabel);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setCurrentTime = useStudio((s) => s.setCurrentTime);

  const cfg = {
    people,
    style,
    layout,
    side,
    align,
    scale,
    textSize,
    titleSize,
    sectionLabel,
    inDuration,
    holdDuration,
    outDuration,
    stagger,
  };
  const duration = totalDuration(renderConfigFromState(cfg));
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      lastRef.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const last = lastRef.current ?? now;
      const dt = Math.min(0.05, (now - last) / 1000);
      lastRef.current = now;
      const st = useStudio.getState();
      const dur = totalDuration(renderConfigFromState(st));
      const next = st.currentTime + dt;
      if (next >= dur) {
        st.setCurrentTime(dur);
        st.setPlaying(false);
        return;
      }
      st.setCurrentTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        const st = useStudio.getState();
        if (st.currentTime >= totalDuration(renderConfigFromState(st))) {
          st.setCurrentTime(0);
          st.setPlaying(true);
        } else {
          st.setPlaying(!st.playing);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex items-center gap-3 border-t border-border bg-card/80 px-4 py-3">
      <Button
        size="icon-sm"
        variant="secondary"
        aria-label={playing ? "暂停" : "播放"}
        onClick={() => {
          if (currentTime >= duration - 0.01) setCurrentTime(0);
          setPlaying(!playing);
        }}
      >
        {playing ? <Pause /> : <Play className="ml-px" />}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="重播"
        onClick={() => {
          setCurrentTime(0);
          setPlaying(true);
        }}
      >
        <RotateCcw />
      </Button>
      <Slider
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.05}
        value={[Math.min(currentTime, duration)]}
        onValueChange={([v]) => {
          setPlaying(false);
          setCurrentTime(v ?? 0);
        }}
        className="flex-1"
        aria-label="时间轴"
      />
      <span className="w-24 text-right font-sans text-xs tabular-nums text-muted-foreground">
        {formatTimecode(currentTime)} / {formatTimecode(duration)}
      </span>
    </div>
  );
}
