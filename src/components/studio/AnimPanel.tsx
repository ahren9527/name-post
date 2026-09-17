import { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Circle,
  Maximize2,
  RotateCw,
} from "lucide-react";
import { useStudio } from "@/lib/nameplates/store";
import type { AnimIn, EaseKind } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";
import { Chip, SectionLabel, SliderRow } from "./widgets";

const IN_MOVES: { id: AnimIn; icon: typeof Circle; label: string }[] = [
  { id: "none", icon: Circle, label: "无动画" },
  { id: "fade", icon: Maximize2, label: "淡入" },
  { id: "up", icon: ArrowUp, label: "上滑入" },
  { id: "down", icon: ArrowDown, label: "下滑入" },
  { id: "left", icon: ArrowLeft, label: "左滑入" },
  { id: "right", icon: ArrowRight, label: "右滑入" },
  { id: "scale", icon: RotateCw, label: "展开入" },
];

export function AnimPanel() {
  const [tab, setTab] = useState<"in" | "hold" | "out">("in");
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);
  const layout = useStudio((s) => s.layout);
  const animIn = useStudio((s) => s.animIn);
  const ease = useStudio((s) => s.ease);

  return (
    <div className="flex flex-col gap-5 p-3">
      <SectionLabel>动画设置</SectionLabel>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
        {(
          [
            ["in", "入场"],
            ["hold", "停留"],
            ["out", "出场"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-sm py-1.5 text-center text-xs",
              tab === id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "in" ? (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {IN_MOVES.map((m) => (
              <MoveBtn
                key={m.id}
                icon={m.icon}
                label={m.label}
                active={animIn === m.id}
                onClick={() => {
                  const st = useStudio.getState();
                  st.setAnimIn(m.id);
                  if (st.activePersonId) st.focusPerson(st.activePersonId, true);
                }}
              />
            ))}
          </div>
          <SliderRow
            label="入场时长"
            value={inDuration}
            min={0.05}
            max={1.5}
            step={0.05}
            format={(v) => `${v.toFixed(2)}s`}
            onChange={(v) => useStudio.getState().setInDuration(v)}
          />
        </>
      ) : null}

      {tab === "hold" ? (
        <>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">出场方式</span>
            <div className="grid flex-1 grid-cols-2 gap-1">
              <Chip active={layout === "sequence"} onClick={() => useStudio.getState().setLayout("sequence")}>
                每人一条
              </Chip>
              <Chip active={layout === "stack"} onClick={() => useStudio.getState().setLayout("stack")}>
                同时出场
              </Chip>
            </div>
          </div>
          <SliderRow
            label="停留"
            value={holdDuration}
            min={1}
            max={12}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => useStudio.getState().setHoldDuration(v)}
          />
          {layout === "stack" ? (
            <SliderRow
              label="错开"
              value={stagger}
              min={0}
              max={0.6}
              step={0.02}
              format={(v) => `${v.toFixed(2)}s`}
              onChange={(v) => useStudio.getState().setStagger(v)}
            />
          ) : null}
        </>
      ) : null}

      {tab === "out" ? (
        <SliderRow
          label="出场"
          value={outDuration}
          min={0.25}
          max={1.4}
          step={0.05}
          format={(v) => `${v.toFixed(2)}s`}
          onChange={(v) => useStudio.getState().setOutDuration(v)}
        />
      ) : null}

      <SectionLabel>缓动曲线</SectionLabel>
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            ["smooth", "平滑"],
            ["linear", "线性"],
            ["snap", "急停"],
          ] as [EaseKind, string][]
        ).map(([id, label]) => (
          <Chip key={id} active={ease === id} onClick={() => useStudio.getState().setEase(id)}>
            {label}
          </Chip>
        ))}
      </div>
      <EasePreview kind={ease} />
      <p className="text-[11px] text-muted-foreground">点入场方式会从当前嘉宾开头预览一次。</p>
    </div>
  );
}

function EasePreview({ kind }: { kind: EaseKind }) {
  const d =
    kind === "linear"
      ? "M8 60 L192 12"
      : kind === "snap"
        ? "M8 60 C 28 60, 36 14, 80 12 S 140 12, 192 12"
        : "M8 60 C 40 60, 70 18, 120 16 S 170 14, 192 12";
  return (
    <svg viewBox="0 0 200 72" className="h-20 w-full rounded-md border border-border bg-muted/40">
      <path d={d} fill="none" stroke="var(--color-brand)" strokeWidth="2" />
    </svg>
  );
}

function MoveBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Circle;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border py-2 text-[10px]",
        active
          ? "border-brand/50 bg-secondary text-foreground"
          : "border-border text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}