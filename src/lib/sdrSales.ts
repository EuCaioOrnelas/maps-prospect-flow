// Helpers do modo Venda Direta do SDR Inteligente.
// As funções de preço aqui espelham a blindagem do backend (sdr-brain):
// a IA nunca pode citar um valor que não exista no catálogo oficial.

export type SdrProductPriceType = "fixed" | "from" | "range" | "custom";
export type SdrBillingModel = "unico" | "mensal" | "anual" | "personalizado";
export type SdrProductPriority = "alta" | "media" | "baixa";

export type SdrProductObjection = { question: string; answer: string };

export type SdrProduct = {
  id: string;
  owner_user_id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  segments: string[] | null;
  problems_solved: string | null;
  benefits: string | null;
  differentials: string | null;
  price_type: SdrProductPriceType;
  price_value: number | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  billing_model: SdrBillingModel;
  installments: string | null;
  payment_conditions: string | null;
  max_discount_percent: number | null;
  negotiation_rules: string | null;
  delivery_estimate: string | null;
  hiring_conditions: string | null;
  sales_arguments: string | null;
  objections: SdrProductObjection[] | null;
  qualification_questions: string[] | null;
  target_audience: string | null;
  priority_segments: string[] | null;
  requirements: string | null;
  when_to_offer: string | null;
  when_not_to_offer: string | null;
  full_description: string | null;
  priority: SdrProductPriority;
  proposal_file: { url: string; name: string; path: string } | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SdrOperationMode = "tradicional" | "venda_direta";
export type SdrOfferStrategy = "especifico" | "selecionados" | "inteligente";
export type SdrActivationMode = "todos" | "oportunidades" | "oportunidades_novos" | "personalizado";

export const SDR_OPERATION_MODES: { id: SdrOperationMode; label: string; hint: string }[] = [
  {
    id: "tradicional",
    label: "SDR tradicional",
    hint: "Atendimento, abordagem e qualificação até reunião ou proposta",
  },
  {
    id: "venda_direta",
    label: "SDR com venda direta",
    hint: "Apresenta produtos, preços e propostas do catálogo e conduz a negociação",
  },
];

export const SDR_OFFER_STRATEGIES: { id: SdrOfferStrategy; label: string; hint: string }[] = [
  {
    id: "especifico",
    label: "Produto específico",
    hint: "Vende apenas o produto escolhido, adaptando os argumentos a cada segmento",
  },
  {
    id: "selecionados",
    label: "Produtos selecionados",
    hint: "A IA escolhe somente entre os produtos que você marcar",
  },
  {
    id: "inteligente",
    label: "Venda inteligente",
    hint: "A IA analisa o lead e escolhe a melhor oferta entre todos os produtos ativos",
  },
];

export const SDR_ACTIVATION_MODES: { id: SdrActivationMode; label: string; hint: string }[] = [
  {
    id: "todos",
    label: "Todos os contatos",
    hint: "Comportamento atual: o SDR responde qualquer mensagem recebida",
  },
  {
    id: "oportunidades",
    label: "Somente oportunidades",
    hint: "Só responde leads da Gestão de Oportunidades (recomendado)",
  },
  {
    id: "oportunidades_novos",
    label: "Oportunidades e novos contatos",
    hint: "Oportunidades da prospecção e contatos novos que ainda não estão no CRM",
  },
  {
    id: "personalizado",
    label: "Seleção personalizada",
    hint: "Você escolhe exatamente quais origens de lead ativam o SDR",
  },
];

/** Origens de lead existentes na arquitetura atual (coluna leads.origin). */
export const SDR_LEAD_ORIGINS: { id: string; label: string }[] = [
  { id: "oportunidades", label: "Gestão de Oportunidades" },
  { id: "prospeccao", label: "Prospecção" },
  { id: "formulario", label: "Formulários" },
  { id: "landing_page", label: "Landing pages" },
  { id: "chat", label: "Chat / WhatsApp" },
  { id: "campanha", label: "Campanhas" },
  { id: "manual", label: "Cadastro manual" },
  { id: "indicacao", label: "Indicação" },
];

export const SDR_ELIGIBILITY_REASONS: Record<string, string> = {
  ok: "Autorizado",
  agent_not_found: "SDR não encontrado",
  invalid_phone: "Telefone inválido",
  session_paused: "SDR pausado neste contato",
  session_opted_out: "Contato pediu para não receber mensagens",
  session_handoff: "Conversa com atendente humano",
  session_closed_explicit_opt_out: "Contato descadastrado",
  session_closed_explicit_rejection: "Contato recusou o contato",
  session_closed_lead_refused: "Lead recusou a oferta",
  session_closed_objective_completed: "Objetivo já concluído neste contato",
  origin_not_opportunity: "Fora da Gestão de Oportunidades",
  origin_not_allowed: "Origem não autorizada",
  origin_not_in_custom_list: "Origem fora da seleção personalizada",
  excluded_crm_contact: "Contato já existe no CRM",
  excluded_existing_client: "Contato já é cliente",
  excluded_human_owned: "Conversa com responsável humano",
};

export const SDR_SALES_EVENT_LABELS: Record<string, string> = {
  eligibility_ok: "Elegibilidade aprovada",
  eligibility_denied: "Elegibilidade recusada",
  need_identified: "Necessidade identificada",
  product_selected: "Produto selecionado",
  price_presented: "Preço apresentado",
  proposal_sent: "Proposta enviada",
  objection_detected: "Objeção identificada",
  negotiation_started: "Negociação iniciada",
  handoff: "Transferido para humano",
  converted: "Oportunidade convertida",
  sale_confirmed: "Venda concluída",
};

// ---------- Blindagem de preços (espelha o backend) ----------

/** Extrai valores monetários citados em um texto (formato pt-BR). */
export function extractMentionedPrices(text: string): number[] {
  const found: number[] = [];
  const patterns = [
    /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/g,
    /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*reais/gi,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const normalized = m[1].replace(/\./g, "").replace(",", ".");
      const value = Number(normalized);
      if (Number.isFinite(value) && value > 0) found.push(value);
    }
  }
  return found;
}

