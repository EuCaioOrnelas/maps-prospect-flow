import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DashboardFunnelProps {
  leadsProspected: number;
  messagesSent: number;
  messagesDelivered: number;
  totalResponses: number;
  prevLeadsProspected: number;
  prevMessagesSent: number;
  prevMessagesDelivered: number;
  prevTotalResponses: number;
  periodDays: number;
}

function FunnelStep({ 
  label, value, barWidth, displayPct, prevValue, color, periodDays
}: { 
  label: string; value: number; barWidth: number; displayPct: number; prevValue: number; color: string; periodDays: number;
}) {
  const change = prevValue > 0 ? ((value - prevValue) / prevValue * 100) : 0;
  const isPositive = change > 0;
  const clampedWidth = Math.max(barWidth, 12);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR')}</span>
          {change !== 0 && (
            <span className={cn("text-xs flex items-center gap-0.5", isPositive ? "text-emerald-400" : "text-destructive")}
              title={`vs ${periodDays} dias anteriores`}
            >
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="w-full flex justify-center">
        <div
          className={cn("h-9 rounded-lg transition-all duration-700 flex items-center justify-center", color)}
          style={{ width: `${clampedWidth}%` }}
        >
          {clampedWidth > 20 && (
            <span className="text-xs font-medium text-white/90">{displayPct.toFixed(0)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardFunnel(props: DashboardFunnelProps) {
  const { leadsProspected, messagesSent, messagesDelivered, periodDays } = props;
  const maxVal = Math.max(leadsProspected, messagesSent, messagesDelivered, 1);

  const steps = [
    { label: "Leads Prospectados", value: leadsProspected, prevValue: props.prevLeadsProspected, color: "bg-primary", displayPct: 100 },
    { label: "Mensagens Enviadas", value: messagesSent, prevValue: props.prevMessagesSent, color: "bg-emerald-500", displayPct: leadsProspected > 0 ? (messagesSent / leadsProspected) * 100 : 0 },
    { label: "Entregues", value: messagesDelivered, prevValue: props.prevMessagesDelivered, color: "bg-cyan-500", displayPct: leadsProspected > 0 ? (messagesDelivered / leadsProspected) * 100 : 0 },
  ];

  const hasPrevData = props.prevLeadsProspected > 0 || props.prevMessagesSent > 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Funil de Performance</CardTitle>
          {hasPrevData && (
            <span className="text-[10px] text-muted-foreground">
              Variação vs {periodDays} dias anteriores
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <FunnelStep
            key={step.label}
            label={step.label}
            value={step.value}
            barWidth={(step.value / maxVal) * 100}
            displayPct={step.displayPct}
            prevValue={step.prevValue}
            color={step.color}
            periodDays={periodDays}
          />
        ))}
      </CardContent>
    </Card>
  );
}
