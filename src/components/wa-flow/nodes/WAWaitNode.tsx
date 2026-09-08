import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias", weeks: "sem" };

export function WAWaitNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = cfg.delay_value > 0;

  return (
    <NodeShell
      icon={Clock}
      accent="bg-amber-500"
      title={String((data as any).label || "Espera")}
      subtitle={
        isConfigured
          ? `${cfg.delay_value} ${unitLabels[cfg.delay_unit] || cfg.delay_unit}${cfg.smart !== false ? " (inteligente)" : ""}`
          : null
      }
      placeholder="Definir tempo"
    >
      <FlowHandle type="target" position={Position.Left} />
      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
