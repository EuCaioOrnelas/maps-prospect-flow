import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";

export function EndNode({ data }: NodeProps) {
  return (
    <div className="bg-card border-2 border-red-500/50 rounded-xl shadow-lg w-56 overflow-hidden">
      <div className="bg-red-500/15 px-3 py-2 flex items-center gap-2 border-b border-red-500/20">
        <Flag size={14} className="text-red-400" />
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Finalização</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Fim do Fluxo")}</p>
        {(data.config as any)?.note && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{(data.config as any).note}</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-400 !border-2 !border-card" />
    </div>
  );
}
