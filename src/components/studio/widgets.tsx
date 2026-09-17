import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-medium tracking-wide text-muted-foreground">{children}</div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{format(value)}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v ?? min)} />
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = value.startsWith("#") ? value : "#0a0a0a";
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <input
        type="color"
        value={hex.length === 7 ? hex : "#4f8cff"}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 shrink-0 cursor-pointer rounded-sm border border-border bg-secondary p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 min-w-0 flex-1 rounded-sm border border-input bg-secondary px-2 font-mono text-xs uppercase"
      />
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-sm border px-2 text-xs transition-[border-color,background-color,color] duration-150",
        active
          ? "border-brand/50 bg-brand text-brand-foreground"
          : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
