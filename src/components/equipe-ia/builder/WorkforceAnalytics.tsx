import { BarChart3 } from "lucide-react";

interface Props { equipeId: string }

export function WorkforceAnalytics({ }: Props) {
  // Placeholder KPIs — connect to agent_conversations/handoff_assignments later.
  const kpis = [
    { label: "Conversas iniciadas", value: "—" },
    { label: "Conversas concluídas", value: "—" },
    { label: "Taxa de sucesso", value: "—" },
    { label: "Objetivos concluídos", value: "—" },
    { label: "Transferências humanas", value: "—" },
    { label: "Tempo médio para conclusão", value: "—" },
    { label: "Leads qualificados", value: "—" },
    { label: "Uso de IA (tokens)", value: "—" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
          <BarChart3 className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance do colaborador digital</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
            <p className="text-2xl font-bold mt-2 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          As métricas em tempo real ficarão disponíveis assim que o colaborador estiver ativo e processando conversas.
        </p>
      </div>
    </div>
  );
}
