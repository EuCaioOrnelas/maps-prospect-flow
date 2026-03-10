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
    <div className="bg-card border-2 border-purple-500/50 rounded-xl shadow-lg w-56 overflow-hidden">
      <div className="bg-purple-500/15 px-3 py-2 flex items-center gap-2 border-b border-purple-500/20">
        <GitBranch size={14} className="text-purple-400" />
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Condição</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Condição")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1">
            {conditionLabels[cfg.condition_type] || cfg.condition_type}
            {cfg.value ? ` (${cfg.value})` : ""}
          </p>
        ) : (
          <p className="text-[11px] text-amber-400 mt-1">⚠ Configure a condição</p>
        )}
        {metrics && (
          <div className="mt-1.5 text-[10px] text-muted-foreground border-t border-border pt-1.5">
            <span>👥 {metrics.passed} passaram</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-card" />
      <Handle type="source" position={Position.Right} id="yes" style={{ top: "35%" }} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-card" />
      <Handle type="source" position={Position.Right} id="no" style={{ top: "65%" }} className="!w-3 !h-3 !bg-red-400 !border-2 !border-card" />
      <div className="absolute right-[-24px] text-[9px] font-medium" style={{ top: "28%" }}>
        <span className="text-emerald-400">Sim</span>
      </div>
      <div className="absolute right-[-24px] text-[9px] font-medium" style={{ top: "60%" }}>
        <span className="text-red-400">Não</span>
      </div>
    </div>
  );
}
