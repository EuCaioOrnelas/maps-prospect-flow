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
const API_BASE = (Deno.env.get("WIIZE_PAY_API_BASE_URL") || "").replace(/\/+$/, "");
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
  return data !== false;
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
  if (["pending", "awaiting_payment", "open", "overdue"].includes(v)) return "awaiting_payment";
  if (["failed", "error"].includes(v)) return "error";
  return "sent";
};

const METHODS = ["pix", "boleto", "credit_card"] as const;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), deal_id: z.string().uuid() }),
  z.object({
    action: z.literal("create"), deal_id: z.string().uuid(), idempotency_key: z.string().min(8).max(100),
    payment_methods: z.array(z.enum(METHODS)).min(1).max(3),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({ action: z.literal("status"), id: z.string().uuid() }),
  z.object({ action: z.literal("cancel"), id: z.string().uuid() }),
  z.object({ action: z.literal("list_for_lead"), lead_id: z.string().uuid() }),
]);

async function buildSnapshot(ownerId: string, dealId: string) {
  const { data: deal } = await admin.from("lead_deals")
    .select("id, lead_id, owner_user_id, title, description, value, sale_type, contract_months, start_date, expiration_date, status")
    .eq("id", dealId).maybeSingle();
  if (!deal || deal.owner_user_id !== ownerId) return null;
  const { data: lead } = await admin.from("leads")
    .select("id, company_name, contact_name, email, phone, city, owner_user_id").eq("id", deal.lead_id).maybeSingle();
  if (!lead || (lead as any).owner_user_id !== ownerId) return null;
  const months = deal.sale_type === "recurring" ? Math.max(1, deal.contract_months || 1) : 1;
  const amountCents = Math.round(Number(deal.value) * 100);
  return {
    schema_version: "1.0",
    source: "wiize_crm",
    deal: {
      id: deal.id, title: deal.title || "Venda", description: deal.description || null,
      type: deal.sale_type === "recurring" ? "recurring" : "one_time",
      amount_cents: amountCents, currency: "BRL", installments_or_months: months,
      total_cents: amountCents * months, start_date: deal.start_date, end_date: deal.expiration_date,
    },
    customer: {
      lead_id: lead.id, company_name: lead.company_name, contact_name: lead.contact_name,
      email: lead.email, phone: lead.phone, city: lead.city,
    },
  };
}

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
  const role: string = (prof as any)?.account_role || "owner";
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

  if (!(await rateLimit(userId, `wiize-pay-charge:${body.action}`))) return json({ error: "rate_limited" }, 429);

  try {
    const { data: conn } = await admin.from("integration_connections").select("status").eq("owner_user_id", ownerId).maybeSingle();
    const connected = conn?.status === "active";

    if (body.action === "list_for_lead") {
      const { data } = await admin.from("wiize_pay_charge_requests")
        .select("id, deal_id, status, external_id, error_message, created_at, updated_at, snapshot")
        .eq("owner_user_id", ownerId).eq("lead_id", body.lead_id).order("created_at", { ascending: false }).limit(50);
      return json({ charges: data || [], connected, api_configured: apiConfigured(), can_charge: privileged });
    }

    if (!privileged) {
      await audit(ownerId, userId, `wiize_pay_charge_${body.action}`, "forbidden", req);
      return json({ error: "forbidden" }, 403);
    }

    if (body.action === "preview") {
      const snap = await buildSnapshot(ownerId, body.deal_id);
      if (!snap) return json({ error: "not_found" }, 404);
      return json({ snapshot: snap, connected, api_configured: apiConfigured() });
    }

    if (body.action === "create") {
      if (!connected) return json({ error: "not_connected" }, 409);
      const { data: existing } = await admin.from("wiize_pay_charge_requests").select("*")
        .eq("owner_user_id", ownerId).eq("idempotency_key", body.idempotency_key).maybeSingle();
      if (existing) return json({ charge: existing, idempotent: true });

      const base = await buildSnapshot(ownerId, body.deal_id);
      if (!base) return json({ error: "not_found" }, 404);
      const snapshot = { ...base, payment: { methods: body.payment_methods, due_date: body.due_date } };
      const checksum = await sha256hex(JSON.stringify(snapshot));

      const { data: row, error } = await admin.from("wiize_pay_charge_requests").insert({
        owner_user_id: ownerId, created_by: userId, lead_id: base.customer.lead_id, deal_id: base.deal.id,
        snapshot, checksum, idempotency_key: body.idempotency_key,
        status: apiConfigured() ? "draft" : "awaiting_wiize_pay",
      }).select("*").single();
      if (error) throw error;

      if (!apiConfigured()) {
        await audit(ownerId, userId, "wiize_pay_charge_create", "ready_for_wiize_pay", req);
        return json({ charge: row, ready_for_wiize_pay: true });
      }

      const token = await getAccessToken(ownerId);
      if (!token) {
        await admin.from("wiize_pay_charge_requests").update({ status: "error", error_message: "token_unavailable", updated_at: new Date().toISOString() }).eq("id", row.id);
        await audit(ownerId, userId, "wiize_pay_charge_create", "error", req, "token_unavailable");
        return json({ error: "token_unavailable" }, 409);
      }
      const resp = await fetch(`${API_BASE}/v1/charges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json",
          "Idempotency-Key": row.id, "X-Wiize-Checksum": checksum,
        },
        body: JSON.stringify({ external_reference: row.id, ...snapshot }),
      });
      const out = await resp.json().catch(() => ({}));
      const checkoutUrl = safeCheckoutUrl(out.checkout_url);
      if (!resp.ok || typeof out.id !== "string" || !checkoutUrl) {
        const msg = `wiize_pay_http_${resp.status}`;
        await admin.from("wiize_pay_charge_requests").update({ status: "error", error_message: msg, updated_at: new Date().toISOString() }).eq("id", row.id);
        await audit(ownerId, userId, "wiize_pay_charge_create", "error", req, msg);
        return json({ error: "wiize_pay_error" }, 502);
      }
      const { data: upd } = await admin.from("wiize_pay_charge_requests").update({
        status: "sent", external_id: out.id.slice(0, 200),
        checkout_url_expires_at: out.checkout_expires_at || new Date(Date.now() + 15 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id).select("*").single();
      await audit(ownerId, userId, "wiize_pay_charge_create", "ok", req);
      // checkout_url é de uso único: devolvido uma vez, nunca gravado
      return json({ charge: upd, checkout_url: checkoutUrl });
    }

    // status / cancel
    const { data: ch } = await admin.from("wiize_pay_charge_requests").select("*").eq("id", body.id).maybeSingle();
    if (!ch || ch.owner_user_id !== ownerId) return json({ error: "not_found" }, 404);

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
        await audit(ownerId, userId, "wiize_pay_charge_cancel", "error", req, `wiize_pay_http_${resp.status}`);
        return json({ error: "wiize_pay_error" }, 502);
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
