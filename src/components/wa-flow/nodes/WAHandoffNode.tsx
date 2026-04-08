import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { HeadphonesIcon } from "lucide-react";

export function WAHandoffNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-48">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
          <HeadphonesIcon size={16} className="text-orange-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Humano")}</p>
          <p className="text-[10px] text-muted-foreground">
            {cfg.notify_team ? "Notificar equipe" : "Transferir para humano"}
          </p>
        </div>
      </div>
    </div>
  );
}
