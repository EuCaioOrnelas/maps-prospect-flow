export const WA_TRIGGER_LABELS: Record<string, string> = {
  keyword: "Mensagem com palavra-chave",
  campaign_reply: "Resposta de campanha",
  webhook: "Webhook/API",
  first_message: "Primeira mensagem do contato",
  any_message: "Qualquer mensagem",
  no_reply_hours: "Contato aguardando resposta",
  no_conversation_days: "Conversa sem atividade",
  before_appointment: "Antes do compromisso",
  after_appointment: "Após o compromisso",
  appointment_no_show: "Compromisso precisa ser reagendado",
  stage_entered: "Lead entrou em uma etapa",
  score_reached: "Lead atingiu um score",
  deal_created: "Venda registrada",
  lead_created: "Novo lead criado",
};

export function getWATriggerLabel(triggerType?: string) {
  if (!triggerType) return "";
  return WA_TRIGGER_LABELS[triggerType] || triggerType;
}