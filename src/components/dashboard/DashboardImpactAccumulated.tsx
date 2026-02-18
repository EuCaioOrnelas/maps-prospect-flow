import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Briefcase, TrendingUp, TrendingDown, GitCompareArrows } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { DashboardComparisonDialog } from "./DashboardComparisonDialog";

interface DashboardImpactAccumulatedProps {
  allTimeLeads: number;
  cumulativeByMonth: { month: string; total: number }[];
  monthlyLeads: number;
  activeDays: number;
  periodDays: number;
  leadsProspected: number;
  prevLeadsProspected: number;
  messagesSent: number;
  prevMessagesSent: number;
}

const CPL_BENCHMARK = 46.17;
const SDR_PER_DAY = 80;

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
  leadsProspected,
  prevLeadsProspected,
  messagesSent,
  prevMessagesSent,
}: DashboardImpactAccumulatedProps) {
  const [showComparison, setShowComparison] = useState(false);

  const financialImpact = leadsProspected * CPL_BENCHMARK;
  const daysSaved = Math.round(leadsProspected / SDR_PER_DAY);

  const leadsChange = prevLeadsProspected > 0
    ? ((leadsProspected - prevLeadsProspected) / prevLeadsProspected) * 100
    : leadsProspected > 0 ? 100 : 0;
  const prevFinancialImpact = prevLeadsProspected * CPL_BENCHMARK;
  const financialChange = prevFinancialImpact > 0
    ? ((financialImpact - prevFinancialImpact) / prevFinancialImpact) * 100
    : financialImpact > 0 ? 100 : 0;

  // Projection
  const monthsActive = cumulativeByMonth.length || 1;
  const avgMonthlyLeads = allTimeLeads / monthsActive;
  const projectedAnnualSavings = avgMonthlyLeads * 12 * CPL_BENCHMARK;

  const dailyAvgLeads = periodDays > 0 ? leadsProspected / periodDays : 0;
  const projectedMonthlyLeads = Math.round(dailyAvgLeads * 30);
  const projectedMonthlySavings = projectedMonthlyLeads * CPL_BENCHMARK;

  return (
    <div className="space-y-4">
      {/* Header with comparison button */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7"
          onClick={() => setShowComparison(true)}
        >
          <GitCompareArrows size={13} />
          Comparar períodos
        </Button>
      </div>

      {/* Hero Impact Card */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-background to-background overflow-hidden">
        <CardContent className="py-6 px-6 flex flex-col items-center text-center space-y-1.5">
          <p className="text-[10px] font-semibold text-emerald-400/80 tracking-[0.2em] uppercase">
            Impacto gerado no período
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight leading-none">
              R$ {fmt(financialImpact)}
            </p>
            {financialChange !== 0 && (
              <div className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                financialChange > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'
              }`}>
                {financialChange > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(financialChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/70 max-w-sm leading-relaxed">
            Valor estimado economizado gerando{' '}
            <span className="font-medium text-foreground/80">{fmtInt(leadsProspected)} leads</span>{' '}
            nos últimos {periodDays} dias.
          </p>
          <p className="text-[10px] text-muted-foreground/50 italic pt-1">
            Mantendo esse ritmo, você deve gerar ~{fmtInt(projectedMonthlyLeads)} leads e economizar R$ {fmt(projectedMonthlySavings)} este mês.
          </p>
        </CardContent>
      </Card>

      {/* Secondary: Capacidade Operacional + Projeção Anual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Capacidade operacional gerada
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {daysSaved} {daysSaved === 1 ? 'dia' : 'dias'}
                </p>
                {leadsChange !== 0 && (
                  <div className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    leadsChange > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {leadsChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(leadsChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/50">de trabalho de um SDR no período</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <CalendarClock size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Mantendo esse ritmo
              </p>
              <p className="text-2xl font-bold text-amber-400 leading-tight">
                R$ {fmt(projectedAnnualSavings)}
              </p>
              <p className="text-[11px] text-muted-foreground/50">em custo evitado por ano</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Growth Chart */}
      {cumulativeByMonth.length > 1 && (
        <Card className="border-border/50">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-semibold text-foreground">Crescimento Acumulado</p>
              <p className="text-[10px] text-muted-foreground/50 italic">
                Seu ativo de prospecção continua crescendo.
              </p>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [fmtInt(value) + ' leads', 'Total acumulado']}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(158, 72%, 38%)" strokeWidth={2} fill="url(#cumulativeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <DashboardComparisonDialog open={showComparison} onOpenChange={setShowComparison} />
    </div>
  );
}
