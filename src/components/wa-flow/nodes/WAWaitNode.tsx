import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias", weeks: "sem" };

export function WAWaitNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = cfg.delay_value > 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-44">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Clock size={16} className="text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Espera")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground">
              {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
              {cfg.smart !== false && " (inteligente)"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Definir tempo</p>
          )}
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
