import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ChevronDown, ChevronUp, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface ExecutiveAlert {
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  text: string;
  route: string;
  priority?: number;
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

const severityWeight: Record<ExecutiveAlert['type'], number> = {
  danger: 3,
  warning: 2,
  success: 1,
  info: 0,
};

const VISIBLE_COUNT = 6;

const todayKey = () => `wiize:exec-alerts-dismissed:${new Date().toISOString().slice(0, 10)}`;

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(todayKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ExecutiveAlerts({ alerts }: ExecutiveAlertsProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(readDismissed());
    // limpa chaves de dias anteriores
    try {
      const prefix = "wiize:exec-alerts-dismissed:";
      const keep = todayKey();
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix) && k !== keep)
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: string[]) => {
    setDismissed(next);
    try {
      localStorage.setItem(todayKey(), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const dismissAlert = (text: string) => persist([...dismissed, text]);
  const restoreAll = () => persist([]);

  const all = (alerts || []).filter((a) => !a.text.includes('NaN'));

  const sorted = all
    .filter((a) => !dismissed.includes(a.text))
    .sort((a, b) => {
      const s = severityWeight[b.type] - severityWeight[a.type];
      if (s !== 0) return s;
      return (b.priority || 0) - (a.priority || 0);
    });

  const dismissedCount = all.length - sorted.length;
  const criticalCount = sorted.filter((a) => a.type === 'danger').length;
  const warningCount = sorted.filter((a) => a.type === 'warning').length;
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hidden = sorted.length - visible.length;

  if (all.length === 0) return null;

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
          <AlertCircle size={16} className="text-yellow-500" />
          Alertas Executivos
          {criticalCount > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive">
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-yellow-500/10 text-yellow-500">
              {warningCount} atenção
            </span>
          )}
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={restoreAll}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={12} /> Restaurar {dismissedCount}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-5">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Todos os alertas de hoje foram arquivados. Novos alertas aparecem amanhã.
          </p>
        )}

        {visible.map((alert, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors group",
              alert.type === 'danger'
                ? "bg-destructive/[0.06] border-destructive/20 hover:bg-destructive/10"
                : alert.type === 'warning'
                ? "bg-yellow-500/[0.06] border-yellow-500/20 hover:bg-yellow-500/10"
                : "bg-muted/50 border-border/30 hover:bg-muted/80",
            )}
            onClick={() => navigate(alert.route)}
          >
            <span className={cn("shrink-0", iconColorMap[alert.type])}>
              {alert.icon}
            </span>
            <span className="text-sm text-foreground/80 flex-1">{alert.text}</span>
            <button
              type="button"
              aria-label="Fechar alerta"
              onClick={(e) => {
                e.stopPropagation();
                dismissAlert(alert.text);
              }}
              className="shrink-0 p-1 rounded-sm text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-foreground/10 hover:text-foreground transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {(hidden > 0 || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {expanded ? (
              <>Ver menos <ChevronUp size={14} /></>
            ) : (
              <>Ver mais {hidden} alerta{hidden > 1 ? 's' : ''} <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </CardContent>

    </Card>
  );
}
