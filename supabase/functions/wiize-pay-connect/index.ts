// =============================================================
// WIIZE PAY — CONEXÃO DE CONTAS (Etapa 1 da integração)
// Self-contained: nenhum import de pasta compartilhada.
//
// Fluxo OAuth 2.0 Authorization Code + PKCE (S256):
//   start    → gera state + code_verifier (guardados só no backend)
//              e devolve a URL de autorização do Wiize Pay
//   callback → valida state (uso único, 10 min), troca o code por
//              tokens NO BACKEND, guarda tokens criptografados (AES-GCM)
//   status   → estado da conexão (nunca retorna tokens)
//   disconnect → revoga no Wiize Pay (se configurado), apaga tokens,
//              mantém histórico
//
// READY_FOR_WIIZE_PAY: as URLs do Wiize Pay NÃO são inventadas.
// Vêm de secrets: WIIZE_PAY_AUTHORIZE_URL, WIIZE_PAY_TOKEN_URL,
// WIIZE_PAY_REVOKE_URL (opcional), WIIZE_PAY_CLIENT_ID,
// WIIZE_PAY_CLIENT_SECRET. Sem elas, retorna "not_configured".
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENC_KEY = Deno.env.get("WIIZE_PAY_TOKEN_ENC_KEY") || "";
const AUTHORIZE_URL = Deno.env.get("WIIZE_PAY_AUTHORIZE_URL") || "";
const TOKEN_URL = Deno.env.get("WIIZE_PAY_TOKEN_URL") || "";
const REVOKE_URL = Deno.env.get("WIIZE_PAY_REVOKE_URL") || "";
const CLIENT_ID = Deno.env.get("WIIZE_PAY_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("WIIZE_PAY_CLIENT_SECRET") || "";

const ALLOWED_ORIGINS = [
  "https://wiize.com.br",
  "https://www.wiize.com.br",
  "https://wiize-lb2.lovable.app",
  "https://id-preview--ae163b9e-4bf7-4640-8610-ba24e81d17c4.lovable.app",
  "http://localhost:8080",
];
const SCOPES = ["crm.read", "contacts.read", "companies.read", "deals.read", "sales.read", "products.read"];
const CALLBACK_PATH = "/configuracoes/integracoes/wiize-pay/callback";

function safeUiTheme(value: unknown) {
  return value === "dark" ? "dark" : "light";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function isConfigured() {
  return !!(AUTHORIZE_URL && TOKEN_URL && CLIENT_ID && CLIENT_SECRET && ENC_KEY
    && AUTHORIZE_URL.startsWith("https://") && TOKEN_URL.startsWith("https://"));
}

// ---------- crypto ----------
const enc = new TextEncoder();
function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomToken(n = 32) { return b64url(crypto.getRandomValues(new Uint8Array(n))); }
async function sha256b64url(s: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
}
async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(ENC_KEY));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(plain)));
  return `${b64url(iv)}.${b64url(ct)}`;
}
function fromB64url(s: string) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
async function decrypt(payload: string) {
  const [iv, ct] = payload.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv) }, await aesKey(), fromB64url(ct));
  return new TextDecoder().decode(pt);
}

// ---------- helpers ----------
async function audit(ownerId: string, userId: string | null, action: string, status: string, req: Request, error?: string) {
  await admin.from("integration_export_audit_logs").insert({
    owner_user_id: ownerId, user_id: userId, action, status,
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    error_message: error ? error.slice(0, 300) : null,
    auth_method: "session",
  });
}

async function rateLimit(id: string, endpoint: string, max = 10) {
  const { data } = await admin.rpc("check_rate_limit", { p_identifier: id, p_endpoint: endpoint, p_max_requests: max, p_window_seconds: 60 });
  return data !== false;
}

