import { useRef } from "react";
import { RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BUILTIN_FONTS, removeCustomFont, uploadCustomFont } from "@/lib/nameplates/fonts";
import { useStudio } from "@/lib/nameplates/store";
import type { Orient, Side } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";
import { ColorRow, SectionLabel, SliderRow, Chip } from "./widgets";
import { StyleThumb } from "./StyleThumb";

const VARIANTS: { orient: Orient; side: Side; label: string }[] = [
  { orient: "horizontal", side: "left", label: "横版左侧" },
  { orient: "horizontal", side: "right", label: "横版右侧" },
  { orient: "vertical", side: "left", label: "竖版左侧" },
  { orient: "vertical", side: "right", label: "竖版右侧" },
];

export function Inspector() {
  const style = useStudio((s) => s.style);
  const textSize = useStudio((s) => s.textSize);
  const titleSize = useStudio((s) => s.titleSize);
  const scale = useStudio((s) => s.scale);
  const nameFontId = useStudio((s) => s.nameFontId);
  const titleFontId = useStudio((s) => s.titleFontId);
  const customFonts = useStudio((s) => s.customFonts);
  const nameColor = useStudio((s) => s.nameColor);
  const titleColor = useStudio((s) => s.titleColor);
  const accentColor = useStudio((s) => s.accentColor);
  const bandColor = useStudio((s) => s.bandColor);
  const side = useStudio((s) => s.side);
  const orient = useStudio((s) => s.orient);
  const layout = useStudio((s) => s.layout);

  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="flex items-center justify-between">
        <SectionLabel>样式</SectionLabel>
        <span className="text-[10px] text-muted-foreground">全局设置</span>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>构图</SectionLabel>
        <p className="text-[10px] leading-relaxed text-muted-foreground">同一预设 · 横竖左右四种样式</p>
        <div className="grid grid-cols-2 gap-1.5">
          {VARIANTS.map((v) => {
            const active = orient === v.orient && side === v.side;
            return (
              <button
                key={v.label}
                type="button"
                onClick={() => useStudio.getState().setVariant(v.orient, v.side)}
                className={cn(
                  "overflow-hidden rounded-md border text-left transition-[border-color,box-shadow] duration-150",
                  active
                    ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]"
                    : "border-border hover:border-brand/40",
                )}
              >
                <div className="h-[4.5rem]">
                  <StyleThumb
                    style={style}
                    orient={v.orient}
                    side={v.side}
                    accent={accentColor}
                    band={bandColor}
                    name={v.orient === "vertical" ? "吴京" : "张小兰"}
                    title={v.orient === "vertical" ? "演员" : "主持人"}
                  />
                </div>
                <div
                  className={cn(
                    "px-1.5 py-1 text-center text-[10px]",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {v.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-muted-foreground">出场</span>
        <div className="grid flex-1 grid-cols-2 gap-1">
          <Chip active={layout === "sequence"} onClick={() => useStudio.getState().setLayout("sequence")}>
            每人一条
          </Chip>
          <Chip active={layout === "stack"} onClick={() => useStudio.getState().setLayout("stack")}>
            同时
          </Chip>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>字体设置</SectionLabel>
        <FontRow
          label="姓名字体"
          value={nameFontId}
          customFonts={customFonts}
          onChange={(id) => useStudio.getState().setNameFontId(id)}
        />
        <FontRow
          label="职务字体"
          value={titleFontId}
          customFonts={customFonts}
          onChange={(id) => useStudio.getState().setTitleFontId(id)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>大小与缩放</SectionLabel>
        <SliderRow
          label="姓名大小"
          value={textSize}
          min={0.6}
          max={1.8}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => useStudio.getState().setTextSize(v)}
        />
        <SliderRow
          label="职务大小"
          value={titleSize}
          min={0.5}
          max={1.8}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => useStudio.getState().setTitleSize(v)}
        />
        <SliderRow
          label="整体缩放"
          value={scale}
          min={0.7}
          max={1.6}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => useStudio.getState().setScale(v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>颜色设置</SectionLabel>
        <ColorRow label="姓名颜色" value={toHex(nameColor)} onChange={(v) => useStudio.getState().setNameColor(v)} />
        <ColorRow label="职务颜色" value={toHex(titleColor)} onChange={(v) => useStudio.getState().setTitleColor(v)} />
        <ColorRow label="装饰颜色" value={toHex(accentColor)} onChange={(v) => useStudio.getState().setAccentColor(v)} />
        <ColorRow
          label="背景色带"
          value={toHex(bandColor)}
          onChange={(v) => useStudio.getState().setBandColor(hexToRgba(v, 0.8))}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          useStudio.getState().resetStyle();
          toast.success("已重置样式，嘉宾名单保留");
        }}
      >
        <RotateCcw />
        重置当前样式
      </Button>
    </div>
  );
}

function toHex(c: string) {
  if (c.startsWith("#") && c.length >= 7) return c.slice(0, 7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#0a0a0a";
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number.parseInt(n, 10).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgba(hex: string, a: number) {
  const n = hex.replace("#", "");
  if (n.length < 6) return `rgba(10,10,10,${a})`;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function FontRow({
  label,
  value,
  customFonts,
  onChange,
}: {
  label: string;
  value: string;
  customFonts: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <select className="field-select flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {BUILTIN_FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
        {customFonts.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <input
        ref={fileRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void (async () => {
            try {
              const meta = await uploadCustomFont(file);
              useStudio.getState().addCustomFont(meta);
              onChange(meta.id);
              toast.success(`已加载「${meta.label}」`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "字体加载失败");
            }
          })();
        }}
      />
      <Button size="icon-sm" variant="ghost" aria-label="上传字体" onClick={() => fileRef.current?.click()}>
        <Upload />
      </Button>
      {customFonts.some((f) => f.id === value) ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="删除字体"
          onClick={() => {
            void (async () => {
              await removeCustomFont(value);
              const next = useStudio.getState().customFonts.filter((f) => f.id !== value);
              useStudio.getState().setCustomFonts(next);
              const st = useStudio.getState();
              if (st.nameFontId === value) st.setNameFontId("serif");
              if (st.titleFontId === value) st.setTitleFontId("sans");
            })();
          }}
        >
          ×
        </Button>
      ) : null}
    </div>
  );
}
