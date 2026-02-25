import {
  AlertTriangle,
  Clock,
  Flame,
  ThermometerSnowflake,
  MessageSquareWarning,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueBottlenecks } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const TrendIndicator = ({ value }: { value: number }) => {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", isUp ? "text-destructive" : "text-primary")}>
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(value)}%
    </span>
  );
};

export const BottleneckCards = () => {
  const { data: metrics, isLoading } = useRevenueBottlenecks();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!metrics) return null;

  // Check if all metrics are zero
  const allZero = metrics.hotIgnoredPct === 0 && metrics.aboveSLAPct === 0 &&
    metrics.avgFirstResponseMin === 0 && metrics.cooledLeads === 0 && metrics.objectionLeads === 0;

  if (allZero) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground/60 italic">
          Nenhum gargalo detectado nos últimos 7 dias.
        </p>
      </div>
    );
  }

  const cards = [
    {
      icon: Flame,
      label: "Quentes Ignorados",
      value: `${metrics.hotIgnoredPct}%`,
      trend: metrics.hotIgnoredTrend,
      color: metrics.hotIgnoredPct > 30 ? "text-destructive" : "text-foreground",
      iconColor: "text-muted-foreground",
    },
    {
      icon: Clock,
      label: "Acima do SLA",
      value: `${metrics.aboveSLAPct}%`,
      trend: metrics.aboveSLATrend,
      color: metrics.aboveSLAPct > 40 ? "text-destructive" : "text-foreground",
      iconColor: "text-muted-foreground",
    },
    {
      icon: AlertTriangle,
      label: "Tempo Médio Resp.",
      value: `${metrics.avgFirstResponseMin}min`,
      trend: metrics.avgFirstResponseTrend,
      color: metrics.avgFirstResponseMin > 30 ? "text-destructive" : "text-foreground",
      iconColor: "text-muted-foreground",
    },
    {
      icon: ThermometerSnowflake,
      label: "Leads Esfriando",
      value: String(metrics.cooledLeads),
      trend: metrics.cooledLeadsTrend,
      color: metrics.cooledLeads > 5 ? "text-destructive" : "text-foreground",
      iconColor: "text-muted-foreground",
    },
    {
      icon: MessageSquareWarning,
      label: "Objeções (7d)",
      value: String(metrics.objectionLeads),
      trend: 0,
      color: metrics.objectionLeads > 3 ? "text-destructive" : "text-foreground",
      iconColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="bg-card border-border/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon size={14} className={card.iconColor} />
              <span className="text-[10px] font-medium text-muted-foreground truncate">{card.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <p className={cn("text-xl font-bold", card.color)}>{card.value}</p>
              <TrendIndicator value={card.trend} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
