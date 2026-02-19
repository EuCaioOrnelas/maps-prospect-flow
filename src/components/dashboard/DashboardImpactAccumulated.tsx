import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Briefcase, TrendingUp, TrendingDown, GitCompareArrows, Info } from "lucide-react";
import { DashboardComparisonDialog } from "./DashboardComparisonDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardImpactAccumulatedProps {
  allTimeLeads: number;
  cumulativeByMonth: { month: string; total: number }[];
  periodDays: number;
  leadsProspected: number;
  prevLeadsProspected: number;
  totalResponses: number;
  prevTotalResponses: number;
  periodFilter?: React.ReactNode;
}

const CPL_BENCHMARK = 11.77;
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
  periodDays,
  leadsProspected,
  prevLeadsProspected,
  totalResponses,
  prevTotalResponses,
  periodFilter,
}: DashboardImpactAccumulatedProps) {
  const [showComparison, setShowComparison] = useState(false);

  const financialImpact = leadsProspected * CPL_BENCHMARK;
  const daysSaved = Math.round(leadsProspected / SDR_PER_DAY);

  // Real comparison — avoid showing +100% when prev is 0
  const hasRealComparison = prevLeadsProspected > 0;
  const financialChange = hasRealComparison
    ? ((leadsProspected - prevLeadsProspected) / prevLeadsProspected) * 100
    : 0;
  const leadsChange = hasRealComparison
    ? ((leadsProspected - prevLeadsProspected) / prevLeadsProspected) * 100
    : 0;
  const leadsDiff = leadsProspected - prevLeadsProspected;

  // Projection
  const monthsActive = cumulativeByMonth.length || 1;
  const avgMonthlyLeads = allTimeLeads / monthsActive;
  const projectedAnnualSavings = avgMonthlyLeads * 12 * CPL_BENCHMARK;

  const dailyAvgLeads = periodDays > 0 ? leadsProspected / periodDays : 0;
  const projectedMonthlyLeads = Math.round(dailyAvgLeads * 30);

  return (
    <div className="space-y-4">
      {/* Header: title + period filter + comparison button */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Visão Geral</h1>
        <div className="flex items-center gap-2">
          {periodFilter}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 bg-card border-border/50 hover:bg-muted"
            onClick={() => setShowComparison(true)}
          >
            <GitCompareArrows size={13} />
            Comparar períodos
          </Button>
        </div>
      </div>

      {/* Hero — Equivalência de Investimento em Mídia */}
      <Card className="bg-card border-border/50 overflow-hidden relative rounded-xl">
        <CardContent className="py-6 px-8 flex flex-col items-center text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground/50 tracking-[0.18em] uppercase">
            Investimento estimado via mídia paga
          </p>
          <p className="text-[2rem] sm:text-[2.6rem] font-black text-primary tracking-[0.02em] leading-none drop-shadow-[0_0_12px_hsla(158,60%,40%,0.2)]">
            R$ {fmt(financialImpact)}
          </p>
          {hasRealComparison && financialChange !== 0 && (
            <span className={`text-sm font-semibold ${financialChange > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
              {financialChange > 0 ? '↑' : '↓'} {Math.abs(financialChange).toFixed(0)}% vs período anterior
            </span>
          )}
          <p className="text-[13px] text-muted-foreground/80 font-[500] max-w-md leading-snug">
            Estimativa aproximada de investimento necessário para gerar {fmtInt(leadsProspected)} contatos B2B via tráfego pago no período selecionado.
            {allTimeLeads > leadsProspected && (
              <span className="text-muted-foreground/50"> — Total acumulado: {fmtInt(allTimeLeads)} leads (R$ {fmt(allTimeLeads * CPL_BENCHMARK)})</span>
            )}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground/45 flex items-center gap-1 cursor-help pt-0.5">
                  Baseado em CPL médio de R$ {fmt(CPL_BENCHMARK)}
                  <Info size={11} className="text-muted-foreground/35" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Benchmark médio de custo por lead (CPL) para campanhas B2B de topo de funil. Valores podem variar conforme mercado e segmentação.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Secondary: Capacidade Operacional + Projeção Anual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50 rounded-xl">
          <CardContent className="py-5 px-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
              <Briefcase size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Capacidade operacional gerada
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {daysSaved} {daysSaved === 1 ? 'dia' : 'dias'}
                </p>
                {hasRealComparison && leadsChange !== 0 && (
                  <span className={`text-[10px] font-medium ${
                    leadsChange > 0 ? 'text-emerald-400' : 'text-destructive'
                  }`}>
                    {leadsDiff > 0 ? '+' : ''}{fmtInt(leadsDiff)} leads vs anterior
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/40">de trabalho de um SDR no período</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 rounded-xl">
          <CardContent className="py-5 px-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
              <CalendarClock size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Projeção estimada (12 meses)
              </p>
              <p className="text-xl font-bold text-foreground leading-tight">
                R$ {fmt(avgMonthlyLeads * 12 * CPL_BENCHMARK)}
              </p>
              <p className="text-[11px] text-muted-foreground/40">
                Para alcançar o mesmo volume via mídia paga em 12 meses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DashboardComparisonDialog open={showComparison} onOpenChange={setShowComparison} />
    </div>
  );
}
