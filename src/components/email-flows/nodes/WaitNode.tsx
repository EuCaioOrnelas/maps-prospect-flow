import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function WaitNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = cfg.delay_value > 0;
  const metrics = data.metrics as any;

  return (
    <div
      className="bg-card border border-border shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-40 backdrop-blur-sm relative"
      style={{
        clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)",
      }}
    >
      <div className="px-6 py-3 flex items-center gap-2">
        <Clock size={12} className="text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground truncate">{String(data.label || "Espera")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground">
              {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Tempo</p>
          )}
        </div>
      </div>
      {metrics && metrics.passed > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <span className="text-[9px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded-full border border-border/50">{metrics.passed} passaram</span>
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" style={{ left: "8%" }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" style={{ right: "8%" }} />
    </div>
  );
}
