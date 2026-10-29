import {
  Layers,
  Magnet,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { renderConfigFromState } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import { formatTimecode, NTSC_FPS, totalDuration } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

function fpsOf() {
  const f = useStudio.getState().exportFps;
  return Math.abs(f - 29.97) < 0.05 ? NTSC_FPS : f;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function usePlayback(loop: boolean) {
  const playing = useStudio((s) => s.playing);
  const people = useStudio((s) => s.people);
  const layout = useStudio((s) => s.layout);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);
  const duration = totalDuration(renderConfigFromState(useStudio.getState()));
  const lastRef = useRef<number | null>(null);
  const loopRef = useRef(loop);
  loopRef.current = loop;

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
      let next = st.currentTime + dt;
      if (next >= dur) {
        if (loopRef.current && dur > 0.05) {
          next = next % dur;
          st.setCurrentTime(next);
        } else {
          st.setCurrentTime(dur);
          st.setPlaying(false);
          return;
        }
      } else {
        st.setCurrentTime(next);
      }
      if (st.layout === "sequence" && st.people.length) {
        const slot = st.inDuration + st.holdDuration + st.outDuration;
        const i = Math.min(st.people.length - 1, Math.max(0, Math.floor(next / slot)));
        const id = st.people[i]?.id;
        if (id && id !== st.activePersonId) st.setActivePersonId(id);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, people, layout, inDuration, holdDuration, outDuration, stagger]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = useStudio.getState();
      const dur = totalDuration(renderConfigFromState(st));
      const fps = fpsOf();
      const frame = 1 / fps;
      if (e.code === "Space") {
        e.preventDefault();
        if (st.currentTime >= dur) {
          st.setCurrentTime(0);
          st.setPlaying(true);
        } else st.setPlaying(!st.playing);
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "Comma") {
        e.preventDefault();
        st.setPlaying(false);
        st.setCurrentTime(clamp(st.currentTime - (e.shiftKey ? 1 : frame), 0, dur));
      }
      if (e.code === "ArrowRight" || e.code === "Period") {
        e.preventDefault();
        st.setPlaying(false);
        st.setCurrentTime(clamp(st.currentTime + (e.shiftKey ? 1 : frame), 0, dur));
      }
      if (e.code === "Home") {
        e.preventDefault();
        st.setCurrentTime(0);
        st.setPlaying(false);
      }
      if (e.code === "End") {
        e.preventDefault();
        st.setCurrentTime(dur);
        st.setPlaying(false);
      }
      if (e.key === "j" || e.key === "J") {
        st.setPlaying(false);
        st.setCurrentTime(clamp(st.currentTime - 1, 0, dur));
      }
      if (e.key === "l" || e.key === "L") {
        st.setPlaying(false);
        st.setCurrentTime(clamp(st.currentTime + 1, 0, dur));
      }
      if (e.key === "k" || e.key === "K") st.setPlaying(!st.playing);
      if (e.key === "Escape") st.clearClip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return duration;
}

function snapPoints(count: number, slot: number, inn: number, hold: number) {
  const pts: number[] = [0];
  for (let i = 0; i < count; i++) {
    const s = i * slot;
    pts.push(s, s + inn, s + inn + hold, s + slot);
  }
  return pts;
}

function snapTime(t: number, pts: number[], thresh: number, enabled: boolean) {
  if (!enabled) return t;
  let best = t;
  let dist = thresh;
  for (const p of pts) {
    const d = Math.abs(p - t);
    if (d < dist) {
      dist = d;
      best = p;
    }
  }
  return best;
}

export function Timeline() {
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const duration = usePlayback(loop);
  const currentTime = useStudio((s) => s.currentTime);
  const playing = useStudio((s) => s.playing);
  const people = useStudio((s) => s.people);
  const activePersonId = useStudio((s) => s.activePersonId);
  const selectedClip = useStudio((s) => s.selectedClip);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const layout = useStudio((s) => s.layout);
  const stagger = useStudio((s) => s.stagger);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const slot = inDuration + holdDuration + outDuration;
  const dur = Math.max(duration, 0.1);
  const pts = snapPoints(people.length, slot, inDuration, holdDuration);

  function timeFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const r = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return r * dur;
  }

  function applySeek(t: number, altKey: boolean) {
    const pxPerSec = (trackRef.current?.getBoundingClientRect().width ?? 400) / dur;
    const thresh = 10 / Math.max(pxPerSec, 1);
    const snapped = snapTime(clamp(t, 0, dur), pts, thresh, snap && !altKey);
    const st = useStudio.getState();
    st.setCurrentTime(snapped);
    if (st.layout === "sequence" && st.people.length) {
      const i = Math.min(st.people.length - 1, Math.max(0, Math.floor(snapped / slot)));
      const id = st.people[i]?.id;
      if (id && id !== st.activePersonId) st.setActivePersonId(id);
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = false;
    useStudio.getState().setPlaying(false);
    applySeek(timeFromClientX(e.clientX), e.altKey);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const t = timeFromClientX(e.clientX);
    setHover(t);
    if (!dragging.current) return;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) moved.current = true;
    applySeek(t, e.altKey);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const wasDrag = moved.current;
    dragging.current = false;
    moved.current = false;
    if (wasDrag) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-clip-layer]");
    const layer = hit?.getAttribute("data-clip-layer") as "name" | "title" | "slash" | "band" | null;
    const pid = hit?.getAttribute("data-clip-person");
    if (layer && pid) {
      useStudio.getState().selectClip(pid, layer);
      const p = useStudio.getState().people.find((x) => x.id === pid);
      if (p) useStudio.getState().focusPerson(p.id);
      return;
    }
    useStudio.getState().clearClip();
  }

  function skipPerson(dir: -1 | 1) {
    const st = useStudio.getState();
    if (!st.people.length) return;
    const i = Math.max(0, st.people.findIndex((p) => p.id === st.activePersonId));
    const n = clamp(i + dir, 0, st.people.length - 1);
    const p = st.people[n];
    if (p) st.focusPerson(p.id);
  }

  useEffect(() => {
    if (dragging.current || !playing) return;
    const scroller = scrollRef.current;
    const inner = trackRef.current;
    if (!scroller || !inner || zoom <= 1) return;
    const x = (currentTime / dur) * inner.scrollWidth;
    const view = scroller.clientWidth;
    if (x < scroller.scrollLeft + 48 || x > scroller.scrollLeft + view - 48) {
      scroller.scrollLeft = x - view * 0.4;
    }
  }, [currentTime, playing, zoom, dur]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const inner = trackRef.current;
    if (!scroller || !inner) return;
    const x = (currentTime / dur) * inner.scrollWidth;
    scroller.scrollLeft = Math.max(0, x - scroller.clientWidth * 0.4);
  }, [zoom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clamp(z + (e.deltaY > 0 ? -0.25 : 0.25), 1, 4));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const hoverPerson =
    hover == null
      ? null
      : layout === "sequence"
        ? people[clamp(Math.floor(hover / slot), 0, Math.max(people.length - 1, 0))]
        : people.find((p) => p.id === activePersonId);

  const layerTracks = [
    { id: "name", label: "姓名", color: "bg-track-name" },
    { id: "title", label: "职务", color: "bg-track-title" },
    { id: "slash", label: "装饰", color: "bg-track-deco" },
    { id: "band", label: "底板", color: "bg-track-band" },
  ];

  const tickCount = Math.max(4, Math.round(6 * zoom) + 1);
  const playPct = (currentTime / dur) * 100;
  const activeIdx = Math.max(0, people.findIndex((p) => p.id === activePersonId));
  const active = people[activeIdx];

  const iconBtn =
    "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30";

  const segment = (p: (typeof people)[number], i: number, color: string, layer: string, label?: boolean) => {
    const stg = stagger;
    const start = layout === "sequence" ? i * slot : i * stg;
    // simultaneous: everyone leaves together at the end
    const len = layout === "sequence" ? slot : dur - start;
    const hold = Math.max(0, len - inDuration - outDuration);
    const on = p.id === activePersonId;
    const picked = selectedClip?.personId === p.id && selectedClip.layer === layer;
    return (
      <div
        key={p.id + layer}
        data-clip-layer={layer || undefined}
        data-clip-person={layer ? p.id : undefined}
        className={cn(
          "absolute top-1 bottom-1 flex overflow-hidden rounded-[5px] transition-opacity",
          picked ? "opacity-100 ring-2 ring-brand" : on ? "opacity-100 ring-1 ring-white/35" : "opacity-50 hover:opacity-75",
        )}
        style={{ left: `${(start / dur) * 100}%`, width: `${(len / dur) * 100}%` }}
      >
        <span className={cn("h-full", color)} style={{ width: `${(inDuration / len) * 100}%`, opacity: 0.55 }} />
        <span className={cn("h-full", color)} style={{ width: `${(hold / len) * 100}%`, opacity: 0.9 }} />
        <span className={cn("h-full", color)} style={{ width: `${(outDuration / len) * 100}%`, opacity: 0.4 }} />
        {label ? (
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center gap-1.5 truncate text-[11px] font-medium text-[#1b160c]">
            <span className="font-mono text-[9px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
            {p.name}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-panel">
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 md:px-4">
        <button type="button" className={iconBtn} aria-label="上一位" title="上一位" onClick={() => skipPerson(-1)}>
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          aria-label={playing ? "暂停" : "播放"}
          title="播放 / 暂停（空格）"
          onClick={() => {
            const st = useStudio.getState();
            if (st.currentTime >= duration - 0.01) st.setCurrentTime(0);
            st.setPlaying(!st.playing);
          }}
          className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
        <button type="button" className={iconBtn} aria-label="下一位" title="下一位" onClick={() => skipPerson(1)}>
          <SkipForward className="size-4" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, loop && "bg-accent text-brand")}
          aria-label="循环播放"
          title="循环播放"
          onClick={() => setLoop((v) => !v)}
        >
          <Repeat className="size-4" />
        </button>
        <span className="ml-2 font-mono text-[13px] tabular-nums text-foreground">{formatTimecode(currentTime)}</span>
        <span className="font-mono text-[11px] tabular-nums text-faint">/ {formatTimecode(duration)}</span>
        {active ? (
          <span className="ml-3 hidden max-w-48 truncate rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-hairline sm:inline">
            <span className="mr-1.5 font-mono text-[10px] text-brand">{String(activeIdx + 1).padStart(2, "0")}</span>
            {active.name}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className={cn(iconBtn, showLayers && "bg-accent text-foreground")}
            aria-label="分图层"
            title="展开图层轨道（单击片段微调位置）"
            onClick={() => setShowLayers((v) => !v)}
          >
            <Layers className="size-4" />
          </button>
          <button
            type="button"
            className={cn(iconBtn, snap && "text-foreground")}
            aria-label="吸附"
            title={snap ? "吸附：开" : "吸附：关"}
            onClick={() => setSnap((v) => !v)}
          >
            <Magnet className={cn("size-4", !snap && "opacity-50")} />
          </button>
          <span className="mx-1 h-4 w-px bg-border" />
          <button type="button" className={iconBtn} aria-label="缩小" disabled={zoom <= 1} onClick={() => setZoom((z) => clamp(z - 0.5, 1, 4))}>
            <ZoomOut className="size-4" />
          </button>
          <span className="w-9 text-center font-mono text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button type="button" className={iconBtn} aria-label="放大" disabled={zoom >= 4} onClick={() => setZoom((z) => clamp(z + 0.5, 1, 4))}>
            <ZoomIn className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex px-3 pb-3 md:px-4">
        <div className="w-14 shrink-0 pt-5">
          <div className="flex h-9 items-center text-[11px] text-muted-foreground">人名条</div>
          {showLayers
            ? layerTracks.map((tr) => (
                <div key={tr.id} className="flex h-6 items-center text-[10.5px] text-faint">
                  {tr.label}
                </div>
              ))
            : null}
        </div>
        <div ref={scrollRef} className="scroll-quiet min-w-0 flex-1 overflow-x-auto select-none">
          <div
            ref={trackRef}
            className="relative cursor-ew-resize touch-none"
            style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragging.current = false;
              moved.current = false;
            }}
            onPointerLeave={() => {
              if (!dragging.current) setHover(null);
            }}
            onDoubleClick={() => useStudio.getState().setPlaying(true)}
          >
            <div className="relative mb-1 h-4 border-b border-hairline">
              {Array.from({ length: tickCount }, (_, i) => {
                const t = (dur * i) / Math.max(tickCount - 1, 1);
                return (
                  <span
                    key={i}
                    className={cn(
                      "absolute font-mono text-[9.5px] text-faint",
                      i === 0 ? "" : i === tickCount - 1 ? "-translate-x-full" : "-translate-x-1/2",
                    )}
                    style={{ left: `${(t / dur) * 100}%` }}
                  >
                    {formatTimecode(t)}
                  </span>
                );
              })}
            </div>

            <div className="relative h-9 rounded-md bg-black/25 ring-1 ring-hairline">
              {layout === "sequence" ? (
                people.map((p, i) => segment(p, i, "bg-track-name", "", true))
              ) : (
                <div className="absolute inset-1 flex items-center overflow-hidden rounded-[5px] bg-track-name/85 px-2 text-[11px] font-medium text-[#1b160c]">
                  同屏 · {people.length} 人（错开 {stagger.toFixed(2)}s）
                </div>
              )}
            </div>
            {showLayers ? (
              <div className="mt-1 space-y-0.5">
                {layerTracks.map((tr) => (
                  <div key={tr.id} data-clip-layer={tr.id} className="relative h-[22px] rounded bg-black/20">
                    {people.map((p, i) => segment(p, i, tr.color, tr.id))}
                  </div>
                ))}
              </div>
            ) : null}

            {hover != null && !dragging.current ? (
              <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-white/25" style={{ left: `${(hover / dur) * 100}%` }}>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded bg-popover px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-popover-foreground shadow ring-1 ring-border">
                  {formatTimecode(hover)}
                  {hoverPerson ? ` · ${hoverPerson.name}` : ""}
                </div>
              </div>
            ) : null}

            <div className="pointer-events-none absolute top-3 bottom-0 z-30" style={{ left: `${playPct}%` }}>
              <div className="absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-[2px] bg-brand shadow" />
              <div className="absolute top-1 bottom-0 left-1/2 w-px -translate-x-1/2 bg-brand" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
