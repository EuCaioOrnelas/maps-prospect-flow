import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface DashboardFunnelProps {
  leadsProspected: number;
  messagesSent: number;
  messagesDelivered: number; // sent - failed
  totalResponses: number;
  prevLeadsProspected: number;
  prevMessagesSent: number;
  prevMessagesDelivered: number;
  prevTotalResponses: number;
}

function FunnelStep({ 
  label, value, widthPercent, prevValue, color 
}: { 
  label: string; value: number; widthPercent: number; prevValue: number; color: string;
}) {
  const change = prevValue > 0 ? ((value - prevValue) / prevValue * 100) : (value > 0 ? 100 : 0);
  const isPositive = change > 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR')}</span>
          {change !== 0 && (
            <span className={cn("text-xs flex items-center gap-0.5", isPositive ? "text-emerald-400" : "text-destructive")}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3", color)}
          style={{ width: `${Math.max(widthPercent, 5)}%` }}
        >
          {widthPercent > 15 && (
            <span className="text-xs font-medium text-white/90">{widthPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversionRate({ from, to }: { from: number; to: number }) {
  const rate = from > 0 ? ((to / from) * 100).toFixed(1) : '0';
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRight size={12} />
        <span>Conversão: <strong className="text-primary">{rate}%</strong></span>
      </div>
    </div>
  );
}

export function DashboardFunnel(props: DashboardFunnelProps) {
  const { leadsProspected, messagesSent, messagesDelivered, totalResponses } = props;
  const maxVal = Math.max(leadsProspected, 1);

  const steps = [
    { label: "Leads Prospectados", value: leadsProspected, prevValue: props.prevLeadsProspected, color: "bg-primary" },
    { label: "Mensagens Enviadas", value: messagesSent, prevValue: props.prevMessagesSent, color: "bg-emerald-500" },
    { label: "Entregues", value: messagesDelivered, prevValue: props.prevMessagesDelivered, color: "bg-cyan-500" },
    { label: "Respondidas", value: totalResponses, prevValue: props.prevTotalResponses, color: "bg-violet-500" },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Funil de Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step, i) => (
          <div key={step.label}>
            <FunnelStep
              label={step.label}
              value={step.value}
              widthPercent={(step.value / maxVal) * 100}
              prevValue={step.prevValue}
              color={step.color}
            />
            {i < steps.length - 1 && (
              <ConversionRate from={steps[i].value} to={steps[i + 1].value} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
