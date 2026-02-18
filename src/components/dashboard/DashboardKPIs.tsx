import { Card } from "@/components/ui/card";
import { Users, Send, Shield, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  suffix?: string;
}

function KPICard({ title, value, icon, change, suffix }: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

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
            {!isNeutral && (
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface DashboardKPIsProps {
  leadsProspected: number;
  prevLeadsProspected: number;
  messagesSent: number;
  prevMessagesSent: number;
  deliverabilityRate: number;
  prevDeliverabilityRate: number;
  responseRate: number;
  prevResponseRate: number;
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function DashboardKPIs(props: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KPICard
        title="Leads Prospectados"
        value={props.leadsProspected.toLocaleString('pt-BR')}
        icon={<Users size={16} />}
        change={calcChange(props.leadsProspected, props.prevLeadsProspected)}
      />
      <KPICard
        title="Mensagens Enviadas"
        value={props.messagesSent.toLocaleString('pt-BR')}
        icon={<Send size={16} />}
        change={calcChange(props.messagesSent, props.prevMessagesSent)}
      />
      <KPICard
        title="Taxa de Entregabilidade"
        value={props.deliverabilityRate.toFixed(1)}
        suffix="%"
        icon={<Shield size={16} />}
        change={props.deliverabilityRate - props.prevDeliverabilityRate}
      />
    </div>
  );
}
