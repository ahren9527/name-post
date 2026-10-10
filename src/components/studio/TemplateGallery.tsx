import { Check, Plus, Search, Star, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { STYLE_CARDS, type PresetGroup, type StyleCard } from "@/lib/nameplates/presets";
import { supportsVertical } from "@/lib/nameplates/premium/spec";
import { useStudio } from "@/lib/nameplates/store";
import { cn } from "@/lib/utils";
import { LiveThumb } from "./LiveThumb";

type Filter = "premium" | "classic" | "fav" | "mine";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "premium", label: "旗舰" },
  { id: "classic", label: "经典" },
  { id: "fav", label: "收藏" },
  { id: "mine", label: "我的" },
];

const CLASSIC_GROUPS: { id: PresetGroup | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "slash", label: "斜杠" },
  { id: "line", label: "线条" },
  { id: "split", label: "分隔" },
  { id: "block", label: "方块" },
  { id: "wave", label: "光弧" },
  { id: "bracket", label: "括号" },
];

export function TemplateGallery() {
  const [filter, setFilter] = useState<Filter>("premium");
  const [group, setGroup] = useState<PresetGroup | "all">("all");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const style = useStudio((s) => s.style);
  const accentColor = useStudio((s) => s.accentColor);
  const favorited = useStudio((s) => s.favorited);
  const customPresets = useStudio((s) => s.customPresets);
  const people = useStudio((s) => s.people);
  const activePersonId = useStudio((s) => s.activePersonId);
  const orient = useStudio((s) => s.orient);
  const person = people.find((p) => p.id === activePersonId) ?? people[0];

  const list = useMemo(() => {
    const all = [...STYLE_CARDS, ...customPresets];
    return all
      .filter((c) => {
        if (filter === "premium") return c.group === "premium" && !c.id.startsWith("custom-");
        if (filter === "classic") return c.group !== "premium" && !c.id.startsWith("custom-") && (group === "all" || c.group === group);
        if (filter === "fav") return favorited.includes(c.id);
        return c.id.startsWith("custom-");
      })
      .filter((c) => !q.trim() || `${c.label}${c.caption}`.includes(q.trim()));
  }, [filter, group, q, customPresets, favorited]);

  function apply(card: StyleCard) {
    useStudio.getState().applyPreset(card);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold tracking-wide">模板</h2>
          <span className="text-[11px] text-muted-foreground">悬停预览动画 · 点击套用</span>
        </div>
        <div className="flex gap-1 rounded-lg bg-black/30 p-0.5 ring-1 ring-hairline">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-7 flex-1 rounded-md text-xs transition-[background-color,color] duration-150",
                filter === f.id ? "bg-accent text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.4)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索模板"
            className="h-8 w-full rounded-md bg-black/25 pr-2 pl-8 text-xs ring-1 ring-input outline-none placeholder:text-faint focus:ring-brand/60"
          />
        </div>
        {filter === "classic" ? (
          <div className="flex flex-wrap gap-1">
            {CLASSIC_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                className={cn(
                  "h-6 rounded-full px-2.5 text-[11px] ring-1 transition-colors",
                  group === g.id ? "bg-accent text-foreground ring-brand/40" : "text-muted-foreground ring-border hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
            {filter === "fav" ? "点模板右上角的星标加入收藏" : filter === "mine" ? "把当前样式存成模板，方便下次使用" : "没有匹配的模板"}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 2xl:grid-cols-2">
          {list.map((card) => {
            const active = style === card.style && accentColor.toLowerCase() === card.accentColor.toLowerCase();
            const starred = favorited.includes(card.id);
            const noVertical = orient === "vertical" && !supportsVertical(card.style);
            return (
              <div
                key={card.id}
                onMouseEnter={() => setHover(card.id)}
                onMouseLeave={() => setHover((h) => (h === card.id ? null : h))}
                className="group"
              >
                <button
                  type="button"
                  onClick={() => apply(card)}
                  onFocus={() => setHover(card.id)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "relative block aspect-video w-full overflow-hidden rounded-lg ring-1 transition-[box-shadow,transform] duration-200",
                    active
                      ? "ring-2 ring-brand shadow-[0_0_0_4px_rgb(217_181_108/0.12)]"
                      : "ring-border group-hover:ring-white/20",
                  )}
                  aria-label={`套用模板 ${card.label}`}
                  aria-pressed={active}
                >
                  <LiveThumb card={card} person={person} playing={hover === card.id} className="size-full" />
                  {active ? (
                    <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground shadow">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                  {noVertical ? (
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur">
                      仅横版
                    </span>
                  ) : null}
                </button>
                <div className="mt-1.5 flex items-center gap-2 px-0.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-foreground/95">{card.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{card.caption}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={starred ? "取消收藏" : "收藏"}
                    onClick={() => useStudio.getState().toggleFavorite(card.id)}
                    className={cn(
                      "rounded p-1 transition-opacity",
                      starred ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    )}
                  >
                    <Star className={cn("size-3.5", starred ? "fill-brand text-brand" : "text-muted-foreground")} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filter === "mine" || filter === "fav" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const card = useStudio.getState().saveCustomPreset();
                toast.success(`已保存「${card.label}」`);
                setFilter("mine");
              }}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" /> 存为模板
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground"
            >
              <Upload className="size-3.5" /> 导入样式
            </button>
          </div>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void file.text().then((text) => {
              try {
                const data = JSON.parse(text) as Partial<StyleCard>;
                if (!data.style) throw new Error("缺少 style");
                useStudio.getState().applyPreset({
                  style: data.style,
                  side: data.side,
                  accentColor: data.accentColor,
                  bandColor: data.bandColor,
                  nameColor: data.nameColor,
                  titleColor: data.titleColor,
                  nameFontId: data.nameFontId,
                  titleFontId: data.titleFontId,
                  sweep: data.sweep,
                });
                toast.success("已导入样式");
              } catch {
                toast.error("无法读取该样式文件");
              }
            });
          }}
        />
      </div>
    </div>
  );
}
