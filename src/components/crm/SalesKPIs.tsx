import { Card } from "@/components/ui/card";
import { DollarSign, Repeat, CheckCircle2, TrendingUp, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function SalesKPIs({
  totalRevenue,
  mrr,
  activeSales,
  projected12mo,
  nextExpiration,
  compact,
}: SalesKPIsProps) {
  const hasData = totalRevenue > 0 || mrr > 0 || activeSales > 0 || projected12mo > 0;

  const kpis = [
    { label: "Receita total", value: fmt(totalRevenue), sub: "acumulado de vendas", icon: DollarSign },
    { label: "MRR ativo", value: fmt(mrr), sub: "receita recorrente / mês", icon: Repeat },
    { label: "Vendas ativas", value: String(activeSales), sub: "contratos em vigor", icon: CheckCircle2 },
    { label: "Projeção 12 meses", value: fmt(projected12mo), sub: "previsto de recorrentes", icon: TrendingUp },
  ];

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
      {kpis.map((k) => (
        <Card
          key={k.label}
          className="group p-4 rounded-2xl border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 min-h-[36px]">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <k.icon className="w-4 h-4" />
            </div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold truncate">
              {k.label}
            </p>
          </div>
          <p
            className={cn(
              "mt-3 tabular-nums leading-none",
              !hasData
                ? "text-sm text-muted-foreground/60 font-normal italic"
                : "text-[22px] font-bold text-foreground tracking-tight"
            )}
          >
            {hasData ? k.value : "Sem dados"}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/70 truncate">{k.sub}</p>
        </Card>
      ))}
      {nextExpiration && !compact && (
        <Card className="p-4 lg:col-span-4 rounded-2xl border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">
                Próxima expiração
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {new Date(nextExpiration).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
