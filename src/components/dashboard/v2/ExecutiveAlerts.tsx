import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp, Clock, Flame, ThermometerSun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface ExecutiveAlert {
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  text: string;
  route: string;
}

interface ExecutiveAlertsProps {
  alerts: ExecutiveAlert[];
}

export function ExecutiveAlerts({ alerts }: ExecutiveAlertsProps) {
  const navigate = useNavigate();

  if (!alerts || alerts.length === 0) return null;

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
