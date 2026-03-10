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
    <div className="relative w-48 h-48">
      {/* Diamond shape */}
      <div
        className="absolute inset-0 bg-card border border-border shadow-[0_2px_16px_hsl(0_0%_0%/0.3)] backdrop-blur-sm"
        style={{ transform: "rotate(45deg)", borderRadius: "8px" }}
      />
      {/* Content (not rotated) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center mb-1">
          <GitBranch size={13} className="text-purple-400" />
        </div>
        <p className="text-xs font-semibold text-foreground truncate w-full">{String(data.label || "Condição")}</p>
        {isConfigured ? (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            {conditionLabels[cfg.condition_type] || cfg.condition_type}
            {cfg.value ? ` · ${cfg.value}` : ""}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">Configurar</p>
        )}
        {metrics && metrics.passed > 0 && (
          <p className="text-[9px] text-muted-foreground mt-1">{metrics.passed} avaliados</p>
        )}
      </div>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-card !rounded-full" style={{ left: "-4px", top: "50%" }} />
      <Handle type="source" position={Position.Right} id="yes" className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" style={{ right: "-4px", top: "35%" }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" style={{ right: "-4px", top: "65%" }} />
      <div className="absolute text-[9px] font-medium z-10" style={{ right: "-24px", top: "30%" }}>
        <span className="text-primary/80">Sim</span>
      </div>
      <div className="absolute text-[9px] font-medium z-10" style={{ right: "-24px", top: "60%" }}>
        <span className="text-destructive/80">Não</span>
      </div>
    </div>
  );
}
