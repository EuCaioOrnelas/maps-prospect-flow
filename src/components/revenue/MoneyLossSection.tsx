import { DollarSign, AlertTriangle, ThermometerSnowflake, MessageSquareWarning, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueBottlenecks, useRevenueSettings, useRevenueLeads } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export const MoneyLossSection = () => {
  const { data: metrics, isLoading: loadingMetrics } = useRevenueBottlenecks();
  const { data: settings } = useRevenueSettings();
  const { data: leads, isLoading: loadingLeads } = useRevenueLeads();

  if (loadingMetrics || loadingLeads) return <Skeleton className="h-32 rounded-xl" />;
  if (!metrics) return null;

  const ticket = settings?.default_ticket_value || 3000;
  const rates = {
    HOT: settings?.default_close_rate_hot || 0.15,
    VERY_HOT: settings?.default_close_rate_very_hot || 0.35,
  };

  // Calculate real impacts
  const hotIgnored = (leads || []).filter(
    l => (l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT") && l.risk_state !== "OK"
  );
  const coolingLeads = (leads || []).filter(l => l.risk_state === "COOLING");
  const atRiskLeads = (leads || []).filter(l => l.risk_state === "AT_RISK");

  const losses: Array<{
    icon: typeof AlertTriangle;
    label: string;
    detail: string;
    impact: string | null;
    severity: "high" | "medium";
  }> = [];

  if (hotIgnored.length > 0) {
    const impactValue = hotIgnored.reduce((sum, l) => {
      const rate = rates[l.status_bucket as keyof typeof rates] || 0;
      return sum + (l.estimated_ticket_value || ticket) * rate;
    }, 0);
    losses.push({
      icon: AlertTriangle,
      label: `${hotIgnored.length} lead${hotIgnored.length > 1 ? "s" : ""} quente${hotIgnored.length > 1 ? "s" : ""} sem resposta`,
      detail: "Leads com alto potencial que não receberam atenção",
      impact: fmt(impactValue),
      severity: "high",
    });
  }

  if (coolingLeads.length > 0) {
    losses.push({
      icon: ThermometerSnowflake,
      label: `${coolingLeads.length} lead${coolingLeads.length > 1 ? "s" : ""} esfriando`,
      detail: "Perdendo engajamento por falta de interação",
      impact: null,
      severity: "medium",
    });
  }

  if (metrics.objectionLeads > 0) {
    losses.push({
      icon: MessageSquareWarning,
      label: `${metrics.objectionLeads} objeç${metrics.objectionLeads > 1 ? "ões" : "ão"} detectada${metrics.objectionLeads > 1 ? "s" : ""}`,
      detail: "Leads com sinais negativos nos últimos 7 dias",
      impact: null,
      severity: "medium",
    });
  }

  if (metrics.aboveSLAPct > 20 && metrics.aboveSLAPct > 0) {
    losses.push({
      icon: Clock,
      label: `${metrics.aboveSLAPct}% das conversas acima do SLA`,
      detail: "Tempo de resposta excedendo o limite configurado",
      impact: null,
      severity: metrics.aboveSLAPct > 40 ? "high" : "medium",
    });
  }

  // Hide section entirely if no losses
  if (losses.length === 0) return null;

  return (
    <Card className="bg-card border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-destructive/70" />
          <CardTitle className="text-base font-semibold">Onde Você Está Perdendo Dinheiro</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {losses.map((loss, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              loss.severity === "high"
                ? "bg-destructive/[0.03] border-destructive/15"
                : "bg-secondary/30 border-border/30"
            )}
          >
            <loss.icon size={14} className={cn(
              "shrink-0 mt-0.5",
              loss.severity === "high" ? "text-destructive/70" : "text-muted-foreground"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{loss.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{loss.detail}</p>
            </div>
            {loss.impact && (
              <span className="text-sm font-bold text-destructive shrink-0">
                -{loss.impact}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
