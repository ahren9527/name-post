import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BUILTIN_FONTS, removeCustomFont, uploadCustomFont } from "@/lib/nameplates/fonts";
import { useStudio } from "@/lib/nameplates/store";
import {
  STYLE_META,
  isColumnStyle,
  type LayoutMode,
  type NameplateStyle,
  type Side,
  type TitleLines,
} from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

const STYLES: NameplateStyle[] = [
  "duo",
  "hook",
  "fold",
  "split",
  "underline",
  "block",
  "ledge",
  "wave",
  "bracket",
  "skew",
  "rule",
  "ceremony",
];

export function Sidebar() {
  const people = useStudio((s) => s.people);
  const style = useStudio((s) => s.style);
  const layout = useStudio((s) => s.layout);
  const side = useStudio((s) => s.side);
  const orient = useStudio((s) => s.orient);
  const scale = useStudio((s) => s.scale);
  const textSize = useStudio((s) => s.textSize);
  const titleSize = useStudio((s) => s.titleSize);
  const nameFontId = useStudio((s) => s.nameFontId);
  const titleFontId = useStudio((s) => s.titleFontId);
  const customFonts = useStudio((s) => s.customFonts);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);
  const previewBg = useStudio((s) => s.previewBg);
  const showSafe = useStudio((s) => s.showSafe);

  return (
    <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-3">
          <Label>样式</Label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((key) => {
              const meta = STYLE_META[key];
              const active = style === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => useStudio.getState().setStyle(key)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
                    active
                      ? "border-primary/40 bg-secondary"
                      : "border-border bg-transparent hover:bg-accent",
                  )}
                >
                  <div className="text-sm font-medium text-foreground">{meta.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {meta.caption}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Label>文字大小</Label>
          <SliderField
            label="姓名"
            value={textSize}
            min={0.6}
            max={1.8}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => useStudio.getState().setTextSize(v)}
          />
          <SliderField
            label="职务"
            value={titleSize}
            min={0.5}
            max={1.8}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => useStudio.getState().setTitleSize(v)}
          />
          <SliderField
            label="整体缩放"
            value={scale}
            min={0.7}
            max={1.6}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => useStudio.getState().setScale(v)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <Label>字体</Label>
          <FontSlot
            label="姓名"
            value={nameFontId}
            customFonts={customFonts}
            onChange={(id) => useStudio.getState().setNameFontId(id)}
          />
          <FontSlot
            label="职务"
            value={titleFontId}
            customFonts={customFonts}
            onChange={(id) => useStudio.getState().setTitleFontId(id)}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            内置均为免费可商用（OFL），选黑体/宋体上屏最清楚。也可上传本机字体。
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <Label>排列</Label>
          <div className="grid grid-cols-2 gap-2">
            <Choice
              active={layout === "sequence"}
              onClick={() =>
                useStudio.getState().setLayout("sequence" satisfies LayoutMode)
              }
              title="每人一条"
              caption="发言时单独出现"
            />
            <Choice
              active={layout === "stack"}
              onClick={() => useStudio.getState().setLayout("stack" satisfies LayoutMode)}
              title="同时列出"
              caption="预览全部嘉宾"
            />
            <Choice
              active={side === "left"}
              onClick={() => useStudio.getState().setSide("left" satisfies Side)}
              title="左侧"
              caption="人名职务左齐"
            />
            <Choice
              active={side === "right"}
              onClick={() => useStudio.getState().setSide("right" satisfies Side)}
              title="右侧"
              caption="人名职务右齐"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>嘉宾 · 人名 + 职务</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {people.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {people.map((person, index) => (
              <li
                key={person.id}
                className="rounded-lg border border-border bg-secondary/50 p-2"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] tracking-widest text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="上移"
                      disabled={index === 0}
                      onClick={() => useStudio.getState().movePerson(person.id, -1)}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="下移"
                      disabled={index === people.length - 1}
                      onClick={() => useStudio.getState().movePerson(person.id, 1)}
                    >
                      <ChevronDown />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="删除"
                      onClick={() => useStudio.getState().removePerson(person.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    value={person.name}
                    aria-label={`姓名 ${index + 1}`}
                    className="h-8"
                    onChange={(e) =>
                      useStudio.getState().updatePerson(person.id, {
                        name: e.target.value,
                      })
                    }
                    placeholder="姓名"
                  />
                  <Input
                    value={person.title}
                    aria-label={`职务 ${index + 1}`}
                    className="h-8"
                    onChange={(e) =>
                      useStudio.getState().updatePerson(person.id, {
                        title: e.target.value,
                      })
                    }
                    placeholder="职务"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {isColumnStyle(orient) ? "列数" : "行数"}
                    </span>
                    <div className="grid flex-1 grid-cols-3 gap-1">
                      {([1, 2, 3] as TitleLines[]).map((n) => {
                        const active = (person.titleLines ?? 1) === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n}${isColumnStyle(orient) ? "列" : "行"}`}
                            onClick={() =>
                              useStudio.getState().updatePerson(person.id, {
                                titleLines: n,
                              })
                            }
                            className={cn(
                              "h-7 rounded-md border text-xs transition-[border-color,background-color] duration-150",
                              active
                                ? "border-primary/40 bg-secondary font-medium text-foreground"
                                : "border-border bg-transparent text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {n}
                            {isColumnStyle(orient) ? "列" : "行"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={people.length >= 8}
              onClick={() => useStudio.getState().addPerson()}
            >
              <Plus />
              添加嘉宾
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useStudio.getState().restoreDefaults()}
            >
              <RotateCcw />
              重置
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Label>动画</Label>
          <SliderField
            label="入场"
            value={inDuration}
            min={0.3}
            max={1.5}
            step={0.05}
            format={(v) => `${v.toFixed(2)}s`}
            onChange={(v) => useStudio.getState().setInDuration(v)}
          />
          <SliderField
            label="停留"
            value={holdDuration}
            min={1}
            max={12}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => useStudio.getState().setHoldDuration(v)}
          />
          <SliderField
            label="出场"
            value={outDuration}
            min={0.25}
            max={1.4}
            step={0.05}
            format={(v) => `${v.toFixed(2)}s`}
            onChange={(v) => useStudio.getState().setOutDuration(v)}
          />
          {layout === "stack" ? (
            <SliderField
              label="错开"
              value={stagger}
              min={0}
              max={0.6}
              step={0.02}
              format={(v) => `${v.toFixed(2)}s`}
              onChange={(v) => useStudio.getState().setStagger(v)}
            />
          ) : null}
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <Label>预览台</Label>
          <div className="grid grid-cols-2 gap-2">
            <Choice
              active={previewBg === "checker"}
              onClick={() => useStudio.getState().setPreviewBg("checker")}
              title="透明棋盘"
              caption="查看透明通道"
            />
            <Choice
              active={previewBg === "stage"}
              onClick={() => useStudio.getState().setPreviewBg("stage")}
              title="舞台"
              caption="暗场叠加上看"
            />
            <Choice
              active={previewBg === "live"}
              onClick={() => useStudio.getState().setPreviewBg("live")}
              title="现场"
              caption="亮幕对比描边"
            />
          </div>
          <div className="flex h-11 items-center justify-between rounded-lg border border-border px-3">
            <span className="text-sm">安全框</span>
            <Switch
              checked={showSafe}
              onCheckedChange={(v) => useStudio.getState().setShowSafe(v)}
              aria-label="显示安全框"
            />
          </div>
        </section>
      </div>
  );
}

function FontSlot({
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
            上传
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <select
          aria-label={`${label}字体`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-secondary px-2 text-sm text-foreground outline-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <optgroup label="免费商用">
            {BUILTIN_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
          {customFonts.length ? (
            <optgroup label="已上传">
              {customFonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        {customFonts.some((f) => f.id === value) ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="删除该字体"
            onClick={() => {
              void (async () => {
                await removeCustomFont(value);
                const next = useStudio
                  .getState()
                  .customFonts.filter((f) => f.id !== value);
                useStudio.getState().setCustomFonts(next);
                const st = useStudio.getState();
                if (st.nameFontId === value) st.setNameFontId("serif");
                if (st.titleFontId === value) st.setTitleFontId("sans");
              })();
            }}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  caption,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
        active
          ? "border-primary/40 bg-secondary"
          : "border-border bg-transparent hover:bg-accent",
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{caption}</div>
    </button>
  );
}

function SliderField({
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-foreground/80">{format(value)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
        aria-label={label}
      />
    </div>
  );
}
