import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";

export function EndNode({ data }: NodeProps) {
  const metrics = data.metrics as any;
  return (
    <div className="bg-card border-2 border-destructive/30 rounded-full shadow-[0_2px_12px_hsl(var(--destructive)/0.1)] w-36 backdrop-blur-sm relative">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <div className="w-5 h-5 rounded-[6px] bg-destructive/10 flex items-center justify-center shrink-0">
          <Flag size={10} className="text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{String(data.label || "Fim")}</p>
          {(data.config as any)?.note && (
            <p className="text-[9px] text-muted-foreground truncate">{(data.config as any).note}</p>
          )}
        </div>
      </div>
      {metrics && metrics.passed > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <span className="text-[9px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded-full border border-border/50">{metrics.passed}</span>
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" />
    </div>
  );
}
