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
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border-2 border-primary/30 rounded-full shadow-[0_2px_12px_hsl(var(--primary)/0.12)] w-44 backdrop-blur-sm relative">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="w-6 h-6 rounded-[7px] bg-primary/10 flex items-center justify-center shrink-0">
          <Zap size={12} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{String(data.label || "Entrada")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">{triggerLabels[cfg.trigger_type] || cfg.trigger_type}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Configurar</p>
          )}
        </div>
      </div>
      {metrics && metrics.passed > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <span className="text-[9px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded-full border border-border/50">{metrics.passed} entraram</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
