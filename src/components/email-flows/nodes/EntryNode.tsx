import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";

const triggerLabels: Record<string, string> = {
  free_trial: "Free Trial",
  signup: "Criou Conta",
  checkout_started: "Iniciou Checkout",
  checkout_abandoned: "Carrinho Abandonado",
  trial_expired_10d: "Trial Expirado +10d",
  downgrade: "Downgrade",
  inactive: "Inativo",
  score_reached: "Score Atingido",
  tag_added: "Tag Adicionada",
  manual: "Manual",
};

export function EntryNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = !!cfg.trigger_type;

  return (
    <div className="bg-card border-2 border-emerald-500/50 rounded-xl shadow-lg w-56 overflow-hidden">
      <div className="bg-emerald-500/15 px-3 py-2 flex items-center gap-2 border-b border-emerald-500/20">
        <Zap size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Entrada</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Entrada")}</p>
        {isConfigured ? (
          <div className="mt-1 space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Gatilho: {triggerLabels[cfg.trigger_type] || cfg.trigger_type}</p>
            {cfg.audience_type && <p className="text-[11px] text-muted-foreground">Público: {cfg.audience_type}</p>}
          </div>
        ) : (
          <p className="text-[11px] text-amber-400 mt-1">⚠ Clique para configurar</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-card" />
    </div>
  );
}
