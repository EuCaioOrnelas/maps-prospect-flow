import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
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

const iconColorMap = {
  danger: 'text-destructive',
  warning: 'text-yellow-500',
  success: 'text-primary',
  info: 'text-blue-500',
};

export function ExecutiveAlerts({ alerts }: ExecutiveAlertsProps) {
  const navigate = useNavigate();

  if (!alerts || alerts.length === 0) return null;

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-500" />
          Alertas Executivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-5">
        {alerts.filter(a => !a.text.includes('NaN')).map((alert, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border/30 cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => navigate(alert.route)}
          >
            <span className={cn("shrink-0", iconColorMap[alert.type])}>
              {alert.icon}
            </span>
            <span className="text-sm text-foreground/80">{alert.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
