import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Database } from "lucide-react";

export function WADataCollectNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const variableName = cfg.variable_name || "";
  const collectType = cfg.collect_type || "";

  const collectLabels: Record<string, string> = {
    name: "Nome",
    email: "Email",
    phone: "Telefone",
    cpf: "CPF",
    address: "Endereço",
    custom: "Personalizado",
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-56 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
          <Database size={16} className="text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Coleta de Dados")}</p>
          <p className="text-[10px] text-muted-foreground">
            {collectType ? collectLabels[collectType] || collectType : "Configurar"}
          </p>
        </div>
      </div>

      {variableName && (
        <div className="px-3 py-2">
          <div className="text-[10px] bg-teal-500/10 text-teal-400 rounded px-2 py-1 font-mono truncate">
            {`{${variableName}}`}
          </div>
        </div>
      )}

      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
