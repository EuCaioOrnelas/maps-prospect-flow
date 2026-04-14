import { Card } from "@/components/ui/card";
import { DollarSign, Flame, AlertTriangle, Bot, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIData {
  title: string;
  value: string;
  badge: string;
  badgeType: 'positive' | 'negative' | 'neutral';
  subtitle: string;
  icon: React.ReactNode;
  tooltip?: string;
}

interface ExecutiveKPIsProps {
  financialImpact: number;
  financialChange: number;
  hotLeads: number;
  hotLeadsChange: number;
  bottleneck: { label: string; change: number; detail: string };
  aiHoursSaved: number;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function ExecutiveKPIs({
  financialImpact,
  financialChange,
  hotLeads,
  hotLeadsChange,
  bottleneck,
  aiHoursSaved,
}: ExecutiveKPIsProps) {
  const kpis: KPIData[] = [
    {
      title: "Receita Potencial Atual",
      value: `R$ ${fmt(financialImpact)}`,
      badge: financialChange !== 0 ? `${financialChange > 0 ? '+' : ''}${financialChange.toFixed(0)}%` : '—',
      badgeType: financialChange > 0 ? 'positive' : financialChange < 0 ? 'negative' : 'neutral',
      subtitle: "Pipeline ponderado ativo",
      icon: <DollarSign size={18} />,
      tooltip: "Estimativa baseada nos leads ativos e taxa de conversão histórica",
    },
    {
      title: "Leads Quentes Hoje",
      value: String(hotLeads),
      badge: hotLeadsChange > 0 ? `+${hotLeadsChange}` : hotLeadsChange < 0 ? String(hotLeadsChange) : '—',
      badgeType: hotLeadsChange > 0 ? 'positive' : hotLeadsChange < 0 ? 'negative' : 'neutral',
      subtitle: "Alta chance de resposta",
      icon: <Flame size={18} />,
      tooltip: "Leads com score acima de 80 ou resposta recente",
    },
    {
      title: "Gargalo Atual",
      value: bottleneck.label,
      badge: `${bottleneck.change > 0 ? '+' : ''}${bottleneck.change.toFixed(0)}%`,
      badgeType: bottleneck.change < 0 ? 'negative' : 'positive',
      subtitle: bottleneck.detail,
      icon: <AlertTriangle size={18} />,
      tooltip: "Principal ponto de atenção identificado pela IA",
    },
    {
      title: "IA Economizou",
      value: `${aiHoursSaved}h`,
      badge: "automático",
      badgeType: 'positive',
      subtitle: "Respostas + follow-up + CRM",
      icon: <Bot size={18} />,
      tooltip: "Horas estimadas economizadas com automação inteligente",
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
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      kpi.badgeType === 'positive' && "bg-primary/10 text-primary",
                      kpi.badgeType === 'negative' && "bg-destructive/10 text-destructive",
                      kpi.badgeType === 'neutral' && "bg-muted text-muted-foreground",
                    )}>
                      {kpi.badge}
                    </span>
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
                {/* Hover glow */}
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
