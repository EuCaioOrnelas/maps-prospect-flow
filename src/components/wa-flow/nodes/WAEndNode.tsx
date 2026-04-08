import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { CircleStop } from "lucide-react";

export function WAEndNode({ data }: NodeProps) {
  return (
    <div className="bg-card border-2 border-destructive/30 rounded-2xl shadow-sm w-36">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 px-3 py-2.5 justify-center">
        <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <CircleStop size={14} className="text-destructive" />
        </div>
        <p className="text-xs font-bold text-foreground">{String((data as any).label || "Fim")}</p>
      </div>
    </div>
  );
}
