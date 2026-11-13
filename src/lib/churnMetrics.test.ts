import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { buildChurnReasonData, calculatePaidChurnRate, filterChurnByDate } from "./churnMetrics";

// Testa a regra real do index.ts sem iniciar o servidor Deno nem copiar a lógica.
const edgeSource = readFileSync("supabase/functions/admin-get-churn/index.ts", "utf8");
const ruleStart = edgeSource.indexOf("export type StripeInvoicePayment");
const ruleEnd = edgeSource.indexOf("const corsHeaders", ruleStart);
if (ruleStart < 0 || ruleEnd < ruleStart) throw new Error("Regra de churn não encontrada no index.ts");
const ruleModule = { exports: {} as {
  hasRealPaymentBeforeCancellation: (
    invoices: Array<{
      paid?: boolean;
      amount_paid?: number | null;
      amount_remaining?: number | null;
      created?: number;
      status_transitions?: { paid_at?: number | null } | null;
    }>,
    canceledAtUnix: number,
  ) => boolean;
  paymentPrecedesCancellation: (paidAt: number | undefined, canceledAt: string) => boolean;
} };
runInNewContext(ts.transpileModule(edgeSource.slice(ruleStart, ruleEnd), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: ruleModule.exports });
const { hasRealPaymentBeforeCancellation, paymentPrecedesCancellation } = ruleModule.exports;

describe("churn acumulado de clientes pagos", () => {
  it("divide todos os que pagaram e cancelaram pelos que já pagaram, não pelos 606 cadastros", () => {
    expect(calculatePaidChurnRate(7, 50)).toBe(14);
    expect(calculatePaidChurnRate(2, 7)).toBeCloseTo(28.5714, 4);
  });
  it("exclui cancelamento anterior ao pagamento e cortesia sem pagamento", () => {
    expect(paymentPrecedesCancellation(Date.parse("2026-11-13"), "2026-11-12")).toBe(false);
    expect(paymentPrecedesCancellation(undefined, "2026-11-12")).toBe(false);
    expect(paymentPrecedesCancellation(Date.parse("2026-11-01"), "2026-11-12")).toBe(true);
  });
});

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
      { id: "old", cancelled_at: "2026-06-15T12:00:00" },
      { id: "end", cancelled_at: "2026-07-31T23:59:59" },
      { id: "after", cancelled_at: "2026-08-01T00:00:00" },
    ];
    expect(filterChurnByDate(records, "2026-06-01", "2026-07-31").map((r) => r.id)).toEqual(["old", "end"]);
    expect(filterChurnByDate(records, "2026-06-01", "").map((r) => r.id)).toEqual(["old", "end", "after"]);
  });
});
