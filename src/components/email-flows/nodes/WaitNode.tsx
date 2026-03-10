import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function WaitNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = cfg.delay_value > 0;
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border border-border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
          <Clock size={13} className="text-amber-400" />
        </div>
        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Espera</span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Espera")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
            {cfg.business_hours_only ? " · Horário comercial" : ""}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic">Defina o tempo</p>
        )}
        {metrics && metrics.passed > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">{metrics.passed} passaram</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" />
    </div>
  );
}
