import { useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: (kind: string) => void;
}

const CATEGORIES: { label: string; kinds: EquipeNodeKind[] }[] = [
  { label: "Estratégia", kinds: ["goal", "rules", "decision"] },
  { label: "Contexto", kinds: ["memory", "knowledge", "crm_data"] },
  { label: "Interação", kinds: ["data_collection", "analysis"] },
  { label: "Execução", kinds: ["tools", "actions", "escalation"] },
];

export function NodePalette({ onAdd }: Props) {
  const [open, setOpen] = useState(true);
  const [openCats, setOpenCats] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.label)),
  );

  const toggleCat = (label: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  return (
    <>
      {/* Reopen button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "absolute top-2 left-2 z-20 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all duration-200",
          open ? "opacity-0 pointer-events-none scale-90 delay-0" : "opacity-100 pointer-events-auto scale-100 delay-300",
        )}
        title="Abrir painel"
      >
        <PanelLeftOpen size={14} />
      </button>

      <aside
        className={cn(
          "border-r border-border bg-card shrink-0 flex flex-col transition-all duration-300 ease-out overflow-hidden",
          open ? "w-[240px]" : "w-0 border-r-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 min-w-[240px]">
          <div>
            <p className="text-sm font-bold text-foreground">Cards</p>
            <p className="text-[10px] text-muted-foreground">Clique para adicionar</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            title="Fechar painel"
          >
            <PanelLeftClose size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin min-w-[240px]">
          {CATEGORIES.map((cat) => {
            const isOpen = openCats.has(cat.label);
            return (
              <div key={cat.label}>
                <button
                  onClick={() => toggleCat(cat.label)}
                  className="w-full flex items-center gap-1.5 mb-2 px-1"
                >
                  <ChevronDown
                    size={12}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200 shrink-0",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {cat.label}
                  </p>
                </button>
                {isOpen && (
                  <div className="space-y-1.5">
                    {cat.kinds.map((kind) => {
                      const meta = EQUIPE_NODE_META[kind];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={kind}
                          onClick={() => onAdd(kind)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 text-left group shadow-sm"
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/60 border border-border/40",
                            meta.color,
                          )}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{meta.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                              {meta.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
