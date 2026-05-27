import { Card } from "@/components/ui/card";
import { DollarSign, Repeat, CheckCircle2, TrendingUp, CalendarClock } from "lucide-react";

interface SalesKPIsProps {
  totalRevenue: number;
  mrr: number;
  activeSales: number;
  projected12mo: number;
  nextExpiration?: string | null;
  compact?: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function SalesKPIs({ totalRevenue, mrr, activeSales, projected12mo, nextExpiration, compact }: SalesKPIsProps) {
  const kpis = [
    {
      label: "Receita total",
      value: fmt(totalRevenue),
      sub: "acumulado de todas as vendas",
      icon: DollarSign,
      tone: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "MRR ativo",
      value: fmt(mrr),
      sub: "receita recorrente mensal",
      icon: Repeat,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Vendas ativas",
      value: String(activeSales),
      sub: "contratos em vigor",
      icon: CheckCircle2,
      tone: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Projeção 12 meses",
      value: fmt(projected12mo),
      sub: "receita prevista de recorrentes",
      icon: TrendingUp,
      tone: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"}`}>
      {kpis.map((k) => (
        <Card key={k.label} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground truncate">{k.label}</p>
              <p className={`mt-1 font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"}`}>{k.value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{k.sub}</p>
            </div>
            <div className={`p-2 rounded-lg ${k.tone}`}>
              <k.icon className="w-4 h-4" />
            </div>
          </div>
        </Card>
      ))}
      {nextExpiration && !compact && (
        <Card className="p-4 lg:col-span-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Próxima expiração</p>
              <p className="text-sm font-semibold">
                {new Date(nextExpiration).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
