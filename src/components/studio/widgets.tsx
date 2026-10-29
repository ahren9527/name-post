import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Small all-caps label used above groups of controls. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase", className)}>
      {children}
    </div>
  );
}

/** Collapsible inspector section with a quiet header. */
export function Section({
  title,
  aside,
  defaultOpen = true,
  children,
}: {
  title: string;
  aside?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border">
      <div className="flex h-10 items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 text-left text-[12px] font-semibold tracking-wide text-foreground/90"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("size-3.5 text-muted-foreground transition-transform duration-150", !open && "-rotate-90")}
          />
          {title}
        </button>
        {aside}
      </div>
      {open ? <div className="flex flex-col gap-3.5 px-4 pt-0.5 pb-4">{children}</div> : null}
    </section>
  );
}

/** Label-left control-right row. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex min-h-8 items-center gap-3">
      <span className="w-[4.25rem] shrink-0 text-xs text-muted-foreground" title={hint}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

/** Segmented control (pill group). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid w-full gap-0.5 rounded-md bg-black/30 p-0.5 ring-1 ring-hairline", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center justify-center gap-1 truncate rounded-[5px] px-1.5 text-xs transition-[background-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-35",
              size === "sm" ? "h-6" : "h-7",
              active
                ? "bg-accent text-foreground shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_1px_2px_rgb(0_0_0/0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
    <div className="flex items-center gap-3">
      <span className="w-[4.25rem] shrink-0 text-xs text-muted-foreground">{label}</span>
      <Slider
        className="flex-1"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
      />
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-foreground/80">
        {format(value)}
      </span>
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches?: string[];
}) {
  const hex = value.startsWith("#") ? value.slice(0, 7) : "#0a0a0a";
  return (
    <div className="flex items-center gap-3">
      <span className="w-[4.25rem] shrink-0 text-xs text-muted-foreground">{label}</span>
      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-input">
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={hex.length === 7 ? hex : "#d9b56c"}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {(swatches ?? []).map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={cn(
              "size-5 shrink-0 rounded-full ring-1 ring-white/10 transition-transform duration-150 hover:scale-110",
              hex.toLowerCase() === c.toLowerCase() && "ring-2 ring-foreground/70",
            )}
            style={{ background: c }}
          />
        ))}
        <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground uppercase">{hex}</span>
      </div>
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
        "h-7 rounded-md px-2.5 text-xs transition-[background-color,color,box-shadow] duration-150",
        active
          ? "bg-accent text-foreground ring-1 ring-brand/50"
          : "text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  mono,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  mono?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full min-w-0 rounded-md bg-black/25 px-2.5 text-[13px] text-foreground ring-1 ring-input outline-none placeholder:text-faint focus:ring-brand/60",
        mono && "font-mono text-xs tracking-wider",
        className,
      )}
    />
  );
}
