import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { layerXform } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import { CLIP_LAYER_META, type ClipLayer } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

const LAYERS: ClipLayer[] = ["name", "title", "slash", "band"];

function Num({
  label,
  value,
  step,
  min,
  max,
  suffix,
  onLive,
  onCommit,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  suffix?: string;
  onLive: (n: number) => void;
  onCommit: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {label}
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onLive(Math.min(max, Math.max(min, n)));
        }}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-7 w-16 px-1.5 text-center font-mono text-xs"
      />
      {suffix ? <span className="text-[10px]">{suffix}</span> : null}
    </label>
  );
}

export function ClipTransformBar() {
  const selected = useStudio((s) => s.selectedClip);
  const people = useStudio((s) => s.people);
  if (!selected) return null;
  const person = people.find((p) => p.id === selected.personId);
  if (!person) return null;
  const xf = layerXform(person, selected.layer);

  function live(patch: Partial<typeof xf>) {
    useStudio.getState().setLayerXform(selected!.personId, selected!.layer, patch, true);
  }
  function commit(patch: Partial<typeof xf>) {
    useStudio.getState().setLayerXform(selected!.personId, selected!.layer, patch);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/60 px-3 py-1.5">
      <div className="flex items-center gap-1">
        {LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => useStudio.getState().selectClip(selected.personId, layer)}
            className={cn(
              "h-6 rounded-sm px-2 text-[11px]",
              layer === selected.layer
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {CLIP_LAYER_META[layer].label}
          </button>
        ))}
      </div>
      <span className="hidden max-w-28 truncate text-xs text-foreground sm:inline">{person.name}</span>
      <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
      <Num
        label="X"
        value={xf.x}
        step={1}
        min={-600}
        max={600}
        onLive={(n) => live({ x: n })}
        onCommit={(n) => commit({ x: n })}
      />
      <Num
        label="Y"
        value={xf.y}
        step={1}
        min={-400}
        max={400}
        onLive={(n) => live({ y: n })}
        onCommit={(n) => commit({ y: n })}
      />
      <Num
        label="旋转"
        value={xf.rotation}
        step={1}
        min={-180}
        max={180}
        suffix="°"
        onLive={(n) => live({ rotation: n })}
        onCommit={(n) => commit({ rotation: n })}
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px]"
        onClick={() => useStudio.getState().resetLayerXform(selected.personId, selected.layer)}
      >
        <RotateCcw />
        重置
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="ml-auto"
        aria-label="关闭片段面板"
        onClick={() => useStudio.getState().clearClip()}
      >
        <X />
      </Button>
    </div>
  );
}
