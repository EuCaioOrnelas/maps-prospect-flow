import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { CircleStop } from "lucide-react";

export function WAEndNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  return (
    <NodeShell
      icon={CircleStop}
      accent="bg-rose-500"
      width="w-52"
      title={String((data as any).label || "Encerramento")}
      subtitle={cfg.mark_completed ? "Marcar atendido" : "Finaliza a conversa"}
    >
      <FlowHandle type="target" position={Position.Left} />
    </NodeShell>
  );
}
