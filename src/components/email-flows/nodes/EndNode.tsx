import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";

export function EndNode({ data }: NodeProps) {
  const metrics = data.metrics as any;
  return (
    <div className="bg-card border border-border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center">
          <Flag size={13} className="text-destructive" />
        </div>
        <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider">Finalização</span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Fim do Fluxo")}</p>
        {(data.config as any)?.note && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{(data.config as any).note}</p>
        )}
        {metrics && metrics.passed > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <span className="text-[10px] text-muted-foreground">{metrics.passed} finalizaram</span>
            {metrics.converted != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Conversão</span>
                <span className="text-[10px] font-medium text-primary">{metrics.converted} ({metrics.total_entered > 0 ? ((metrics.converted / metrics.total_entered) * 100).toFixed(1) : 0}%)</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" />
    </div>
  );
}
