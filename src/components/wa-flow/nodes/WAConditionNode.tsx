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
    <div className="relative w-32 h-32">
      {/* Diamond */}
      <div
        className="absolute inset-2 bg-card border border-border shadow-sm backdrop-blur-sm"
        style={{ transform: "rotate(45deg)", borderRadius: "6px" }}
      />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 z-10">
        <GitBranch size={14} className="text-purple-400 mb-1" />
        <p className="text-[11px] font-bold text-foreground truncate w-full">
          {String((data as any).label || "Condição")}
        </p>
        {isConfigured ? (
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight truncate w-full">
            {conditionLabels[cfg.condition_type] || cfg.condition_type}
          </p>
        ) : (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5 italic">Configurar</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-card !rounded-full" style={{ left: "-4px", top: "50%" }} />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full" style={{ right: "-4px", top: "38%" }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-3 !h-3 !bg-destructive !border-2 !border-card !rounded-full" style={{ right: "-4px", top: "62%" }} />
      <div className="absolute text-[9px] font-semibold z-10" style={{ right: "-22px", top: "30%" }}>
        <span className="text-primary/80">Sim</span>
      </div>
      <div className="absolute text-[9px] font-semibold z-10" style={{ right: "-22px", top: "56%" }}>
        <span className="text-destructive/80">Não</span>
      </div>
    </div>
  );
}
