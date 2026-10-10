import { useRef } from "react";
import { RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { BUILTIN_FONTS, removeCustomFont, uploadCustomFont } from "@/lib/nameplates/fonts";
import { TEMPLATE_BY_ID, isPremiumId, supportsVertical } from "@/lib/nameplates/premium/spec";
import { useStudio } from "@/lib/nameplates/store";
import { STYLE_META, type AnimIn, type EaseKind, type TextBacking, type TextFx, type TitleLines } from "@/lib/nameplates/types";
import { isClassicStyle } from "@/lib/nameplates/classic";
import { cn } from "@/lib/utils";
import { ColorRow, Field, Section, Segmented, SliderRow, TextField } from "./widgets";

const NAME_SWATCHES = ["#FFFFFF", "#F7F2E8", "#E6CB8F", "#14161C", "#0E1E3A"];
const ACCENT_SWATCHES = ["#CFAA66", "#C8102E", "#3EC6E0", "#1F57C3", "#FFFFFF"];
const BAND_SWATCHES = ["#0E1E3A", "#0A0908", "#A80E24", "#FFFFFF", "#F6EFE2"];

const MOVES: { id: AnimIn; label: string }[] = [
  { id: "left", label: "侧入" },
  { id: "up", label: "上升" },
  { id: "fade", label: "淡入" },
  { id: "scale", label: "展开" },
  { id: "none", label: "切入" },
];

const EASES: { id: EaseKind; label: string; title: string }[] = [
  { id: "smooth", label: "模板", title: "使用模板推荐曲线" },
  { id: "expo", label: "Expo", title: "easeOutExpo：快起缓停，最高级" },
  { id: "quint", label: "Quint", title: "easeOutQuint：柔和" },
  { id: "back", label: "Back", title: "easeOutBack：轻微回弹" },
  { id: "linear", label: "线性", title: "匀速" },
];

export function Inspector() {
  const style = useStudio((s) => s.style);
  const people = useStudio((s) => s.people);
  const activePersonId = useStudio((s) => s.activePersonId);
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
  const textFx = useStudio((s) => s.textFx);
  const backing = useStudio((s) => s.backing);
  const sweep = useStudio((s) => s.sweep);
  const animIn = useStudio((s) => s.animIn);
  const ease = useStudio((s) => s.ease);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const stagger = useStudio((s) => s.stagger);

  const person = people.find((p) => p.id === activePersonId) ?? people[0];
  const idx = Math.max(0, people.findIndex((p) => p.id === person?.id));
  const premium = isPremiumId(style);
  const spec = premium ? TEMPLATE_BY_ID[style] : null;
  const canVertical = supportsVertical(style);
  // 衬底 applies to plate-less flagship templates (soft shade layer) and classic styles
  const hasBacking = spec
    ? (orient === "vertical" || spec.nativeVertical ? spec.vertical.plate : spec.plate).some((l) => l.kind === "scrim")
    : isClassicStyle(style);
  const st = useStudio.getState;
  const moveValue: AnimIn = animIn === "right" ? "left" : animIn === "down" ? "up" : animIn;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">当前模板</div>
          <div className="truncate text-sm font-semibold">{STYLE_META[style]?.label ?? style}</div>
        </div>
        {premium ? (
          <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-medium text-brand ring-1 ring-brand/30">
            旗舰
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">经典</span>
        )}
      </div>

      <Section
        title="内容"
        aside={<span className="font-mono text-[10px] text-muted-foreground">{String(idx + 1).padStart(2, "0")} / {String(people.length).padStart(2, "0")}</span>}
      >
        {person ? (
          <>
            <Field label="姓名">
              <TextField
                ariaLabel="姓名"
                value={person.name}
                maxLength={12}
                onChange={(v) => st().updatePerson(person.id, { name: v })}
              />
            </Field>
            <Field label="英文 / 拼音" hint="可选，自动大写、加宽字距">
              <TextField
                ariaLabel="英文或拼音"
                mono
                value={person.en ?? ""}
                placeholder="XIONG YIZHI"
                onChange={(v) => st().updatePerson(person.id, { en: v })}
              />
            </Field>
            <div className="flex gap-3">
              <span className="w-[4.25rem] shrink-0 pt-2 text-xs text-muted-foreground">职务</span>
              <textarea
                aria-label="职务"
                value={person.title}
                rows={2}
                onChange={(e) => st().updatePerson(person.id, { title: e.target.value })}
                className="min-h-14 w-full min-w-0 resize-none rounded-md bg-black/25 px-2.5 py-1.5 text-[13px] leading-relaxed ring-1 ring-input outline-none focus:ring-brand/60"
              />
            </div>
            <Field label="职务行数">
              <Segmented<TitleLines>
                value={(person.titleLines ?? 1) as TitleLines}
                onChange={(n) => st().updatePerson(person.id, { titleLines: n })}
                options={[1, 2, 3].map((n) => ({ value: n as TitleLines, label: `${n} ${orient === "vertical" ? "列" : "行"}` }))}
              />
            </Field>
            <Field
              label={spec?.tagHint?.label ?? "机构 / 标签"}
              hint={spec?.tagHint ? `「${spec.label}」显示为${spec.tagHint.label}` : "部分模板显示：运动斜切为号码、新闻双层条为左侧标签、学术讲座为机构行等"}
            >
              <TextField
                ariaLabel="机构或号码"
                value={person.tag ?? ""}
                placeholder={spec?.tagHint?.placeholder ?? "可选"}
                onChange={(v) => st().updatePerson(person.id, { tag: v })}
              />
            </Field>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">在左侧「嘉宾」添加人物。</p>
        )}
      </Section>

      <Section title="版式">
        <Field label="方向">
          <Segmented
            value={orient}
            onChange={(o) => st().setOrient(o)}
            options={[
              { value: "horizontal", label: "横排" },
              { value: "vertical", label: "竖排", disabled: !canVertical, title: canVertical ? undefined : "该模板仅支持横排" },
            ]}
          />
        </Field>
        <Field label="位置">
          <Segmented
            value={side}
            onChange={(s) => st().setSide(s)}
            options={[
              { value: "left", label: "左侧" },
              { value: "right", label: "右侧" },
            ]}
          />
        </Field>
        <Field label="出场">
          <Segmented
            value={layout}
            onChange={(l) => st().setLayout(l)}
            options={[
              { value: "sequence", label: "逐个" },
              { value: "stack", label: spec?.mirrored ? "成对同屏" : "同屏" },
            ]}
          />
        </Field>
        <SliderRow
          label="整体缩放"
          value={scale}
          min={0.7}
          max={1.6}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => st().setScale(v)}
        />
      </Section>

      <Section title="文字">
        <FontRow label="姓名字体" value={nameFontId} customFonts={customFonts} onChange={(id) => st().setNameFontId(id)} />
        <FontRow label="职务字体" value={titleFontId} customFonts={customFonts} onChange={(id) => st().setTitleFontId(id)} />
        <SliderRow
          label="姓名字号"
          value={textSize}
          min={0.6}
          max={1.8}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => st().setTextSize(v)}
        />
        <SliderRow
          label="职务字号"
          value={titleSize}
          min={0.5}
          max={1.8}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => st().setTitleSize(v)}
        />
        <Field label="文字处理" hint="高级模板依靠底板保证可读性；描边为旧版效果">
          <Segmented<TextFx>
            value={textFx}
            onChange={(v) => st().setTextFx(v)}
            options={[
              { value: "none", label: "无" },
              { value: "soft", label: "柔和投影" },
              { value: "outline", label: "描边" },
            ]}
          />
        </Field>
        {hasBacking ? (
          <Field label="衬底" hint="柔光：贴合文字的淡衬底（底板为浅色时自动略去）；实底：按底板颜色/不透明度铺一块干净底板">
            <Segmented<TextBacking>
              value={backing}
              onChange={(v) => st().setBacking(v)}
              options={[
                { value: "soft", label: "柔光" },
                { value: "none", label: "无" },
                { value: "solid", label: "实底" },
              ]}
            />
          </Field>
        ) : null}
      </Section>

      <Section title="颜色">
        <ColorRow label="姓名" value={toHex(nameColor)} swatches={NAME_SWATCHES} onChange={(v) => st().setNameColor(v)} />
        <ColorRow label="职务" value={toHex(titleColor)} swatches={NAME_SWATCHES} onChange={(v) => st().setTitleColor(v)} />
        <ColorRow label="强调色" value={toHex(accentColor)} swatches={ACCENT_SWATCHES} onChange={(v) => st().setAccentColor(v)} />
        <ColorRow
          label="底板"
          value={toHex(bandColor)}
          swatches={BAND_SWATCHES}
          onChange={(v) => st().setBandColor(hexToRgba(v, alphaOf(bandColor)))}
        />
        <SliderRow
          label="底板不透明"
          value={alphaOf(bandColor)}
          min={0.2}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => st().setBandColor(hexToRgba(toHex(bandColor), v))}
        />
        {spec ? (
          <button
            type="button"
            onClick={() => {
              const s = useStudio.getState();
              s.setNameColor(spec.palette.name);
              s.setTitleColor(spec.palette.title);
              s.setAccentColor(spec.palette.accent);
              s.setBandColor(spec.palette.band);
            }}
            className="self-start text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            恢复模板配色
          </button>
        ) : null}
      </Section>

      <Section title="动效">
        <Field label="入场">
          <Segmented<AnimIn>
            size="sm"
            value={moveValue}
            onChange={(m) => {
              const s = useStudio.getState();
              const dir: AnimIn = m === "left" ? (s.side === "right" ? "right" : "left") : m;
              s.setAnimIn(dir);
              if (s.activePersonId) s.focusPerson(s.activePersonId, true);
            }}
            options={MOVES.map((m) => ({ value: m.id, label: m.label }))}
          />
        </Field>
        <Field label="缓动">
          <Segmented<EaseKind>
            size="sm"
            value={ease === "snap" ? "expo" : ease}
            onChange={(v) => st().setEase(v)}
            options={EASES.map((e) => ({ value: e.id, label: e.label, title: e.title }))}
          />
        </Field>
        <EaseCurve kind={ease} />
        <SliderRow label="入场" value={inDuration} min={0.2} max={1.8} step={0.05} format={(v) => `${v.toFixed(2)}s`} onChange={(v) => st().setInDuration(v)} />
        <SliderRow label="停留" value={holdDuration} min={1} max={12} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => st().setHoldDuration(v)} />
        <SliderRow label="出场" value={outDuration} min={0.2} max={1.4} step={0.05} format={(v) => `${v.toFixed(2)}s`} onChange={(v) => st().setOutDuration(v)} />
        {layout === "stack" ? (
          <SliderRow label="错开" value={stagger} min={0} max={0.6} step={0.02} format={(v) => `${v.toFixed(2)}s`} onChange={(v) => st().setStagger(v)} />
        ) : null}
        <label className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            停留扫光
            <span className="ml-1.5 text-[10px] text-faint">约 1.2s · 仅一次</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sweep}
            aria-label="停留扫光"
            disabled={!premium}
            onClick={() => st().setSweep(!sweep)}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors disabled:opacity-35",
              sweep && premium ? "bg-brand" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
                sweep && premium && "translate-x-4",
              )}
            />
          </button>
        </label>
        <p className="text-[11px] leading-relaxed text-faint">出场自动比入场快约 30%，逆序收回。</p>
      </Section>

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => {
            useStudio.getState().resetStyle();
            toast.success("已重置样式，嘉宾名单保留");
          }}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          重置样式
        </button>
      </div>
    </div>
  );
}

