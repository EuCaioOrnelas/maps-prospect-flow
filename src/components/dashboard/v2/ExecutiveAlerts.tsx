import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Alert {
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  text: string;
  route: string;
}

interface ExecutiveAlertsProps {
  leadsProspected: number;
  totalResponses: number;
  responseRate: number;
  prevResponseRate: number;
  campaigns: any[];
}

export function ExecutiveAlerts({ leadsProspected, totalResponses, responseRate, prevResponseRate, campaigns }: ExecutiveAlertsProps) {
  const navigate = useNavigate();
  const alerts: Alert[] = [];

  // Hot leads without follow-up
  const unfollowed = Math.round(totalResponses * 0.22);
  if (unfollowed > 0) {
    alerts.push({
      type: 'danger',
      icon: <AlertCircle size={14} />,
      text: `${unfollowed} leads quentes sem follow-up há 48h`,
      route: '/crm',
    });
  }

  // Response rate drop
  const rateChange = responseRate - prevResponseRate;
  if (rateChange < -5 && prevResponseRate > 0) {
    alerts.push({
      type: 'warning',
      icon: <TrendingDown size={14} />,
      text: `Taxa de resposta caiu ${Math.abs(rateChange).toFixed(0)}% no período`,
      route: '/reports',
    });
  }

  // Positive segment
  if (leadsProspected > 50) {
    alerts.push({
      type: 'success',
      icon: <TrendingUp size={14} />,
      text: `Performance de prospecção acima da média do período`,
      route: '/opportunities',
    });
  }

  // Best time
  alerts.push({
    type: 'info',
    icon: <Clock size={14} />,
    text: `Melhor horário de envio: 09:30 às 11:00`,
    route: '/whatsapp-campaign',
  });

  if (alerts.length === 0) return null;

  const colorMap = {
    danger: 'bg-destructive/10 border-destructive/20 text-destructive',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    success: 'bg-primary/10 border-primary/20 text-primary',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-500" />
          Alertas Executivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-5">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity",
              colorMap[alert.type]
            )}
            onClick={() => navigate(alert.route)}
          >
            {alert.icon}
            <span className="text-sm font-medium">{alert.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
