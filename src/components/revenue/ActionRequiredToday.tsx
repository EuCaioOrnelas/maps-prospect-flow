import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueActionItems } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const ActionRequiredToday = () => {
  const { data: items, isLoading } = useRevenueActionItems();

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  if (!items || items.length === 0) {
    return (
      <Card className="bg-card border-border/40">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            ✅ Nenhuma ação crítica identificada hoje.
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = items.filter(i => i.urgency === "critical").length;

  return (
    <Card className={cn(
      "border",
      criticalCount > 0
        ? "bg-destructive/[0.03] border-destructive/20"
        : "bg-card border-border/40"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className={criticalCount > 0 ? "text-destructive" : "text-muted-foreground"} />
          <CardTitle className="text-base font-semibold">
            🔥 Ação Necessária Hoje
          </CardTitle>
          {criticalCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const timeSince = formatDistanceToNow(new Date(item.last_activity_at), {
            addSuffix: false,
            locale: ptBR,
          });

          return (
            <Link
              key={item.id}
              to={`/revenue/leads/${item.id}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors group",
                item.urgency === "critical"
                  ? "bg-destructive/5 hover:bg-destructive/10 border border-destructive/10"
                  : "bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name || item.phone_e164}
                  </p>
                  <Badge variant="outline" className={cn(
                    "text-[10px] shrink-0",
                    item.urgency === "critical"
                      ? "border-destructive/30 text-destructive"
                      : "border-border text-muted-foreground"
                  )}>
                    Score {item.score_total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={10} />
                  <span>{timeSince}</span>
                </div>
                <ArrowRight size={14} className="text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
