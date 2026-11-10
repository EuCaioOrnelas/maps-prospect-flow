import { describe, expect, it } from "vitest";
import { hasRealPaymentBeforeCancellation } from "../../supabase/functions/admin-get-churn/churnRules";
import { buildChurnReasonData, filterChurnByDate } from "./churnMetrics";

describe("prova de pagamento para churn", () => {
  it("conta quem pagou R$ 129 antes de cancelar, mesmo durante a data do trial", () => {
    const paidAt = 1_780_000_000;
    expect(hasRealPaymentBeforeCancellation([
      { paid: true, amount_paid: 12900, amount_remaining: 0, status_transitions: { paid_at: paidAt } },
    ], paidAt + 3600)).toBe(true);
  });

  it("não conta trial com fatura de R$ 0", () => {
    expect(hasRealPaymentBeforeCancellation([
      { paid: true, amount_paid: 0, amount_remaining: 0, created: 1_780_000_000 },
    ], 1_780_003_600)).toBe(false);
  });

  it("não conta fatura não paga nem pagamento posterior ao cancelamento", () => {
    expect(hasRealPaymentBeforeCancellation([
      { paid: false, amount_paid: 12900, amount_remaining: 12900, created: 1_780_000_000 },
      { paid: true, amount_paid: 12900, amount_remaining: 0, created: 1_780_010_000 },
    ], 1_780_003_600)).toBe(false);
  });

  it("aceita pagamento confirmado mesmo quando a fatura não tem referência de cobrança", () => {
    expect(hasRealPaymentBeforeCancellation([
      { paid: true, amount_paid: 12900, amount_remaining: 0, created: 1_780_000_000 },
    ], 1_780_003_600)).toBe(true);
  });
});

describe("motivos e filtro de churn", () => {
  it("ordena o maior motivo primeiro e inclui cancelamentos sem feedback", () => {
    expect(buildChurnReasonData([
      { cancellation_reason: "expensive" },
      { cancellation_reason: "Custo / investimento" },
      { cancellation_reason: null },
      { cancellation_reason: "bug" },
    ]).map(({ name, value }) => ({ name, value }))).toEqual([
      { name: "Custo alto", value: 2 },
      { name: "Não informado", value: 1 },
      { name: "Problemas técnicos", value: 1 },
    ]);
  });

  it("permite filtrar churns de datas anteriores e inclui o dia final inteiro", () => {
    const records = [
      { id: "old", cancelled_at: "2026-06-15T12:00:00-03:00" },
      { id: "end", cancelled_at: "2026-07-31T23:59:59-03:00" },
      { id: "after", cancelled_at: "2026-08-01T00:00:00-03:00" },
    ];
    expect(filterChurnByDate(records, "2026-06-01", "2026-07-31").map((r) => r.id)).toEqual(["old", "end"]);
    expect(filterChurnByDate(records, "2026-06-01", "").map((r) => r.id)).toEqual(["old", "end", "after"]);
  });
});
