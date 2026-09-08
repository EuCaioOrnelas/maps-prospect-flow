import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { HeadphonesIcon } from "lucide-react";

export function WAHandoffNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isRoundRobin = cfg.distribution_type === "round_robin";
  const memberCount = Array.isArray(cfg.member_ids) ? cfg.member_ids.length : 0;

  let subtitle = "Transferir para humano";
  if (isRoundRobin) subtitle = `Distribuir entre ${memberCount || 0} colaboradores`;
  else if (cfg.specific_member_id) subtitle = "Colaborador específico";
  else if (cfg.notify_team) subtitle = "Notificar equipe";

  return (
    <NodeShell
      icon={HeadphonesIcon}
      accent="bg-cyan-500"
      title={String((data as any).label || "Humano")}
      subtitle={subtitle}
    >
      <FlowHandle type="target" position={Position.Left} />
      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
