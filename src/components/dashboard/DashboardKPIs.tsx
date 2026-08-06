import { Card } from "@/components/ui/card";
import { Users, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricSlot } from "@/components/ui/metric-empty";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel?: string;
  suffix?: string;
  subtitle?: string;
  subtitleSize?: string;
  empty?: boolean;
  emptyHint?: string;
  loading?: boolean;
}

function KPICard({ title, value, icon, change, changeLabel, suffix, subtitle, subtitleSize, empty, emptyHint, loading }: KPICardProps) {
  const isPositive = change > 0;
  const hasRealChange = change !== 0;

  return (
    <Card className="bg-card border-border/50 p-5 relative overflow-hidden rounded-xl">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          empty || loading ? "bg-muted/40 text-muted-foreground/40" : "bg-muted/50 text-muted-foreground"
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            {title}
          </p>
          <MetricSlot loading={loading} empty={empty} hint={emptyHint} className="mt-1 min-h-[52px]">
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {value}{suffix}
                </p>
                {hasRealChange && (
                  <span className={cn(
                    "text-[10px] font-medium",
                    isPositive ? "text-emerald-400" : "text-destructive"
                  )}>
                    {changeLabel || `${isPositive ? '+' : ''}${Math.abs(change).toFixed(1)}%`}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className={cn(subtitleSize || "text-[10px]", "text-muted-foreground/50 mt-0.5")}>{subtitle}</p>
              )}
            </>
          </MetricSlot>
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
  loading?: boolean;
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
  const leadsDiff = leadsProspected - prevLeadsProspected;
  const conversasChange = calcChange(messagesSent, prevMessagesSent);
  const conversasDiff = messagesSent - prevMessagesSent;

  const activationRate = leadsProspected > 0
    ? (messagesSent / leadsProspected) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <KPICard
        title="Leads Prospectados"
        value={leadsProspected.toLocaleString('pt-BR')}
        icon={<Users size={16} />}
        change={leadsChange}
        loading={props.loading}
        empty={leadsProspected === 0}
        emptyHint="Preenchido após a primeira busca de leads."
        changeLabel={leadsChange !== 0 ? `${leadsChange > 0 ? '+' : ''}${Math.abs(leadsChange).toFixed(1)}% vs anterior` : undefined}
        subtitle={
          leadsDiff !== 0
            ? `${leadsDiff > 0 ? '+' : ''}${leadsDiff.toLocaleString('pt-BR')} leads ${leadsDiff > 0 ? 'a mais' : 'a menos'} que o período anterior`
            : 'Mesmo volume do período anterior'
        }
        subtitleSize="text-xs"
      />
      <KPICard
        title="Conversas Iniciadas"
        value={messagesSent.toLocaleString('pt-BR')}
        icon={<MessageCircle size={16} />}
        change={conversasChange}
        loading={props.loading}
        empty={messagesSent === 0}
        emptyHint="Disponível após o primeiro envio de mensagem."
        changeLabel={
          prevMessagesSent > 0 && conversasDiff !== 0
            ? `${conversasDiff > 0 ? '+' : ''}${conversasDiff} vs anterior`
            : undefined
        }
        subtitle={`Taxa de conversas iniciadas: ${activationRate.toFixed(1)}%`}
        subtitleSize="text-xs"
      />

    </div>
  );
}