function EaseCurve({ kind }: { kind: EaseKind }) {
  const f =
    kind === "linear"
      ? (t: number) => t
      : kind === "quint"
        ? (t: number) => 1 - Math.pow(1 - t, 5)
        : kind === "back"
          ? (t: number) => 1 + 2.25 * Math.pow(t - 1, 3) + 1.25 * Math.pow(t - 1, 2)
          : (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const pts = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${(8 + t * 224).toFixed(1)},${(58 - f(t) * 44).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 240 66" className="h-14 w-full rounded-md bg-black/25 ring-1 ring-hairline" aria-hidden>
      <line x1="8" y1="14" x2="232" y2="14" stroke="rgb(255 255 255 / 0.06)" />
      <line x1="8" y1="58" x2="232" y2="58" stroke="rgb(255 255 255 / 0.06)" />
      <polyline points={pts} fill="none" stroke="var(--color-brand)" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function alphaOf(c: string) {
  const m = c.match(/rgba\([^)]*,\s*([\d.]+)\s*\)/);
  return m ? Math.max(0, Math.min(1, Number(m[1]))) : 1;
}

function toHex(c: string) {
  if (c.startsWith("#") && c.length >= 7) return c.slice(0, 7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#0a0a0a";
  return (
    "#" +
    [m[1], m[2], m[3]].map((n) => Number.parseInt(n, 10).toString(16).padStart(2, "0")).join("")
  );
}

function hexToRgba(hex: string, a: number) {
  const n = hex.replace("#", "");
  if (n.length < 6) return `rgba(10,10,10,${a})`;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
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
    <Field label={label}>
      <select className="field-select flex-1 !bg-black/25" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
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
      <button
        type="button"
        aria-label="上传字体"
        title="上传字体文件（TTF / OTF / WOFF）"
        onClick={() => fileRef.current?.click()}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground ring-1 ring-input hover:bg-accent hover:text-foreground"
      >
        <Upload className="size-3.5" />
      </button>
      {customFonts.some((f) => f.id === value) ? (
        <button
          type="button"
          aria-label="删除字体"
          onClick={() => {
            void (async () => {
              await removeCustomFont(value);
              const next = useStudio.getState().customFonts.filter((f) => f.id !== value);
              useStudio.getState().setCustomFonts(next);
              const s = useStudio.getState();
              if (s.nameFontId === value) s.setNameFontId("serif");
              if (s.titleFontId === value) s.setTitleFontId("sans");
            })();
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground ring-1 ring-input hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </Field>
  );
}
