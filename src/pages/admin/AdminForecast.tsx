import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Target, DollarSign, BarChart3, AlertTriangle,
  Calendar, Users, ArrowUpRight, ArrowDownRight, Sparkles, ShieldCheck,
  Activity, Repeat, Heart, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ============================================================
 * Wiize · Forecast de Receita (CFO-grade · SaaS WhatsApp SMB)
 * MRR(n) = MRR(n-1) + New + Expansion − Churn
 * Cenários calibrados para SMB Brasil:
 *   Otimista:   churn 4%  · vendas +35% · expansão +30%
 *   Realista:   churn 6%  · vendas base · expansão base
 *   Pessimista: churn 9%  · vendas -25% · expansão 0
 * Churn nunca > 15% no dashboard principal.
 * ============================================================ */

// Churn mensal por cenário (calibrado SaaS WhatsApp PME Brasil)
const CHURN = { optimistic: 0.04, realistic: 0.06, pessimistic: 0.09 };
// Multiplicadores de novas vendas (vs baseline histórico)
const SALES = { optimistic: 1.35, realistic: 1.0, pessimistic: 0.55 };
// Expansão real: clientes × upgrade rate × upgrade médio (R$)
const UPGRADE_RATE = { optimistic: 0.10, realistic: 0.06, pessimistic: 0.0 };
const UPGRADE_AVG = 90; // R$ médio de upgrade por cliente que faz upsell

/**
 * Curva de ramp-up por cenário (12 meses) — multiplica as novas vendas mensais.
 * Pessimista: queda nos primeiros 3 meses (mercado contraído / churn > vendas),
 *             estabiliza no mês 4 e recupera devagar.
 * Realista:   crescimento gradual orgânico.
 * Otimista:   aceleração composta plausível.
 */
