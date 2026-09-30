// =============================================================
// WIIZE PAY — AVISOS DE PAGAMENTO (Etapa 3)
// Self-contained: nenhum import de pasta compartilhada.
//
// Recebe eventos assinados do Wiize Pay e atualiza a cobrança + histórico do lead.
// Segurança: HMAC-SHA256 (secret WIIZE_PAY_WEBHOOK_SECRET) sobre
//   `${timestamp}.${nonce}.${rawBody}`, janela de 5 min, nonce e event_id de uso único,
//   comparação em tempo constante, vínculo external_reference + external_id.
// READY_FOR_WIIZE_PAY: sem o secret responde 503 e não processa nada.
// Contrato: docs/wiize-pay-avisos-etapa3.md
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("WIIZE_PAY_WEBHOOK_SECRET") || "";
const MAX_SKEW_S = 300;

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const enc = new TextEncoder();

async function hmacHex(msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const Event = z.object({
  event_id: z.string().min(8).max(200),
  type: z.enum(["charge.paid", "charge.pending", "charge.overdue", "charge.cancelled", "charge.failed", "charge.refunded"]),
  data: z.object({
    charge_id: z.string().min(1).max(200),
    external_reference: z.string().uuid(),
    amount_cents: z.number().int().nonnegative().optional(),
    paid_at: z.string().datetime().optional(),
  }),
});

const STATUS: Record<string, string> = {
  "charge.paid": "paid", "charge.pending": "awaiting_payment", "charge.overdue": "overdue",
  "charge.cancelled": "cancelled", "charge.failed": "error", "charge.refunded": "refunded",
};
const LABEL: Record<string, string> = {
  "charge.paid": "Pagamento confirmado no Wiize Pay", "charge.pending": "Cobrança aguardando pagamento no Wiize Pay",
  "charge.overdue": "Cobrança vencida no Wiize Pay", "charge.cancelled": "Cobrança cancelada no Wiize Pay",
  "charge.failed": "Pagamento recusado no Wiize Pay", "charge.refunded": "Pagamento estornado no Wiize Pay",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (SECRET.length < 32) return json({ error: "not_configured", ready_for_wiize_pay: true }, 503);

  const raw = await req.text();
  if (raw.length > 16_384) return json({ error: "payload_too_large" }, 413);
  const ts = req.headers.get("x-wiize-pay-timestamp") || "";
  const nonce = req.headers.get("x-wiize-pay-nonce") || "";
  const sig = (req.headers.get("x-wiize-pay-signature") || "").replace(/^sha256=/, "").toLowerCase();
  const tsNum = Number(ts);
  if (!/^\d{10}$/.test(ts) || Math.abs(Date.now() / 1000 - tsNum) > MAX_SKEW_S) return json({ error: "invalid_timestamp" }, 401);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return json({ error: "invalid_signature" }, 401);
  if (!safeEqual(await hmacHex(`${ts}.${nonce}.${raw}`), sig)) return json({ error: "invalid_signature" }, 401);

  let parsed;
  try { parsed = Event.safeParse(JSON.parse(raw)); } catch { return json({ error: "invalid_json" }, 400); }
  if (!parsed.success) return json({ error: "invalid_payload" }, 400);
  const ev = parsed.data;

  // uso único (event_id e nonce UNIQUE) — repetição responde 200 sem reprocessar
  const { data: logRow, error: dupErr } = await admin.from("wiize_pay_webhook_events")
    .insert({ event_id: ev.event_id, nonce, event_type: ev.type }).select("id").single();
  if (dupErr) return json({ ok: true, duplicate: true });

  const fail = async (msg: string, status = 200) => {
    await admin.from("wiize_pay_webhook_events").update({ status: "ignored", error_message: msg }).eq("id", logRow.id);
    return json({ ok: false, error: msg }, status);
  };

  const { data: ch } = await admin.from("wiize_pay_charge_requests").select("*").eq("id", ev.data.external_reference).maybeSingle();
  if (!ch) return fail("charge_not_found");
  if (ch.external_id && ch.external_id !== ev.data.charge_id) return fail("charge_mismatch");
  // conta precisa continuar conectada
  const { data: conn } = await admin.from("integration_connections").select("status").eq("owner_user_id", ch.owner_user_id).maybeSingle();
  if (conn?.status !== "active") return fail("connection_inactive");
  // cobrança paga não volta para outro estado, exceto estorno
  if (ch.status === "paid" && ev.type !== "charge.refunded") return fail("already_paid");

  const now = new Date().toISOString();
  const newStatus = STATUS[ev.type];
  await admin.from("wiize_pay_charge_requests").update({
    status: newStatus, external_id: ch.external_id || ev.data.charge_id, last_event_at: now,
    paid_at: ev.type === "charge.paid" ? (ev.data.paid_at || now) : ch.paid_at, updated_at: now,
  }).eq("id", ch.id);

  const snap = ch.snapshot as { deal?: { title?: string } } | null;
  await admin.from("lead_activities").insert({
    lead_id: ch.lead_id, owner_user_id: ch.owner_user_id, user_id: ch.created_by,
    activity_type: "wiize_pay_payment",
    description: `${LABEL[ev.type]}${snap?.deal?.title ? ` — ${snap.deal.title}` : ""}`,
    metadata: { charge_request_id: ch.id, deal_id: ch.deal_id, status: newStatus, amount_cents: ev.data.amount_cents ?? null },
  });
  await admin.from("wiize_pay_webhook_events").update({ owner_user_id: ch.owner_user_id, charge_request_id: ch.id }).eq("id", logRow.id);
  await admin.from("integration_export_audit_logs").insert({
    owner_user_id: ch.owner_user_id, user_id: null, action: `wiize_pay_webhook_${ev.type}`, status: "ok", auth_method: "hmac",
  });
  return json({ ok: true });
});
