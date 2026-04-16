import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, DollarSign, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (n >= 10_000) return `${(n / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtMonth(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function AdminForecast() {
  const { loading, totalMRR, stripeMRR, churnRate, totalSubscribers, averageTicket } = useAdminDashboard();

  const { historicalData, projectionData, scenarios, avgGrowthRate, trend } = useMemo(() => {
    const monthlyMRR = stripeMRR?.monthlyMRR || [];
    if (monthlyMRR.length < 2) {
      return { historicalData: [], projectionData: [], scenarios: [], avgGrowthRate: 0, trend: "stable" as const };
    }

    // Calculate month-over-month growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < monthlyMRR.length; i++) {
      const prev = monthlyMRR[i - 1].mrr;
      const curr = monthlyMRR[i].mrr;
      if (prev > 0) {
        growthRates.push((curr - prev) / prev);
      }
    }

    // Use last 3 months weighted average (more recent = more weight)
    const recentRates = growthRates.slice(-3);
    let avgGrowth = 0;
    if (recentRates.length > 0) {
      const weights = recentRates.length === 1 ? [1] : recentRates.length === 2 ? [1, 2] : [1, 2, 3];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      avgGrowth = recentRates.reduce((sum, r, i) => sum + r * weights[i], 0) / totalWeight;
    }

    const trend = avgGrowth > 0.02 ? "up" : avgGrowth < -0.02 ? "down" : "stable";

    // Historical data
    const historical = monthlyMRR.map((m) => ({
      month: m.month,
      label: fmtMonth(m.month),
      mrr: Math.round(m.mrr),
      type: "historical" as const,
    }));

    // Project 12 months from last data point
    const lastMRR = monthlyMRR[monthlyMRR.length - 1].mrr;
    const lastMonth = monthlyMRR[monthlyMRR.length - 1].month;
    const [lastY, lastM] = lastMonth.split("-").map(Number);

    const projection: typeof historical = [];
    for (let i = 1; i <= 12; i++) {
      const date = new Date(lastY, lastM - 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const pessimistic = Math.max(0, Math.round(lastMRR * Math.pow(1 + Math.min(avgGrowth - 0.05, -0.02), i)));
      const realistic = Math.round(lastMRR * Math.pow(1 + avgGrowth, i));
      const optimistic = Math.round(lastMRR * Math.pow(1 + Math.max(avgGrowth + 0.05, 0.03), i));

      projection.push({
        month: monthKey,
        label: fmtMonth(monthKey),
        pessimistic,
        realistic,
        optimistic,
        type: "projection" as const,
      } as any);
    }

    // Scenarios for cards
    const scenarioData = [
      {
        label: "Pessimista",
        value: projection[projection.length - 1]?.pessimistic || 0,
        rate: Math.min(avgGrowth - 0.05, -0.02),
        icon: TrendingDown,
        gradient: "from-red-500/10 to-red-500/5",
        border: "border-red-500/20",
        text: "text-red-400",
        badge: "bg-red-500/15 text-red-400",
      },
      {
        label: "Realista",
        value: projection[projection.length - 1]?.realistic || 0,
        rate: avgGrowth,
        icon: Target,
        gradient: "from-primary/10 to-primary/5",
        border: "border-primary/20",
        text: "text-primary",
        badge: "bg-primary/15 text-primary",
      },
      {
        label: "Otimista",
        value: projection[projection.length - 1]?.optimistic || 0,
        rate: Math.max(avgGrowth + 0.05, 0.03),
        icon: TrendingUp,
        gradient: "from-emerald-500/10 to-emerald-500/5",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-400",
      },
    ];

    // Merge for chart
    const chartData = [
      ...historical.map((h) => ({ ...h, pessimistic: undefined, realistic: undefined, optimistic: undefined })),
      ...projection.map((p: any) => ({ ...p, mrr: undefined })),
    ];

    return {
      historicalData: chartData,
      projectionData: projection,
      scenarios: scenarioData,
      avgGrowthRate: avgGrowth,
      trend,
    };
  }, [stripeMRR]);

  const kpis = useMemo(() => [
    {
      label: "MRR Atual",
      value: `R$ ${fmt(totalMRR)}`,
      icon: DollarSign,
      color: "text-primary",
    },
    {
      label: "Assinantes",
      value: totalSubscribers.toString(),
      icon: BarChart3,
      color: "text-blue-400",
    },
    {
      label: "Ticket Médio",
      value: `R$ ${fmt(averageTicket)}`,
      icon: Target,
      color: "text-emerald-400",
    },
    {
      label: "Churn Rate",
      value: `${churnRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: churnRate > 5 ? "text-red-400" : "text-yellow-400",
    },
  ], [totalMRR, totalSubscribers, averageTicket, churnRate]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forecast de Receita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projeção de 12 meses baseada no crescimento médio ({(avgGrowthRate * 100).toFixed(1)}%/mês)
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/30 bg-card/60 backdrop-blur rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-muted/40 ${kpi.color}`}>
                <kpi.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <Card key={s.label} className={`border ${s.border} bg-gradient-to-br ${s.gradient} rounded-2xl overflow-hidden`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <s.icon size={16} className={s.text} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
                  {(s.rate * 100).toFixed(1)}%/mês
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">R$ {fmt(s.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">MRR em 12 meses</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-border/30 bg-card/60 backdrop-blur rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Projeção MRR — 12 Meses
          </CardTitle>
          <p className="text-xs text-muted-foreground">Histórico + projeção com base no crescimento médio ponderado</p>
        </CardHeader>
        <CardContent className="pb-4">
          {historicalData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
              Dados insuficientes. É necessário pelo menos 2 meses de histórico.
            </div>
          ) : (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRealistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOptimistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPessimistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `R$${fmt(v)}`}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "11px",
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        mrr: "Histórico",
                        realistic: "Realista",
                        optimistic: "Otimista",
                        pessimistic: "Pessimista",
                      };
                      return value ? [`R$ ${fmt(value)}`, labels[name] || name] : [null, null];
                    }}
                  />
                  {/* Historical */}
                  <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gradHistorical)" dot={false} connectNulls={false} />
                  {/* Projections */}
                  <Area type="monotone" dataKey="optimistic" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gradOptimistic)" dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="realistic" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradRealistic)" dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="pessimistic" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gradPessimistic)" dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-primary rounded" />
              <span className="text-[10px] text-muted-foreground">Histórico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-primary rounded border-dashed" style={{ borderTop: "2px dashed hsl(var(--primary))", height: 0 }} />
              <span className="text-[10px] text-muted-foreground">Realista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ borderTop: "2px dashed #10b981", height: 0 }} />
              <span className="text-[10px] text-muted-foreground">Otimista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ borderTop: "2px dashed #ef4444", height: 0 }} />
              <span className="text-[10px] text-muted-foreground">Pessimista</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
