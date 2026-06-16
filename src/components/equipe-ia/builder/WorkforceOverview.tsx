import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { Bot, Target, Brain, ShieldCheck, BookOpen, Database, Zap, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";
import type { Equipe } from "@/hooks/useEquipeIA";

interface Props {
  worker: Equipe;
  nodes: Node[];
}

const SCORING: { kind: EquipeNodeKind; weight: number; label: string }[] = [
  { kind: "goal", weight: 15, label: "Objetivo definido" },
  { kind: "rules", weight: 15, label: "Regras configuradas" },
  { kind: "knowledge", weight: 15, label: "Conhecimento conectado" },
  { kind: "escalation", weight: 15, label: "Escalonamento configurado" },
  { kind: "memory", weight: 15, label: "Memória configurada" },
  { kind: "tools", weight: 15, label: "Ferramentas disponíveis" },
  { kind: "data_collection", weight: 10, label: "Coleta de dados" },
];

export function WorkforceOverview({ worker, nodes }: Props) {
  const { score, present, modules } = useMemo(() => {
    const p = new Set(nodes.map((n) => (n.data as { kind?: string })?.kind ?? ""));
    let s = 0;
    for (const item of SCORING) if (p.has(item.kind)) s += item.weight;
    const mods = nodes.filter((n) => (n.data as { kind?: string })?.kind !== "core");
    return { score: Math.min(100, s), present: p, modules: mods };
  }, [nodes]);

  const goal = nodes.find((n) => (n.data as { kind?: string })?.kind === "goal");
  const goalSummary = (goal?.data as { summary?: string })?.summary;

  const status = worker.status?.toLowerCase() === "active" ? "Ativo" : "Rascunho";
  const scoreTone = score >= 85 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center text-primary shrink-0">
              <Bot className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Colaborador Digital</p>
              <h2 className="text-2xl font-bold tracking-tight mt-0.5">{worker.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{worker.role || "Sem função definida"}</p>
              {worker.description && (
                <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{worker.description}</p>
              )}
            </div>
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md ring-1",
              status === "Ativo"
                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 ring-amber-500/30",
            )}>
              <span className="size-1.5 rounded-full bg-current" />
              {status}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Workforce Score</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={cn("text-5xl font-bold tabular-nums leading-none", scoreTone)}>{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="w-full mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full transition-all", score >= 85 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${score}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            {modules.length} de 10 módulos configurados
          </p>
        </div>
      </div>

      {/* Objective + config checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="size-4 text-emerald-500" />
            <p className="text-sm font-semibold">Objetivo principal</p>
          </div>
          {goalSummary ? (
            <p className="text-sm text-foreground/90 leading-relaxed">{goalSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum objetivo configurado. Adicione um módulo de Objetivo no canvas.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm font-semibold mb-3">Configuração</p>
          <ul className="space-y-2">
            {SCORING.map((s) => {
              const ok = present.has(s.kind);
              return (
                <li key={s.kind} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Modules grid */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-sm font-semibold mb-4">Módulos conectados ({modules.length})</p>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum módulo conectado ao núcleo ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map((n) => {
              const kind = (n.data as { kind?: EquipeNodeKind })?.kind;
              if (!kind) return null;
              const meta = EQUIPE_NODE_META[kind];
              if (!meta) return null;
              const Icon = meta.icon;
              const summary = (n.data as { summary?: string })?.summary;
              return (
                <div key={n.id} className="border border-border rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {summary || "Sem configuração"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
