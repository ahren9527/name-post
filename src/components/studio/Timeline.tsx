import {
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
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

  const tracks = [
    { id: "name", label: "姓名", color: "bg-track-name" },
    { id: "title", label: "职务", color: "bg-track-title" },
    { id: "slash", label: "装饰线条", color: "bg-track-deco" },
    { id: "band", label: "背景色带", color: "bg-track-band" },
  ];

  const tickCount = Math.max(4, Math.round((zoom >= 2 ? 12 : 7) * Math.min(dur / 8, 2)));
  const playPct = (currentTime / dur) * 100;

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-panel">
      <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
        <Button size="icon-sm" variant="ghost" aria-label="上一位移" onClick={() => skipPerson(-1)}>
          <SkipBack />
        </Button>
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label={playing ? "暂停" : "播放"}
          onClick={() => {
            const st = useStudio.getState();
            if (st.currentTime >= duration - 0.01) st.setCurrentTime(0);
            st.setPlaying(!st.playing);
          }}
        >
          {playing ? <Pause /> : <Play className="ml-px" />}
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="下一位移" onClick={() => skipPerson(1)}>
          <SkipForward />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="回到开头"
          onClick={() => {
            useStudio.getState().setCurrentTime(0);
            useStudio.getState().setPlaying(false);
          }}
        >
          <ChevronsLeft />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="跳到结尾"
          onClick={() => {
            useStudio.getState().setCurrentTime(duration);
            useStudio.getState().setPlaying(false);
          }}
        >
          <ChevronsRight />
        </Button>
        <Button
          size="icon-sm"
          variant={loop ? "secondary" : "ghost"}
          aria-label="循环播放"
          onClick={() => setLoop((v) => !v)}
        >
          <Repeat className={loop ? "text-brand" : ""} />
        </Button>
        <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground">
          {formatTimecode(currentTime)} / {formatTimecode(duration)}
        </span>
        <button
          type="button"
          onClick={() => setSnap((v) => !v)}
          className={cn(
            "ml-2 hidden h-6 rounded-sm px-2 text-[11px] sm:inline",
            snap ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          吸附 {snap ? "开" : "关"}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="缩小"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => clamp(z - 0.5, 1, 4))}
          >
            <ZoomOut />
          </Button>
          <span className="w-10 text-center font-mono text-[11px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="放大"
            disabled={zoom >= 4}
            onClick={() => setZoom((z) => clamp(z + 0.5, 1, 4))}
          >
            <ZoomIn />
          </Button>
        </div>
      </div>

      <div className="flex px-3 pb-3">
        <div className="w-16 shrink-0 pt-4">
          <div className="space-y-1">
            {tracks.map((tr) => (
              <div key={tr.id} className="flex h-7 items-center text-[11px] text-muted-foreground">
                {tr.label}
              </div>
            ))}
          </div>
        </div>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto select-none">
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
            <div className="relative mb-1 h-4">
              {Array.from({ length: tickCount }, (_, i) => {
                const t = (dur * i) / Math.max(tickCount - 1, 1);
                return (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                    style={{ left: `${(t / dur) * 100}%` }}
                  >
                    {formatTimecode(t)}
                  </span>
                );
              })}
            </div>

            <div className="space-y-1">
              {tracks.map((tr, ti) => (
                <div key={tr.id} data-clip-layer={tr.id} className="relative h-7 rounded-sm bg-muted">
                  {people.map((p, i) => {
                    const start = layout === "sequence" ? i * slot : 0;
                    const on = p.id === activePersonId;
                    const picked = selectedClip?.personId === p.id && selectedClip.layer === tr.id;
                    const left = (start / dur) * 100;
                    return (
                      <div
                        key={p.id + tr.id}
                        data-clip-layer={tr.id}
                        data-clip-person={p.id}
                        className={cn(
                          "absolute top-0.5 bottom-0.5 flex overflow-hidden rounded-sm",
                          picked
                            ? "opacity-100 ring-2 ring-brand"
                            : on
                              ? "opacity-100 ring-1 ring-foreground/30"
                              : "opacity-55",
                        )}
                        style={{ left: `${left}%`, width: `${(slot / dur) * 100}%` }}
                      >
                        <span className={cn("h-full", tr.color)} style={{ width: `${(inDuration / slot) * 100}%`, opacity: 0.65 }} />
                        <span className={cn("h-full", tr.color)} style={{ width: `${(holdDuration / slot) * 100}%` }} />
                        <span className={cn("h-full", tr.color)} style={{ width: `${(outDuration / slot) * 100}%`, opacity: 0.4 }} />
                        {ti === 0 ? (
                          <span className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-[10px] text-primary-foreground">
                            {p.name}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {hover != null && !dragging.current ? (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-foreground/35"
                style={{ left: `${(hover / dur) * 100}%` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-popover px-1.5 py-0.5 font-mono text-[10px] text-popover-foreground shadow-sm">
                  {formatTimecode(hover)}
                  {hoverPerson ? ` · ${hoverPerson.name}` : ""}
                </div>
              </div>
            ) : null}

            <div className="pointer-events-none absolute top-4 bottom-0 z-30" style={{ left: `${playPct}%` }}>
              <div className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1 rotate-45 bg-foreground" />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground" />
            </div>
          </div>
        </div>
      </div>
      <p className="px-3 pb-2 text-[10px] text-muted-foreground">
        单击片段打开变换条 · 拖动轨道擦洗 · 方向键逐帧 · 空格播放 · Esc 取消选中
      </p>
    </div>
  );
}