function safeOrigin(o: unknown) {
  const s = typeof o === "string" ? o : "";
  return ALLOWED_ORIGINS.includes(s) ? s : ALLOWED_ORIGINS[0];
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

  let body: any = {};
  try {
    const text = await req.text();
    if (text.length > 4096) return json({ error: "payload_too_large" }, 413);
    body = text ? JSON.parse(text) : {};
  } catch { return json({ error: "invalid_json" }, 400); }
  const action = typeof body.action === "string" ? body.action : "";

  if (!(await rateLimit(`${userId}`, `wiize-pay-connect:${action}`))) return json({ error: "rate_limited" }, 429);

  try {
    if (action === "status") {
      const { data } = await admin.from("integration_connections")
        .select("status, scopes, connected_at, revoked_at, last_error, external_account_label")
        .eq("owner_user_id", ownerId).maybeSingle();
      return json({ configured: isConfigured(), ready_for_wiize_pay: !isConfigured(), connection: data || null, can_manage: privileged });
    }

    if (!privileged) {
      await audit(ownerId, userId, `wiize_pay_${action}`, "forbidden", req);
      return json({ error: "forbidden" }, 403);
    }

    if (action === "start") {
      if (!isConfigured()) return json({ error: "not_configured", ready_for_wiize_pay: true }, 409);
      const state = randomToken(32);
      const verifier = randomToken(48);
      const challenge = await sha256b64url(verifier);
      await admin.from("integration_oauth_states").delete().lt("expires_at", new Date().toISOString());
      const { error } = await admin.from("integration_oauth_states").insert({
        owner_user_id: ownerId, user_id: userId, state_hash: await sha256b64url(state),
        code_verifier_enc: await encrypt(verifier),
      });
      if (error) throw error;
      await admin.from("integration_connections").upsert(
        { owner_user_id: ownerId, provider: "wiize_pay", status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "owner_user_id" },
      );
      const redirectUri = `${safeOrigin(body.origin)}${CALLBACK_PATH}`;
      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", CLIENT_ID);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", SCOPES.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      // Preferência apenas visual. Não contém dados pessoais nem altera a segurança OAuth.
      url.searchParams.set("ui_theme", safeUiTheme(body.ui_theme));
      await audit(ownerId, userId, "wiize_pay_connect_start", "ok", req);
      return json({ authorize_url: url.toString() });
    }

    if (action === "callback") {
      if (!isConfigured()) return json({ error: "not_configured" }, 409);
      const code = typeof body.code === "string" ? body.code : "";
      const state = typeof body.state === "string" ? body.state : "";
      if (!code || !state || code.length > 512 || state.length > 128) return json({ error: "invalid_params" }, 400);
      const { data: st } = await admin.from("integration_oauth_states")
        .select("*").eq("state_hash", await sha256b64url(state)).maybeSingle();
      if (!st || st.used_at || new Date(st.expires_at) < new Date() || st.owner_user_id !== ownerId || st.user_id !== userId) {
        await audit(ownerId, userId, "wiize_pay_connect_callback", "invalid_state", req);
        return json({ error: "invalid_state" }, 400);
      }
      // uso único: marca antes de trocar
      const { data: claimed } = await admin.from("integration_oauth_states")
        .update({ used_at: new Date().toISOString() }).eq("id", st.id).is("used_at", null).select("id");
      if (!claimed?.length) return json({ error: "invalid_state" }, 400);

      const verifier = await decrypt(st.code_verifier_enc);
      const redirectUri = `${safeOrigin(body.origin)}${CALLBACK_PATH}`;
      const resp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, redirect_uri: redirectUri,
          client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code_verifier: verifier,
        }),
      });
      const tok = await resp.json().catch(() => ({}));
      if (!resp.ok || typeof tok.access_token !== "string") {
        await admin.from("integration_connections").update({ status: "error", last_error: `token_exchange_${resp.status}` }).eq("owner_user_id", ownerId);
        await audit(ownerId, userId, "wiize_pay_connect_callback", "error", req, `token_exchange_${resp.status}`);
        return json({ error: "token_exchange_failed" }, 502);
      }
      const expiresIn = Number(tok.expires_in) > 0 ? Number(tok.expires_in) : 3600;
      await admin.from("integration_connection_secrets").upsert({
        owner_user_id: ownerId, provider: "wiize_pay",
        access_token_enc: await encrypt(tok.access_token),
        refresh_token_enc: typeof tok.refresh_token === "string" ? await encrypt(tok.refresh_token) : null,
        access_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      const grantedScopes = typeof tok.scope === "string" ? tok.scope.split(" ").filter((s: string) => SCOPES.includes(s)) : SCOPES;
      await admin.from("integration_connections").update({
        status: "active", scopes: grantedScopes, connected_by: userId, connected_at: new Date().toISOString(),
        revoked_at: null, last_error: null, updated_at: new Date().toISOString(),
        external_account_label: typeof tok.account_name === "string" ? tok.account_name.slice(0, 120) : null,
      }).eq("owner_user_id", ownerId);
      await audit(ownerId, userId, "wiize_pay_connected", "ok", req);
      return json({ ok: true });
    }

    if (action === "disconnect") {
      const { data: sec } = await admin.from("integration_connection_secrets").select("*").eq("owner_user_id", ownerId).maybeSingle();
      if (sec && REVOKE_URL.startsWith("https://") && CLIENT_ID) {
        for (const [hint, enc_] of [["refresh_token", sec.refresh_token_enc], ["access_token", sec.access_token_enc]] as const) {
          if (!enc_) continue;
          try {
            await fetch(REVOKE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ token: await decrypt(enc_), token_type_hint: hint, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
            });
          } catch { /* segue: tokens locais serão apagados de qualquer forma */ }
        }
      }
      await admin.from("integration_connection_secrets").delete().eq("owner_user_id", ownerId);
      await admin.from("integration_oauth_states").delete().eq("owner_user_id", ownerId);
      await admin.from("integration_connections").update({
        status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("owner_user_id", ownerId);
      await audit(ownerId, userId, "wiize_pay_disconnected", "ok", req);
      return json({ ok: true });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (e) {
    await audit(ownerId, userId, `wiize_pay_${action}`, "error", req, (e as Error).message);
    return json({ error: "internal_error" }, 500);
  }
});
