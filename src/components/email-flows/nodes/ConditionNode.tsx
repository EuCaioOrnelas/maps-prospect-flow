import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

const conditionLabels: Record<string, string> = {
  email_opened: "Abriu email",
  email_clicked: "Clicou no email",
  score_above: "Score acima de",
  has_tag: "Possui tag",
  is_customer: "Virou cliente",
  checkout_started: "Iniciou checkout",
  inactive_days: "Inativo há X dias",
};

export function ConditionNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = !!cfg.condition_type;
  const metrics = data.metrics as any;

  return (
    <div className="relative w-28 h-28">
      {/* Diamond */}
      <div
        className="absolute inset-1 bg-card border border-border shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] backdrop-blur-sm"
        style={{ transform: "rotate(45deg)", borderRadius: "4px" }}
      />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        <GitBranch size={12} className="text-purple-400 mb-0.5" />
        <p className="text-[10px] font-semibold text-foreground truncate w-full">{String(data.label || "Condição")}</p>
        {isConfigured ? (
          <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight truncate w-full">
            {conditionLabels[cfg.condition_type] || cfg.condition_type}
          </p>
        ) : (
          <p className="text-[8px] text-muted-foreground/60 mt-0.5 italic">Configurar</p>
        )}
      </div>
      {metrics && metrics.passed > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10">
          <span className="text-[9px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded-full border border-border/50">{metrics.passed}</span>
        </div>
      )}
      {/* Handles on diamond tips */}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-card !rounded-full" style={{ left: "-2px", top: "50%" }} />
      <Handle type="source" position={Position.Right} id="yes" className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" style={{ right: "-2px", top: "35%" }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" style={{ right: "-2px", top: "65%" }} />
      <div className="absolute text-[9px] font-medium z-10" style={{ right: "-20px", top: "28%" }}>
        <span className="text-primary/80">Sim</span>
      </div>
      <div className="absolute text-[9px] font-medium z-10" style={{ right: "-20px", top: "60%" }}>
        <span className="text-destructive/80">Não</span>
      </div>
    </div>
  );
}
