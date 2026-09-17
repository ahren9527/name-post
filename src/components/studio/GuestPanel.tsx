import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudio } from "@/lib/nameplates/store";
import { isColumnStyle, type TitleLines } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";
import { Chip, SectionLabel } from "./widgets";

export function GuestPanel() {
  const people = useStudio((s) => s.people);
  const activePersonId = useStudio((s) => s.activePersonId);
  const orient = useStudio((s) => s.orient);
  const inDuration = useStudio((s) => s.inDuration);
  const holdDuration = useStudio((s) => s.holdDuration);
  const outDuration = useStudio((s) => s.outDuration);
  const [dragId, setDragId] = useState<string | null>(null);

  const person = people.find((p) => p.id === activePersonId) ?? people[0];
  const idx = Math.max(0, people.findIndex((p) => p.id === person?.id));
  const slot = (inDuration + holdDuration + outDuration).toFixed(1);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between">
        <SectionLabel>嘉宾</SectionLabel>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={people.length >= 8}
          onClick={() => {
            useStudio.getState().addPerson();
            toast.success("已添加嘉宾");
          }}
        >
          <Plus />
          添加
        </Button>
      </div>

      {person ? (
        <div className="flex flex-col gap-2.5 rounded-md border border-border bg-secondary/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              当前编辑 · {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-[11px] text-foreground">{person.name || "未命名"}</span>
          </div>
          <label className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs text-muted-foreground">姓名</span>
            <Input
              value={person.name}
              className="h-8"
              maxLength={10}
              onChange={(e) => useStudio.getState().updatePerson(person.id, { name: e.target.value })}
            />
            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
              {person.name.length}/10
            </span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs text-muted-foreground">职务</span>
            <Input
              value={person.title}
              className="h-8"
              onChange={(e) => useStudio.getState().updatePerson(person.id, { title: e.target.value })}
            />
          </label>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs text-muted-foreground">布局</span>
            <div className="grid flex-1 grid-cols-3 gap-1">
              {([1, 2, 3] as TitleLines[]).map((n) => (
                <Chip
                  key={n}
                  active={(person.titleLines ?? 1) === n}
                  onClick={() => useStudio.getState().updatePerson(person.id, { titleLines: n })}
                >
                  {n}
                  {isColumnStyle(orient) ? "列" : "行"}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {people.length === 0 ? (
        <button
          type="button"
          onClick={() => useStudio.getState().addPerson()}
          className="rounded-md border border-dashed border-border px-3 py-8 text-xs text-muted-foreground hover:bg-accent"
        >
          还没有嘉宾，点击添加
        </button>
      ) : (
        <ul className="flex flex-col gap-1.5">
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
              >
                <div
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md border px-1.5 py-1.5 transition-[border-color,background-color] duration-150",
                    active ? "border-brand/50 bg-secondary" : "border-border hover:bg-accent",
                    dragId === item.id && "opacity-50",
                  )}
                >
                  <span
                    className="cursor-grab text-muted-foreground active:cursor-grabbing"
                    aria-label="拖动排序"
                  >
                    <GripVertical className="size-3.5" />
                  </span>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => useStudio.getState().focusPerson(item.id)}
                  >
                    <span className="w-5 font-mono text-[10px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.name || "未命名"}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {item.title || "职务"}
                      </span>
                    </span>
                  </button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="复制嘉宾"
                    onClick={() => {
                      useStudio.getState().duplicatePerson(item.id);
                      toast.success("已复制嘉宾");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="删除嘉宾"
                    disabled={people.length <= 1}
                    onClick={() => {
                      useStudio.getState().removePerson(item.id);
                      toast.success("已删除");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        点名单切换当前编辑。拖动手柄排序。每人 {slot}s。
      </p>
    </div>
  );
}
