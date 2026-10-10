import { useEffect, useRef } from "react";
import type { StyleCard } from "@/lib/nameplates/presets";
import { supportsVertical } from "@/lib/nameplates/premium/spec";
import { drawFrame, renderConfigFromState } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import type { Person } from "@/lib/nameplates/types";

const SRC_W = 960;
const SRC_H = 540;
let scratch: HTMLCanvasElement | null = null;
let photo: HTMLImageElement | null = null;
let photoReady = false;
const photoWaiters = new Set<() => void>();

function scratchCanvas() {
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratch.width = SRC_W;
    scratch.height = SRC_H;
  }
  return scratch;
}

function ensurePhoto(onReady: () => void) {
  if (photoReady) return;
  photoWaiters.add(onReady);
  if (photo) return;
  photo = new Image();
  photo.src = "/bg/live-interview.jpg";
  photo.onload = () => {
    photoReady = true;
    photoWaiters.forEach((f) => f());
    photoWaiters.clear();
  };
}

const SAMPLE: Person = { id: "thumb", name: "张小兰", title: "主持人", en: "ZHANG XIAOLAN", titleLines: 1 };

/**
 * Real renderer output for a template card, cropped to the quadrant the
 * plate lives in so the thumbnail reads large. Static at the hold frame;
 * plays its in-animation on a loop while hovered.
 */
export function LiveThumb({
  card,
  person,
  playing,
  className,
}: {
  card: StyleCard;
  person?: Person;
  playing: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const side = useStudio((s) => s.side);
  const orient = useStudio((s) => s.orient);
  const fontEpoch = useStudio((s) => s.fontEpoch);
  const scale = useStudio((s) => s.scale);
  const p = person && person.name.trim() ? person : SAMPLE;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    let start = 0;
    const st = useStudio.getState();
    const vertical = orient === "vertical" && supportsVertical(card.style);
    const cfg = renderConfigFromState({
      ...st,
      people: [{ ...p, xform: undefined }],
      style: card.style,
      layout: "sequence",
      side,
      orient: vertical ? "vertical" : "horizontal",
      align: vertical ? "top" : side === "right" ? "right" : "left",
      scale,
      accentColor: card.accentColor,
      bandColor: card.bandColor,
      nameColor: card.nameColor ?? st.nameColor,
      titleColor: card.titleColor ?? st.titleColor,
      nameFontId: card.nameFontId ?? st.nameFontId,
      titleFontId: card.titleFontId ?? st.titleFontId,
      sweep: card.sweep ?? st.sweep,
      textFx: "soft",
      animIn: side === "right" ? "right" : "left",
      inDuration: 0.9,
      holdDuration: 2.2,
      outDuration: 0.6,
    });
    const loop = cfg.inDuration + cfg.holdDuration + cfg.outDuration + 0.35;

    const paint = (t: number) => {
      const ctx = canvas.getContext("2d");
      const src = scratchCanvas();
      const sctx = src.getContext("2d");
      if (!ctx || !sctx) return;
      drawFrame(sctx, SRC_W, SRC_H, t, cfg);
      // crop the quadrant that holds the plate (55% of the frame)
      const k = vertical || card.style === "xuan" ? 0.62 : 0.46;
      const cw = SRC_W * k;
      const ch = SRC_H * k;
      const cx = side === "right" ? SRC_W * 0.97 - cw : SRC_W * 0.03;
      const cy = vertical || card.style === "xuan" ? SRC_H * 0.06 : SRC_H * 0.955 - ch;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      if (photoReady && photo) {
        const pw = photo.naturalWidth;
        const ph = photo.naturalHeight;
        ctx.drawImage(photo, (cx / SRC_W) * pw, (cy / SRC_H) * ph, (cw / SRC_W) * pw, (ch / SRC_H) * ph, 0, 0, W, H);
        ctx.fillStyle = "rgba(8,9,11,0.18)";
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = "#1a1b1f";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.drawImage(src, cx, cy, cw, ch, 0, 0, W, H);
    };

    const hold = cfg.inDuration + 1.7;
    if (!playing) {
      paint(hold);
      ensurePhoto(() => paint(hold));
    } else {
      const tick = (now: number) => {
        if (!start) start = now;
        const t = ((now - start) / 1000) % loop;
        paint(Math.min(t, loop - 0.35));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [card, p, playing, side, orient, fontEpoch, scale]);

  return <canvas ref={ref} width={384} height={216} className={className} aria-hidden />;
}
