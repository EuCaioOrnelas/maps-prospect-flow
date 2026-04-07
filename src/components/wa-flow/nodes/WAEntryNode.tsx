import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, Phone, AlertTriangle } from "lucide-react";

const triggerLabels: Record<string, string> = {
  keyword: "Palavra-chave",
  campaign_reply: "Resposta campanha",
  button_click: "Clique em botão",
  webhook: "Webhook/API",
  qr_code: "QR Code",
  first_message: "1ª mensagem",
  re_entry: "Reentrada",
};

export function WAEntryNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.trigger_type;
  const numberName = cfg.whatsapp_number_name;
  const apiType = cfg.api_type; // "evolution" | "meta"
  const isEvolution = apiType === "evolution";

  return (
    <div className="bg-card border-2 border-primary/40 rounded-2xl shadow-[0_2px_16px_hsl(158,72%,38%,0.15)] w-56 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Entrada")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">{triggerLabels[cfg.trigger_type] || cfg.trigger_type}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      {numberName && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2 py-1.5">
            <Phone size={10} className="shrink-0" />
            <span className="truncate">{numberName}</span>
          </div>
        </div>
      )}

      {isEvolution && (
        <div className="px-3 pb-2">
          <div className="flex items-start gap-1.5 text-[9px] text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-1.5 leading-tight">
            <AlertTriangle size={10} className="shrink-0 mt-0.5" />
            <span>API Outbound — risco de bloqueio por spam</span>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
