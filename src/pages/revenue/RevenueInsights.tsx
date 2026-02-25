import { DollarSign, TrendingUp, AlertTriangle, BarChart3, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRevenueDashboardStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Morno",
  HOT: "Engajado",
  VERY_HOT: "Quente",
};

const bucketEmojis: Record<string, string> = {
  COLD: "🧊",
  ENGAGED: "💬",
  HOT: "🔥",
  VERY_HOT: "🔥🔥",
};

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
        <h1 className="text-2xl font-bold text-foreground">Projeções de Receita</h1>
        <p className="text-sm text-muted-foreground">
          Estimativas baseadas no engajamento dos leads, ticket médio e taxas de conversão configuradas
        </p>
      </div>

      {/* Explainer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground font-medium mb-1">Como os valores são calculados?</p>
              <p className="text-xs leading-relaxed">
                <strong>Receita Potencial:</strong> Quantidade de leads quentes e muito quentes × ticket médio — o cenário ideal se todos fecharem.
                <br />
                <strong>Receita Esperada:</strong> Soma ponderada de cada nível × sua taxa de conversão × ticket médio — uma estimativa mais realista.
                <br />
                <strong>Receita em Risco:</strong> Valor esperado dos leads quentes que estão esfriando ou em risco de serem perdidos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={14} />
              Receita Potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{fmt(receitaPotencial)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {buckets.HOT + buckets.VERY_HOT} leads engajados/quentes × {fmt(ticket)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp size={14} />
              Receita Esperada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(receitaEsperada)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ponderada pelas taxas de conversão de cada nível
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={14} />
              Receita em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{fmt(receitaEmRisco)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {atRiskHotLeads} leads engajados/quentes com risco de perda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by bucket */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} />
            Detalhamento por Nível
          </CardTitle>
          <CardDescription>
            Quantidade de leads, taxa de conversão e receita esperada para cada nível de engajamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                <div key={bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {bucketEmojis[bucket]} {bucketLabels[bucket]} ({count} leads)
                    </span>
                    <span className="text-muted-foreground">
                      Taxa {(rate * 100).toFixed(0)}% → {fmt(expected)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
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
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Parâmetros usados neste cálculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Ticket Médio</p>
              <p className="font-medium text-foreground">{fmt(ticket)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Frio</p>
              <p className="font-medium text-foreground">{(rates.COLD * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Engajado</p>
              <p className="font-medium text-foreground">{(rates.ENGAGED * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa Quente</p>
              <p className="font-medium text-foreground">{(rates.HOT * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa M. Quente</p>
              <p className="font-medium text-foreground">{(rates.VERY_HOT * 100).toFixed(0)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-3">
            Ajuste esses valores em Configurações para refletir a realidade do seu negócio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueInsights;
