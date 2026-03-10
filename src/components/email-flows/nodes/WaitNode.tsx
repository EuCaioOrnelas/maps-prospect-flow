import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function WaitNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = cfg.delay_value > 0;
  const metrics = data.metrics as any;

  return (
    <div
      className="bg-card border border-border shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-52 backdrop-blur-sm relative"
      style={{
        clipPath: "polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)",
        padding: "0",
      }}
    >
      <div className="px-8 py-4 flex flex-col items-center text-center">
        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
          <Clock size={13} className="text-amber-400" />
        </div>
        <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Espera</p>
        <p className="text-sm font-medium text-foreground truncate w-full">{String(data.label || "Espera")}</p>
        {isConfigured ? (
          <p className="text-[10px] text-muted-foreground mt-1">
            {cfg.delay_value} {unitLabels[cfg.delay_unit] || cfg.delay_unit}
            {cfg.business_hours_only ? " · Comercial" : ""}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Defina o tempo</p>
        )}
        {metrics && metrics.passed > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.passed} passaram</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" style={{ left: "10%" }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-card !rounded-full" style={{ right: "10%" }} />
    </div>
  );
}
