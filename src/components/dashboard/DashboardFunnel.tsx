import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DashboardFunnelProps {
  leadsProspected: number;
  totalResponses: number;
  prevLeadsProspected: number;
  prevTotalResponses: number;
  periodDays: number;
  conversionRate?: number; // configurable estimated opportunity rate, default 3%
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
  const clampedWidth = Math.max(barWidth, 12);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{value.toLocaleString('pt-BR')}</span>
          {hasRealPrev && change !== 0 && (
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
  const { leadsProspected, totalResponses, periodDays } = props;
  const opportunityRate = props.conversionRate ?? DEFAULT_OPPORTUNITY_RATE;
  const estimatedOpportunities = Math.round(totalResponses * opportunityRate * 100) / 100;
  const prevEstimatedOpportunities = Math.round(props.prevTotalResponses * opportunityRate * 100) / 100;

  const maxVal = Math.max(leadsProspected, totalResponses, 1);

  const steps = [
    { 
      label: "Leads Prospectados", 
      value: leadsProspected, 
      prevValue: props.prevLeadsProspected, 
      displayPct: 100 
    },
    { 
      label: "Conversas Iniciadas", 
      value: totalResponses, 
      prevValue: props.prevTotalResponses, 
      displayPct: leadsProspected > 0 ? (totalResponses / leadsProspected) * 100 : 0 
    },
    { 
      label: "Oportunidades Estimadas", 
      value: Math.round(estimatedOpportunities), 
      prevValue: Math.round(prevEstimatedOpportunities), 
      displayPct: leadsProspected > 0 ? (estimatedOpportunities / leadsProspected) * 100 : 0 
    },
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
        <p className="text-[9px] text-muted-foreground/40 text-right italic pt-1">
          *Oportunidades estimadas com base em média de mercado de {(opportunityRate * 100).toFixed(0)}%
        </p>
      </CardContent>
    </Card>
  );
}
