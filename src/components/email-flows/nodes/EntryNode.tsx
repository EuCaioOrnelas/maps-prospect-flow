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

const audienceLabels: Record<string, string> = {
  all: "Todos",
  all_free: "Todos Free",
  all_paid: "Todos Pagos",
  trial_active: "Trial Ativo",
  trial_expired: "Trial Expirado",
  inactive_7d: "Inativos 7d",
  inactive_30d: "Inativos 30d",
};

export function EntryNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = !!cfg.trigger_type;
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border-2 border-primary/30 rounded-full shadow-[0_2px_16px_hsl(var(--primary)/0.15)] w-56 backdrop-blur-sm relative">
      <div className="px-5 py-4 flex flex-col items-center text-center">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mb-1.5">
          <Zap size={14} className="text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground truncate w-full">{String(data.label || "Entrada")}</p>
        {isConfigured ? (
          <div className="mt-1 space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">{triggerLabels[cfg.trigger_type] || cfg.trigger_type}</span>
            {cfg.audience_type && (
              <p className="text-[10px] text-muted-foreground/70">{audienceLabels[cfg.audience_type] || cfg.audience_type}</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Clique para configurar</p>
        )}
        {metrics && metrics.passed > 0 && (
          <p className="text-[10px] font-medium text-muted-foreground mt-1.5">{metrics.passed} entraram</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
