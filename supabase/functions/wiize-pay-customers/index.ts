import { createClient } from "npm:@supabase/supabase-js@2.49.1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENC_KEY = Deno.env.get("WIIZE_PAY_TOKEN_ENC_KEY") || "";
const API_BASE = (Deno.env.get("WIIZE_PAY_API_BASE_URL") || "").replace(/\/+$/, "");
const TOKEN_URL = Deno.env.get("WIIZE_PAY_TOKEN_URL") || "";
const CLIENT_ID = Deno.env.get("WIIZE_PAY_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("WIIZE_PAY_CLIENT_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
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
async function getAccessToken(ownerId: string, force = false): Promise<string | null> {
  const { data: sec } = await admin.from("integration_connection_secrets").select("*").eq("owner_user_id", ownerId).maybeSingle();
  if (!sec?.access_token_enc) return null;
  const exp = sec.access_expires_at ? new Date(sec.access_expires_at).getTime() : 0;
  if (!force && exp - Date.now() > 60_000) return decrypt(sec.access_token_enc);
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

// =============================================================
// WIIZE PAY — SINCRONIZAÇÃO DE CLIENTES (CRM → Wiize Pay)
// POST {WIIZE_PAY_API_BASE_URL}/customers  { customers: [...] } (lotes de até 100)
// actions: process_queue (gatilho interno, x-cron-secret) | sync_all (botão) | status
// =============================================================
const BATCH = 100;
const MAX_ATTEMPTS = 8;
const clean = (v: unknown, max = 255) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
};
const digits = (v: unknown) => { const d = String(v ?? "").replace(/\D/g, ""); return d || undefined; };

function toCustomer(l: any) {
  const name = clean(l.company_name) || clean(l.contact_name) || clean(l.email) || clean(l.phone) || "Cliente";
  const c: Record<string, string> = { id: l.id, name };
  const opt: Record<string, string | undefined> = {
    trade_name: l.company_name && l.contact_name ? clean(l.contact_name) : undefined,
    email: clean(l.email), phone: digits(l.phone), document: digits(l.document),
    address: clean(l.address, 500), city: clean(l.city),
    state: l.region && String(l.region).trim().length === 2 ? String(l.region).trim().toUpperCase() : undefined,
  };
  for (const [k, v] of Object.entries(opt)) if (v) c[k] = v;
  return c;
}

/** Envia um lote. Renova o token e tenta de novo em 401; repete falhas temporárias. */
async function sendBatch(ownerId: string, customers: Record<string, string>[]): Promise<{ ok: boolean; error?: string }> {
  let lastErr = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    const token = await getAccessToken(ownerId, attempt > 0 && lastErr === "http_401");
    if (!token) return { ok: false, error: "token_unavailable" };
    try {
      const resp = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ customers }),
        signal: AbortSignal.timeout(20_000),
      });
      await resp.text().catch(() => "");
      if (resp.ok) return { ok: true };
      lastErr = `http_${resp.status}`;
      if (resp.status !== 401 && resp.status !== 429 && resp.status < 500) return { ok: false, error: lastErr };
    } catch (e) {
      lastErr = e instanceof Error ? e.name : "network_error";
    }
  }
  return { ok: false, error: lastErr };
}

