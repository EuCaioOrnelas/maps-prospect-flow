import { Card } from "@/components/ui/card";
import { Users, Send, Shield, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number; // percentage change vs previous period
  suffix?: string;
}

function KPICard({ title, value, icon, change, suffix }: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card className="p-5 glass relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[60px] transition-all group-hover:bg-primary/10" />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        {!isNeutral && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}{suffix}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Leads Prospectados"
        value={props.leadsProspected.toLocaleString('pt-BR')}
        icon={<Users size={20} />}
        change={calcChange(props.leadsProspected, props.prevLeadsProspected)}
      />
      <KPICard
        title="Mensagens Enviadas"
        value={props.messagesSent.toLocaleString('pt-BR')}
        icon={<Send size={20} />}
        change={calcChange(props.messagesSent, props.prevMessagesSent)}
      />
      <KPICard
        title="Taxa de Entregabilidade"
        value={props.deliverabilityRate.toFixed(1)}
        suffix="%"
        icon={<Shield size={20} />}
        change={props.deliverabilityRate - props.prevDeliverabilityRate}
      />
      <KPICard
        title="Taxa de Resposta"
        value={props.responseRate.toFixed(1)}
        suffix="%"
        icon={<MessageSquare size={20} />}
        change={props.responseRate - props.prevResponseRate}
      />
    </div>
  );
}
