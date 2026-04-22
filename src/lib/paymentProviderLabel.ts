/**
 * Mapeamento canônico de provedores de pagamento para o admin e usuário.
 *
 * Estado atual da plataforma:
 * - "stripe"      -> Cartão de crédito (mensal e anual via Stripe Payment Element)
 * - "asaas"       -> PIX recorrente (novo sistema)
 * - "abacate_pay" -> PIX legado (mantido para compatibilidade com base antiga)
 *
 * Qualquer outro valor é exibido como veio (ou "—" quando vazio).
 */
export type PaymentProvider = "stripe" | "asaas" | "abacate_pay" | string | null | undefined;

/** Label curto exibido em tabelas e badges. */
export function getProviderLabel(provider: PaymentProvider): string {
  switch (provider) {
    case "stripe":
      return "Stripe (Cartão)";
    case "asaas":
      return "Asaas (PIX)";
    case "abacate_pay":
      return "PIX (legado)";
    default:
      return provider || "—";
  }
}

/** Bucket para agregação de MRR/assinantes. */
export type ProviderBucket = "stripe" | "pix" | "other";

export function getProviderBucket(provider: PaymentProvider): ProviderBucket {
  if (provider === "stripe") return "stripe";
  if (provider === "asaas" || provider === "abacate_pay") return "pix";
  return "other";
}

/** Verdadeiro se o provider representa um pagamento via PIX (Asaas novo ou abacate legado). */
export function isPixProvider(provider: PaymentProvider): boolean {
  return provider === "asaas" || provider === "abacate_pay";
}
