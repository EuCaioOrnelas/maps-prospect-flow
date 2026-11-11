import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Flame, AlertTriangle, Bot, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricSlot } from "@/components/ui/metric-empty";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIData {
  title: string;
  value: string;
  badge?: string;
  badgeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description: string;
  showBadge: boolean;
  empty?: boolean;
  /** Frase curta do estado vazio — cabe em uma linha. */
  emptyLabel?: string;
}

interface ExecutiveKPIsProps {
  receitaPotencial: number;
  receitaPotencialGrowth: number;
  leadsQuentesHoje: number;
  leadsQuentesOntem: number;
  healthStatus: string;
  healthDetail: string;
  aiMinutesSaved: number;
  loading?: boolean;
}

function fmtCompact(n: number) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 10_000) return `${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ExecutiveKPIs({
  receitaPotencial,
  receitaPotencialGrowth,
  leadsQuentesHoje,
  leadsQuentesOntem,
  healthStatus,
  healthDetail,
  aiMinutesSaved,
  loading = false,
}: ExecutiveKPIsProps) {
  const hotLeadsChange = leadsQuentesHoje - leadsQuentesOntem;
  const aiHours = Math.floor(aiMinutesSaved / 60);
  const aiMins = aiMinutesSaved % 60;
  const aiDisplay = aiHours > 0 ? `${aiHours}h ${aiMins}min` : `${aiMins}min`;

  const isInsufficientData = healthStatus === "Dados Insuficientes";

  const healthBadgeType: 'positive' | 'negative' | 'neutral' =
    healthStatus === "Excelente" || healthStatus === "Operação Saudável" ? 'positive' :
    healthStatus === "Atenção Necessária" || healthStatus === "Score Baixo" || healthStatus === "Crítico" ? 'negative' : 'neutral';

  const healthTooltip = isInsufficientData
    ? "O cálculo de saúde requer no mínimo 300 leads prospectados e 50 leads no CRM. Após atingir esses volumes, o diagnóstico será calculado com base em: score médio, % de leads quentes, penalidade de leads frios, oportunidades recentes e perda de score."
    : "Saúde da operação calculada com: score médio (0-40pts), % leads quentes score≥601 (0-25pts), penalidade leads frios score≤200, oportunidades recentes últimos 7 dias (0-20pts), e penalidade por perda de score. Fatores sem dados são excluídos do cálculo.";

  const kpis: KPIData[] = [
    {
      title: "Receita Potencial Atual",
      value: `R$ ${fmtCompact(receitaPotencial)}`,
      badge: receitaPotencialGrowth !== 0 ? `${receitaPotencialGrowth > 0 ? '+' : ''}${receitaPotencialGrowth.toFixed(0)}%` : undefined,
      badgeType: receitaPotencialGrowth > 0 ? 'positive' : receitaPotencialGrowth < 0 ? 'negative' : 'neutral',
      icon: <DollarSign size={20} />,
      description: "Soma total dos valores em negociação de todos os leads no CRM. Crescimento comparado aos últimos 30 dias.",
      showBadge: true,
      empty: receitaPotencial === 0,
      emptyLabel: "Aguardando negociações",
    },
    {
      title: "Leads Quentes Hoje",
      value: String(leadsQuentesHoje),
      badge: hotLeadsChange > 0 ? `+${hotLeadsChange}` : hotLeadsChange < 0 ? String(hotLeadsChange) : undefined,
      badgeType: hotLeadsChange > 0 ? 'positive' : hotLeadsChange < 0 ? 'negative' : 'neutral',
      icon: <Flame size={20} />,
      description: "Leads que tiveram um aumento relevante de 150+ pontos no score nas últimas 24 horas. Comparado com o dia anterior.",
      showBadge: true,
      empty: leadsQuentesHoje === 0 && leadsQuentesOntem === 0,
      emptyLabel: "Aguardando score dos leads",
    },
    {
      title: "Gargalo Atual",
      value: healthStatus,
      badgeType: healthBadgeType,
      icon: <AlertTriangle size={20} />,
      description: healthDetail ? `${healthTooltip} — ${healthDetail}` : healthTooltip,
      showBadge: false,
      empty: isInsufficientData,
      emptyLabel: "Precisa de mais leads",
    },
    {
      title: "IA Economizou",
      value: aiDisplay,
      badge: "automático",
      badgeType: 'positive',
      icon: <Bot size={20} />,
      empty: aiMinutesSaved === 0,
      emptyLabel: "Aguardando uso da IA",
      description: "Tempo economizado com respostas IA + fluxos. Calculado com base nos caracteres escritos pela IA (200 chars/min humano) + nós percorridos nos fluxos automatizados (2 min/nó).",
      showBadge: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <TooltipProvider>
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-border/50 relative overflow-hidden">
            {/* Green glow */}
            {!kpi.empty && !loading && (
              <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-2xl pointer-events-none" />
            )}
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center translate-y-[1px]",
                    kpi.empty || loading ? "bg-muted/50" : "bg-primary/[0.07] dark:bg-primary/[0.12]"
                  )}
                >
                  <span className={cn(kpi.empty || loading ? "text-muted-foreground/40" : "text-primary")}>
                    {kpi.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 h-[18px]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none truncate min-w-0">
                      {kpi.title}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`O que significa ${kpi.title}?`}
                          className="shrink-0 -translate-y-px rounded-full text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug">
                        {kpi.description}
                      </TooltipContent>
                    </Tooltip>
                    {kpi.showBadge && kpi.badge && !kpi.empty && !loading && (
                      <span
                        className={cn(
                          "ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          kpi.badgeType === 'positive' && "bg-primary/10 text-primary",
                          kpi.badgeType === 'negative' && "bg-destructive/10 text-destructive dark:text-red-400",
                          kpi.badgeType === 'neutral' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {kpi.badge}
                      </span>
                    )}
                  </div>
                  <MetricSlot
                    cacheKey={`cockpit:${kpi.title}`}
                    loading={loading}
                    empty={kpi.empty}
                    label={kpi.emptyLabel}
                    size="sm"
                    className="min-h-[24px] mt-1.5"
                  >
                    <p
                      className={cn(
                        "font-bold leading-none truncate",
                        kpi.value.length > 14 ? "text-[15px]" : "text-[22px]"
                      )}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {kpi.value}
                    </p>
                  </MetricSlot>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TooltipProvider>
    </div>
  );
}
