/**
 * Centralized plan labels.
 * Internally we still use 'scale' as the plan key in the database,
 * but the UI displays it as "Enterprise".
 */
export type PlanKey = "free" | "start" | "growth" | "scale";

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  start: "Start",
  growth: "Growth",
  scale: "Enterprise",
};

export function getPlanLabel(plan: string | null | undefined): string {
  if (!plan) return "—";
  return PLAN_LABELS[plan.toLowerCase()] || plan;
}
