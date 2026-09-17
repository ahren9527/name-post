import { Check, ChevronLeft, Search, Star, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STYLE_CARDS, type StyleCard } from "@/lib/nameplates/presets";
import { useStudio } from "@/lib/nameplates/store";
import { isColumnStyle } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";
import { StyleThumb } from "./StyleThumb";

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "fav", label: "收藏" },
  { id: "slash", label: "斜杠" },
  { id: "line", label: "下划线" },
  { id: "split", label: "分隔" },
  { id: "block", label: "方块" },
  { id: "wave", label: "光弧" },
  { id: "bracket", label: "括号" },
] as const;

export function PresetView() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const style = useStudio((s) => s.style);
  const orient = useStudio((s) => s.orient);
  const side = useStudio((s) => s.side);
  const accentColor = useStudio((s) => s.accentColor);
  const favorited = useStudio((s) => s.favorited);
  const customPresets = useStudio((s) => s.customPresets);
  const catalog = [...STYLE_CARDS, ...customPresets];

  const list = useMemo(() => {
    return catalog
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "fav") return favorited.includes(c.id);
        return c.group === filter;
      })
      .filter((c) => `${c.label}${c.caption}`.includes(q.trim()));
  }, [q, filter, catalog, favorited]);

  function apply(card: StyleCard) {
    useStudio.getState().applyPreset(card);
    toast.success(`已套用「${card.label}」`);
  }

  function close() {
    useStudio.getState().setEditorNav("style");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={close}>
          <ChevronLeft />
          返回
        </Button>
        <h2 className="text-sm font-medium">全部预设</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">点卡片预览不关闭</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-7 rounded-sm px-2 text-xs",
              filter === f.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-2 left-2 size-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索风格"
            className="h-8 pl-7"
          />
        </div>
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
                });
                toast.success("已导入样式");
              } catch {
                toast.error("无法读取该预设文件");
              }
            });
          }}
        />
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => fileRef.current?.click()}>
          <Upload />
          导入
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {list.map((card) => {
            const active = style === card.style && accentColor === card.accentColor;
            const starred = favorited.includes(card.id);
            return (
              <div
                key={card.id}
                className={cn(
                  "overflow-hidden rounded-lg border text-left",
                  active ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-border hover:border-brand/40",
                )}
              >
                <button type="button" className="relative block h-24 w-full" onClick={() => apply(card)}>
                  <StyleThumb
                    style={card.style}
                    orient={orient}
                    side={side}
                    accent={card.accentColor}
                    band={card.bandColor}
                    nameColor={card.nameColor}
                    titleColor={card.titleColor}
                    name={isColumnStyle(orient) ? "吴京" : "张小兰"}
                    title={card.caption}
                  />
                  {active ? (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-2.5" />
                    </span>
                  ) : null}
                </button>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <button type="button" className="truncate text-xs" onClick={() => apply(card)}>
                    {card.label}
                  </button>
                  <button
                    type="button"
                    aria-label={starred ? "取消收藏" : "收藏"}
                    onClick={() => useStudio.getState().toggleFavorite(card.id)}
                  >
                    <Star className={cn("size-3 shrink-0", starred ? "fill-brand text-brand" : "text-muted-foreground")} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const card = useStudio.getState().saveCustomPreset();
              toast.success(`已从当前画面保存「${card.label}」`);
            }}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-accent"
          >
            <span className="text-lg">+</span>
            保存当前
          </button>
        </div>
      </div>
    </div>
  );
}