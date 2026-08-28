/**
 * Canais suportados pelo motor de Fluxos de Automação.
 *
 * O motor é único: os nós de lógica, IA, integrações e ações valem para
 * todos os canais. Cada canal só declara quais blocos fazem sentido nele
 * e como o gatilho de entrada é configurado.
 */
export type FlowChannel = "whatsapp" | "instagram";

export const FLOW_CHANNELS: Record<
  FlowChannel,
  { id: FlowChannel; label: string; entryNodeType: string; accent: string }
> = {
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    entryNodeType: "entry",
    accent: "text-emerald-500",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    entryNodeType: "instagram_entry",
    accent: "text-pink-500",
  },
};

export function normalizeChannel(value: unknown): FlowChannel {
  return value === "instagram" ? "instagram" : "whatsapp";
}

/** Blocos exclusivos de um canal. Os não listados valem para todos. */
const CHANNEL_ONLY_NODES: Record<string, FlowChannel> = {
  entry: "whatsapp",
  instagram_entry: "instagram",
  ig_reply_comment: "instagram",
  ig_send_dm: "instagram",
};

/** Blocos que o canal não suporta tecnicamente. */
const UNSUPPORTED_BY_CHANNEL: Record<FlowChannel, string[]> = {
  whatsapp: [],
  // O Instagram não tem listas interativas nem templates fora da janela.
  instagram: ["rating"],
};

export function isNodeAllowedInChannel(nodeType: string, channel: FlowChannel): boolean {
  const only = CHANNEL_ONLY_NODES[nodeType];
  if (only && only !== channel) return false;
  return !UNSUPPORTED_BY_CHANNEL[channel].includes(nodeType);
}

export const IG_TRIGGERS = [
  { value: "any_dm", label: "Qualquer direct", desc: "Dispara em toda mensagem recebida no direct" },
  { value: "first_dm", label: "Primeiro direct", desc: "Só na primeira conversa com o contato" },
  { value: "dm_keyword", label: "Palavra-chave no direct", desc: "Dispara quando o direct contém uma palavra" },
  { value: "any_comment", label: "Qualquer comentário", desc: "Dispara em comentários nas publicações" },
  { value: "comment_keyword", label: "Palavra-chave no comentário", desc: "Dispara em comentários com a palavra" },
  { value: "story_reply", label: "Resposta de story", desc: "Dispara quando alguém responde um story" },
  { value: "mention", label: "Menção", desc: "Dispara quando a conta é mencionada" },
] as const;

export function igTriggerLabel(value?: string): string {
  return IG_TRIGGERS.find((t) => t.value === value)?.label || "Sem gatilho";
}

/** Gatilhos que originam um comentário (habilitam o bloco "Responder comentário"). */
export function isCommentTrigger(triggerType?: string): boolean {
  return triggerType === "any_comment" || triggerType === "comment_keyword" || triggerType === "mention";
}
