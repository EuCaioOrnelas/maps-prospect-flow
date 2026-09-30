// =============================================================
// WIIZE PAY — COBRANÇA A PARTIR DE VENDA DO CRM (Etapa 2)
// Self-contained: nenhum import de pasta compartilhada.
//
// actions: preview | create | status | cancel | list_for_lead
//
// READY_FOR_WIIZE_PAY: nenhuma URL do Wiize Pay é inventada.
// A API vem de secrets (WIIZE_PAY_API_BASE_URL, WIIZE_PAY_CHECKOUT_ORIGIN).
// Sem elas, o pedido é salvo como "awaiting_wiize_pay" e nada é chamado.
// Contrato esperado: docs/wiize-pay-cobranca-etapa2.md
// Dados de cartão NUNCA passam pelo Wiize.
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENC_KEY = Deno.env.get("WIIZE_PAY_TOKEN_ENC_KEY") || "";
// Aceita a base com ou sem "/v1" no final: as rotas abaixo sempre acrescentam "/v1/<recurso>".
const API_BASE = (Deno.env.get("WIIZE_PAY_API_BASE_URL") || "").replace(/\/+$/, "").replace(/\/v1$/i, "");
const CHECKOUT_ORIGIN = (Deno.env.get("WIIZE_PAY_CHECKOUT_ORIGIN") || "").replace(/\/+$/, "");
const TOKEN_URL = Deno.env.get("WIIZE_PAY_TOKEN_URL") || "";
const CLIENT_ID = Deno.env.get("WIIZE_PAY_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("WIIZE_PAY_CLIENT_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const apiConfigured = () =>
  !!(API_BASE.startsWith("https://") && CHECKOUT_ORIGIN.startsWith("https://") && ENC_KEY);

// ---------- crypto (mesmo formato da Etapa 1) ----------
const enc = new TextEncoder();
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function aesKey() {
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode(ENC_KEY)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(p: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${b64url(iv)}.${b64url(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(p))))}`;
}
async function decrypt(p: string) {
  const [iv, ct] = p.split(".");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv) }, await aesKey(), fromB64url(ct)));
}
async function sha256hex(s: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- helpers ----------
async function audit(ownerId: string, userId: string, action: string, status: string, req: Request, error?: string) {
  await admin.from("integration_export_audit_logs").insert({
    owner_user_id: ownerId, user_id: userId, action, status,
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    error_message: error ? error.slice(0, 300) : null,
    auth_method: "session",
  });
}
async function rateLimit(id: string, endpoint: string, max = 20) {
  const { data } = await admin.rpc("check_rate_limit", { p_identifier: id, p_endpoint: endpoint, p_max_requests: max, p_window_seconds: 60 });
  return (data as { allowed?: boolean } | null)?.allowed !== false;
}

/** Access token válido (renova com refresh_token quando faltar < 60 s). */
async function getAccessToken(ownerId: string): Promise<string | null> {
  const { data: sec } = await admin.from("integration_connection_secrets").select("*").eq("owner_user_id", ownerId).maybeSingle();
  if (!sec?.access_token_enc) return null;
  const exp = sec.access_expires_at ? new Date(sec.access_expires_at).getTime() : 0;
  if (exp - Date.now() > 60_000) return decrypt(sec.access_token_enc);
  if (!sec.refresh_token_enc || !TOKEN_URL.startsWith("https://") || !CLIENT_ID) return null;
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: await decrypt(sec.refresh_token_enc),
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    }),
  });
  const tok = await resp.json().catch(() => ({}));
  if (!resp.ok || typeof tok.access_token !== "string") {
    await admin.from("integration_connections").update({ status: "error", last_error: "refresh_failed", updated_at: new Date().toISOString() }).eq("owner_user_id", ownerId);
    return null;
  }
  const expiresIn = Math.min(Math.max(Number(tok.expires_in) || 3600, 60), 86400);
  await admin.from("integration_connection_secrets").update({
    access_token_enc: await encrypt(tok.access_token),
    refresh_token_enc: typeof tok.refresh_token === "string" ? await encrypt(tok.refresh_token) : sec.refresh_token_enc,
    access_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("owner_user_id", ownerId);
  return tok.access_token;
}

function safeCheckoutUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try { const url = new URL(u); return url.origin === CHECKOUT_ORIGIN ? url.toString() : null; } catch { return null; }
}
const mapStatus = (s: unknown) => {
  const v = String(s || "").toLowerCase();
  if (["paid", "succeeded", "received", "confirmed"].includes(v)) return "paid";
  if (["cancelled", "canceled", "voided"].includes(v)) return "cancelled";
  if (v === "overdue") return "overdue";
  if (v === "refunded") return "refunded";
  if (["pending", "awaiting_payment", "open"].includes(v)) return "awaiting_payment";
  if (["failed", "error"].includes(v)) return "error";
  return "sent";
};

const METHODS = ["pix", "boleto", "credit_card", "debit"] as const;
const BILLING = ["one_time", "installment", "recurring"] as const;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), deal_id: z.string().uuid() }),
  z.object({
    action: z.literal("create"), deal_id: z.string().uuid(), idempotency_key: z.string().min(8).max(100),
    payment_methods: z.array(z.enum(METHODS)).min(1).max(4),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    billing_type: z.enum(BILLING).optional(),
    installments: z.number().int().min(2).max(21).optional(),
    customer_document: z.string().max(20).optional(),
  }),
  z.object({ action: z.literal("status"), id: z.string().uuid() }),
  z.object({ action: z.literal("cancel"), id: z.string().uuid() }),
  z.object({ action: z.literal("link"), id: z.string().uuid() }),
  z.object({ action: z.literal("list_for_lead"), lead_id: z.string().uuid() }),
  z.object({ action: z.literal("list_all") }),
]);

const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const validEmail = (v: unknown) => (typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? v.trim().slice(0, 254) : null);
const cut = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

type BuildOpts = { billing_type?: typeof BILLING[number]; installments?: number; document?: string };

async function buildSnapshot(ownerId: string, dealId: string, opts: BuildOpts = {}) {
  const { data: deal } = await admin.from("lead_deals")
    .select("id, lead_id, owner_user_id, title, value, sale_type, contract_months, start_date, expiration_date, status, created_at, billing_provider")
    .eq("id", dealId).maybeSingle();
  if (!deal || deal.owner_user_id !== ownerId) return null;
  const { data: lead } = await admin.from("leads")
    .select("id, company_name, contact_name, email, phone, city, owner_user_id, document").eq("id", deal.lead_id).maybeSingle();
  if (!lead || (lead as any).owner_user_id !== ownerId) return null;
  const type = opts.billing_type || (deal.sale_type === "recurring" ? "recurring" : "one_time");
  const valueCents = Math.round(Number(deal.value) * 100);
  let amountCents = valueCents, n = 1, totalCents = valueCents;
  if (type === "recurring") { n = Math.max(1, Math.min(60, deal.contract_months || 1)); totalCents = valueCents * n; }
  if (type === "installment") { n = Math.max(2, Math.min(21, opts.installments || 2)); amountCents = Math.round(valueCents / n); totalCents = valueCents; }
  const document = onlyDigits(opts.document ?? (lead as any).document) || null;
  const d: Record<string, unknown> = {
    id: deal.id, title: (deal.title || "Venda").slice(0, 160), type,
    amount_cents: amountCents, currency: "BRL", installments_or_months: n, total_cents: totalCents,
  };
  if (deal.start_date) d.start_date = String(deal.start_date).slice(0, 10);
  if (deal.expiration_date) d.end_date = String(deal.expiration_date).slice(0, 10);
  const customer: Record<string, unknown> = {
    lead_id: lead.id, company_name: cut(lead.company_name, 200), contact_name: cut(lead.contact_name, 200),
    email: validEmail(lead.email), phone: cut(onlyDigits(lead.phone), 30), city: cut(lead.city, 120), document,
  };
  return { snapshot: { schema_version: "1.0", source: "wiize_crm", deal: d, customer }, deal, lead };
}

/** Cria/atualiza o cliente no Wiize Pay antes da cobrança. Não bloqueia: a cobrança também vincula o cliente. */
async function pushCustomer(token: string, lead: any, document: string) {
  const name = cut(lead.company_name, 200) || cut(lead.contact_name, 200) || validEmail(lead.email) || "Cliente";
  const c: Record<string, string> = { id: lead.id, name, document };
  if (lead.company_name && lead.contact_name) c.trade_name = String(cut(lead.contact_name, 200));
  const email = validEmail(lead.email); if (email) c.email = email.toLowerCase();
  const phone = cut(onlyDigits(lead.phone), 30); if (phone) c.phone = phone;
  const city = cut(lead.city, 120); if (city) c.city = city;
  try {
    const r = await fetch(`${API_BASE}/v1/customers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ customers: [c] }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) console.warn(`wiize-pay customer pre-sync [${r.status}]`);
    await r.text().catch(() => "");
  } catch (e) {
    console.warn("wiize-pay customer pre-sync failed", e instanceof Error ? e.name : "x");
  }
}

