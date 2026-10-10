import { FolderOpen, LayoutTemplate, Users } from "lucide-react";
import { useStudio } from "@/lib/nameplates/store";
import { cn } from "@/lib/utils";

type Item = { id: "style" | "guests" | "projects"; icon: typeof Users; label: string };

const ITEMS: Item[] = [
  { id: "style", icon: LayoutTemplate, label: "模板" },
  { id: "guests", icon: Users, label: "嘉宾" },
  { id: "projects", icon: FolderOpen, label: "项目" },
];

export function LeftRail() {
  const workspace = useStudio((s) => s.workspace);
  const editorNav = useStudio((s) => s.editorNav);
  const count = useStudio((s) => s.people.length);

  return (
    <nav
      className="order-last flex shrink-0 gap-1 border-t border-border bg-rail p-1.5 md:order-none md:w-[3.75rem] md:flex-col md:items-center md:border-t-0 md:border-r md:py-3"
      aria-label="工坊导航"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.id === "projects"
            ? workspace === "projects"
            : workspace !== "projects" && (item.id === "style" ? editorNav !== "guests" : editorNav === "guests");
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => {
              if (item.id === "projects") useStudio.getState().setWorkspace("projects");
              else useStudio.getState().setEditorNav(item.id);
            }}
            className={cn(
              "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10.5px] transition-[background-color,color] duration-150 md:w-12 md:flex-none md:py-2.5",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            {active ? <span className="absolute top-2.5 bottom-2.5 -left-1.5 hidden w-0.5 rounded-full bg-brand md:block" /> : null}
            <Icon className="size-[18px]" strokeWidth={1.75} />
            {item.label}
            {item.id === "guests" && count ? (
              <span className="absolute top-1 right-1 min-w-4 rounded-full bg-white/10 px-1 font-mono text-[9px] leading-4 text-foreground/80">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
