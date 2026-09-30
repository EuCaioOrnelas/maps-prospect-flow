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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
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
