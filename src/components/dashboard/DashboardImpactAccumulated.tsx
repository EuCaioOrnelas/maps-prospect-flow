import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, CalendarClock, TrendingUp, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface DashboardImpactAccumulatedProps {
  allTimeLeads: number;
  cumulativeByMonth: { month: string; total: number }[];
  monthlyLeads: number;
  activeDays: number;
  periodDays: number;
}

const CPL_BENCHMARK = 46.17;
const SDR_PER_DAY = 80;
const SDR_WORK_DAYS = 22;
const SDR_PER_MONTH = SDR_PER_DAY * SDR_WORK_DAYS; // 1760

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export function DashboardImpactAccumulated({
  allTimeLeads,
  cumulativeByMonth,
  monthlyLeads,
  activeDays,
  periodDays,
}: DashboardImpactAccumulatedProps) {
  const financialImpact = allTimeLeads * CPL_BENCHMARK;
  const sdrEquivalent = allTimeLeads / SDR_PER_MONTH;
  const daysSaved = allTimeLeads / SDR_PER_DAY;
  const monthlySDR = monthlyLeads / SDR_PER_MONTH;
  const dailyAvg = activeDays > 0 ? monthlyLeads / Math.min(activeDays, periodDays) : 0;

  // Annual projection based on monthly avg
  const monthsActive = cumulativeByMonth.length || 1;
  const avgMonthlyLeads = allTimeLeads / monthsActive;
  const projectedAnnualLeads = avgMonthlyLeads * 12;
  const projectedAnnualSavings = projectedAnnualLeads * CPL_BENCHMARK;

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Impacto Acumulado</h2>
          <p className="text-xs text-muted-foreground">Crescimento estrutural da sua operação com a Wiize</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BLOCO 1 – Impacto Financeiro */}
        <Card className="glass border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp size={15} className="text-emerald-400" />
              </div>
              <CardTitle className="text-sm font-semibold">Impacto Financeiro Acumulado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-3xl font-extrabold text-emerald-400">
                R$ {fmt(financialImpact)}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {fmtInt(allTimeLeads)} leads × R$ {fmt(CPL_BENCHMARK)} = R$ {fmt(financialImpact)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
              Estimativa baseada no custo médio de geração de lead via tráfego pago ou SDR interno.
            </p>
          </CardContent>
        </Card>

        {/* BLOCO 2 – Equivalência SDR */}
        <Card className="glass border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users size={15} className="text-primary" />
              </div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-semibold">Equivalência em SDR</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={12} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Baseado em média conservadora: {SDR_PER_DAY} prospecções/dia, {SDR_WORK_DAYS} dias/mês = {fmtInt(SDR_PER_MONTH)} prospecções/mês por SDR.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-2xl font-bold text-foreground">{sdrEquivalent.toFixed(2).replace('.', ',')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">SDR equivalente/mês</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-2xl font-bold text-foreground">{daysSaved.toFixed(1).replace('.', ',')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">dias de trabalho economizados</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Baseado em média conservadora de produtividade de SDR.
            </p>
          </CardContent>
        </Card>

        {/* BLOCO 3 – Capacidade Operacional */}
        <Card className="glass border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Zap size={15} className="text-cyan-400" />
              </div>
              <CardTitle className="text-sm font-semibold">Capacidade Operacional Gerada</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <p className="text-2xl font-bold text-foreground">{monthlySDR.toFixed(2).replace('.', ',')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">SDR equivalente mensal</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <p className="text-2xl font-bold text-foreground">{dailyAvg.toFixed(1).replace('.', ',')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">prospecções/dia (média)</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Baseado nos leads prospectados no período selecionado.
            </p>
          </CardContent>
        </Card>

        {/* BLOCO EXTRA – Projeção Anual */}
        <Card className="glass border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <CalendarClock size={15} className="text-amber-400" />
              </div>
              <CardTitle className="text-sm font-semibold">Projeção Anual</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Se mantiver o ritmo atual, você gerará:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-2xl font-bold text-foreground">{fmtInt(Math.round(projectedAnnualLeads))}</p>
                <p className="text-[10px] text-muted-foreground mt-1">leads por ano</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-2xl font-bold text-amber-400">R$ {fmt(projectedAnnualSavings)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">em custo evitado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 4 – Crescimento Acumulado (Gráfico) */}
      {cumulativeByMonth.length > 1 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Crescimento Acumulado de Leads</CardTitle>
              <p className="text-[10px] text-muted-foreground max-w-[220px] text-right">
                Seu ativo de prospecção continua crescendo enquanto você utiliza a Wiize.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 18%, 7%)',
                      border: '1px solid hsl(220, 14%, 16%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [fmtInt(value) + ' leads', 'Total acumulado']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(158, 72%, 38%)"
                    strokeWidth={2}
                    fill="url(#cumulativeGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