async function postCharge(token: string, rowId: string, snapshot: Record<string, unknown>) {
  const raw = JSON.stringify({ external_reference: rowId, ...snapshot });
  const checksum = await sha256hex(raw);
  const resp = await fetch(`${API_BASE}/v1/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json",
      "Idempotency-Key": rowId, "X-Wiize-Checksum": checksum,
    },
    body: raw,
  });
  const out = await resp.json().catch(() => ({}));
  return { resp, out, checksum };
}

const providerMessage = (out: any, status: number) =>
  String(out?.message || out?.error || `wiize_pay_http_${status}`).slice(0, 200);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const userId = u.user.id;
  const { data: prof } = await admin.from("profiles").select("account_role, parent_owner_id").eq("id", userId).maybeSingle();
  const ownerId: string = (prof as any)?.parent_owner_id || userId;
  const role: string = prof ? ((prof as any).account_role || "owner") : "none"; // sem perfil = sem permissão
  const privileged = role === "owner" || role === "admin";

  let raw: unknown;
  try {
    const t = await req.text();
    if (t.length > 4096) return json({ error: "payload_too_large" }, 413);
    raw = t ? JSON.parse(t) : {};
  } catch { return json({ error: "invalid_json" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid_params", details: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  if (!(await rateLimit(userId, `wiize-pay-charge:${body.action}`, body.action.startsWith("list") ? 60 : 20))) return json({ error: "rate_limited" }, 429);

  try {
    const { data: conn } = await admin.from("integration_connections").select("status, connected_at").eq("owner_user_id", ownerId).maybeSingle();
    const connected = conn?.status === "active";
    const meta = { connected, connected_at: connected ? conn?.connected_at ?? null : null, api_configured: apiConfigured(), can_charge: privileged };
    const listCols = "id, deal_id, lead_id, status, external_id, error_message, created_at, updated_at, snapshot";

    if (body.action === "list_for_lead") {
      const { data } = await admin.from("wiize_pay_charge_requests").select(listCols)
        .eq("owner_user_id", ownerId).eq("lead_id", body.lead_id).order("created_at", { ascending: false }).limit(50);
      return json({ charges: data || [], ...meta });
    }
    if (body.action === "list_all") {
      const { data } = await admin.from("wiize_pay_charge_requests").select(listCols)
        .eq("owner_user_id", ownerId).order("created_at", { ascending: false }).limit(1000);
      return json({ charges: data || [], ...meta });
    }

    if (!privileged) {
      await audit(ownerId, userId, `wiize_pay_charge_${body.action}`, "forbidden", req);
      return json({ error: "forbidden" }, 403);
    }

    if (body.action === "preview") {
      const b = await buildSnapshot(ownerId, body.deal_id);
      if (!b) return json({ error: "not_found" }, 404);
      return json({ snapshot: b.snapshot, ...meta });
    }

    if (body.action === "create") {
      if (!connected) return json({ error: "not_connected" }, 409);
      if (!apiConfigured()) return json({ error: "not_configured" }, 409);
      const { data: existing } = await admin.from("wiize_pay_charge_requests").select("*")
        .eq("owner_user_id", ownerId).eq("idempotency_key", body.idempotency_key).maybeSingle();
      if (existing) return json({ charge: existing, idempotent: true });

      const type = body.billing_type;
      if ((type === "recurring" || type === "installment") && body.payment_methods.length !== 1) {
        return json({ error: "validation", message: "Parcelado e recorrente aceitam uma única forma de pagamento." }, 400);
      }
      const doc = body.customer_document !== undefined ? onlyDigits(body.customer_document) : undefined;
      if (doc !== undefined && doc && ![11, 14].includes(doc.length)) {
        return json({ error: "validation", message: "CPF deve ter 11 dígitos e CNPJ 14." }, 400);
      }
      const b = await buildSnapshot(ownerId, body.deal_id, { billing_type: type, installments: body.installments, document: doc });
      if (!b) return json({ error: "not_found" }, 404);
      if (conn?.connected_at && new Date(b.deal.created_at) < new Date(conn.connected_at)) {
        return json({ error: "validation", message: "Vendas anteriores à conexão ficam só no controle interno." }, 409);
      }
      const docFinal = (b.snapshot.customer as any).document as string | null;
      if (!docFinal || ![11, 14].includes(docFinal.length)) {
        return json({ error: "validation", message: "Informe o CPF ou CNPJ do cliente." }, 400);
      }
      if (doc && doc !== onlyDigits((b.lead as any).document)) {
        await admin.from("leads").update({ document: doc }).eq("id", b.lead.id).eq("owner_user_id", ownerId);
      }
      const snapshot = { ...b.snapshot, payment: { methods: body.payment_methods, due_date: body.due_date } };

      const { data: row, error } = await admin.from("wiize_pay_charge_requests").insert({
        owner_user_id: ownerId, created_by: userId, lead_id: b.lead.id, deal_id: b.deal.id,
        snapshot, checksum: "pending", idempotency_key: body.idempotency_key, status: "draft",
      }).select("*").single();
      if (error) throw error;

      const token = await getAccessToken(ownerId);
      if (!token) {
        await admin.from("wiize_pay_charge_requests").update({ status: "error", error_message: "token_unavailable", updated_at: new Date().toISOString() }).eq("id", row.id);
        await audit(ownerId, userId, "wiize_pay_charge_create", "error", req, "token_unavailable");
        return json({ error: "token_unavailable", message: "A conexão com o Wiize Pay expirou. Reconecte em Integrações." }, 409);
      }
      // Fluxo Wiize Pay: 1) cliente  2) serviço/contrato  3) cobrança.
      // O cliente vai antes (com CPF/CNPJ) para a cobrança ser vinculada ao cadastro certo no Wiize Pay.
      await pushCustomer(token, b.lead, docFinal);
      const { resp, out, checksum } = await postCharge(token, row.id, snapshot);
      const checkoutUrl = safeCheckoutUrl(out.checkout_url);
      if (!resp.ok || typeof out.id !== "string" || !checkoutUrl) {
        const msg = providerMessage(out, resp.status);
        console.error(`wiize-pay create failed [${resp.status}]: ${JSON.stringify(out).slice(0, 400).replace(/wpat_[A-Za-z0-9_-]+/g, "***")}`);
        await admin.from("wiize_pay_charge_requests").update({ status: "error", checksum, error_message: msg, updated_at: new Date().toISOString() }).eq("id", row.id);
        await audit(ownerId, userId, "wiize_pay_charge_create", "error", req, msg);
        return json({ error: "wiize_pay_error", status: resp.status, message: msg }, 502);
      }
      const { data: upd } = await admin.from("wiize_pay_charge_requests").update({
        status: "awaiting_payment", checksum, external_id: out.id.slice(0, 200),
        checkout_url_expires_at: out.checkout_expires_at || new Date(Date.now() + 15 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id).select("*").single();
      await admin.from("lead_deals").update({
        billing_provider: "wiize_pay", billing_type: (b.snapshot.deal as any).type,
        installments: (b.snapshot.deal as any).type === "installment" ? (b.snapshot.deal as any).installments_or_months : null,
        wiize_pay_charge_id: row.id, payment_method: body.payment_methods.length === 1 ? body.payment_methods[0] : "wiize_pay",
      }).eq("id", b.deal.id).eq("owner_user_id", ownerId);
      await audit(ownerId, userId, "wiize_pay_charge_create", "ok", req);
      // checkout_url: devolvido, nunca gravado
      return json({ charge: upd, checkout_url: checkoutUrl, checkout_expires_at: upd?.checkout_url_expires_at });
    }

    // status / cancel / link
    const { data: ch } = await admin.from("wiize_pay_charge_requests").select("*").eq("id", body.id).maybeSingle();
    if (!ch || ch.owner_user_id !== ownerId) return json({ error: "not_found" }, 404);

    if (body.action === "link") {
      if (!ch.external_id || ["paid", "cancelled", "error"].includes(ch.status)) return json({ error: "validation", message: "Esta cobrança não aceita novo link." }, 409);
      const token = await getAccessToken(ownerId);
      if (!token) return json({ error: "token_unavailable", message: "Reconecte o Wiize Pay em Integrações." }, 409);
      const { resp, out } = await postCharge(token, ch.id, ch.snapshot as Record<string, unknown>);
      const checkoutUrl = safeCheckoutUrl(out.checkout_url);
      if (!resp.ok || !checkoutUrl) {
        if (resp.ok && out.status) {
          await admin.from("wiize_pay_charge_requests").update({ status: mapStatus(out.status), updated_at: new Date().toISOString() }).eq("id", ch.id);
        }
        return json({ error: "wiize_pay_error", status: resp.status, message: resp.ok ? "Cobrança já finalizada no Wiize Pay." : providerMessage(out, resp.status) }, 502);
      }
      await admin.from("wiize_pay_charge_requests").update({ checkout_url_expires_at: out.checkout_expires_at || null, updated_at: new Date().toISOString() }).eq("id", ch.id);
      await audit(ownerId, userId, "wiize_pay_charge_link", "ok", req);
      return json({ checkout_url: checkoutUrl, checkout_expires_at: out.checkout_expires_at || null });
    }

    if (body.action === "status") {
      if (!apiConfigured() || !ch.external_id) return json({ charge: ch });
      const token = await getAccessToken(ownerId);
      if (!token) return json({ charge: ch, warning: "token_unavailable" });
      const resp = await fetch(`${API_BASE}/v1/charges/${encodeURIComponent(ch.external_id)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) return json({ charge: ch, warning: `wiize_pay_http_${resp.status}` });
      const out = await resp.json().catch(() => ({}));
      const { data: upd } = await admin.from("wiize_pay_charge_requests")
        .update({ status: mapStatus(out.status), updated_at: new Date().toISOString() }).eq("id", ch.id).select("*").single();
      return json({ charge: upd });
    }

    // cancel
    if (["paid", "cancelled"].includes(ch.status)) return json({ error: "cannot_cancel" }, 409);
    if (apiConfigured() && ch.external_id) {
      const token = await getAccessToken(ownerId);
      if (!token) return json({ error: "token_unavailable" }, 409);
      const resp = await fetch(`${API_BASE}/v1/charges/${encodeURIComponent(ch.external_id)}/cancel`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) {
        const out = await resp.json().catch(() => ({}));
        await audit(ownerId, userId, "wiize_pay_charge_cancel", "error", req, providerMessage(out, resp.status));
        return json({ error: "wiize_pay_error", status: resp.status, message: providerMessage(out, resp.status) }, 502);
      }
    }
    const { data: upd } = await admin.from("wiize_pay_charge_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", ch.id).select("*").single();
    await audit(ownerId, userId, "wiize_pay_charge_cancel", "ok", req);
    return json({ charge: upd });
  } catch (e) {
    console.error("wiize-pay-charge", (e as Error)?.message);
    return json({ error: "internal_error" }, 500);
  }
});
