import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Repeat, CheckCircle2, TrendingUp, CalendarClock } from "lucide-react";
import { MetricSlot } from "@/components/ui/metric-empty";
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
  const kpis = [
    {
      label: "Receita total",
      value: fmt(totalRevenue),
      sub: "acumulado de vendas",
      icon: DollarSign,
      empty: totalRevenue === 0,
      hint: "Aparece ao registrar a primeira venda.",
    },
    {
      label: "MRR ativo",
      value: fmt(mrr),
      sub: "receita recorrente / mês",
      icon: Repeat,
      empty: mrr === 0,
      hint: "Aparece quando há vendas recorrentes ativas.",
    },
    {
      label: "Vendas ativas",
      value: String(activeSales),
      sub: "contratos em vigor",
      icon: CheckCircle2,
      empty: activeSales === 0,
      hint: "Aparece ao registrar uma venda.",
    },
    {
      label: "Projeção 12 meses",
      value: fmt(projected12mo),
      sub: "previsto de recorrentes",
      icon: TrendingUp,
      empty: projected12mo === 0,
      hint: "Aparece quando há vendas recorrentes ativas.",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {kpis.map((k) => (
        <Card key={k.label} className="border-border/50 relative overflow-hidden">
          {/* Green glow */}
          {!k.empty && (
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-2xl pointer-events-none" />
          )}
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
                  k.empty ? "bg-muted/50" : "bg-primary/[0.07] dark:bg-primary/[0.12]"
                )}
              >
                <k.icon
                  className={cn("w-[15px] h-[15px]", k.empty ? "text-muted-foreground/40" : "text-primary")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none truncate">
                  {k.label}
                </p>
                <MetricSlot
                  cacheKey={`sales:${k.label}`}
                  empty={k.empty}
                  hint={k.hint}
                  size="sm"
                  className="min-h-[26px] mt-1.5"
                >
                  <div>
                    <p
                      className="text-[22px] font-bold leading-none"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {k.value}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/50 font-light truncate">
                      {k.sub}
                    </p>
                  </div>
                </MetricSlot>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {nextExpiration && !compact && (
        <Card className="lg:col-span-4 border-amber-500/30 relative overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10 dark:bg-amber-500/[0.14]">
                <CalendarClock className="w-[15px] h-[15px] text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none truncate">
                  Próxima expiração
                </p>
                <p className="text-[22px] font-bold leading-none mt-1.5">
                  {new Date(nextExpiration).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
