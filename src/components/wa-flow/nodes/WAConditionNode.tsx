import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

const conditionLabels: Record<string, string> = {
  button_clicked: "Clicou botão",
  keyword_match: "Contém palavra",
  has_tag: "Tem tag",
  field_equals: "Campo = valor",
  responded: "Respondeu",
  no_response: "Não respondeu",
};

export function WAConditionNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.condition_type;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-48">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <GitBranch size={16} className="text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Condição")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {conditionLabels[cfg.condition_type] || cfg.condition_type}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-primary">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          Sim
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          Não
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full" style={{ top: "58%" }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-3 !h-3 !bg-destructive !border-2 !border-card !rounded-full" style={{ top: "78%" }} />
    </div>
  );
}
