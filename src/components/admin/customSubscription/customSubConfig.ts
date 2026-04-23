/**
 * Default plan configurations - used as starting points but admin can override.
 */
type PlanDefault = { searches_limit: number; whatsapp_numbers_limit: number; monthly_value_cents: number };
export const PLAN_DEFAULTS: Record<"free" | "start" | "growth" | "scale", PlanDefault> = {
  free: { searches_limit: 120, whatsapp_numbers_limit: 1, monthly_value_cents: 0 },
  start: { searches_limit: 1000, whatsapp_numbers_limit: 1, monthly_value_cents: 29600 },
  growth: { searches_limit: 3000, whatsapp_numbers_limit: 3, monthly_value_cents: 69600 },
  scale: { searches_limit: 10000, whatsapp_numbers_limit: 10, monthly_value_cents: 89700 },
};

export const PAYMENT_METHODS = [
  { value: "free", label: "Cortesia (Gratuito)" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência bancária" },
  { value: "card", label: "Cartão de crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
] as const;

export const SUBSCRIPTION_LABELS = [
  "Scale Influenciador",
  "Scale Personalizado",
  "Cortesia Interna",
  "Teste Beta",
  "Parceiro Estratégico",
  "Cliente Enterprise",
] as const;

export const formatCents = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const parseCurrencyToCents = (value: string): number => {
  const clean = value.replace(/[^\d,]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
};
