// Portal Proxy — Admin-only backend proxy for the Developer Portal Playground.
// Purpose: keep INTEGRATION_WIAN_CLIENT_ID/SECRET OUT of the browser.
// Flow: Admin browser (JWT) -> this proxy -> integration-v1-context|provider -> Provider
// Auth: verifies the caller's Supabase JWT belongs to an admin (has_role admin) via service role.
// Never accepts client_id/client_secret from the request body/headers.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLIENT_ID = Deno.env.get("INTEGRATION_WIAN_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("INTEGRATION_WIAN_CLIENT_SECRET") ?? "";

const ALLOWED_TARGETS = new Set(["integration-v1-context", "integration-v1-provider"]);

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Extract caller JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7).trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);

  // 2. Verify caller is an admin (service role bypasses RLS on user_roles)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) return json({ error: "auth_check_failed" }, 500);
  if (!roleRow) return json({ error: "forbidden", reason: "not_admin" }, 403);

  // 3. Parse & validate proxy payload
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const target = String(payload?.target ?? "");
  const body = payload?.body ?? {};
  const bypassCache = !!payload?.bypass_cache;

  if (!ALLOWED_TARGETS.has(target)) return json({ error: "invalid_target" }, 400);
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: "server_misconfigured", reason: "integration_credentials_missing" }, 500);

  // 4. Forward to internal integration endpoint with backend-held credentials
  const targetUrl = `${SUPABASE_URL}/functions/v1/${target}`;
  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${jwt}`,                 // caller JWT preserved (Integration API expects it)
    "apikey": ANON_KEY,
    "x-integration-client-id": CLIENT_ID,             // injected server-side, NEVER from browser
    "x-integration-client-secret": CLIENT_SECRET,
    "x-integration-source": "portal-proxy",
  };
  if (bypassCache) forwardHeaders["x-integration-cache-bypass"] = "true";

  const started = performance.now();
  let upstreamStatus = 0;
  let upstreamJson: any = null;
  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(body ?? {}),
    });
    upstreamStatus = upstream.status;
    upstreamJson = await upstream.json().catch(() => ({ error: "invalid_upstream_response" }));
  } catch (e) {
    return json({ error: "upstream_unreachable", detail: (e as Error).message }, 502);
  }
  const elapsed = Math.round(performance.now() - started);

  return json({
    proxy: { target, elapsed_ms: elapsed, upstream_status: upstreamStatus },
    response: upstreamJson,
  }, upstreamStatus === 0 ? 500 : 200);
});