/** Faixas autorizadas por produto: [mínimo com desconto máximo, máximo]. */
export function authorizedPriceRanges(
  products: Pick<SdrProduct, "price_value" | "price_min" | "price_max" | "max_discount_percent">[]
): { min: number; max: number }[] {
  const ranges: { min: number; max: number }[] = [];
  for (const p of products) {
    const discount = Math.min(100, Math.max(0, Number(p.max_discount_percent) || 0)) / 100;
    const values = [p.price_value, p.price_min, p.price_max]
      .map((v) => (v == null ? null : Number(v)))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (!values.length) continue;
    const hi = Math.max(...values);
    const lo = Math.min(...values) * (1 - discount);
    ranges.push({ min: Math.round(lo * 100) / 100, max: Math.round(hi * 100) / 100 });
  }
  return ranges;
}

/** Valores citados que não existem no catálogo (anti-alucinação). */
export function findUnauthorizedPrices(
  messages: string[],
  products: Pick<SdrProduct, "price_value" | "price_min" | "price_max" | "max_discount_percent">[]
): number[] {
  const ranges = authorizedPriceRanges(products);
  const unauthorized = new Set<number>();
  for (const text of messages) {
    for (const price of extractMentionedPrices(text)) {
      const ok = ranges.some((r) => price >= r.min - 0.01 && price <= r.max + 0.01);
      if (!ok) unauthorized.add(price);
    }
  }
  return Array.from(unauthorized);
}

/** Texto de preço para exibição no catálogo. */
export function productPriceLabel(p: Partial<SdrProduct>): string {
  if (p.price_display) return p.price_display;
  const fmt = (v: number) =>
    `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const billing =
    p.billing_model === "mensal" ? "/mês" : p.billing_model === "anual" ? "/ano" : "";
  if (p.price_type === "range" && p.price_min != null && p.price_max != null)
    return `${fmt(p.price_min)} a ${fmt(p.price_max)}${billing}`;
  if (p.price_type === "from" && p.price_value != null)
    return `a partir de ${fmt(p.price_value)}${billing}`;
  if (p.price_value != null) return `${fmt(p.price_value)}${billing}`;
  return "Investimento personalizado";
}
