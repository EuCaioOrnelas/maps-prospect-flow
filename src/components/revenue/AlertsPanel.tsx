import { Bell, AlertTriangle, TrendingDown, Clock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueAlerts } from "@/hooks/useRevenueData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const severityStyles: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-yellow-500/30 bg-yellow-500/5",
  info: "border-primary/30 bg-primary/5",
};

const severityIcon: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: TrendingDown,
  info: Clock,
};

export const AlertsPanel = () => {
  const { data: alerts, isLoading } = useRevenueAlerts(5);
  const queryClient = useQueryClient();

  const dismissAlert = async (id: string) => {
    await supabase.from("revenue_alerts").update({ is_read: true } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["revenue-alerts"] });
  };

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  const unread = (alerts || []).filter((a) => !a.is_read);
  if (unread.length === 0) return null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-yellow-400" />
          <CardTitle className="text-base font-semibold">Alertas de Anomalias</CardTitle>
          <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
            {unread.length} novo{unread.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {unread.map((alert) => {
          const Icon = severityIcon[alert.alert_severity] || TrendingDown;
          return (
            <div
              key={alert.id}
              className={cn("flex items-start gap-3 p-3 rounded-lg border", severityStyles[alert.alert_severity] || severityStyles.warning)}
            >
              <Icon size={16} className="shrink-0 mt-0.5 text-yellow-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.alert_message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alert.metric_name} • Variação de {Math.abs(alert.variation_pct).toFixed(0)}% •{" "}
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismissAlert(alert.id)}>
                <X size={12} />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
