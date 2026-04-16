import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, DollarSign, BarChart3, AlertTriangle, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

/**
 * SaaS Forecast Formula (CFO-grade):
 * MRR(t+1) = MRR(t) + New MRR + Expansion MRR - Churn MRR
 * 
 * Where:
 * - New MRR = new customers * average ticket
 * - Expansion MRR = existing base * expansion rate (upsell/cross-sell)
 * - Churn MRR = existing base * churn rate
 * - Net New MRR = New MRR + Expansion MRR - Churn MRR
 * 
 * Scenarios:
 * - Pessimista: churn 1.5x histórico, new clients 0.5x, expansion 0x
 * - Realista: churn = histórico, new clients = média, expansion = média
 * - Otimista: churn 0.7x, new clients 1.5x, expansion 1.5x
 */

interface ForecastMonth {
  month: string;
  label: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
}

export default function AdminForecast() {
  const { loading, totalMRR, stripeMRR, churnRate, totalSubscribers, averageTicket } = useAdminDashboard();

  const forecast = useMemo(() => {
    const monthlyMRR = stripeMRR?.monthlyMRR || [];
    const monthlySales = stripeMRR?.monthlySales || [];

    if (monthlyMRR.length < 2) {
      return null;
    }

    // --- Calculate historical metrics ---
    
    // 1. Monthly churn rate (from Stripe data or profile-based)
    const historicalChurnRate = churnRate / 100; // e.g. 5% -> 0.05
    const monthlyChurn = Math.max(historicalChurnRate, 0.02); // minimum 2%

    // 2. Average new clients per month (from monthlySales)
    const recentSales = monthlySales.slice(-3);
    const avgNewClientsPerMonth = recentSales.length > 0
      ? recentSales.reduce((sum, s) => sum + s.newSales, 0) / recentSales.length
      : totalSubscribers * 0.08; // fallback: 8% of base

    // 3. Average new MRR per month
    const avgNewMRRPerMonth = avgNewClientsPerMonth * averageTicket;

    // 4. Expansion rate (upsell/cross-sell) - estimate from MRR growth vs new sales
    // If MRR grew faster than new client additions explain, the delta = expansion
    let expansionRate = 0;
    if (monthlyMRR.length >= 3) {
      const lastThreeMonths = monthlyMRR.slice(-3);
      let totalNetGrowth = 0;
      let totalExpectedFromNew = 0;
      for (let i = 1; i < lastThreeMonths.length; i++) {
        const mrrGrowth = lastThreeMonths[i].mrr - lastThreeMonths[i - 1].mrr;
        const expectedChurnLoss = lastThreeMonths[i - 1].mrr * monthlyChurn;
        const newMRR = avgNewMRRPerMonth;
        // Expansion = actual growth - new MRR + churn loss
        const impliedExpansion = mrrGrowth - newMRR + expectedChurnLoss;
        if (impliedExpansion > 0 && lastThreeMonths[i - 1].mrr > 0) {
          totalNetGrowth += impliedExpansion;
          totalExpectedFromNew += lastThreeMonths[i - 1].mrr;
        }
      }
      expansionRate = totalExpectedFromNew > 0 ? Math.min(totalNetGrowth / totalExpectedFromNew, 0.05) : 0;
    }

    // --- Build 12-month projection using MRR formula ---
    const currentMRR = totalMRR;

    const buildProjection = (
      churnMultiplier: number,
      newClientMultiplier: number,
      expansionMultiplier: number
    ): number[] => {
      const months: number[] = [];
      let mrr = currentMRR;

      for (let i = 0; i < 12; i++) {
        const churnMRR = mrr * monthlyChurn * churnMultiplier;
        const newMRR = avgNewMRRPerMonth * newClientMultiplier;
        const expansionMRR = mrr * expansionRate * expansionMultiplier;
        
        mrr = Math.max(0, mrr + newMRR + expansionMRR - churnMRR);
        months.push(Math.round(mrr));
      }

      return months;
    };

    // Pessimista: churn 1.5x, new 0.5x, expansion 0x
    const pessimisticMonths = buildProjection(1.5, 0.5, 0);
    // Realista: churn 1x, new 1x, expansion 1x
    const realisticMonths = buildProjection(1, 1, 1);
    // Otimista: churn 0.7x, new 1.5x, expansion 1.5x
    const optimisticMonths = buildProjection(0.7, 1.5, 1.5);

    // Generate month keys
    const now = new Date();
    const projectionData: ForecastMonth[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      projectionData.push({
        month: monthKey,
        label: fmtMonth(monthKey),
        pessimistic: pessimisticMonths[i],
        realistic: realisticMonths[i],
        optimistic: optimisticMonths[i],
      });
    }

    // Historical chart data
    const historicalChart = monthlyMRR.map((m) => ({
      month: m.month,
      label: fmtMonth(m.month),
      mrr: Math.round(m.mrr),
    }));

    // Cards = next 30 days (month 1 of projection)
    const next30 = {
      pessimistic: pessimisticMonths[0],
      realistic: realisticMonths[0],
      optimistic: optimisticMonths[0],
    };

    // Metrics breakdown
    const churnMRR = currentMRR * monthlyChurn;
    const netNewMRR = avgNewMRRPerMonth + (currentMRR * expansionRate) - churnMRR;
    const growthRate = currentMRR > 0 ? netNewMRR / currentMRR : 0;

    return {
      projectionData,
      historicalChart,
      next30,
      metrics: {
        churnMRR: Math.round(churnMRR),
        newMRR: Math.round(avgNewMRRPerMonth),
        expansionMRR: Math.round(currentMRR * expansionRate),
        netNewMRR: Math.round(netNewMRR),
        growthRate,
        monthlyChurn,
        avgNewClients: Math.round(avgNewClientsPerMonth),
        expansionRate,
      },
    };
  }, [stripeMRR, totalMRR, churnRate, totalSubscribers, averageTicket]);

  // Merge historical + projection for chart
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const hist = forecast.historicalChart.map((h) => ({
      ...h,
      pessimistic: undefined as number | undefined,
      realistic: undefined as number | undefined,
      optimistic: undefined as number | undefined,
    }));
    // Bridge: last historical point also starts projection
    const lastHist = forecast.historicalChart[forecast.historicalChart.length - 1];
    if (lastHist) {
      hist[hist.length - 1] = {
        ...hist[hist.length - 1],
        pessimistic: lastHist.mrr,
        realistic: lastHist.mrr,
        optimistic: lastHist.mrr,
      };
    }
    const proj = forecast.projectionData.map((p) => ({
      month: p.month,
      label: p.label,
      mrr: undefined as number | undefined,
      pessimistic: p.pessimistic,
      realistic: p.realistic,
      optimistic: p.optimistic,
    }));
    return [...hist, ...proj];
  }, [forecast]);

  const scenarioCards = useMemo(() => {
    if (!forecast) return [];
    const m = forecast.metrics;
    return [
      {
        label: "Pessimista",
        subtitle: "Próximos 30 dias",
        value: forecast.next30.pessimistic,
        delta: forecast.next30.pessimistic - totalMRR,
        desc: `Churn ↑ (${(m.monthlyChurn * 1.5 * 100).toFixed(1)}%), vendas ↓ (${Math.round(m.avgNewClients * 0.5)}/mês)`,
        icon: TrendingDown,
        gradient: "from-red-500/10 via-red-500/5 to-transparent",
        border: "border-red-500/20",
        text: "text-red-400",
        deltaBg: "bg-red-500/10 text-red-400",
      },
      {
        label: "Realista",
        subtitle: "Próximos 30 dias",
        value: forecast.next30.realistic,
        delta: forecast.next30.realistic - totalMRR,
        desc: `Churn ${(m.monthlyChurn * 100).toFixed(1)}%, ${m.avgNewClients} novos/mês, expansão ${(m.expansionRate * 100).toFixed(1)}%`,
        icon: Target,
        gradient: "from-primary/10 via-primary/5 to-transparent",
        border: "border-primary/30",
        text: "text-primary",
        deltaBg: "bg-primary/10 text-primary",
      },
      {
        label: "Otimista",
        subtitle: "Próximos 30 dias",
        value: forecast.next30.optimistic,
        delta: forecast.next30.optimistic - totalMRR,
        desc: `Churn ↓ (${(m.monthlyChurn * 0.7 * 100).toFixed(1)}%), vendas ↑ (${Math.round(m.avgNewClients * 1.5)}/mês)`,
        icon: TrendingUp,
        gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        deltaBg: "bg-emerald-500/10 text-emerald-400",
      },
    ];
  }, [forecast, totalMRR]);

  const kpis = useMemo(() => {
    const m = forecast?.metrics;
    return [
      { label: "MRR Atual", value: `R$ ${fmt(totalMRR)}`, icon: DollarSign, color: "text-primary" },
      { label: "Assinantes", value: totalSubscribers.toString(), icon: Users, color: "text-blue-400" },
      { label: "Ticket Médio", value: `R$ ${fmt(averageTicket)}`, icon: Target, color: "text-emerald-400" },
      { label: "Net New MRR", value: m ? `R$ ${fmt(m.netNewMRR)}` : "—", icon: TrendingUp, color: (m?.netNewMRR ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
      { label: "Churn MRR", value: m ? `R$ ${fmt(m.churnMRR)}` : "—", icon: AlertTriangle, color: "text-red-400" },
      { label: "Growth Rate", value: m ? `${(m.growthRate * 100).toFixed(1)}%` : "—", icon: BarChart3, color: (m?.growthRate ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
    ];
  }, [totalMRR, totalSubscribers, averageTicket, forecast]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
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
          Fórmula: MRR = MRR Atual + New MRR + Expansion MRR − Churn MRR
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/30 bg-card/60 backdrop-blur rounded-2xl">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon size={14} className={kpi.color} />
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scenario Cards — NEXT 30 DAYS */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar size={14} />
          Projeção Próximos 30 Dias
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarioCards.map((s) => (
            <Card key={s.label} className={`border ${s.border} bg-gradient-to-br ${s.gradient} rounded-2xl overflow-hidden`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <s.icon size={16} className={s.text} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.deltaBg}`}>
                    {s.delta >= 0 ? "+" : ""}R$ {fmt(s.delta)}
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">R$ {fmt(s.value)}</p>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Chart — 12 MONTHS */}
      <Card className="border-border/30 bg-card/60 backdrop-blur rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Projeção MRR — 12 Meses
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Histórico + 3 cenários · MRR Final = MRR + New + Expansion − Churn
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          {chartData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
              Dados insuficientes. É necessário pelo menos 2 meses de histórico.
            </div>
          ) : (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRealistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOptimistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPessimistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.08} />
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
                      return value != null ? [`R$ ${fmt(value)}`, labels[name] || name] : [null, null];
                    }}
                  />
                  {/* Historical */}
                  <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gradHistorical)" dot={false} connectNulls={false} />
                  {/* Projections */}
                  <Area type="monotone" dataKey="optimistic" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gradOptimistic)" dot={false} connectNulls />
                  <Area type="monotone" dataKey="realistic" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradRealistic)" dot={false} connectNulls />
                  <Area type="monotone" dataKey="pessimistic" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gradPessimistic)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-[3px] bg-primary rounded-full" />
              <span className="text-[10px] text-muted-foreground font-medium">Histórico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0" style={{ borderTop: "2px dashed hsl(var(--primary))" }} />
              <span className="text-[10px] text-muted-foreground font-medium">Realista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0" style={{ borderTop: "2px dashed #10b981" }} />
              <span className="text-[10px] text-muted-foreground font-medium">Otimista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0" style={{ borderTop: "2px dashed #ef4444" }} />
              <span className="text-[10px] text-muted-foreground font-medium">Pessimista</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formula breakdown */}
      {forecast && (
        <Card className="border-border/30 bg-card/60 backdrop-blur rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Breakdown Mensal (Cenário Realista)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">+ New MRR</p>
                <p className="text-lg font-bold text-emerald-400">R$ {fmt(forecast.metrics.newMRR)}</p>
                <p className="text-[10px] text-muted-foreground">{forecast.metrics.avgNewClients} novos clientes/mês</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">+ Expansion MRR</p>
                <p className="text-lg font-bold text-blue-400">R$ {fmt(forecast.metrics.expansionMRR)}</p>
                <p className="text-[10px] text-muted-foreground">{(forecast.metrics.expansionRate * 100).toFixed(1)}% da base</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">− Churn MRR</p>
                <p className="text-lg font-bold text-red-400">R$ {fmt(forecast.metrics.churnMRR)}</p>
                <p className="text-[10px] text-muted-foreground">{(forecast.metrics.monthlyChurn * 100).toFixed(1)}% churn mensal</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">= Net New MRR</p>
                <p className={`text-lg font-bold ${forecast.metrics.netNewMRR >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {forecast.metrics.netNewMRR >= 0 ? "+" : ""}R$ {fmt(forecast.metrics.netNewMRR)}
                </p>
                <p className="text-[10px] text-muted-foreground">{(forecast.metrics.growthRate * 100).toFixed(1)}% growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
