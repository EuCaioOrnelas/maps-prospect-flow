import { useState, useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  timestamp: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive" as const },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", badge: "secondary" as const },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", badge: "secondary" as const },
  success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", badge: "secondary" as const },
};

export default function AdminAlertas() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateAlerts = async () => {
      const generatedAlerts: Alert[] = [];

      // Check trials expiring soon
      const { count: expiringTrials } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free")
        .gte("trial_end_at", new Date().toISOString())
        .lte("trial_end_at", new Date(Date.now() + 2 * 86400000).toISOString());

      if (expiringTrials && expiringTrials > 0) {
        generatedAlerts.push({
          id: "expiring-trials",
          severity: "warning",
          title: `${expiringTrials} trials expirando em 48h`,
          description: "Considere enviar uma campanha de upgrade para esses usuários.",
          timestamp: new Date().toISOString(),
        });
      }

      // Check free users near limit
      const { data: nearLimit } = await supabase
        .from("profiles")
        .select("id")
        .eq("plan", "free")
        .gte("searches_used", 90);

      if (nearLimit && nearLimit.length > 0) {
        generatedAlerts.push({
          id: "near-limit",
          severity: "info",
          title: `${nearLimit.length} usuários Free quase no limite`,
          description: "Oportunidade para conversão de upgrade.",
          timestamp: new Date().toISOString(),
        });
      }

      // Check inactive paid users
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: inactivePaid } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("plan", "free")
        .lt("updated_at", thirtyDaysAgo);

      if (inactivePaid && inactivePaid > 0) {
        generatedAlerts.push({
          id: "inactive-paid",
          severity: "critical",
          title: `${inactivePaid} clientes pagos inativos há 30+ dias`,
          description: "Alto risco de churn. Ação imediata recomendada.",
          timestamp: new Date().toISOString(),
        });
      }

      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: "all-good",
          severity: "success",
          title: "Tudo operando normalmente",
          description: "Nenhum alerta crítico no momento.",
          timestamp: new Date().toISOString(),
        });
      }

      setAlerts(generatedAlerts);
      setLoading(false);
    };

    generateAlerts();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alertas Executivos</h1>
        <p className="text-sm text-muted-foreground mt-1">Alertas priorizados por urgência e impacto no negócio</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <Card key={alert.id} className={`border-border/40 ${config.bg} cursor-pointer hover:shadow-md transition-all`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={config.badge} className="text-[10px]">
                      {alert.severity === "critical" ? "Crítico" : alert.severity === "warning" ? "Atenção" : alert.severity === "info" ? "Info" : "OK"}
                    </Badge>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
