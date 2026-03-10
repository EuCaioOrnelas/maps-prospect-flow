import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";

export function EndNode({ data }: NodeProps) {
  const metrics = data.metrics as any;
  return (
    <div className="bg-card border-2 border-destructive/30 rounded-full shadow-[0_2px_16px_hsl(var(--destructive)/0.1)] w-48 backdrop-blur-sm relative">
      <div className="px-5 py-4 flex flex-col items-center text-center">
        <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center mb-1.5">
          <Flag size={14} className="text-destructive" />
        </div>
        <p className="text-sm font-semibold text-foreground truncate w-full">{String(data.label || "Fim do Fluxo")}</p>
        {(data.config as any)?.note && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate w-full">{(data.config as any).note}</p>
        )}
        {metrics && metrics.passed > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5">{metrics.passed} finalizaram</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" />
    </div>
  );
}
