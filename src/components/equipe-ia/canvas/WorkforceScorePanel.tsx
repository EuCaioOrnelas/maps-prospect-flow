import { useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import { Sparkles, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";

const SCORING: { kind: EquipeNodeKind; weight: number; label: string }[] = [
  { kind: "goal", weight: 15, label: "Objetivo definido" },
  { kind: "rules", weight: 15, label: "Regras configuradas" },
  { kind: "knowledge", weight: 15, label: "Conhecimento conectado" },
  { kind: "escalation", weight: 15, label: "Escalonamento configurado" },
  { kind: "memory", weight: 15, label: "Memória configurada" },
  { kind: "tools", weight: 15, label: "Ferramentas disponíveis" },
  { kind: "data_collection", weight: 10, label: "Coleta de dados ativa" },
];

interface Props {
  nodes: Node[];
  onAddKind?: (kind: EquipeNodeKind) => void;
}

export function WorkforceScorePanel({ nodes, onAddKind }: Props) {
  const [open, setOpen] = useState(false);

  const { score, suggestions } = useMemo(() => {
    const present = new Set(nodes.map((n) => (n.data as { kind?: string })?.kind ?? ""));
    let s = 0;
    const sugg: { kind: EquipeNodeKind; label: string }[] = [];
    for (const item of SCORING) {
      if (present.has(item.kind)) s += item.weight;
      else sugg.push({ kind: item.kind, label: item.label });
    }
    return { score: Math.min(100, s), suggestions: sugg };
  }, [nodes]);

  const tone =
    score >= 85 ? "text-emerald-500" :
    score >= 60 ? "text-amber-500" :
    "text-rose-500";

  return (
    <div className="absolute top-3 right-3 z-20 w-[300px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-card border border-border rounded-xl shadow-md px-4 py-3 flex items-center gap-3 hover:border-primary/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Workforce Score</p>
          <p className={cn("text-lg font-bold leading-none mt-0.5", tone)}>{score}<span className="text-xs text-muted-foreground font-normal">/100</span></p>
        </div>
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 bg-card border border-border rounded-xl shadow-md p-3 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full transition-all",
              score >= 85 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500")}
              style={{ width: `${score}%` }} />
          </div>

          {suggestions.length === 0 ? (
            <p className="text-xs text-emerald-600">Tudo configurado. Seu colaborador está pronto para produção.</p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sugestões</p>
              <ul className="space-y-1.5">
                {suggestions.map((s) => {
                  const meta = EQUIPE_NODE_META[s.kind];
                  const Icon = meta.icon;
                  return (
                    <li key={s.kind}>
                      <button onClick={() => onAddKind?.(s.kind)}
                        className="w-full flex items-center gap-2 text-left text-xs p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="w-7 h-7 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                          <Icon size={13} />
                        </div>
                        <span className="flex-1 truncate">{s.label}</span>
                        <Plus size={12} className="text-primary" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
