import { Check, Copy, FilePlus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { STYLE_CARDS } from "@/lib/nameplates/presets";
import { useStudio } from "@/lib/nameplates/store";
import { isColumnStyle } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";
import { StyleThumb } from "./StyleThumb";
import { SectionLabel } from "./widgets";

const MAIN_IDS = ["duo-gold", "hook-white", "fold-white", "split-white", "underline-white", "block-white"];
const MAIN = MAIN_IDS.map((id) => STYLE_CARDS.find((c) => c.id === id)!);

export function StylePanel() {
  const style = useStudio((s) => s.style);
  const orient = useStudio((s) => s.orient);
  const side = useStudio((s) => s.side);
  const accentColor = useStudio((s) => s.accentColor);
  const favorited = useStudio((s) => s.favorited);

  return (
    <div className="flex flex-col gap-5 p-3">
      <SectionLabel>风格预设</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {MAIN.map((card) => {
          const active = style === card.style;
          const starred = favorited.includes(card.id);
          return (
            <div
              key={card.id}
              className={cn(
                "overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150",
                active ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-border hover:border-brand/40",
              )}
            >
              <button
                type="button"
                className="relative block h-24 w-full"
                onClick={() => useStudio.getState().applyPreset(card)}
              >
                <StyleThumb
                  style={card.style}
                  orient={orient}
                  side={side}
                  accent={card.accentColor}
                  band={card.bandColor}
                  nameColor={card.nameColor}
                  titleColor={card.titleColor}
                  name={isColumnStyle(orient) ? "吴京" : "张小兰"}
                  title={isColumnStyle(orient) ? "演员" : "主持人"}
                />
                {active ? (
                  <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="size-2.5" />
                  </span>
                ) : null}
              </button>
              <div className="flex items-center justify-between px-2 py-1.5">
                <button
                  type="button"
                  className="text-xs text-foreground"
                  onClick={() => useStudio.getState().applyPreset(card)}
                >
                  {card.label}
                </button>
                <button
                  type="button"
                  aria-label={starred ? "取消收藏" : "收藏"}
                  onClick={() => {
                    useStudio.getState().toggleFavorite(card.id);
                    toast.success(starred ? "已取消收藏" : "已加入收藏");
                  }}
                >
                  <Star className={cn("size-3", starred ? "fill-brand text-brand" : "text-muted-foreground")} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => useStudio.getState().openPresetBrowse()}
        className="h-8 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        更多预设
      </button>

      <SectionLabel>快速操作</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Quick
          icon={FilePlus}
          label="新建项目"
          onClick={() => {
            toast("将恢复默认嘉宾与样式", {
              action: {
                label: "新建",
                onClick: () => {
                  useStudio.getState().restoreDefaults();
                  toast.success("已新建项目");
                },
              },
            });
          }}
        />
        <Quick icon={Upload} label="导入样式" onClick={() => useStudio.getState().openPresetBrowse()} />
        <Quick
          icon={Copy}
          label="复制当前样式"
          onClick={() => {
            const card = useStudio.getState().saveCustomPreset();
            toast.success(`已保存「${card.label}」到预设`);
          }}
        />
        <Quick
          icon={Trash2}
          label="清空画布"
          onClick={() => {
            toast("清空全部嘉宾？", {
              action: {
                label: "清空",
                onClick: () => {
                  useStudio.getState().setPeople([]);
                  toast.success("画布已清空");
                },
              },
            });
          }}
        />
      </div>
      <p className="rounded-md border border-border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        点卡片套用样式。每种预设有横左、横右、竖左、竖右四种构图，在右侧切换。当前强调色 {accentColor.toUpperCase()}。
      </p>
    </div>
  );
}

function Quick({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FilePlus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center gap-2 rounded-md border border-border px-2 text-left text-xs text-foreground hover:bg-accent"
    >
      <Icon className="size-3.5 text-muted-foreground" />
      {label}
    </button>
  );
}