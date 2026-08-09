// Regressão lógica: filtro de owner_user_id no auto-tag 131026 do meta-webhook.
// Garante que a query usada (após o fix) NÃO marca leads de outra conta.
//
// Esta é uma simulação do query-builder que o webhook executa em
// supabase/functions/meta-webhook/index.ts:692–725
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

type Lead = {
  id: string;
  owner_user_id: string;
  phone: string;
  whatsapp_status: string;
};

// Replica EXATAMENTE a lógica do filtro do webhook após o fix.
function simulateWebhookTagQuery(
  leads: Lead[],
  recipient: string,
  tagOwnerId: string
): Lead[] {
  const tail = recipient.slice(-8);
  return leads.filter((l) =>
    l.owner_user_id === tagOwnerId &&
    (l.phone === recipient || l.phone.endsWith(tail)) &&
    l.whatsapp_status !== "not_whatsapp"
  );
}

const OWNER_A = "11111111-1111-1111-1111-111111111111";
const OWNER_B = "22222222-2222-2222-2222-222222222222";
const SUBUSER_OF_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // user_id diferente, mas owner = OWNER_A

const dataset: Lead[] = [
  { id: "lead-A1", owner_user_id: OWNER_A, phone: "5511999998888", whatsapp_status: "never_contacted" },
  { id: "lead-A2-sub", owner_user_id: OWNER_A, phone: "5511999998888", whatsapp_status: "never_contacted" }, // subusuário da conta A
  { id: "lead-B1", owner_user_id: OWNER_B, phone: "5511999998888", whatsapp_status: "never_contacted" }, // OUTRA CONTA — não pode tocar
  { id: "lead-A3-other", owner_user_id: OWNER_A, phone: "5511777776666", whatsapp_status: "never_contacted" },
];

Deno.test("131026 do owner A só marca leads do owner A (mesmo telefone em B)", () => {
  const matched = simulateWebhookTagQuery(dataset, "5511999998888", OWNER_A);
  const ids = matched.map((l) => l.id).sort();
  assertEquals(ids, ["lead-A1", "lead-A2-sub"]);
  assert(!ids.includes("lead-B1"), "🚨 Lead da conta B NÃO pode ser marcado");
});

Deno.test("131026 do owner B só marca leads do owner B", () => {
  const matched = simulateWebhookTagQuery(dataset, "5511999998888", OWNER_B);
  assertEquals(matched.map((l) => l.id), ["lead-B1"]);
});

Deno.test("Subusuário (account_member) é coberto pelo escopo do owner", () => {
  // Subusuário de A grava lead com owner_user_id = OWNER_A. O filtro pega.
  const matched = simulateWebhookTagQuery(dataset, "5511999998888", OWNER_A);
  assert(matched.some((l) => l.id === "lead-A2-sub"), "Lead do subusuário deve ser marcado");
});

Deno.test("Lead já marcado not_whatsapp é ignorado (não re-update)", () => {
  const withFlagged: Lead[] = [
    ...dataset,
    { id: "lead-A4-flagged", owner_user_id: OWNER_A, phone: "5511999998888", whatsapp_status: "not_whatsapp" },
  ];
  const matched = simulateWebhookTagQuery(withFlagged, "5511999998888", OWNER_A);
  assert(!matched.some((l) => l.id === "lead-A4-flagged"));
});

Deno.test("Match por tail (últimos 8 dígitos) ainda escopado ao owner", () => {
  // Telefone gravado sem DDI completo, ex: "11999998888" (sem 55)
  const data: Lead[] = [
    { id: "lead-A-tail", owner_user_id: OWNER_A, phone: "11999998888", whatsapp_status: "never_contacted" },
    { id: "lead-B-tail", owner_user_id: OWNER_B, phone: "11999998888", whatsapp_status: "never_contacted" },
  ];
  const matched = simulateWebhookTagQuery(data, "5511999998888", OWNER_A);
  assertEquals(matched.map((l) => l.id), ["lead-A-tail"]);
});
