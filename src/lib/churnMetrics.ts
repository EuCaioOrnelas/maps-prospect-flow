export const CHURN_REASON_LABELS: Record<string, string> = {
  expensive: "Custo alto",
  not_using: "Não estava usando",
  no_results: "Sem resultado",
  bug: "Problemas técnicos",
  competitor: "Migrou para concorrente",
  missing_feature: "Falta recurso",
  no_time: "Sem tempo",
  other: "Outro",
  falta_pagamento: "Falta de pagamento",
  cancellation_requested: "Cancelamento solicitado",
  payment_failed: "Falha de pagamento",
  payment_disputed: "Pagamento contestado",
  "Não entendi como usar": "Não entendeu",
  "Não tive tempo para implementar": "Sem tempo",
  "Não vi resultado": "Sem resultado",
  "Custo / investimento": "Custo alto",
  "Tive problemas técnicos": "Problemas técnicos",
  "Não era o que eu esperava": "Expectativa",
  Outro: "Outro",
};

export const CHURN_REASON_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--muted-foreground) / 0.45)",
];

export function getChurnReasonLabel(reason?: string | null): string {
  if (!reason?.trim()) return "Não informado";
  return CHURN_REASON_LABELS[reason] || reason;
}

export type ChurnReasonDatum = {
  name: string;
  value: number;
  fill: string;
};

export function buildChurnReasonData(
  records: Array<{ cancellation_reason?: string | null }>,
): ChurnReasonDatum[] {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const label = getChurnReasonLabel(record.cancellation_reason);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"))
    .map((item, index) => ({
      ...item,
      fill: CHURN_REASON_COLORS[index % CHURN_REASON_COLORS.length],
    }));
}

/** Filtra pela data do cancelamento, incluindo o dia final até 23:59:59.999. */
export function filterChurnByDate<T extends { cancelled_at: string }>(
  records: T[],
  startDate: string,
  endDate: string,
): T[] {
  if (!startDate && !endDate) return records;
  const startTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
  const endTs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

  return records.filter((record) => {
    const timestamp = new Date(record.cancelled_at).getTime();
    return Number.isFinite(timestamp) && timestamp >= startTs && timestamp <= endTs;
  });
}
