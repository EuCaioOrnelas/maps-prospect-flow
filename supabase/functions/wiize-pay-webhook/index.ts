// =============================================================
// WIIZE PAY — AVISOS (cobranças "charge.*" e vendas "sale.*")
// Self-contained: nenhum import de pasta compartilhada.
//
// Segurança (nesta ordem): corpo bruto ≤ 64 KB → horário ±5 min + HMAC-SHA256
// de `${timestamp}.${nonce}.${rawBody}` (tempo constante) → nonce único por 10 min
// → event_id único (repetição responde 200 sem processar).
// Contrato: docs/wiize-pay-avisos-etapa3.md
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("WIIZE_PAY_WEBHOOK_SECRET") || "";
const MAX_SKEW_S = 300;
const MAX_BYTES = 64 * 1024;
const NONCE_TTL_MS = 10 * 60 * 1000;

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
/** Valores em reais → string com 2 casas (gravado como NUMERIC, sem float no banco). */
const money = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === "") return "0.00";
  const s = String(n).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return "0.00";
  const [i, d = ""] = s.split(".");
  return `${i}.${(d + "00").slice(0, 2)}`;
};

// ---------------- Cobranças (legado etapa 3) ----------------
const ChargeEvent = z.object({
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
  "charge.paid": "Pagamento confirmado no WiizePay", "charge.pending": "Cobrança aguardando pagamento no WiizePay",
  "charge.overdue": "Cobrança vencida no WiizePay", "charge.cancelled": "Cobrança cancelada no WiizePay",
  "charge.failed": "Pagamento recusado no WiizePay", "charge.refunded": "Pagamento estornado no WiizePay",
};

// ---------------- Vendas ----------------
const num = z.union([z.number(), z.string()]);
const SaleEvent = z.object({
  event_id: z.string().min(4).max(200),
  type: z.enum(["sale.created", "sale.updated", "sale.payment_received", "sale.overdue", "sale.cancelled", "sale.refunded"]),
  occurred_at: z.string().datetime({ offset: true }),
  data: z.object({
    sale_id: z.string().min(1).max(200),
    organization_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().optional().nullable()),
    tenant_id: z.preprocess((v) => (v === "" ? null : v), z.string().max(200).optional().nullable()),
    customer: z.union([
      z.object({ source: z.literal("wiize"), wiize_customer_id: z.string().min(1).max(200) }).passthrough(),
      z.object({
        source: z.literal("wiizepay"),
        name: z.string().max(300).optional().nullable(),
        document: z.string().max(30).optional().nullable(),
        email: z.string().max(300).optional().nullable(),
      }).passthrough(),
    ]),
    type: z.enum(["one_time", "installment", "recurring"]),
    type_label: z.string().max(60).optional().nullable(),
    total_amount: num,
    installment_amount: num.optional().nullable(),
    installments: z.number().int().nonnegative().nullable().optional(),
    recurrence_frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "semiannual", "yearly"]).nullable().optional(),
    starts_on: z.string().max(10).nullable().optional(),
    expires_on: z.string().max(10).nullable().optional(),
    status: z.string().min(1).max(40),
    status_label: z.string().max(80).nullable().optional(),
    paid_installments: z.number().int().nonnegative().nullable().optional(),
    amount_received: num.nullable().optional(),
    last_paid_at: z.string().nullable().optional(),
    next_due_on: z.string().max(10).nullable().optional(),
    payment_method: z.string().max(30).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    service: z.object({ id: z.string().nullable().optional(), name: z.string().max(300).nullable().optional() }).nullable().optional(),
    contract_id: z.string().max(200).nullable().optional(),
    currency: z.string().max(5).nullable().optional(),
  }),
});
type SaleEv = z.infer<typeof SaleEvent>;

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function activeOwner(owner: string) {
  const { data } = await admin.from("integration_connections").select("status").eq("owner_user_id", owner).maybeSingle();
  return data?.status === "active";
}

/** Descobre a conta (organização) dona da venda. */
async function resolveOwner(ev: SaleEv): Promise<string | null> {
  // Código da conta Wiize enviado pela WiizePay tem prioridade.
  if (ev.data.organization_id) return ev.data.organization_id;
  const { data: known } = await admin.from("wiizepay_sales").select("owner_user_id").eq("wiizepay_sale_id", ev.data.sale_id).limit(2);
  if (known && known.length === 1) return known[0].owner_user_id;
  const c = ev.data.customer;
  if (c.source === "wiize" && isUuid(c.wiize_customer_id)) {
    const { data: lead } = await admin.from("leads").select("owner_user_id, user_id").eq("id", c.wiize_customer_id).maybeSingle();
    if (lead) return lead.owner_user_id || lead.user_id;
  }
  // Sem identificação: só é seguro quando existe exatamente uma conta conectada.
  const { data: conns } = await admin.from("integration_connections").select("owner_user_id").eq("provider", "wiize_pay").eq("status", "active").limit(2);
  return conns && conns.length === 1 ? conns[0].owner_user_id : null;
}

