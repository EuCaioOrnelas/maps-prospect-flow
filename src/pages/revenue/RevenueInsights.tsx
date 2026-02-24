import { DollarSign, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueDashboardStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const RevenueInsights = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();

  const ticket = settings?.default_ticket_value || 3000;
  const rates = {
    COLD: settings?.default_close_rate_cold || 0.05,
    ENGAGED: settings?.default_close_rate_engaged || 0.15,
    HOT: settings?.default_close_rate_hot || 0.35,
    VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
  };

  const buckets = stats?.bucketCounts || { COLD: 0, ENGAGED: 0, HOT: 0, VERY_HOT: 0 };

  const receitaPotencial = (buckets.HOT + buckets.VERY_HOT) * ticket;
  const receitaEsperada = Object.entries(buckets).reduce(
    (sum, [b, count]) => sum + count * ticket * (rates[b as keyof typeof rates] || 0),
    0
  );

  // Risk = HOT/VERY_HOT leads with risk_state != OK
  const atRiskHotLeads = stats?.topOpportunities.filter(
    (l) =>
      (l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT") &&
      l.risk_state !== "OK"
  ).length || 0;
  const receitaEmRisco = atRiskHotLeads * ticket * ((rates.HOT + rates.VERY_HOT) / 2);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Insights de Receita</h1>
        <p className="text-sm text-muted-foreground">
          Projeções baseadas em engajamento, ticket médio e taxas de conversão
        </p>
      </div>

      {/* Main cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={14} />
              Receita Potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{fmt(receitaPotencial)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {buckets.HOT + buckets.VERY_HOT} leads HOT/VERY HOT × {fmt(ticket)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp size={14} />
              Receita Esperada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(receitaEsperada)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ponderada pelas taxas de conversão por bucket
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={14} />
              Receita em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{fmt(receitaEmRisco)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {atRiskHotLeads} leads quentes com risco elevado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by bucket */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} />
            Breakdown por Bucket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(["VERY_HOT", "HOT", "ENGAGED", "COLD"] as const).map((bucket) => {
              const count = buckets[bucket];
              const rate = rates[bucket];
              const expected = count * ticket * rate;
              const maxCount = Math.max(...Object.values(buckets), 1);
              const width = (count / maxCount) * 100;

              const colors: Record<string, string> = {
                COLD: "bg-blue-500",
                ENGAGED: "bg-yellow-500",
                HOT: "bg-orange-500",
                VERY_HOT: "bg-red-500",
              };

              return (
                <div key={bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {bucket.replace("_", " ")} ({count})
                    </span>
                    <span className="text-muted-foreground">
                      {(rate * 100).toFixed(0)}% → {fmt(expected)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", colors[bucket])}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Config info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Configurações usadas neste cálculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Ticket Médio</p>
              <p className="font-medium text-foreground">{fmt(ticket)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Cold</p>
              <p className="font-medium text-foreground">{(rates.COLD * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Engaged</p>
              <p className="font-medium text-foreground">{(rates.ENGAGED * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Hot</p>
              <p className="font-medium text-foreground">{(rates.HOT * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueInsights;
