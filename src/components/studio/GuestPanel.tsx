import { ClipboardPaste, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStudio } from "@/lib/nameplates/store";
import type { Person } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

const MAX_GUESTS = 12;

/** "姓名 职务 [ENGLISH]" per line → people. Tabs, commas or 2+ spaces separate fields. */
function parseBulk(text: string): Person[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_GUESTS)
    .map((line, i) => {
      const parts = line.split(/\t|\s{2,}|[|｜]|,(?![^(（]*[)）])/).map((s) => s.trim()).filter(Boolean);
      const en = parts[2] ?? "";
      let name = parts[0] ?? "";
      let title = parts[1] ?? "";
      if (parts.length === 1) {
        const m = line.match(/^(\S{2,4})\s+(.+)$/);
        if (m) {
          name = m[1];
          title = m[2];
        }
      }
      return {
        id: `p-bulk-${Date.now()}-${i}`,
        name,
        title,
        en: /^[A-Za-z .'-]+$/.test(en) ? en : "",
        titleLines: (title.length > 16 ? 2 : 1) as 1 | 2,
      };
    })
    .filter((p) => p.name);
}

export function GuestPanel() {
  const people = useStudio((s) => s.people);
  const activePersonId = useStudio((s) => s.activePersonId);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const [dragId, setDragId] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const slot = (inDuration + holdDuration + outDuration).toFixed(1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide">嘉宾</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {people.length} 位 · 每人 {slot}s · 拖动排序
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            title="批量粘贴名单"
            aria-label="批量粘贴名单"
            onClick={() => setBulk(bulk == null ? "" : null)}
            className={cn(
              "flex size-8 items-center justify-center rounded-md ring-1 ring-border hover:bg-accent",
              bulk != null ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <ClipboardPaste className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={people.length >= MAX_GUESTS}
            onClick={() => useStudio.getState().addPerson()}
            className="flex h-8 items-center gap-1 rounded-md bg-brand px-2.5 text-xs font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-40"
          >
            <Plus className="size-3.5" /> 添加
          </button>
        </div>
      </div>

      {bulk != null ? (
        <div className="mx-4 mb-3 flex flex-col gap-2 rounded-lg bg-black/25 p-3 ring-1 ring-border">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            每行一位：<span className="text-foreground/80">姓名 ⇥ 职务 ⇥ 英文（可选）</span>，用 Tab、两个空格或竖线分隔。会替换当前名单。
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"熊义志\t吕梁市委副书记、市长\tXIONG YIZHI\n宋书玉\t中国酒业协会理事长"}
            className="w-full resize-none rounded-md bg-black/30 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed ring-1 ring-input outline-none focus:ring-brand/60"
          />
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => setBulk(null)} className="h-7 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground">
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                const list = parseBulk(bulk);
                if (!list.length) {
                  toast.error("没有识别到姓名");
                  return;
                }
                useStudio.getState().setPeople(list);
                useStudio.getState().setActivePersonId(list[0].id);
                setBulk(null);
                toast.success(`已导入 ${list.length} 位嘉宾`);
              }}
              className="h-7 rounded-md bg-accent px-3 text-xs text-foreground ring-1 ring-border hover:bg-white/10"
            >
              导入名单
            </button>
          </div>
        </div>
      ) : null}

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {people.length === 0 ? (
          <button
            type="button"
            onClick={() => useStudio.getState().addPerson()}
            className="mx-2 w-[calc(100%-1rem)] rounded-lg border border-dashed border-border px-3 py-10 text-xs text-muted-foreground hover:bg-accent"
          >
            还没有嘉宾，点击添加
          </button>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {people.map((item, index) => {
              const active = item.id === activePersonId;
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId) return;
                    const from = people.findIndex((p) => p.id === dragId);
                    useStudio.getState().reorderPeople(from, index);
                    setDragId(null);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors duration-150",
                    active ? "bg-accent ring-1 ring-white/8" : "hover:bg-white/[0.035]",
                    dragId === item.id && "opacity-40",
                  )}
                >
                  <span className="cursor-grab text-faint opacity-0 group-hover:opacity-100 active:cursor-grabbing" aria-label="拖动排序">
                    <GripVertical className="size-3.5" />
                  </span>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => useStudio.getState().focusPerson(item.id)}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px]",
                        active ? "bg-brand text-brand-foreground" : "bg-black/30 text-muted-foreground ring-1 ring-border",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{item.name || "未命名"}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{item.title || "职务"}</span>
                    </span>
                  </button>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label="复制嘉宾"
                      onClick={() => useStudio.getState().duplicatePerson(item.id)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="删除嘉宾"
                      disabled={people.length <= 1}
                      onClick={() => useStudio.getState().removePerson(item.id)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-faint">
        选中嘉宾后在右侧「内容」编辑姓名、英文、职务与标签。
      </p>
    </div>
  );
}