async function resolveCustomer(ev: SaleEv, owner: string): Promise<{ id: string | null; name: string | null }> {
  const c = ev.data.customer;
  if (c.source === "wiize") {
    if (!isUuid(c.wiize_customer_id)) return { id: null, name: null };
    const { data } = await admin.from("leads").select("id, owner_user_id, user_id, contact_name, company_name").eq("id", c.wiize_customer_id).maybeSingle();
    if (!data || (data.owner_user_id || data.user_id) !== owner) return { id: null, name: null };
    return { id: data.id, name: data.contact_name || data.company_name };
  }
  const doc = (c.document || "").replace(/\D/g, "");
  if (doc.length === 11 || doc.length === 14) {
    const { data: found } = await admin.from("leads").select("id, contact_name, company_name, document").eq("owner_user_id", owner).not("document", "is", null).limit(5000);
    const hit = (found || []).find((l: { document: string | null }) => (l.document || "").replace(/\D/g, "") === doc);
    if (hit) return { id: hit.id, name: hit.contact_name || hit.company_name };
  }
  const name = (c.name || "").trim() || "Cliente WiizePay";
  const { data: created } = await admin.from("leads").insert({
    user_id: owner, owner_user_id: owner, contact_name: name, document: doc || null,
    email: c.email || null, source: "wiizepay",
  }).select("id").single();
  return { id: created?.id ?? null, name };
}