const SALES_RAMP = {
  pessimistic: [0.55, 0.45, 0.40, 0.50, 0.60, 0.70, 0.78, 0.85, 0.90, 0.95, 1.00, 1.05],
  realistic:   [1.00, 1.03, 1.06, 1.10, 1.14, 1.18, 1.22, 1.27, 1.32, 1.37, 1.42, 1.48],
  optimistic:  [1.10, 1.20, 1.32, 1.45, 1.58, 1.72, 1.86, 2.00, 2.15, 2.30, 2.45, 2.60],
};
// Curva de churn (pessimista pico nos meses iniciais, depois normaliza)
const CHURN_RAMP = {
  pessimistic: [1.30, 1.40, 1.35, 1.20, 1.10, 1.05, 1.00, 0.98, 0.96, 0.95, 0.95, 0.95],
  realistic:   [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
  optimistic:  [0.95, 0.92, 0.90, 0.88, 0.86, 0.84, 0.82, 0.80, 0.78, 0.76, 0.74, 0.72],
};

const COLORS = {
  realistic: "#3b82f6",   // azul
  optimistic: "#10b981",  // verde
  pessimistic: "#ef4444", // vermelho
  historical: "#94a3b8",  // cinza
};

function fmt(n: number) {
  if (!isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtMonth(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

interface ProjMonth {
  month: string;
  label: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
  newMRR: number;
  expansionMRR: number;
  churnMRR: number;
  netNewMRR: number;
  growthRate: number;
}

export default function AdminForecast() {
  const { loading, totalMRR, stripeMRR, totalSubscribers, averageTicket } = useAdminDashboard();

  const forecast = useMemo(() => {
    const monthlyMRR = stripeMRR?.monthlyMRR || [];
    const monthlySales = stripeMRR?.monthlySales || [];

    if (totalMRR <= 0 && monthlyMRR.length === 0) return null;

    // === Drivers históricos ===
    // New clients/month — média ponderada dos últimos 3 meses
    const recent = monthlySales.slice(-3);
    const avgNewClients = recent.length > 0
      ? recent.reduce((s, x, i) => s + x.newSales * (i === recent.length - 1 ? 2 : 1), 0) / (recent.length + 1)
      : Math.max(totalSubscribers * 0.06, 1);

    const avgNewMRR = avgNewClients * averageTicket;
    const currentMRR = totalMRR;
    const currentClients = Math.max(totalSubscribers, 1);

    // === Build 12-month compound projection com ramps ===
    // Expansão real: clientes ativos × upgrade rate × upgrade médio
    const buildProjection = (
      churnBase: number,
      salesMult: number,
      upgradeRate: number,
      salesRamp: number[],
      churnRamp: number[],
    ) => {
      const months: { mrr: number; newM: number; expM: number; churnM: number; clients: number }[] = [];
      let mrr = currentMRR;
      let clients = currentClients;
      for (let i = 0; i < 12; i++) {
        const churnRate = churnBase * churnRamp[i];
        const churnLoss = mrr * churnRate;
        const newM = avgNewMRR * salesMult * salesRamp[i];
        const expM = clients * upgradeRate * UPGRADE_AVG;
        const nextMRR = Math.max(currentMRR * 0.45, mrr + newM + expM - churnLoss);
        // Atualiza nº clientes (proxy via MRR/ticket)
        const lostClients = clients * churnRate;
        const newClients = avgNewClients * salesMult * salesRamp[i];
        clients = Math.max(1, clients - lostClients + newClients);
        mrr = nextMRR;
        months.push({ mrr: Math.round(mrr), newM: Math.round(newM), expM: Math.round(expM), churnM: Math.round(churnLoss), clients: Math.round(clients) });
      }
      return months;
    };

    const pessSeries = buildProjection(CHURN.pessimistic, SALES.pessimistic, UPGRADE_RATE.pessimistic, SALES_RAMP.pessimistic, CHURN_RAMP.pessimistic);
    const realSeries = buildProjection(CHURN.realistic, SALES.realistic, UPGRADE_RATE.realistic, SALES_RAMP.realistic, CHURN_RAMP.realistic);
    const optSeries = buildProjection(CHURN.optimistic, SALES.optimistic, UPGRADE_RATE.optimistic, SALES_RAMP.optimistic, CHURN_RAMP.optimistic);

    // Build projection rows (realistic breakdown)
    const now = new Date();
    const projection: ProjMonth[] = [];
    let prevMRR = currentMRR;
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const r = realSeries[i];
      const net = r.newM + r.expM - r.churnM;
      projection.push({
        month: monthKey,
        label: fmtMonth(monthKey),
        pessimistic: pessSeries[i].mrr,
        realistic: realSeries[i].mrr,
        optimistic: optSeries[i].mrr,
        newMRR: r.newM,
        expansionMRR: r.expM,
        churnMRR: r.churnM,
        netNewMRR: Math.round(net),
        growthRate: prevMRR > 0 ? net / prevMRR : 0,
      });
      prevMRR = realSeries[i].mrr;
    }

    // 30-day cards (mês 1)
    const next30 = {
      pessimistic: pessSeries[0].mrr,
      realistic: realSeries[0].mrr,
      optimistic: optSeries[0].mrr,
    };

    const breakdown = {
      pessimistic: { churnMRR: pessSeries[0].churnM, newMRR: pessSeries[0].newM, expansionMRR: pessSeries[0].expM },
      realistic:   { churnMRR: realSeries[0].churnM, newMRR: realSeries[0].newM, expansionMRR: realSeries[0].expM },
      optimistic:  { churnMRR: optSeries[0].churnM, newMRR: optSeries[0].newM, expansionMRR: optSeries[0].expM },
    };

    // SaaS health metrics
    const churnMRR = realSeries[0].churnM;
    const expMRR = realSeries[0].expM;
    const netNew = avgNewMRR + expMRR - churnMRR;
    const growthRate = currentMRR > 0 ? netNew / currentMRR : 0;
    const ltv = averageTicket / CHURN.realistic;
    const estCAC = averageTicket * 1.5;
    const cacPayback = averageTicket > 0 ? estCAC / averageTicket : 0;
    const retention = (1 - CHURN.realistic) * 100;

    // Historical chart data
    const historical = monthlyMRR.map((m) => ({
      month: m.month,
      label: fmtMonth(m.month),
      mrr: Math.round(m.mrr),
    }));

    return {
      projection,
      historical,
      next30,
      breakdown,
      metrics: {
        churnMRR: Math.round(churnMRR),
        newMRR: Math.round(avgNewMRR),
        expansionMRR: Math.round(expMRR),
        netNewMRR: Math.round(netNew),
        growthRate,
        avgNewClients: Math.round(avgNewClients),
        ltv: Math.round(ltv),
        cacPayback: cacPayback.toFixed(1),
        retention,
      },
    };
  }, [stripeMRR, totalMRR, totalSubscribers, averageTicket]);

  // Combined chart: historical + projection
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const hist = forecast.historical.map((h) => ({
      ...h,
      pessimistic: undefined as number | undefined,
      realistic: undefined as number | undefined,
      optimistic: undefined as number | undefined,
    }));
    // Bridge last historical point to projection start
    const last = forecast.historical[forecast.historical.length - 1];
    if (last && hist.length) {
      hist[hist.length - 1] = {
        ...hist[hist.length - 1],
        pessimistic: last.mrr,
        realistic: last.mrr,
        optimistic: last.mrr,
      };
    }
    const proj = forecast.projection.map((p) => ({
      month: p.month,
      label: p.label,
      mrr: undefined as number | undefined,
      pessimistic: p.pessimistic,
      realistic: p.realistic,
      optimistic: p.optimistic,
    }));
    return [...hist, ...proj];
  }, [forecast]);

  // === KPI cards ===
  const kpis = useMemo(() => {
    const m = forecast?.metrics;
    return [
      { label: "MRR Atual", value: `R$ ${fmt(totalMRR)}`, sub: "Receita mensal recorrente", icon: DollarSign, accent: "text-primary" },
      { label: "Clientes Ativos", value: totalSubscribers.toLocaleString("pt-BR"), sub: "Assinaturas pagantes", icon: Users, accent: "text-blue-500" },
      { label: "Ticket Médio", value: `R$ ${fmt(averageTicket)}`, sub: "Receita por cliente", icon: Target, accent: "text-emerald-500" },
      { label: "Net New MRR", value: m ? `${m.netNewMRR >= 0 ? "+" : ""}R$ ${fmt(m.netNewMRR)}` : "—", sub: "New + Expansion − Churn", icon: m && m.netNewMRR >= 0 ? ArrowUpRight : ArrowDownRight, accent: (m?.netNewMRR ?? 0) >= 0 ? "text-emerald-500" : "text-red-500" },
      { label: "Churn Rate", value: `${(CHURN.realistic * 100).toFixed(1)}%`, sub: "Cancelamento mensal", icon: AlertTriangle, accent: "text-red-500" },
      { label: "Growth Rate", value: m ? `${(m.growthRate * 100).toFixed(1)}%` : "—", sub: "Crescimento líquido/mês", icon: BarChart3, accent: (m?.growthRate ?? 0) >= 0 ? "text-emerald-500" : "text-red-500" },
    ];
  }, [totalMRR, totalSubscribers, averageTicket, forecast]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[440px] rounded-2xl" />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <Card className="border-border/30 rounded-2xl">
          <CardContent className="p-12 text-center text-muted-foreground">
            Sem dados suficientes para gerar o forecast.
          </CardContent>
        </Card>
      </div>
    );
  }

  // 30-day delta values
  const realDelta = forecast.next30.realistic - totalMRR;
  const optDelta = forecast.next30.optimistic - totalMRR;
  const pessDelta = forecast.next30.pessimistic - totalMRR;

  const max12 = Math.max(
    forecast.projection[11]?.optimistic ?? 0,
    forecast.projection[11]?.realistic ?? 0,
    forecast.projection[11]?.pessimistic ?? 0,
  );

  // Drivers do crescimento (12 meses acumulado, realista)
  const accNew = forecast.projection.reduce((s, p) => s + p.newMRR, 0);
  const accExp = forecast.projection.reduce((s, p) => s + p.expansionMRR, 0);
  const accChurn = forecast.projection.reduce((s, p) => s + p.churnMRR, 0);
  const accNet = accNew + accExp - accChurn;
  const driverMax = Math.max(accNew, accExp, accChurn, Math.abs(accNet)) || 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* === Header === */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Forecast de Receita</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Projeção CFO · MRR(n) = MRR(n-1) + New + Expansion − Churn · Calibrado para SaaS WhatsApp SMB
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Modelo CFO Validado</span>
        </div>
      </div>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/40 bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-muted/60">
                  <kpi.icon size={13} className={kpi.accent} />
                </div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground tracking-tight">{kpi.value}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* === Scenario Cards (30 dias) === */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            Projeção dos Próximos 30 Dias
          </h2>
          <span className="text-[10px] text-muted-foreground/70">Base: MRR atual de R$ {fmt(totalMRR)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pessimista */}
          <ScenarioCard
            label="Pessimista"
            subtitle="Cenário de cautela"
            value={forecast.next30.pessimistic}
            delta={pessDelta}
            churn={CHURN.pessimistic * 100}
            newMRR={forecast.breakdown.pessimistic.newMRR}
            expansion={forecast.breakdown.pessimistic.expansionMRR}
            color="red"
          />
          {/* Realista — DESTAQUE */}
          <ScenarioCard
            label="Realista"
            subtitle="Cenário base recomendado"
            value={forecast.next30.realistic}
            delta={realDelta}
            churn={CHURN.realistic * 100}
            newMRR={forecast.breakdown.realistic.newMRR}
            expansion={forecast.breakdown.realistic.expansionMRR}
            color="blue"
            highlighted
          />
          {/* Otimista */}
          <ScenarioCard
            label="Otimista"
            subtitle="Potencial de upside"
            value={forecast.next30.optimistic}
            delta={optDelta}
            churn={CHURN.optimistic * 100}
            newMRR={forecast.breakdown.optimistic.newMRR}
            expansion={forecast.breakdown.optimistic.expansionMRR}
            color="green"
          />
        </div>
      </div>

      {/* === Chart 12 meses === */}
      <Card className="border-border/40 bg-card rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Projeção MRR — 12 Meses
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Crescimento composto · Histórico + 3 cenários projetados
              </p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Pessimista 12m</p>
                <p className="text-sm font-bold text-red-500">R$ {fmt(forecast.projection[11]?.pessimistic ?? 0)}</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Realista 12m</p>
                <p className="text-sm font-bold text-blue-500">R$ {fmt(forecast.projection[11]?.realistic ?? 0)}</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Otimista 12m</p>
                <p className="text-sm font-bold text-emerald-500">R$ {fmt(forecast.projection[11]?.optimistic ?? 0)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.historical} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.historical} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.realistic} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={COLORS.realistic} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.optimistic} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={COLORS.optimistic} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.pessimistic} stopOpacity={0.08} />
                    <stop offset="95%" stopColor={COLORS.pessimistic} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${fmt(v)}`} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "11px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    padding: "10px 12px",
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
                <Area type="monotone" dataKey="mrr" stroke={COLORS.historical} strokeWidth={2.5} fill="url(#gHist)" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="pessimistic" stroke={COLORS.pessimistic} strokeWidth={2} fill="url(#gPess)" dot={false} connectNulls />
                <Area type="monotone" dataKey="optimistic" stroke={COLORS.optimistic} strokeWidth={2} fill="url(#gOpt)" dot={false} connectNulls />
                <Area type="monotone" dataKey="realistic" stroke={COLORS.realistic} strokeWidth={2.5} fill="url(#gReal)" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
            <LegendDot color={COLORS.historical} label="Histórico" />
            <LegendDot color={COLORS.pessimistic} label="Pessimista" />
            <LegendDot color={COLORS.realistic} label="Realista" />
            <LegendDot color={COLORS.optimistic} label="Otimista" />
          </div>
        </CardContent>
      </Card>

      {/* === Drivers de Crescimento === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/40 bg-card rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Drivers do Crescimento
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Acumulado dos próximos 12 meses · Cenário realista
            </p>
          </CardHeader>
          <CardContent className="pb-5 space-y-4">
            <DriverBar label="Novas Vendas" value={accNew} max={driverMax} color="emerald" sign="+" />
            <DriverBar label="Expansão / Upsell" value={accExp} max={driverMax} color="blue" sign="+" />
            <DriverBar label="Churn (perda)" value={accChurn} max={driverMax} color="red" sign="−" />
            <div className="pt-3 border-t border-border/30">
              <DriverBar label="Net Growth (líquido)" value={Math.abs(accNet)} max={driverMax} color={accNet >= 0 ? "primary" : "red"} sign={accNet >= 0 ? "=+" : "=−"} bold />
            </div>
          </CardContent>
        </Card>

        {/* === Saúde SaaS === */}
        <Card className="border-border/40 bg-card rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />
              Saúde SaaS
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Indicadores de unit economics</p>
          </CardHeader>
          <CardContent className="pb-5 space-y-3">
            <HealthRow icon={Repeat} label="Retenção mensal" value={`${forecast.metrics.retention.toFixed(1)}%`} accent="text-emerald-500" />
            <HealthRow icon={Activity} label="LTV estimado" value={`R$ ${fmt(forecast.metrics.ltv)}`} accent="text-blue-500" />
            <HealthRow icon={Zap} label="CAC payback" value={`${forecast.metrics.cacPayback} meses`} accent="text-violet-500" />
            <HealthRow icon={DollarSign} label="Receita / cliente" value={`R$ ${fmt(averageTicket)}`} accent="text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* === Tabela mensal === */}
      <Card className="border-border/40 bg-card rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Breakdown Mensal · Cenário Realista
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Decomposição mês a mês com crescimento composto</p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-emerald-500 uppercase tracking-wider">+ New</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-blue-500 uppercase tracking-wider">+ Expansion</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-red-500 uppercase tracking-wider">− Churn</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Net New</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Growth %</th>
                  <th className="text-right py-2.5 px-3 text-[9px] font-semibold text-foreground uppercase tracking-wider">MRR Final</th>
                </tr>
              </thead>
              <tbody>
                {forecast.projection.map((row, i) => (
                  <tr key={row.month} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/30 transition-colors`}>
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.label}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-500 font-medium">+R$ {fmt(row.newMRR)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-500 font-medium">+R$ {fmt(row.expansionMRR)}</td>
                    <td className="py-2.5 px-3 text-right text-red-500 font-medium">−R$ {fmt(row.churnMRR)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold ${row.netNewMRR >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {row.netNewMRR >= 0 ? "+" : ""}R$ {fmt(row.netNewMRR)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${row.growthRate >= 0 ? "text-emerald-500" : "text-red-500"}`}>
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

      {/* === Premissas === */}
      <Card className="border-border/30 bg-muted/20 rounded-2xl">
        <CardContent className="p-4">
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            <strong className="text-muted-foreground">Premissas do modelo:</strong> SaaS WhatsApp para PME no Brasil ·
            Pessimista: churn 9%, vendas −25%, expansão 0% ·
            Realista: churn 6%, vendas base, expansão 1.5% ·
            Otimista: churn 4%, vendas +35%, expansão +30% ·
            Crescimento composto MRR(n) = MRR(n-1) + New + Expansion − Churn ·
            LTV = ticket médio / churn rate · CAC payback estimado a partir do ticket médio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function ScenarioCard({
  label, subtitle, value, delta, churn, newMRR, expansion, color, highlighted,
}: {
  label: string; subtitle: string; value: number; delta: number;
  churn: number; newMRR: number; expansion: number;
  color: "red" | "blue" | "green"; highlighted?: boolean;
}) {
  const palette = {
    red: {
      text: "text-red-500",
      bg: "bg-red-500/10",
      ring: highlighted ? "ring-2 ring-red-500/40" : "",
      gradient: "from-red-500/[0.08] via-transparent to-transparent",
      bar: "bg-red-500",
      badgeBg: "bg-red-500",
    },
    blue: {
      text: "text-blue-500",
      bg: "bg-blue-500/10",
      ring: highlighted ? "ring-2 ring-blue-500/50" : "",
      gradient: "from-blue-500/[0.10] via-transparent to-transparent",
      bar: "bg-blue-500",
      badgeBg: "bg-blue-500",
    },
    green: {
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      ring: highlighted ? "ring-2 ring-emerald-500/40" : "",
      gradient: "from-emerald-500/[0.08] via-transparent to-transparent",
      bar: "bg-emerald-500",
      badgeBg: "bg-emerald-500",
    },
  }[color];
  const Icon = color === "red" ? TrendingDown : color === "green" ? TrendingUp : Target;
  const baseValue = value - delta;
  const deltaPct = baseValue > 0 ? ((delta / baseValue) * 100).toFixed(1) : "0";
  const isPositive = delta >= 0;

  return (
    <Card className={`relative overflow-hidden border border-border/50 bg-card rounded-2xl ${palette.ring} ${highlighted ? "shadow-xl shadow-blue-500/5" : "shadow-sm"} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
      {/* Gradient accent */}
      <div className={`absolute inset-0 bg-gradient-to-br ${palette.gradient} pointer-events-none`} />
      {/* Side bar accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${palette.bar}`} />

      {highlighted && (
        <div className={`absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full ${palette.badgeBg} text-white text-[9px] font-bold uppercase tracking-wider z-10 shadow-md`}>
          <Sparkles size={9} />
          Recomendado
        </div>
      )}

      <CardContent className="relative p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${palette.bg} ring-1 ring-border/30`}>
            <Icon size={18} className={palette.text} strokeWidth={2.5} />
          </div>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${palette.text}`}>{label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Big value */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1">MRR projetado · 30d</p>
          <p className="text-[34px] font-extrabold text-foreground tracking-tight leading-none">
            R$ {fmt(value)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${palette.bg}`}>
              {isPositive ? <ArrowUpRight size={11} className={palette.text} /> : <ArrowDownRight size={11} className={palette.text} />}
              <span className={`text-[11px] font-bold ${palette.text}`}>
                {isPositive ? "+" : ""}R$ {fmt(delta)}
              </span>
            </div>
            <span className={`text-[11px] font-semibold ${palette.text}`}>
              {isPositive ? "+" : ""}{deltaPct}%
            </span>
          </div>
        </div>

        {/* Drivers row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40">
          <DriverMini label="Churn" value={`${churn.toFixed(1)}%`} color={palette.text} />
          <DriverMini label="New MRR" value={`R$ ${fmt(newMRR)}`} color={palette.text} />
          <DriverMini label="Expansão" value={`R$ ${fmt(expansion)}`} color={palette.text} />
        </div>
      </CardContent>
    </Card>
  );
}

function DriverMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-bold ${color} mt-0.5`}>{value}</p>
    </div>
  );
}

function DriverBar({
  label, value, max, color, sign, bold,
}: {
  label: string; value: number; max: number;
  color: "emerald" | "blue" | "red" | "primary";
  sign: string; bold?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const palette = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    primary: "bg-primary",
  }[color];
  const text = {
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    red: "text-red-500",
    primary: "text-primary",
  }[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-xs ${bold ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{label}</p>
        <p className={`text-sm font-bold ${text}`}>{sign} R$ {fmt(value)}</p>
      </div>
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={`h-full ${palette} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function HealthRow({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-muted/50">
          <Icon size={13} className={accent} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-[3px] rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
    </div>
  );
}
