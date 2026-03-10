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
    <div className="bg-card border border-border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap size={13} className="text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Entrada</span>
        {isConfigured && <span className="ml-auto text-[10px] text-primary">●</span>}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Entrada")}</p>
        {isConfigured ? (
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Gatilho</span>
              <span className="text-[11px] text-muted-foreground font-medium">{triggerLabels[cfg.trigger_type] || cfg.trigger_type}</span>
            </div>
            {cfg.audience_type && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Público</span>
                <span className="text-[11px] text-muted-foreground font-medium">{audienceLabels[cfg.audience_type] || cfg.audience_type}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic">Clique para configurar</p>
        )}
        {metrics && metrics.passed > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">{metrics.passed} entraram</span>
            {metrics.converted != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Conversão</span>
                <span className="text-[10px] font-medium text-primary">{metrics.converted} ({metrics.passed > 0 ? ((metrics.converted / metrics.passed) * 100).toFixed(1) : 0}%)</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