async function handleSale(ev: SaleEv, logId: string) {
  const owner = await resolveOwner(ev);
  if (!owner) return "owner_unknown";
  if (!(await activeOwner(owner))) return "connection_inactive";

  const { data: existing } = await admin.from("wiizepay_sales").select("id, last_event_at, status, cancelled_at, customer_id, customer_name")
    .eq("owner_user_id", owner).eq("wiizepay_sale_id", ev.data.sale_id).maybeSingle();
  if (existing?.last_event_at && new Date(ev.occurred_at) < new Date(existing.last_event_at)) return "out_of_order";

  const cust = existing?.customer_id ? { id: existing.customer_id, name: existing.customer_name } : await resolveCustomer(ev, owner);
  const d = ev.data;
  const cancelled = d.status === "cancelled" || ev.type === "sale.cancelled";
  const row = {
    owner_user_id: owner, wiizepay_sale_id: d.sale_id, customer_id: cust.id, customer_name: cust.name,
    sale_type: d.type, type_label: d.type_label ?? null,
    total_amount: money(d.total_amount), installment_amount: money(d.installment_amount ?? d.total_amount),
    installments: d.installments ?? null, recurrence_frequency: d.recurrence_frequency ?? null,
    starts_on: d.starts_on || null, expires_on: d.expires_on || null,
    status: d.status, status_label: d.status_label ?? null,
    paid_installments: d.paid_installments ?? 0, amount_received: money(d.amount_received),
    last_paid_at: d.last_paid_at || null, next_due_on: d.next_due_on || null,
    payment_method: d.payment_method ?? null, description: d.description ?? null,
    service_id: d.service?.id ?? null, service_name: d.service?.name ?? null,
    contract_id: d.contract_id ?? null, currency: d.currency || "BRL",
    cancelled_at: cancelled ? (existing?.cancelled_at || ev.occurred_at) : null,
    last_event_at: ev.occurred_at, updated_at: new Date().toISOString(),
  };
  const { error: upErr } = await admin.from("wiizepay_sales").upsert(row, { onConflict: "owner_user_id,wiizepay_sale_id" });
  if (upErr) throw new Error(`sale_upsert: ${upErr.message}`);

  if (ev.type === "sale.payment_received" && (d.paid_installments ?? 0) > 0) {
    const amount = d.type === "one_time" ? money(d.total_amount) : money(d.installment_amount ?? d.total_amount);
    await admin.from("wiizepay_revenue_entries").upsert({
      owner_user_id: owner, wiizepay_sale_id: d.sale_id, paid_installments: d.paid_installments,
      amount, paid_at: d.last_paid_at || ev.occurred_at,
    }, { onConflict: "owner_user_id,wiizepay_sale_id,paid_installments", ignoreDuplicates: true });
  }
  if (ev.type === "sale.refunded" || d.status === "refunded") {
    await admin.from("wiizepay_revenue_entries").update({ refunded: true, refunded_at: ev.occurred_at })
      .eq("owner_user_id", owner).eq("wiizepay_sale_id", d.sale_id).eq("refunded", false);
  }

  if (cust.id && ["sale.created", "sale.payment_received", "sale.cancelled", "sale.refunded", "sale.overdue"].includes(ev.type)) {
    const label: Record<string, string> = {
      "sale.created": "Venda criada na WiizePay", "sale.payment_received": "Pagamento recebido na WiizePay",
      "sale.cancelled": "Venda cancelada na WiizePay", "sale.refunded": "Venda estornada na WiizePay",
      "sale.overdue": "Pagamento em atraso na WiizePay",
    };
    await admin.from("lead_activities").insert({
      lead_id: cust.id, owner_user_id: owner, user_id: owner, activity_type: "wiize_pay_payment",
      description: `${label[ev.type]}${d.service?.name ? ` — ${d.service.name}` : ""}`,
      metadata: { wiizepay_sale_id: d.sale_id, status: d.status, status_label: d.status_label ?? null },
    });
  }
  await admin.from("wiize_pay_webhook_events").update({ owner_user_id: owner }).eq("id", logId);
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (SECRET.length < 32) return json({ error: "not_configured", ready_for_wiize_pay: true }, 503);

  // 1. corpo bruto, limite 64 KB
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return json({ error: "payload_too_large" }, 413);
  const raw = new TextDecoder().decode(buf);

  // 2. horário e assinatura
  const ts = req.headers.get("x-wiize-pay-timestamp") || "";
  const nonce = req.headers.get("x-wiize-pay-nonce") || "";
  const sig = (req.headers.get("x-wiize-pay-signature") || "").replace(/^sha256=/, "").toLowerCase();
  if (!/^\d{9,11}$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > MAX_SKEW_S) return json({ error: "invalid_timestamp" }, 401);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return json({ error: "invalid_signature" }, 401);
  if (!safeEqual(await hmacHex(`${ts}.${nonce}.${raw}`), sig)) return json({ error: "invalid_signature" }, 401);

  // 3. nonce único (guardado 10 min)
  await admin.from("wiize_pay_webhook_nonces").delete().lt("created_at", new Date(Date.now() - NONCE_TTL_MS).toISOString());
  const { error: nonceErr } = await admin.from("wiize_pay_webhook_nonces").insert({ nonce });
  if (nonceErr) return json({ error: "nonce_reused" }, 401);

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  const typ = (body as { type?: string })?.type || "";

  // 4. event_id único
  const eventId = (body as { event_id?: string })?.event_id || req.headers.get("idempotency-key") || "";
  if (!eventId) return json({ error: "invalid_payload" }, 400);
  const { data: logRow, error: dupErr } = await admin.from("wiize_pay_webhook_events")
    .insert({ event_id: eventId, nonce, event_type: String(typ).slice(0, 60) || "unknown" }).select("id").single();
  if (dupErr) return json({ ok: true, duplicate: true });

  const mark = async (msg: string | null, status = "ignored") => {
    if (msg) await admin.from("wiize_pay_webhook_events").update({ status, error_message: msg }).eq("id", logRow.id);
  };

  if (typ.startsWith("sale.")) {
    const p = SaleEvent.safeParse(body);
    if (!p.success) { await mark("invalid_payload"); return json({ ok: false, error: "invalid_payload" }); }
    try {
      const err = await handleSale(p.data, logRow.id);
      await mark(err);
      return json({ ok: !err, ...(err ? { error: err } : {}) });
    } catch (e) {
      // Falha temporária: libera o evento para a WiizePay reenviar.
      await admin.from("wiize_pay_webhook_events").delete().eq("id", logRow.id);
      console.error("sale_processing_failed", (e as Error).message);
      return json({ error: "processing_failed" }, 500);
    }
  }

  // ---------- cobranças (legado) ----------
  const parsed = ChargeEvent.safeParse(body);
  if (!parsed.success) { await mark("invalid_payload"); return json({ ok: false, error: "invalid_payload" }); }
  const ev = parsed.data;
  const fail = async (msg: string) => { await mark(msg); return json({ ok: false, error: msg }); };

  const { data: ch } = await admin.from("wiize_pay_charge_requests").select("*").eq("id", ev.data.external_reference).maybeSingle();
  if (!ch) return fail("charge_not_found");
  if (ch.external_id && ch.external_id !== ev.data.charge_id) return fail("charge_mismatch");
  if (!(await activeOwner(ch.owner_user_id))) return fail("connection_inactive");
  if (ch.status === "paid" && ev.type !== "charge.refunded") return fail("already_paid");
  if (["cancelled", "refunded"].includes(ch.status) && ev.type !== "charge.paid") return fail("final_status");

  const now = new Date().toISOString();
  const newStatus = STATUS[ev.type];
  await admin.from("wiize_pay_charge_requests").update({
    status: newStatus, external_id: ch.external_id || ev.data.charge_id, last_event_at: now,
    paid_at: ev.type === "charge.paid" ? (ev.data.paid_at || now) : ch.paid_at, updated_at: now,
  }).eq("id", ch.id);
  const snap = ch.snapshot as { deal?: { title?: string } } | null;
  await admin.from("lead_activities").insert({
    lead_id: ch.lead_id, owner_user_id: ch.owner_user_id, user_id: ch.created_by, activity_type: "wiize_pay_payment",
    description: `${LABEL[ev.type]}${snap?.deal?.title ? ` — ${snap.deal.title}` : ""}`,
    metadata: { charge_request_id: ch.id, deal_id: ch.deal_id, status: newStatus, amount_cents: ev.data.amount_cents ?? null },
  });
  await admin.from("wiize_pay_webhook_events").update({ owner_user_id: ch.owner_user_id, charge_request_id: ch.id }).eq("id", logRow.id);
  return json({ ok: true });
});
