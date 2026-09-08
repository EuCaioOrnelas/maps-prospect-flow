import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { Database } from "lucide-react";

const collectLabels: Record<string, string> = {
  name: "Nome",
  email: "Email",
  phone: "Telefone",
  cpf: "CPF",
  address: "Endereço",
  custom: "Personalizado",
};

export function WADataCollectNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const variableName = cfg.variable_name || "";
  const collectType = cfg.collect_type || "";

  return (
    <NodeShell
      icon={Database}
      accent="bg-amber-500"
      title={String((data as any).label || "Coleta de Dados")}
      subtitle={collectType ? collectLabels[collectType] || collectType : null}
      placeholder="Configurar"
      width="w-56"
    >
      <FlowHandle type="target" position={Position.Left} />

      {variableName && (
        <div className="px-3.5 pb-3 -mt-1">
          <div className="text-[10px] bg-amber-500/10 text-amber-400 rounded-lg px-2.5 py-1.5 font-mono truncate">
            {`{${variableName}}`}
          </div>
        </div>
      )}

      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
