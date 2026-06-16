import { EQUIPE_NODE_LIST } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (kind: string) => void;
}

export function NodePalette({ onAdd }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r bg-card/60 backdrop-blur-sm overflow-y-auto scrollbar-thin">
      <div className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Cards disponíveis
        </h3>
        <p className="text-[11px] text-muted-foreground/70 mb-4">
          Clique para adicionar ao construtor.
        </p>
        <div className="space-y-1.5">
          {EQUIPE_NODE_LIST.filter((n) => n.kind !== "core").map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.kind}
                onClick={() => onAdd(n.kind)}
                className={cn(
                  "w-full text-left flex items-center gap-3 rounded-lg",
                  "px-2.5 py-2 hover:bg-accent/60 transition-colors group",
                )}
              >
                <div
                  className={cn(
                    "rounded-lg w-9 h-9 flex items-center justify-center shrink-0",
                    "bg-muted/60 group-hover:bg-background border border-border/40",
                    n.color,
                  )}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {n.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
