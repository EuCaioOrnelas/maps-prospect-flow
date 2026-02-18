import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DashboardFunnelProps {
  leadsProspected: number;
  totalResponses: number;
  prevLeadsProspected: number;
  prevTotalResponses: number;
  messagesSent: number;
  prevMessagesSent: number;
  periodDays: number;
  conversionRate?: number;
}

const DEFAULT_OPPORTUNITY_RATE = 0.03; // 3% market average

function FunnelStep({ 
  label, value, barWidth, displayPct, prevValue, periodDays
}: { 
  label: string; value: number; barWidth: number; displayPct: number; prevValue: number; periodDays: number;
}) {
  const hasRealPrev = prevValue > 0;
  const change = hasRealPrev ? ((value - prevValue) / prevValue * 100) : 0;
  const isPositive = change > 0;
  const clampedWidth = Math.max(barWidth, 8);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground/70">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{value.toLocaleString('pt-BR')}</span>
          {hasRealPrev && change !== 0 && (
            <span className={cn("text-[10px] font-medium", isPositive ? "text-emerald-400" : "text-destructive")}
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
          className={cn(
            "h-7 rounded-md transition-all duration-700 flex items-center justify-center",
            displayPct === 100 ? "bg-primary/25" : "bg-primary/20"
          )}
          style={{ width: `${Math.max(clampedWidth, value > 0 ? 8 : 4)}%`, opacity: displayPct === 100 ? 1 : 0.65 }}
        >
          <span className="text-[10px] font-semibold text-foreground/70">{displayPct.toFixed(0)}%</span>
        </div>
      </div>
      {/* Conversion rate between steps */}
      {displayPct < 100 && displayPct > 0 && (
        <p className="text-[9px] text-muted-foreground/40 text-center">
          {displayPct.toFixed(1)}% taxa de conversão
        </p>
      )}
    </div>
  );
}

export function DashboardFunnel(props: DashboardFunnelProps) {
  const { leadsProspected, periodDays } = props;
  const messagesSent = props.messagesSent ?? 0;
  const prevMessagesSent = props.prevMessagesSent ?? 0;
  const opportunityRate = props.conversionRate ?? DEFAULT_OPPORTUNITY_RATE;
  const estimatedOpportunities = Math.round(messagesSent * opportunityRate);
  const prevEstimatedOpportunities = Math.round(prevMessagesSent * opportunityRate);

  const maxVal = Math.max(leadsProspected, messagesSent, 1);

  const steps = [
    { 
      label: "Leads Prospectados", 
      value: leadsProspected, 
      prevValue: props.prevLeadsProspected, 
      displayPct: 100 
    },
    { 
      label: "Conversas Iniciadas", 
      value: messagesSent, 
      prevValue: prevMessagesSent, 
      displayPct: leadsProspected > 0 ? (messagesSent / leadsProspected) * 100 : 0 
    },
    { 
      label: "Oportunidades Estimadas", 
      value: estimatedOpportunities, 
      prevValue: prevEstimatedOpportunities, 
      displayPct: leadsProspected > 0 ? (estimatedOpportunities / leadsProspected) * 100 : 0 
    },
  ];

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="text-sm font-semibold text-foreground">Funil de Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">
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
        <p className="text-[9px] text-muted-foreground/35 text-right pt-1">
          *Oportunidades estimadas com base em média de mercado de {(opportunityRate * 100).toFixed(0)}%
        </p>
      </CardContent>
    </Card>
  );
}
