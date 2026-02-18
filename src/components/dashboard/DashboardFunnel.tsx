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
  label, value, barWidth, displayPct, prevValue, periodDays
}: { 
  label: string; value: number; barWidth: number; displayPct: number; prevValue: number; periodDays: number;
}) {
  const change = prevValue > 0 ? ((value - prevValue) / prevValue * 100) : 0;
  const isPositive = change > 0;
  const clampedWidth = Math.max(barWidth, 12);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{value.toLocaleString('pt-BR')}</span>
          {change !== 0 && (
            <span className={cn("text-[10px] flex items-center gap-0.5", isPositive ? "text-emerald-400" : "text-destructive")}
              title={`vs ${periodDays} dias anteriores`}
            >
              {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="w-full flex justify-center">
        <div
          className="h-6 rounded-md transition-all duration-700 flex items-center justify-center bg-primary/20"
          style={{ width: `${clampedWidth}%` }}
        >
          {clampedWidth > 20 && (
            <span className="text-[10px] font-medium text-foreground/60">{displayPct.toFixed(0)}%</span>
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
    { label: "Leads Prospectados", value: leadsProspected, prevValue: props.prevLeadsProspected, displayPct: 100 },
    { label: "Mensagens Enviadas", value: messagesSent, prevValue: props.prevMessagesSent, displayPct: leadsProspected > 0 ? (messagesSent / leadsProspected) * 100 : 0 },
    { label: "Entregues", value: messagesDelivered, prevValue: props.prevMessagesDelivered, displayPct: leadsProspected > 0 ? (messagesDelivered / leadsProspected) * 100 : 0 },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">Funil de Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {steps.map((step) => (
          <FunnelStep
            key={step.label}
            label={step.label}
            value={step.value}
            barWidth={(step.value / maxVal) * 100}
            displayPct={step.displayPct}
            prevValue={step.prevValue}
            periodDays={periodDays}
          />
        ))}
      </CardContent>
    </Card>
  );
}
