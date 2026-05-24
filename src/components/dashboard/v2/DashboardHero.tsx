import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Rocket, Info, Megaphone, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasOpportunitiesAccess } from "@/lib/planAccess";
import { useContactLimit } from "@/hooks/useContactLimit";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DashboardHeroProps {
  financialImpact: number;
  financialChange: number;
  leadsGerados: number;
  conversasAtivas: number;
  oportunidadesQuentes: number;
  cumulativeByMonth: { month: string; total: number }[];
  leadsByDay: { date: string; count: number }[];
  estimatedSales: number;
  averageTicket: number;
  opportunitySales: number;
  scoreSales: number;
  periodDays: number;
}

function fmt(n: number) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 10_000) return `${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

const MONTH_LABELS_PT_BR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function DashboardHero({
  financialImpact,
  financialChange,
  leadsGerados,
  conversasAtivas,
  oportunidadesQuentes,
  cumulativeByMonth,
  leadsByDay,
  estimatedSales,
  averageTicket,
  opportunitySales,
  scoreSales,
  periodDays,
}: DashboardHeroProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const showOpportunities = hasOpportunitiesAccess(profile as any);
  const { count: contactCount, limit: contactLimit, hasLimit: hasContactLimit } = useContactLimit();
  const hasChange = financialChange !== 0;
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  const chartData = buildChartData(cumulativeByMonth, periodDays, leadsByDay);

  const periodLabel = periodDays <= 7 ? '7 dias' : periodDays <= 30 ? '30 dias' : '90 dias';

  return (
    <>
      <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.03] rounded-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-primary tracking-wide uppercase">
                  Cockpit de Crescimento
                </p>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm text-xs space-y-2 p-3">
                      <p className="font-semibold text-foreground">Como calculamos o valor em oportunidades:</p>
                      <div className="space-y-1.5">
                        <p><strong>1. Oportunidades prospectadas:</strong> Cada lead gerado tem 1% de chance estimada de venda (apenas os que NÃO possuem score).</p>
                        <p><strong>2. Score de contatos (prioridade):</strong> Leads com score são calculados por faixa: Frio (1-3%), Baixo (4-8%), Engajado (10-18%), Alto valor (20-35%), Pronto p/ venda (40-65%).</p>
                        <p><strong>3. Ticket médio:</strong> R$ {fmtInt(averageTicket)} (média dos seus serviços).</p>
                        <p><strong>4. Sem duplicidade:</strong> Se um lead tem score, ele é calculado APENAS pelo score (prioridade). Leads sem score usam 1%.</p>
                        <p className="text-muted-foreground/70 pt-1">
                          {opportunitySales} venda(s) por oportunidades + {scoreSales} por score = {estimatedSales} total × R$ {fmtInt(averageTicket)} = R$ {fmt(financialImpact)}
                        </p>
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                Seu comercial gerou{" "}
                <span className="text-primary">
                  R$ {fmt(financialImpact)}
                </span>{" "}
                {showOpportunities ? "em oportunidades" : "em atendimentos"}
              </h2>
              {hasChange && (
                <div className="flex items-center gap-1.5">
                  {financialChange > 0 ? (
                    <TrendingUp size={14} className="text-primary" />
                  ) : (
                    <TrendingDown size={14} className="text-destructive" />
                  )}
                  <span className={cn(
                    "text-sm font-semibold",
                    financialChange > 0 ? "text-primary" : "text-destructive"
                  )}>
                    {financialChange > 0 ? '+' : ''}{financialChange.toFixed(0)}% vs {periodLabel} anterior
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{fmtInt(leadsGerados)}</strong> leads gerados</span>
              <span><strong className="text-foreground">{conversasAtivas}</strong> conversas ativas</span>
              {showOpportunities ? (
                <span><strong className="text-foreground">{oportunidadesQuentes}</strong> oportunidades quentes</span>
              ) : (
                <span>
                  <strong className="text-foreground">{fmtInt(contactCount)}</strong> contatos no CRM
                  {hasContactLimit && (
                    <span className="text-muted-foreground"> / {(Number(contactLimit) || 0).toLocaleString('pt-BR')}</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {showOpportunities ? (
                <Button
                  onClick={() => navigate('/opportunities')}
                  variant="outline"
                  className="gap-2 text-sm border-border/50 hover:bg-muted/50"
                >
                  Ver Oportunidades
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/crm')}
                  variant="outline"
                  className="gap-2 text-sm border-border/50 hover:bg-muted/50"
                >
                  Ver Contatos
                  <ArrowRight size={14} />
                </Button>
              )}
              <Button
                onClick={() => setShowCampaignDialog(true)}
                className="gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Rocket size={14} />
                Iniciar Campanha
              </Button>
            </div>
          </div>

          {chartData.length > 1 ? (
            <div className="w-full lg:w-[280px] h-[120px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 2 }}>
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                    tickMargin={8}
                    padding={{ left: 16, right: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [fmtInt(value), 'Leads acumulados']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#heroGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full lg:w-[280px] h-[120px] shrink-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/20">
              <BarChart3 size={24} className="text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/60 text-center px-4">Dados insuficientes para gerar o gráfico</span>
            </div>
          )}
        </div>
      </Card>

      {/* Campaign Type Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-card">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Rocket size={18} className="text-primary" />
                </div>
                Tipo de Campanha
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Escolha a estratégia ideal para o seu objetivo
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-3 p-6 pt-2">
            <button
              className="group relative w-full text-left p-5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300 overflow-hidden"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Megaphone size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base mb-1">Prospecção Fria</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Envio em massa para leads que ainda não conhecem você. Ideal para expandir sua base e gerar novas oportunidades de venda.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary/70">
                    API Outbound • Alta escala
                  </span>
                </div>
              </div>
            </button>

            <button
              className="group relative w-full text-left p-5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300 overflow-hidden"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Users size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base mb-1">Relacionamento Interno</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nutrição e follow-up para leads que já interagiram com você. Seguro para o seu número principal e com maior taxa de resposta.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary/70">
                    Meta API Inbound • Opt-in seguro
                  </span>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildChartData(
  cumulativeByMonth: { month: string; total: number }[],
  periodDays: number,
  leadsByDay: { date: string; count: number }[] = []
): { label: string; total: number }[] {

  if (periodDays <= 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const result: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayData = leadsByDay.find(l => l.date === dateKey);
      result.push({ label: days[d.getDay()], total: dayData?.count || 0 });
    }
    // Build cumulative
    let cumulative = 0;
    const cumulativeResult = result.map(r => {
      cumulative += r.total;
      return { label: r.label, total: cumulative };
    });
    // Only return if there's any data
    return cumulative > 0 ? cumulativeResult : [];
  }

  if (periodDays <= 30) {
    const now = new Date();
    const weekBuckets: { label: string; total: number }[] = [];
    const totalWeeks = Math.max(1, Math.ceil(30 / 7));
    for (let w = 0; w < totalWeeks; w++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (totalWeeks - 1 - w) * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      
      let weekTotal = 0;
      leadsByDay.forEach(l => {
        if (l.date >= weekStart.toISOString().slice(0, 10) && l.date <= weekEnd.toISOString().slice(0, 10)) {
          weekTotal += l.count;
        }
      });
      weekBuckets.push({ label: `Semana ${w + 1}`, total: weekTotal });
    }
    // Build cumulative
    let cumulative = 0;
    const cumulativeResult = weekBuckets.map(r => {
      cumulative += r.total;
      return { label: r.label, total: cumulative };
    });
    return cumulative > 0 ? cumulativeResult : [];
  }

  // 90 days — aggregate by month using real daily data
  const now = new Date();
  const result: { label: string; total: number }[] = [];
  let cumulative = 0;
  for (let i = 2; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    let monthTotal = 0;
    leadsByDay.forEach(l => {
      if (l.date.startsWith(monthKey)) {
        monthTotal += l.count;
      }
    });
    cumulative += monthTotal;
    result.push({ label: MONTH_LABELS_PT_BR[monthDate.getMonth()], total: cumulative });
  }
  return cumulative > 0 ? result : [];
}
