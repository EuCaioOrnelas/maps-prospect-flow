import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Phone, Radio, Wifi } from "lucide-react";

const triggerLabels: Record<string, string> = {
  keyword: "Palavra-chave",
  campaign_reply: "Resposta campanha",
  webhook: "Webhook/API",
  first_message: "1ª mensagem",
  any_message: "Qualquer mensagem",
  no_reply_hours: "Sem resposta há X horas",
  no_conversation_days: "X dias sem conversa",
  before_appointment: "Antes do compromisso",
  after_appointment: "Após a reunião",
  appointment_no_show: "Compromisso precisa ser reagendado",
  stage_entered: "Entrou na etapa do CRM",
  score_reached: "Score atingido",
  deal_created: "Venda registrada",
  lead_created: "Novo lead criado",
};

export function WAEntryNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.trigger_type;
  const numberName = cfg.whatsapp_number_name;
  const apiType = cfg.api_type;
  const isEvolution = apiType === "evolution";
  const isMeta = apiType === "meta";

  return (
    <NodeShell
      icon={WhatsAppIcon}
      accent="bg-wa-trigger"
      title={String((data as any).label || "Gatilho")}
      subtitle={isConfigured ? (triggerLabels[cfg.trigger_type] || cfg.trigger_type) : null}
      placeholder="Clique para configurar"
    >
      <FlowHandle type="target" position={Position.Left} />

      {numberName && (
        <div className="px-3.5 pb-3 -mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
            <Phone size={11} className="shrink-0" />
            <span className="truncate flex-1">{numberName}</span>
            {isMeta && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 rounded-md px-1.5 py-0.5 shrink-0">
                <Wifi size={8} /> Marketing
              </span>
            )}
            {isEvolution && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 rounded-md px-1.5 py-0.5 shrink-0">
                <Radio size={8} /> Atendimento
              </span>
            )}
          </div>
        </div>
      )}

      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