async function processOwner(ownerId: string, deadline: number) {
  let sent = 0, failed = 0;
  while (Date.now() < deadline) {
    const { data: q } = await admin.from("wiize_pay_customer_sync_queue").select("lead_id, attempts")
      .eq("owner_user_id", ownerId).lte("next_attempt_at", new Date().toISOString())
      .order("created_at").limit(BATCH);
    if (!q?.length) break;
    const ids = q.map((r: any) => r.lead_id);
    const { data: leads } = await admin.from("leads")
      .select("id, company_name, contact_name, email, phone, document, address, city, region, owner_user_id")
      .in("id", ids).eq("owner_user_id", ownerId);
    const found = new Set((leads || []).map((l: any) => l.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) await admin.from("wiize_pay_customer_sync_queue").delete().in("lead_id", missing);
    if (!leads?.length) continue;
    const res = await sendBatch(ownerId, leads.map(toCustomer));
    const sentIds = leads.map((l: any) => l.id);
    if (res.ok) {
      await admin.from("wiize_pay_customer_sync_queue").delete().in("lead_id", sentIds);
      sent += sentIds.length;
    } else {
      const attempts = Math.max(...q.map((r: any) => r.attempts)) + 1;
      const now = new Date().toISOString();
      if (attempts >= MAX_ATTEMPTS) {
        // Desiste após várias tentativas; volta a enviar na próxima edição ou no botão Sincronizar.
        await admin.from("wiize_pay_customer_sync_queue").delete().in("lead_id", sentIds);
      } else {
        const delayMin = Math.min(60, 2 ** attempts);
        await admin.from("wiize_pay_customer_sync_queue").update({
          attempts, last_error: res.error, updated_at: now,
          next_attempt_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
        }).in("lead_id", sentIds);
      }
      failed += sentIds.length;
      break; // não insiste neste ciclo; reenvio agendado
    }
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!API_BASE.startsWith("https://") || !ENC_KEY) return json({ error: "not_configured" }, 503);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const deadline = Date.now() + 45_000;

  if (action === "process_queue") {
    const supplied = req.headers.get("x-cron-secret") || "";
    const { data: cfg } = await admin.from("wiize_pay_sync_config").select("cron_secret").eq("id", 1).maybeSingle();
    if (!supplied || !cfg?.cron_secret || supplied !== cfg.cron_secret) return json({ error: "unauthorized" }, 401);
    const { data: owners } = await admin.from("wiize_pay_customer_sync_queue").select("owner_user_id")
      .lte("next_attempt_at", new Date().toISOString()).limit(1000);
    const unique = [...new Set((owners || []).map((o: any) => o.owner_user_id))];
    let sent = 0, failed = 0;
    for (const ownerId of unique) {
      if (Date.now() > deadline) break;
      const { data: conn } = await admin.from("integration_connections").select("status").eq("owner_user_id", ownerId).maybeSingle();
      if (conn?.status !== "active") { await admin.from("wiize_pay_customer_sync_queue").delete().eq("owner_user_id", ownerId); continue; }
      const r = await processOwner(ownerId, deadline);
      sent += r.sent; failed += r.failed;
    }
    return json({ ok: true, sent, failed });
  }

  // Ações do usuário
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const userId = u.user.id;
  const { data: prof } = await admin.from("profiles").select("account_role, parent_owner_id").eq("id", userId).maybeSingle();
  const ownerId: string = (prof as any)?.parent_owner_id || userId;
  const role: string = (prof as any)?.account_role || "owner";

  const { data: conn } = await admin.from("integration_connections").select("status").eq("owner_user_id", ownerId).maybeSingle();
  if (conn?.status !== "active") return json({ error: "not_connected" }, 409);

  if (action === "status") {
    const { count: pending } = await admin.from("wiize_pay_customer_sync_queue").select("lead_id", { count: "exact", head: true }).eq("owner_user_id", ownerId);
    const { count: total } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", ownerId);
    return json({ pending: pending || 0, total: total || 0 });
  }

  if (action === "sync_all") {
    if (role !== "owner" && role !== "admin") return json({ error: "forbidden" }, 403);
    if (!(await rateLimit(ownerId, "wiize_pay_customers_sync_all", 5))) return json({ error: "rate_limited" }, 429);
    // Coloca TODOS os clientes (inclusive os antigos) na fila, em páginas de 1000.
    let from = 0, queued = 0;
    for (;;) {
      const { data: page } = await admin.from("leads").select("id").eq("owner_user_id", ownerId).order("created_at").range(from, from + 999);
      if (!page?.length) break;
      const now = new Date().toISOString();
      await admin.from("wiize_pay_customer_sync_queue").upsert(
        page.map((l: any) => ({ lead_id: l.id, owner_user_id: ownerId, attempts: 0, next_attempt_at: now, last_error: null, updated_at: now })),
        { onConflict: "lead_id" },
      );
      queued += page.length;
      if (page.length < 1000) break;
      from += 1000;
    }
    const r = await processOwner(ownerId, deadline);
    await audit(ownerId, userId, "wiize_pay_customers_sync_all", r.failed ? "partial" : "ok", req);
    const { count: pending } = await admin.from("wiize_pay_customer_sync_queue").select("lead_id", { count: "exact", head: true }).eq("owner_user_id", ownerId);
    // Se sobrou (muitos clientes), o processamento continua em segundo plano.
    if ((pending || 0) > 0 && !r.failed) await admin.rpc("wiize_pay_wake_customer_sync" as any).then(() => {}, () => {});
    return json({ ok: !r.failed, queued, sent: r.sent, failed: r.failed, pending: pending || 0 });
  }

  return json({ error: "invalid_action" }, 400);
});
