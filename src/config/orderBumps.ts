/**
 * Catálogo de Order Bumps do checkout / gestão de add-ons.
 *
 * Preços e price IDs do Stripe definidos em 2026-05-19.
 *
 * Regras:
 * - `numbers` (incremento de 1) e `contacts` (incremento de 1.000) aparecem em
 *   Atendimento (start) e Growth.
 * - `opportunities` (incremento de 1.000) aparece SÓ no Growth.
 * - Bumps são RECORRENTES MENSAIS. No checkout ANUAL eles são bloqueados pois
 *   o Stripe não permite misturar intervalos `month` + `year` na mesma
 *   subscription. A UI esconde a seção quando billingPeriod === "annual".
 * - Quando o pagamento de um bump falha, o webhook remove o item da subscription
 *   e zera a coluna `extra_*` correspondente em `profiles` (mantém o plano).
 */

import { MessageSquare, Users, Target, type LucideIcon } from "lucide-react";

export type OrderBumpId = "numbers" | "contacts" | "opportunities";

export interface OrderBumpDef {
  id: OrderBumpId;
  title: string;
  shortLabel: string;
  description: string;
  unit: string;
  step: number;
  /** Preço mensal por 1 incremento (em centavos). */
  monthlyPriceCents: number;
  /** Price ID mensal do Stripe (recorrente). */
  stripePriceIdMonthly: string;
  /** Price ID anual — null por enquanto, bumps não disponíveis em anual. */
  stripePriceIdAnnual: string | null;
  icon: LucideIcon;
  availableOn: Array<"start" | "growth">;
  accent: "primary" | "emerald" | "amber";
  /** Coluna em profiles que guarda a quantidade ativa. */
  profileColumn: "extra_numbers" | "extra_contacts_packs" | "extra_opportunities_packs";
}

export const ORDER_BUMPS: OrderBumpDef[] = [
  {
    id: "numbers",
    title: "Expansão de Atendimento",
    shortLabel: "Expansão de Atendimento: +1 Número",
    description: "Conecte mais um número de WhatsApp para escalar disparo, atendimento e contornar limites diários.",
    unit: "número",
    step: 1,
    monthlyPriceCents: 9600,
    stripePriceIdMonthly: "price_1TYdiXK8CM0R6xMMqnhxGM1V",
    stripePriceIdAnnual: null,
    icon: MessageSquare,
    availableOn: ["start", "growth"],
    accent: "emerald",
    profileColumn: "extra_numbers",
  },
  {
    id: "contacts",
    title: "Expansão de CRM",
    shortLabel: "Expansão de CRM: +1k Contatos CRM",
    description: "Amplia o limite total de contatos armazenados e gerenciados dentro do seu CRM.",
    unit: "contatos",
    step: 1000,
    monthlyPriceCents: 4800,
    stripePriceIdMonthly: "price_1TYdkPK8CM0R6xMMXHTfihdw",
    stripePriceIdAnnual: null,
    icon: Users,
    availableOn: ["start", "growth"],
    accent: "primary",
    profileColumn: "extra_contacts_packs",
  },
  {
    id: "opportunities",
    title: "Expansão Comercial",
    shortLabel: "Expansão Comercial: +1k Oportunidades",
    description: "Mais leads B2B qualificados captados e diagnosticados pelo SDR IA todo mês.",
    unit: "oportunidades",
    step: 1000,
    monthlyPriceCents: 19600,
    stripePriceIdMonthly: "price_1TYdknK8CM0R6xMM9TXjGFf5",
    stripePriceIdAnnual: null,
    icon: Target,
    availableOn: ["growth"],
    accent: "amber",
    profileColumn: "extra_opportunities_packs",
  },
];

export type OrderBumpSelection = Record<OrderBumpId, number>;

export const emptyBumpSelection = (): OrderBumpSelection => ({
  numbers: 0,
  contacts: 0,
  opportunities: 0,
});

export function calcBumpsMonthlyCents(selection: OrderBumpSelection): number {
  return ORDER_BUMPS.reduce((sum, b) => sum + b.monthlyPriceCents * (selection[b.id] || 0), 0);
}

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

/** True se a combinação plano+ciclo aceita order bumps. */
export function bumpsAllowedForCycle(billing: "monthly" | "annual" | string): boolean {
  return billing !== "annual";
}

/** Converte profile.extra_* em uma OrderBumpSelection. */
export function profileToBumpSelection(profile: {
  extra_numbers?: number | null;
  extra_contacts_packs?: number | null;
  extra_opportunities_packs?: number | null;
} | null | undefined): OrderBumpSelection {
  return {
    numbers: profile?.extra_numbers || 0,
    contacts: profile?.extra_contacts_packs || 0,
    opportunities: profile?.extra_opportunities_packs || 0,
  };
}
