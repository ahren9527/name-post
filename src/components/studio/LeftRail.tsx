import { Folder, Sparkles, Type, Users } from "lucide-react";
import { useStudio } from "@/lib/nameplates/store";
import type { EditorNav } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

const ITEMS: { id: EditorNav | "projects"; icon: typeof Type; label: string }[] = [
  { id: "style", icon: Type, label: "风格" },
  { id: "guests", icon: Users, label: "嘉宾" },
  { id: "anim", icon: Sparkles, label: "动画" },
  { id: "projects", icon: Folder, label: "我的" },
];

export function LeftRail() {
  const workspace = useStudio((s) => s.workspace);
  const editorNav = useStudio((s) => s.editorNav);

  return (
    <nav
      className="order-last flex shrink-0 gap-1 border-t border-border bg-rail p-1 md:order-none md:w-16 md:flex-col md:border-t-0 md:border-r md:p-2"
      aria-label="工坊导航"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.id === "projects"
            ? workspace === "projects"
            : workspace !== "projects" &&
              (item.id === "style"
                ? editorNav === "style" || workspace === "presets"
                : editorNav === item.id && workspace !== "presets");
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === "projects") {
                useStudio.getState().setWorkspace("projects");
              } else {
                useStudio.getState().setEditorNav(item.id);
              }
            }}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] transition-[background-color,color] duration-150 md:flex-none md:py-3",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}