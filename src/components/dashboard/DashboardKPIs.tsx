import { Card } from "@/components/ui/card";
import { Users, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel?: string;
  suffix?: string;
  subtitle?: string;
}

function KPICard({ title, value, icon, change, changeLabel, suffix, subtitle }: KPICardProps) {
  const isPositive = change > 0;
  const hasRealChange = change !== 0;

  return (
    <Card className="p-4 border-border/40 bg-card/80 relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground leading-tight">
              {value}{suffix}
            </p>
            {hasRealChange && (
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {changeLabel || `${Math.abs(change).toFixed(1)}%`}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface DashboardKPIsProps {
  leadsProspected: number;
  prevLeadsProspected: number;
  totalResponses: number;
  prevTotalResponses: number;
  messagesSent: number;
  prevMessagesSent: number;
  responseRate: number;
  prevResponseRate: number;
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return 0; // Don't show +100% when no previous data
  return ((current - previous) / previous) * 100;
}

export function DashboardKPIs(props: DashboardKPIsProps) {
  const leadsProspected = props.leadsProspected ?? 0;
  const prevLeadsProspected = props.prevLeadsProspected ?? 0;
  const totalResponses = props.totalResponses ?? 0;
  const prevTotalResponses = props.prevTotalResponses ?? 0;
  const messagesSent = props.messagesSent ?? 0;
  const prevMessagesSent = props.prevMessagesSent ?? 0;

  const leadsChange = calcChange(leadsProspected, prevLeadsProspected);
  const conversasChange = calcChange(totalResponses, prevTotalResponses);
  const conversasDiff = totalResponses - prevTotalResponses;

  const activationRate = leadsProspected > 0
    ? (totalResponses / leadsProspected) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <KPICard
        title="Leads Prospectados"
        value={leadsProspected.toLocaleString('pt-BR')}
        icon={<Users size={16} />}
        change={leadsChange}
        changeLabel={leadsChange !== 0 ? `${leadsChange > 0 ? '+' : ''}${Math.abs(leadsChange).toFixed(1)}% vs anterior` : undefined}
      />
      <KPICard
        title="Conversas Iniciadas"
        value={totalResponses.toLocaleString('pt-BR')}
        icon={<MessageCircle size={16} />}
        change={conversasChange}
        changeLabel={
          prevTotalResponses > 0 && conversasDiff !== 0
            ? `${conversasDiff > 0 ? '+' : ''}${conversasDiff} vs anterior`
            : undefined
        }
        subtitle={`Taxa de ativação: ${activationRate.toFixed(1)}%`}
      />
    </div>
  );
}
