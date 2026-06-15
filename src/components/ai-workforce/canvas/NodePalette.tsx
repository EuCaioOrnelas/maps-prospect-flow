import { WORKFORCE_NODE_LIST } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (kind: string) => void;
}

export function NodePalette({ onAdd }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r bg-background/60 backdrop-blur-sm p-4 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Cards disponíveis
      </h3>
      <div className="space-y-2">
        {WORKFORCE_NODE_LIST.filter((n) => n.kind !== "core").map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.kind}
              onClick={() => onAdd(n.kind)}
              className={cn(
                "w-full text-left flex items-start gap-3 rounded-lg border border-border/60",
                "px-3 py-2.5 bg-card hover:bg-accent/40 hover:border-border transition-colors"
              )}
            >
              <div className={cn("rounded-md p-1.5 bg-muted/40 shrink-0 mt-0.5", n.color)}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{n.label}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
