import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, DollarSign, BarChart3, AlertTriangle, Calendar, Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
 * SaaS CFO Forecast — Wiize (WhatsApp SMB SaaS)
 * 
 * Formula: MRR(n) = MRR(n-1) + New MRR + Expansion MRR − Churn MRR
 * 
 * Premissas calibradas para SaaS WhatsApp SMB Brasil:
 * - Churn tende a ser alto (PME cancelam rápido, switching cost baixo)
 * - Expansão via upgrade de plano / módulos adicionais
 * - Vendas flutuam conforme performance comercial
 * 
 * Cards = próximos 30 dias
 * Gráfico = 12 meses com crescimento composto (MRR acumulado)
 * 
 * Cenários:
 * - Pessimista: churn × 2.2, vendas × 0.6, expansão = 0
 * - Realista: churn × 1, vendas × 1, expansão × 1
 * - Otimista: churn × 0.8, vendas × 1.4, expansão × 1.5
 */

interface ProjectionMonth {
  month: string;
  label: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
  // Breakdown for realistic
  newMRR: number;
  expansionMRR: number;
  churnMRR: number;
  netNewMRR: number;
  growthRate: number;
}

export default function AdminForecast() {
  const { loading, totalMRR, stripeMRR, churnRate, totalSubscribers, averageTicket } = useAdminDashboard();

  const forecast = useMemo(() => {
    const monthlyMRR = stripeMRR?.monthlyMRR || [];
    const monthlySales = stripeMRR?.monthlySales || [];

    if (monthlyMRR.length < 1 && totalMRR <= 0) return null;

    // === HISTORICAL DRIVERS ===

    // 1. Monthly churn rate — floor at 5% for WhatsApp SMB SaaS
    const rawChurn = churnRate / 100;
    const monthlyChurn = Math.max(rawChurn, 0.05);

    // 2. Average new clients/month (last 3 months weighted)
    const recentSales = monthlySales.slice(-3);
    const avgNewClientsPerMonth = recentSales.length > 0
      ? recentSales.reduce((sum, s, i) => {
          const weight = i === recentSales.length - 1 ? 2 : 1; // weight recent more
          return sum + s.newSales * weight;
        }, 0) / (recentSales.length + 1)
      : Math.max(totalSubscribers * 0.06, 1);

    // 3. New MRR per month
    const avgNewMRRPerMonth = avgNewClientsPerMonth * averageTicket;

    // 4. Expansion rate — derived from MRR growth exceeding new+churn
    let expansionRate = 0;
    if (monthlyMRR.length >= 3) {
      const last3 = monthlyMRR.slice(-3);
      let totalImplied = 0;
      let totalBase = 0;
      for (let i = 1; i < last3.length; i++) {
        const growth = last3[i].mrr - last3[i - 1].mrr;
        const churnLoss = last3[i - 1].mrr * monthlyChurn;
        const implied = growth - avgNewMRRPerMonth + churnLoss;
        if (implied > 0 && last3[i - 1].mrr > 0) {
          totalImplied += implied;
          totalBase += last3[i - 1].mrr;
        }
      }
      expansionRate = totalBase > 0 ? Math.min(totalImplied / totalBase, 0.04) : 0;
    }

    const currentMRR = totalMRR;

    // === BUILD 12-MONTH COMPOUND PROJECTION ===
    const buildProjection = (
      churnMult: number,
      newMult: number,
      expMult: number
    ): number[] => {
      const result: number[] = [];
      let mrr = currentMRR;
      for (let i = 0; i < 12; i++) {
        const churnLoss = mrr * monthlyChurn * churnMult;
        const newMRR = avgNewMRRPerMonth * newMult;
        const expMRR = mrr * expansionRate * expMult;
        mrr = Math.max(0, mrr + newMRR + expMRR - churnLoss);
        result.push(Math.round(mrr));
      }
      return result;
    };

    // Pessimista: churn ×2.2, vendas ×0.6, expansão ×0
    const pessMonths = buildProjection(2.2, 0.6, 0);
    // Realista: churn ×1, vendas ×1, expansão ×1
    const realMonths = buildProjection(1, 1, 1);
    // Otimista: churn ×0.8, vendas ×1.4, expansão ×1.5
    const optMonths = buildProjection(0.8, 1.4, 1.5);

    // Generate projection months with breakdown (realistic scenario)
    const now = new Date();
    const projectionData: ProjectionMonth[] = [];
    let prevMRR = currentMRR;

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const churnMRR_r = prevMRR * monthlyChurn;
      const newMRR_r = avgNewMRRPerMonth;
      const expMRR_r = prevMRR * expansionRate;
      const netNew = newMRR_r + expMRR_r - churnMRR_r;
      const gr = prevMRR > 0 ? netNew / prevMRR : 0;

      projectionData.push({
        month: monthKey,
        label: fmtMonth(monthKey),
        pessimistic: pessMonths[i],
        realistic: realMonths[i],
        optimistic: optMonths[i],
        newMRR: Math.round(newMRR_r),
        expansionMRR: Math.round(expMRR_r),
        churnMRR: Math.round(churnMRR_r),
        netNewMRR: Math.round(netNew),
        growthRate: gr,
      });

      prevMRR = realMonths[i];
    }

    // Historical chart
    const historicalChart = monthlyMRR.map((m) => ({
      month: m.month,
      label: fmtMonth(m.month),
      mrr: Math.round(m.mrr),
    }));

    // Cards = next 30 days (index 0)
    const next30 = {
      pessimistic: pessMonths[0],
      realistic: realMonths[0],
      optimistic: optMonths[0],
    };

    // Current realistic metrics
    const churnMRR = currentMRR * monthlyChurn;
    const newMRR = avgNewMRRPerMonth;
    const expMRR = currentMRR * expansionRate;
    const netNewMRR = newMRR + expMRR - churnMRR;
    const growthRate = currentMRR > 0 ? netNewMRR / currentMRR : 0;

    return {
      projectionData,
      historicalChart,
      next30,
      metrics: {
        churnMRR: Math.round(churnMRR),
        newMRR: Math.round(newMRR),
        expansionMRR: Math.round(expMRR),
        netNewMRR: Math.round(netNewMRR),
        growthRate,
        monthlyChurn,
        avgNewClients: Math.round(avgNewClientsPerMonth),
        expansionRate,
      },
    };
  }, [stripeMRR, totalMRR, churnRate, totalSubscribers, averageTicket]);

  // Chart: historical + projection lines
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const hist = forecast.historicalChart.map((h) => ({
      ...h,
      pessimistic: undefined as number | undefined,
      realistic: undefined as number | undefined,
      optimistic: undefined as number | undefined,
    }));
    // Bridge last historical to projection start
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

  // Scenario cards config
  const scenarioCards = useMemo(() => {
    if (!forecast) return [];
    const m = forecast.metrics;
    const churnPess = (m.monthlyChurn * 2.2 * 100).toFixed(1);
    const churnReal = (m.monthlyChurn * 100).toFixed(1);
    const churnOpt = (m.monthlyChurn * 0.8 * 100).toFixed(1);

    return [
      {
        label: "Pessimista",
        subtitle: "Cenário de estresse — próximos 30 dias",
        value: forecast.next30.pessimistic,
        delta: forecast.next30.pessimistic - totalMRR,
        drivers: [
          { label: "Churn", value: `${churnPess}%`, color: "text-red-400" },
          { label: "Vendas", value: `${Math.round(m.avgNewClients * 0.6)}/mês`, color: "text-red-400" },
          { label: "Expansão", value: "0%", color: "text-red-400" },
        ],
        icon: TrendingDown,
        gradient: "from-red-500/8 via-transparent to-transparent",
        border: "border-red-500/20",
        text: "text-red-400",
        deltaBg: "bg-red-500/10 text-red-400",
        barColor: "bg-red-500",
      },
      {
        label: "Realista",
        subtitle: "Média histórica — próximos 30 dias",
        value: forecast.next30.realistic,
        delta: forecast.next30.realistic - totalMRR,
        drivers: [
          { label: "Churn", value: `${churnReal}%`, color: "text-blue-400" },
          { label: "Vendas", value: `${m.avgNewClients}/mês`, color: "text-blue-400" },
          { label: "Expansão", value: `${(m.expansionRate * 100).toFixed(1)}%`, color: "text-blue-400" },
        ],
        icon: Target,
        gradient: "from-blue-500/8 via-transparent to-transparent",
        border: "border-blue-500/20",
        text: "text-blue-400",
        deltaBg: "bg-blue-500/10 text-blue-400",
        barColor: "bg-blue-500",
      },
      {
        label: "Otimista",
        subtitle: "Meta agressiva plausível — próximos 30 dias",
        value: forecast.next30.optimistic,
        delta: forecast.next30.optimistic - totalMRR,
        drivers: [
          { label: "Churn", value: `${churnOpt}%`, color: "text-emerald-400" },
          { label: "Vendas", value: `${Math.round(m.avgNewClients * 1.4)}/mês`, color: "text-emerald-400" },
          { label: "Expansão", value: `${(m.expansionRate * 1.5 * 100).toFixed(1)}%`, color: "text-emerald-400" },
        ],
        icon: TrendingUp,
        gradient: "from-emerald-500/8 via-transparent to-transparent",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        deltaBg: "bg-emerald-500/10 text-emerald-400",
        barColor: "bg-emerald-500",
      },
    ];
  }, [forecast, totalMRR]);

  const kpis = useMemo(() => {
    const m = forecast?.metrics;
    return [
      { label: "MRR Atual", value: `R$ ${fmt(totalMRR)}`, icon: DollarSign, color: "text-primary", sub: "Receita mensal recorrente" },
      { label: "Assinantes", value: totalSubscribers.toString(), icon: Users, color: "text-blue-400", sub: "Clientes ativos pagantes" },
      { label: "Ticket Médio", value: `R$ ${fmt(averageTicket)}`, icon: Target, color: "text-emerald-400", sub: "Receita por assinante" },
      { label: "Net New MRR", value: m ? `${m.netNewMRR >= 0 ? "+" : ""}R$ ${fmt(m.netNewMRR)}` : "—", icon: m && m.netNewMRR >= 0 ? ArrowUpRight : ArrowDownRight, color: (m?.netNewMRR ?? 0) >= 0 ? "text-emerald-400" : "text-red-400", sub: "New + Expansion − Churn" },
      { label: "Churn MRR", value: m ? `−R$ ${fmt(m.churnMRR)}` : "—", icon: AlertTriangle, color: "text-red-400", sub: `${m ? (m.monthlyChurn * 100).toFixed(1) : '—'}% mensal` },
      { label: "Growth Rate", value: m ? `${(m.growthRate * 100).toFixed(1)}%` : "—", icon: BarChart3, color: (m?.growthRate ?? 0) >= 0 ? "text-emerald-400" : "text-red-400", sub: "Crescimento líquido mensal" },
    ];
  }, [totalMRR, totalSubscribers, averageTicket, forecast]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forecast de Receita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modelo CFO · MRR(n) = MRR(n-1) + New MRR + Expansion MRR − Churn MRR · Calibrado para SaaS WhatsApp SMB
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/30 bg-card/80 backdrop-blur rounded-2xl hover:border-border/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-lg bg-muted/50`}>
                  <kpi.icon size={13} className={kpi.color} />
                </div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
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
          {scenarioCards.map((s) => {
            const deltaPercent = totalMRR > 0 ? ((s.delta / totalMRR) * 100).toFixed(1) : "0";
            return (
              <Card key={s.label} className={`border ${s.border} bg-gradient-to-br ${s.gradient} rounded-2xl overflow-hidden`}>
                <CardContent className="p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${s.deltaBg}`}>
                        <s.icon size={14} className={s.text} />
                      </div>
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                        <p className="text-[9px] text-muted-foreground/60">{s.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      R$ {fmt(s.value)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.deltaBg}`}>
                        {s.delta >= 0 ? "+" : ""}R$ {fmt(s.delta)}
                      </span>
                      <span className={`text-[10px] ${s.text}`}>
                        ({s.delta >= 0 ? "+" : ""}{deltaPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
                    {s.drivers.map((d) => (
                      <div key={d.label} className="text-center">
                        <p className="text-[8px] font-medium text-muted-foreground/60 uppercase tracking-wider">{d.label}</p>
                        <p className={`text-xs font-bold ${d.color}`}>{d.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Chart — 12 MONTHS COMPOUND */}
      <Card className="border-border/30 bg-card/80 backdrop-blur rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Projeção MRR — Próximos 12 Meses
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Crescimento composto mês a mês · MRR(n) = MRR(n-1) + New + Expansion − Churn
              </p>
            </div>
            {forecast && (
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground/60">MRR em 12m (realista)</p>
                  <p className="text-sm font-bold text-blue-400">
                    R$ {fmt(forecast.projectionData[11]?.realistic ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {chartData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
              Dados insuficientes. É necessário pelo menos 1 mês de histórico.
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.06} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
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
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "11px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        mrr: "📊 Histórico",
                        realistic: "🔵 Realista",
                        optimistic: "🟢 Otimista",
                        pessimistic: "🔴 Pessimista",
                      };
                      return value != null ? [`R$ ${fmt(value)}`, labels[name] || name] : [null, null];
                    }}
                  />
                  {/* Historical solid */}
                  <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gradHist)" dot={false} connectNulls={false} />
                  {/* Pessimistic */}
                  <Area type="monotone" dataKey="pessimistic" stroke="#ef4444" strokeWidth={2} strokeDasharray="8 4" fill="url(#gradPess)" dot={false} connectNulls />
                  {/* Realistic */}
                  <Area type="monotone" dataKey="realistic" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="8 4" fill="url(#gradReal)" dot={false} connectNulls />
                  {/* Optimistic */}
                  <Area type="monotone" dataKey="optimistic" stroke="#10b981" strokeWidth={2} strokeDasharray="8 4" fill="url(#gradOpt)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-[3px] bg-primary rounded-full" />
              <span className="text-[10px] text-muted-foreground font-medium">Histórico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0" style={{ borderTop: "2.5px dashed #ef4444" }} />
              <span className="text-[10px] text-red-400 font-medium">Pessimista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0" style={{ borderTop: "2.5px dashed #3b82f6" }} />
              <span className="text-[10px] text-blue-400 font-medium">Realista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0" style={{ borderTop: "2.5px dashed #10b981" }} />
              <span className="text-[10px] text-emerald-400 font-medium">Otimista</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      {forecast && (
        <Card className="border-border/30 bg-card/80 backdrop-blur rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              Breakdown Mensal — Cenário Realista
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Decomposição dos drivers de MRR mês a mês com crescimento composto
            </p>
          </CardHeader>
          <CardContent className="pb-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">+ New MRR</p>
                <p className="text-xl font-bold text-emerald-400">R$ {fmt(forecast.metrics.newMRR)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{forecast.metrics.avgNewClients} novos clientes/mês</p>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">+ Expansion MRR</p>
                <p className="text-xl font-bold text-blue-400">R$ {fmt(forecast.metrics.expansionMRR)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{(forecast.metrics.expansionRate * 100).toFixed(1)}% da base</p>
              </div>
              <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/15">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">− Churn MRR</p>
                <p className="text-xl font-bold text-red-400">R$ {fmt(forecast.metrics.churnMRR)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{(forecast.metrics.monthlyChurn * 100).toFixed(1)}% churn mensal</p>
              </div>
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">= Net New MRR</p>
                <p className={`text-xl font-bold ${forecast.metrics.netNewMRR >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {forecast.metrics.netNewMRR >= 0 ? "+" : ""}R$ {fmt(forecast.metrics.netNewMRR)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{(forecast.metrics.growthRate * 100).toFixed(1)}% growth rate</p>
              </div>
            </div>

            {/* Monthly table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">+ New</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-blue-400 uppercase tracking-wider">+ Expansion</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-red-400 uppercase tracking-wider">− Churn</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Net New</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Growth %</th>
                    <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-foreground uppercase tracking-wider">MRR Final</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.projectionData.map((row, i) => (
                    <tr key={row.month} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/5" : ""} hover:bg-muted/10 transition-colors`}>
                      <td className="py-2.5 px-3 font-medium text-foreground">{row.label}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">+R$ {fmt(row.newMRR)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-400 font-medium">+R$ {fmt(row.expansionMRR)}</td>
                      <td className="py-2.5 px-3 text-right text-red-400 font-medium">−R$ {fmt(row.churnMRR)}</td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${row.netNewMRR >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {row.netNewMRR >= 0 ? "+" : ""}R$ {fmt(row.netNewMRR)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-medium ${row.growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(row.growthRate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">R$ {fmt(row.realistic)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premissas */}
      <Card className="border-border/30 bg-card/60 rounded-2xl">
        <CardContent className="p-4">
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            <strong className="text-muted-foreground/70">Premissas do modelo:</strong> SaaS WhatsApp para PME no Brasil — churn mínimo calibrado em 5% (switching cost baixo, clientes menores). 
            Pessimista usa churn ×2.2, vendas ×0.6, sem expansão. 
            Otimista usa churn ×0.8, vendas ×1.4, expansão ×1.5. 
            Crescimento composto: cada mês usa MRR do mês anterior, não o MRR atual fixo.
            Expansion rate limitado a 4% (cap conservador para SMB).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
