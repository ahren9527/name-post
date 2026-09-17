import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { NameplateStyle, Orient, Side } from "@/lib/nameplates/types";

export function StyleThumb({
  style,
  orient = "horizontal",
  side = "left",
  accent,
  band,
  name = "张小兰",
  title = "主持人",
  nameColor,
  titleColor,
  className,
}: {
  style: NameplateStyle;
  orient?: Orient;
  side?: Side;
  accent: string;
  band: string;
  name?: string;
  title?: string;
  nameColor?: string;
  titleColor?: string;
  className?: string;
}) {
  const v = orient === "vertical";
  const r = side === "right";
  const nameStyle = nameColor ? { color: nameColor } : undefined;
  const titleFill =
    titleColor ?? (accent === "#111111" || accent === "#3f3a32" || nameColor === "#141414" ? "#222" : "#eee");
  const n2 = name.slice(0, 2);
  const t2 = title.slice(0, 2);

  const frame = cn(
    "relative flex h-full overflow-hidden bg-rail",
    v ? (r ? "items-center justify-end pr-2" : "items-center justify-start pl-2") : "items-end p-3",
    !v && r && "justify-end",
    className,
  );

  if (style === "duo") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("min-w-0", r && "text-right")}>
            <div className={cn("flex items-center gap-1.5", r && "flex-row-reverse")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <span className="flex h-5 items-end gap-0.5">
                <span className="h-4 w-0.5 origin-bottom rotate-12" style={{ background: accent }} />
                <span className="h-4 w-0.5 origin-bottom rotate-12" style={{ background: accent }} />
              </span>
            </div>
            <div className="mt-1 text-[10px]" style={{ color: titleFill }}>
              {title}
            </div>
            <div className={cn("mt-1 flex items-center", r && "flex-row-reverse")}>
              <span className="size-1.5 rounded-full" style={{ background: accent }} />
              <span className="h-px flex-1" style={{ background: accent }} />
              <span className="size-1.5 rotate-45" style={{ background: accent }} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex flex-col", r ? "items-end" : "items-start")}>
          <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
            <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
            <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
          </div>
          <div className="mt-0.5 flex flex-col items-center">
            <span className="flex h-3 items-end gap-0.5">
              <span className="h-3 w-0.5 rotate-12" style={{ background: accent }} />
              <span className="h-3 w-0.5 rotate-12" style={{ background: accent }} />
            </span>
            <span className="mt-0.5 flex items-center gap-0.5">
              <span className="size-1 rotate-45" style={{ background: accent }} />
              <span className="h-px w-5" style={{ background: accent }} />
              <span className="size-1 rounded-full" style={{ background: accent }} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (style === "hook") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-stretch gap-1", r && "flex-row-reverse")}>
            <span className={cn("w-px self-stretch origin-bottom", r ? "rotate-12" : "-rotate-12")} style={{ background: accent }} />
            <div className={cn(r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="mt-0.5 h-px w-full" style={{ background: accent }} />
              <div className="mt-1 text-[10px]" style={{ color: titleFill }}>
                {title}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <span className="relative w-2 self-stretch">
            <span
              className={cn("absolute top-0 h-3 w-px origin-top", r ? "-rotate-12 left-1" : "rotate-12 right-1")}
              style={{ background: accent }}
            />
            <span className={cn("absolute top-2 bottom-1 w-px", r ? "left-1" : "right-1")} style={{ background: accent }} />
          </span>
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <VChars text={t2} className="text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "fold") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-center gap-1", r && "flex-row-reverse")}>
            <div className="flex flex-col items-center text-sm font-medium leading-none" style={nameStyle}>
              <span>{name.slice(0, 1)}</span>
              <span className="mt-1">{name.slice(-1)}</span>
            </div>
            <span className="h-8 w-px origin-center rotate-12" style={{ background: accent }} />
            <div className="text-[10px] leading-tight" style={{ color: titleFill }}>
              {title.slice(0, 4)}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <div className="flex flex-col items-center justify-between text-sm font-medium leading-none" style={nameStyle}>
            <span>{name.slice(0, 1)}</span>
            <span>{name.slice(-1)}</span>
          </div>
          <span className="w-px self-stretch origin-center rotate-12" style={{ background: accent }} />
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "split") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-center gap-2", r && "flex-row-reverse")}>
            <div className="text-sm font-medium text-foreground" style={nameStyle}>
              {name}
            </div>
            <span className="h-6 w-px" style={{ background: accent }} />
            <div className="text-[10px] leading-tight" style={{ color: titleFill }}>
              {title.slice(0, 4)}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <span className="w-px self-stretch" style={{ background: accent }} />
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "underline") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("w-fit", r && "text-right")}>
            <div className="text-sm font-medium text-foreground" style={nameStyle}>
              {name}
            </div>
            <div className="mt-1 h-px w-full" style={{ background: accent }} />
            <div className="mt-1 text-[10px]" style={{ color: titleFill }}>
              {title}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className="flex flex-col items-center">
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <span className="mt-1 h-px w-4" style={{ background: accent }} />
          <div className="mt-1 flex gap-1 text-[10px] leading-tight text-muted-foreground">
            {t2.split("").map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "block") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-end gap-1.5", r && "flex-row-reverse")}>
            <span className="mb-0.5 size-2.5 shrink-0" style={{ background: accent }} />
            <div className={cn(r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="mt-0.5 h-px w-full bg-foreground/70" />
              <div className="mt-1 text-[10px]" style={{ color: titleFill }}>
                {title}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <VChars text={n2} className="mt-3 text-sm font-medium leading-none tracking-widest" style={nameStyle} />
          <div className="flex w-3 flex-col items-center">
            <span className="size-2.5" style={{ background: accent }} />
            <span className="w-px flex-1 bg-foreground/70" />
          </div>
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "ledge") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-start gap-1.5", r && "flex-row-reverse")}>
            <span className="mt-0.5 h-4 w-px" style={{ background: accent }} />
            <div className={cn(r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: titleFill }}>
                {title}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <span className="mt-0.5 h-7 w-px" style={{ background: accent }} />
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "wave") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("w-full", r && "text-right")}>
            <div className="text-sm font-medium text-foreground" style={nameStyle}>
              {name}
            </div>
            <div className="text-[10px]" style={{ color: titleFill }}>
              {title}
            </div>
            <svg className={cn("mt-1 h-3 w-24", r && "ml-auto")} viewBox="0 0 96 12" fill="none">
              <path d="M0 7 C 24 0, 48 12, 96 6" stroke={accent} strokeWidth="2" />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex flex-col", r ? "items-end" : "items-start")}>
          <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
            <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
            <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
          </div>
          <svg className="mt-0.5 h-3 w-10" viewBox="0 0 40 12" fill="none">
            <path d="M0 7 C 10 0, 20 12, 40 6" stroke={accent} strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  }

  if (style === "bracket") {
    if (!v) {
      return (
        <div className={frame}>
          <div className="relative px-2 py-1">
            <span className="absolute top-0 left-0 h-3 w-0.5" style={{ background: accent }} />
            <span className="absolute top-0 left-0 h-0.5 w-3" style={{ background: accent }} />
            <span className="absolute right-0 bottom-0 h-3 w-0.5" style={{ background: accent }} />
            <span className="absolute right-0 bottom-0 h-0.5 w-3" style={{ background: accent }} />
            <div className={cn("px-1", r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="text-[10px]" style={{ color: titleFill }}>
                {title}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className="relative px-2 py-1">
          <span className="absolute top-0 left-0 h-3 w-0.5" style={{ background: accent }} />
          <span className="absolute top-0 left-0 h-0.5 w-3" style={{ background: accent }} />
          <span className="absolute right-0 bottom-0 h-3 w-0.5" style={{ background: accent }} />
          <span className="absolute right-0 bottom-0 h-0.5 w-3" style={{ background: accent }} />
          <div className={cn("flex items-stretch gap-1.5 px-1", !r && "flex-row-reverse")}>
            <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
            <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (style === "skew") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-center gap-2", r && "flex-row-reverse")}>
            <span className="-skew-x-12 px-2 py-0.5 text-sm font-medium" style={{ background: band, color: nameColor ?? "#111" }}>
              {name}
            </span>
            <div className="w-fit">
              <span className="text-[10px]" style={{ color: titleFill }}>
                {title}
              </span>
              <div className="mt-1 h-px w-full bg-foreground/70" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <span className="w-1.5 self-center -skew-x-12 py-1" style={{ background: band }} />
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "rule") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-stretch gap-1.5", r && "flex-row-reverse")}>
            <span className="w-1 self-stretch" style={{ background: accent }} />
            <div className={cn(r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="mt-1 px-1.5 py-0.5 text-[10px] leading-4" style={{ background: band, color: titleFill }}>
                {title}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-1.5", r && "flex-row-reverse")}>
          <span className="w-1 self-stretch" style={{ background: accent }} />
          <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
          <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (style === "ceremony") {
    if (!v) {
      return (
        <div className={frame}>
          <div className={cn("flex items-stretch gap-1.5", r && "flex-row-reverse")}>
            <span className="w-1.5 -skew-x-12 self-stretch" style={{ background: accent }} />
            <div className={cn(r && "text-right")}>
              <div className="text-sm font-medium text-foreground" style={nameStyle}>
                {name}
              </div>
              <div className="mt-0.5 h-px w-full bg-foreground/70" />
              <div className="mt-1 text-[10px] text-muted-foreground">{title}</div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={frame}>
        <div className={cn("flex flex-col", r ? "items-end" : "items-start")}>
          <div className={cn("flex items-stretch gap-1.5", !r && "flex-row-reverse")}>
            <VChars text={n2} className="text-sm font-medium leading-none" style={nameStyle} />
            <VChars text={t2} className="self-center text-[10px] leading-tight text-muted-foreground" />
          </div>
          <span
            className={cn("mt-0.5 h-1 w-7", r ? "-skew-x-12" : "skew-x-12")}
            style={{ background: accent }}
          />
        </div>
      </div>
    );
  }

  if (style === "card") {
    return (
      <div className={frame}>
        <div className={cn("flex overflow-hidden rounded-md", r && "flex-row-reverse")} style={{ background: band }}>
          <span className="w-1.5 self-stretch" style={{ background: accent }} />
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium text-foreground" style={nameStyle}>
              {name}
            </div>
            <div className="text-[10px] text-muted-foreground" style={{ color: titleFill }}>
              {title}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "pill") {
    return (
      <div className={frame}>
        <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1.5", r && "flex-row-reverse")} style={{ background: band }}>
          <span className="h-4 w-1.5 rounded-full" style={{ background: accent }} />
          <div>
            <div className="text-sm font-medium leading-none text-foreground" style={nameStyle}>
              {name}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: titleFill }}>
              {title}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "stack") {
    return (
      <div className={frame}>
        <div className="w-full">
          <div className="px-2 py-1 text-sm font-medium" style={{ background: accent, color: nameColor ?? "#fff" }}>
            {name}
          </div>
          <div className="mt-0.5 px-2 py-0.5 text-[10px]" style={{ background: band, color: titleFill }}>
            {title}
          </div>
        </div>
      </div>
    );
  }

  if (style === "rail") {
    return (
      <div className={frame}>
        <div className={cn("flex items-stretch gap-2", r && "flex-row-reverse")}>
          <span className="w-1.5 self-stretch rounded-sm" style={{ background: accent }} />
          <div>
            <div className="text-sm font-medium text-foreground" style={nameStyle}>
              {name}
            </div>
            <div className="text-[10px] text-muted-foreground" style={{ color: titleFill }}>
              {title}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "badge") {
    const first = name.slice(0, 1);
    const rest = name.slice(1);
    return (
      <div className={frame}>
        <div className={cn("flex items-start gap-1.5", r && "flex-row-reverse")}>
          <span
            className="flex size-7 items-center justify-center text-sm font-semibold"
            style={{ background: accent, color: nameColor ?? "#fff" }}
          >
            {first}
          </span>
          <div>
            <div className="text-sm font-medium leading-none text-foreground" style={nameStyle}>
              {rest}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground" style={{ color: titleFill }}>
              {title}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "news") {
    return (
      <div className={frame}>
        <div className={cn("w-full", r && "text-right")}>
          <div className="text-sm font-medium text-foreground" style={nameStyle}>
            {name}
          </div>
          <div className="mt-1 h-5 px-2 py-0.5 text-[10px] leading-4" style={{ background: band, color: titleFill }}>
            {title}
          </div>
        </div>
      </div>
    );
  }

  if (style === "qinghua") {
    return (
      <div className={frame}>
        <div className={cn(r && "text-right")}>
          <div className="mb-1 text-sm font-medium text-foreground" style={nameStyle}>
            {name}
          </div>
          <div className={cn("relative flex items-center", r && "flex-row-reverse")}>
            <span className={cn("h-5 w-1.5 -skew-x-12", r ? "-mr-1" : "-ml-1")} style={{ background: accent }} />
            <span className="h-5 min-w-16 px-2 py-0.5 text-[10px] leading-4" style={{ background: band, color: titleFill }}>
              {title}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className={cn("flex items-stretch gap-1.5", r && "flex-row-reverse")}>
        <span className="w-1.5 -skew-x-12 self-stretch" style={{ background: accent }} />
        <div>
          <div className="text-sm font-medium text-foreground" style={nameStyle}>
            {name}
          </div>
          <div className="mt-0.5 w-fit">
            <div className="h-px w-full bg-foreground/70" />
            <div className="mt-1 text-[10px] text-muted-foreground">{title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VChars({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)} style={style}>
      {text.split("").map((ch, i) => (
        <span key={`${ch}-${i}`}>{ch}</span>
      ))}
    </div>
  );
}
