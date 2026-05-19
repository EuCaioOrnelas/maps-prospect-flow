/**
 * Catálogo de Order Bumps do checkout.
 *
 * ⚠️ Preços ainda não definidos — usando placeholders. Ajuste `monthlyPriceCents`
 * de cada bump quando os valores forem decididos. O fluxo de UI/estado já está
 * pronto; basta atualizar números aqui.
 *
 * Regras:
 * - `numbers` (incremento de 1) e `contacts` (incremento de 1.000) aparecem em
 *   Atendimento (start) e Growth.
 * - `opportunities` (incremento de 1.000) aparece SÓ no Growth.
 * - Todos os bumps são RECORRENTES e seguem o ciclo do plano (mensal/anual).
 *   No anual o valor é multiplicado por 12 com o mesmo % de desconto do plano.
 */

import { MessageSquare, Users, Target, type LucideIcon } from "lucide-react";

export type OrderBumpId = "numbers" | "contacts" | "opportunities";

export interface OrderBumpDef {
  id: OrderBumpId;
  title: string;
  shortLabel: string;
  description: string;
  unit: string;            // "número" | "contatos" | "oportunidades"
  step: number;            // quanto cada incremento adiciona (1 ou 1000)
  /** Preço mensal por 1 incremento (em centavos). 0 = placeholder. */
  monthlyPriceCents: number;
  icon: LucideIcon;
  /** Planos onde o bump aparece. */
  availableOn: Array<"start" | "growth">;
  /** Cor de destaque (tailwind token). */
  accent: "primary" | "emerald" | "amber";
}

export const ORDER_BUMPS: OrderBumpDef[] = [
  {
    id: "numbers",
    title: "Número extra de WhatsApp",
    shortLabel: "+1 número",
    description: "Conecte outro número para aumentar disparo, atendimento e contornar limites diários.",
    unit: "número",
    step: 1,
    monthlyPriceCents: 0, // TODO: definir preço
    icon: MessageSquare,
    availableOn: ["start", "growth"],
    accent: "emerald",
  },
  {
    id: "contacts",
    title: "Pacote de contatos no CRM",
    shortLabel: "+1.000 contatos",
    description: "Aumenta o limite total de contatos armazenados e gerenciados no CRM.",
    unit: "contatos",
    step: 1000,
    monthlyPriceCents: 0, // TODO: definir preço
    icon: Users,
    availableOn: ["start", "growth"],
    accent: "primary",
  },
  {
    id: "opportunities",
    title: "Pacote de oportunidades comerciais",
    shortLabel: "+1.000 oportunidades",
    description: "Mais leads qualificados captados pelo SDR IA todo mês.",
    unit: "oportunidades",
    step: 1000,
    monthlyPriceCents: 0, // TODO: definir preço
    icon: Target,
    availableOn: ["growth"],
    accent: "amber",
  },
];

export type OrderBumpSelection = Record<OrderBumpId, number>;

export const emptyBumpSelection = (): OrderBumpSelection => ({
  numbers: 0,
  contacts: 0,
  opportunities: 0,
});

/**
 * Calcula o total mensal (em centavos) dos bumps selecionados.
 */
export function calcBumpsMonthlyCents(selection: OrderBumpSelection): number {
  return ORDER_BUMPS.reduce((sum, b) => sum + b.monthlyPriceCents * (selection[b.id] || 0), 0);
}

/**
 * Calcula o total para o ciclo (mensal vs anual). No anual aplicamos 12x.
 * Se quiser dar desconto anual nos bumps, ajuste aqui.
 */
export function calcBumpsTotalCents(
  selection: OrderBumpSelection,
  billing: "monthly" | "annual",
): number {
  const monthly = calcBumpsMonthlyCents(selection);
  return billing === "annual" ? monthly * 12 : monthly;
}

export function getBumpsForPlan(planKey: string): OrderBumpDef[] {
  const k = (planKey || "").toLowerCase();
  if (k !== "start" && k !== "growth") return [];
  return ORDER_BUMPS.filter((b) => b.availableOn.includes(k as "start" | "growth"));
}
