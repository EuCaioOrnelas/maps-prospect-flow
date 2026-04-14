import { Card } from "@/components/ui/card";
import { DollarSign, Flame, AlertTriangle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIData {
  title: string;
  value: string;
  badge?: string;
  badgeType: 'positive' | 'negative' | 'neutral';
  subtitle: string;
  icon: React.ReactNode;
  tooltip?: string;
  showBadge: boolean;
}

interface ExecutiveKPIsProps {
  receitaPotencial: number;
  receitaPotencialGrowth: number;
  leadsQuentesHoje: number;
  leadsQuentesOntem: number;
  healthStatus: string;
  healthDetail: string;
  aiMinutesSaved: number;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function ExecutiveKPIs({
  receitaPotencial,
  receitaPotencialGrowth,
  leadsQuentesHoje,
  leadsQuentesOntem,
  healthStatus,
  healthDetail,
  aiMinutesSaved,
}: ExecutiveKPIsProps) {
  const hotLeadsChange = leadsQuentesHoje - leadsQuentesOntem;
  const aiHours = Math.floor(aiMinutesSaved / 60);
  const aiMins = aiMinutesSaved % 60;
  const aiDisplay = aiHours > 0 ? `${aiHours}h ${aiMins}min` : `${aiMins}min`;

  const healthBadgeType: 'positive' | 'negative' | 'neutral' = 
    healthStatus === "Excelente" || healthStatus === "Operação Saudável" ? 'positive' :
    healthStatus === "Atenção Necessária" || healthStatus === "Score Baixo" || healthStatus === "Sem Prospecção" ? 'negative' : 'neutral';

  const kpis: KPIData[] = [
    {
      title: "Receita Potencial Atual",
      value: `R$ ${fmt(receitaPotencial)}`,
      badge: receitaPotencialGrowth !== 0 ? `${receitaPotencialGrowth > 0 ? '+' : ''}${receitaPotencialGrowth.toFixed(0)}%` : '—',
      badgeType: receitaPotencialGrowth > 0 ? 'positive' : receitaPotencialGrowth < 0 ? 'negative' : 'neutral',
      subtitle: "Soma do valor em negociação do CRM",
      icon: <DollarSign size={18} />,
      tooltip: "Soma total dos valores em negociação de todos os leads no CRM. Crescimento comparado aos últimos 30 dias.",
      showBadge: true,
    },
    {
      title: "Leads Quentes Hoje",
      value: String(leadsQuentesHoje),
      badge: hotLeadsChange > 0 ? `+${hotLeadsChange}` : hotLeadsChange < 0 ? String(hotLeadsChange) : '—',
      badgeType: hotLeadsChange > 0 ? 'positive' : hotLeadsChange < 0 ? 'negative' : 'neutral',
      subtitle: "Crescimento de score >150pts em 24h",
      icon: <Flame size={18} />,
      tooltip: "Leads que tiveram um aumento relevante de 150+ pontos no score nas últimas 24 horas. Comparado com o dia anterior.",
      showBadge: true,
    },
    {
      title: "Gargalo Atual",
      value: healthStatus,
      badgeType: healthBadgeType,
      subtitle: healthDetail,
      icon: <AlertTriangle size={18} />,
      tooltip: "Saúde da operação comercial calculada com base no score médio dos leads e volume de oportunidades geradas.",
      showBadge: false,
    },
    {
      title: "IA Economizou",
      value: aiDisplay,
      badge: "automático",
      badgeType: 'positive',
      subtitle: "Tempo economizado com respostas IA + fluxos",
      icon: <Bot size={18} />,
      tooltip: "Calculado com base nos caracteres escritos pela IA (200 chars/min humano) + nós percorridos nos fluxos automatizados (2 min/nó).",
      showBadge: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <TooltipProvider>
        {kpis.map((kpi) => (
          <Tooltip key={kpi.title}>
            <TooltipTrigger asChild>
              <Card className="group relative overflow-hidden border-border/40 bg-card hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.04] transition-all duration-300 cursor-pointer rounded-2xl">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {kpi.icon}
                    </div>
                    {kpi.showBadge && kpi.badge && (
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        kpi.badgeType === 'positive' && "bg-primary/10 text-primary",
                        kpi.badgeType === 'negative' && "bg-destructive/10 text-destructive",
                        kpi.badgeType === 'neutral' && "bg-muted text-muted-foreground",
                      )}>
                        {kpi.badge}
                      </span>
                    )}
                    {!kpi.showBadge && (
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        kpi.badgeType === 'positive' && "bg-primary",
                        kpi.badgeType === 'negative' && "bg-destructive",
                        kpi.badgeType === 'neutral' && "bg-muted-foreground",
                      )} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{kpi.subtitle}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Card>
            </TooltipTrigger>
            {kpi.tooltip && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{kpi.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
