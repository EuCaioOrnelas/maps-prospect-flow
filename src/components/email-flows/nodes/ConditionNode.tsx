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
    <div className="bg-card border border-border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
          <GitBranch size={13} className="text-purple-400" />
        </div>
        <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Condição</span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Condição")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {conditionLabels[cfg.condition_type] || cfg.condition_type}
            {cfg.value ? ` · ${cfg.value}` : ""}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic">Configure a condição</p>
        )}
        {metrics && metrics.passed > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">{metrics.passed} avaliados</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} id="yes" style={{ top: "35%" }} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} id="no" style={{ top: "65%" }} className="!w-2.5 !h-2.5 !bg-destructive !border-2 !border-card !rounded-full" />
      <div className="absolute right-[-22px] text-[9px] font-medium" style={{ top: "28%" }}>
        <span className="text-primary/80">Sim</span>
      </div>
      <div className="absolute right-[-22px] text-[9px] font-medium" style={{ top: "60%" }}>
        <span className="text-destructive/80">Não</span>
      </div>
    </div>
  );
}
