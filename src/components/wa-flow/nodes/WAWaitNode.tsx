import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function WAWaitNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = cfg.delay_value > 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-44">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-card !rounded-full" />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Clock size={16} className="text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Espera")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground">
              {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
              {cfg.smart && " (inteligente)"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Definir tempo</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
