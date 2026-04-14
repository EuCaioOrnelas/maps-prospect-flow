import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Rocket, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
  estimatedSales: number;
  averageTicket: number;
  opportunitySales: number;
  scoreSales: number;
  periodDays: number;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function DashboardHero({
  financialImpact,
  financialChange,
  leadsGerados,
  conversasAtivas,
  oportunidadesQuentes,
  cumulativeByMonth,
  estimatedSales,
  averageTicket,
  opportunitySales,
  scoreSales,
  periodDays,
}: DashboardHeroProps) {
  const navigate = useNavigate();
  const hasChange = financialChange !== 0;
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  const chartData = buildChartData(cumulativeByMonth, periodDays);

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
                em oportunidades
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
                    {financialChange > 0 ? '+' : ''}{financialChange.toFixed(0)}% vs período anterior
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{fmtInt(leadsGerados)}</strong> leads gerados</span>
              <span><strong className="text-foreground">{conversasAtivas}</strong> conversas ativas</span>
              <span><strong className="text-foreground">{oportunidadesQuentes}</strong> oportunidades quentes</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={() => navigate('/opportunities')}
                variant="outline"
                className="gap-2 text-sm border-border/50 hover:bg-muted/50"
              >
                Ver Oportunidades
                <ArrowRight size={14} />
              </Button>
              <Button
                onClick={() => setShowCampaignDialog(true)}
                className="gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Rocket size={14} />
                Iniciar Campanha
              </Button>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="w-full lg:w-[280px] h-[120px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
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
          )}
        </div>
      </Card>

      {/* Campaign Type Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Campanha</DialogTitle>
            <DialogDescription>Escolha o tipo de campanha que deseja iniciar</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1 text-left"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <span className="font-semibold text-foreground">Prospecção Fria</span>
              <span className="text-xs text-muted-foreground">Meta API Outbound — Envio em massa para leads que ainda não conhecem você</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1 text-left"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <span className="font-semibold text-foreground">Relacionamento Interno</span>
              <span className="text-xs text-muted-foreground">Meta API Inbound — Nutrição e follow-up para leads que já interagiram</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildChartData(
  cumulativeByMonth: { month: string; total: number }[],
  periodDays: number
): { label: string; total: number }[] {
  if (cumulativeByMonth.length === 0) return [];

  if (periodDays <= 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        label: days[d.getDay()],
        total: cumulativeByMonth.length > 0 ? Math.round(cumulativeByMonth[cumulativeByMonth.length - 1].total * ((7 - i) / 7)) : 0,
      });
    }
    return result;
  }

  if (periodDays <= 30) {
    // Calculate which weeks of the month fall in the last 30 days
    const now = new Date();
    const result = [];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);

    // Group by week number within the month
    const weeks = new Map<number, { label: string; total: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const weekOfMonth = Math.ceil(d.getDate() / 7);
      if (!weeks.has(weekOfMonth)) {
        weeks.set(weekOfMonth, {
          label: `Semana ${weekOfMonth}`,
          total: 0,
        });
      }
    }

    const lastTotal = cumulativeByMonth.length > 0 ? cumulativeByMonth[cumulativeByMonth.length - 1].total : 0;
    const sortedWeeks = Array.from(weeks.values()).sort((a, b) => {
      const numA = parseInt(a.label.replace('Semana ', ''));
      const numB = parseInt(b.label.replace('Semana ', ''));
      return numA - numB;
    });

    // Distribute values proportionally across weeks
    sortedWeeks.forEach((w, i) => {
      w.total = Math.round(lastTotal * ((i + 1) / sortedWeeks.length));
    });

    return sortedWeeks;
  }

  // 90 days — show last 3 months
  return cumulativeByMonth.slice(-3).map(m => ({ label: m.month, total: m.total }));
}
