import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { Settings } from "lucide-react";

export function WAActionNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const actions = cfg.actions || [];

  return (
    <NodeShell
      icon={Settings}
      accent="bg-cyan-500"
      title={String((data as any).label || "Ação")}
      subtitle={actions.length > 0 ? `${actions.length} ${actions.length === 1 ? "ação" : "ações"}` : null}
      placeholder="Configurar ações"
    >
      <FlowHandle type="target" position={Position.Left} />
      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
