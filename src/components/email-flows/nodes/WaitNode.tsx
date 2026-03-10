import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function WaitNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = cfg.delay_value > 0;
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border-2 border-amber-500/50 rounded-xl shadow-lg w-56 overflow-hidden">
      <div className="bg-amber-500/15 px-3 py-2 flex items-center gap-2 border-b border-amber-500/20">
        <Clock size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Espera</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Espera")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1">
            Aguardar {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
            {cfg.business_hours_only ? " (horário comercial)" : ""}
          </p>
        ) : (
          <p className="text-[11px] text-amber-400 mt-1">⚠ Defina o tempo</p>
        )}
        {metrics && (
          <div className="mt-1.5 text-[10px] text-muted-foreground border-t border-border pt-1.5">
            <span>👥 {metrics.passed} passaram</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-400 !border-2 !border-card" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-400 !border-2 !border-card" />
    </div>
  );
}
