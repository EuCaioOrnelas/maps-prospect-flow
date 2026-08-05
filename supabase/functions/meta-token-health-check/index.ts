// Daily cron: validates all Meta WABA tokens. Only marks a connection as
// `disconnected` when Meta explicitly returns an auth error (OAuthException
// code 190 — invalid/expired token, revoked, password change, etc).
// Network errors, rate limits and transient failures NEVER disconnect the token,
// to avoid false positives (e.g. permanent/never-expiring tokens).
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Meta auth subcodes that mean the token is truly dead.
// Reference: https://developers.facebook.com/docs/graph-api/guides/error-handling
const HARD_AUTH_SUBCODES = new Set([
  458, // App not installed
  459, // Password changed
  460, // Password changed
  463, // Session expired
  464, // Untrusted device
  467, // Invalid access token
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: connections, error } = await supabase
    .from("user_waba_connections")
    .select("id, user_id, access_token, token_expires_at, display_phone_number, business_name, status")
    .neq("status", "disconnected");

  if (error) {
    console.error("[health-check] fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  let checked = 0;
  let disconnected = 0;
  let notified = 0;
  let skipped = 0;

  for (const conn of connections || []) {
    checked++;
    if (!conn.access_token) { skipped++; continue; }

    // Hard expiry by date (only when we actually know the expiry).
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      console.log(`[health-check] conn ${conn.id} expired by date`);
      await markDisconnected(supabase, conn, today);
      disconnected++;
      notified++;
      continue;
    }

    // Live check against Graph API.
    let isHardAuthFailure = false;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(conn.access_token)}`,
      );
      const body = await res.json().catch(() => ({} as any));
      if (res.ok && body?.id) {
        // OK — valid token, do nothing
      } else {
        const err = body?.error;
        const code = err?.code;
        const subcode = err?.error_subcode;
        const type = err?.type;
        // Treat ONLY genuine OAuth/auth errors as a disconnection.
        if (code === 190 || type === "OAuthException" || HARD_AUTH_SUBCODES.has(subcode)) {
          // Even with OAuthException, ignore transient ones (e.g. rate limited subcodes)
          if (subcode && !HARD_AUTH_SUBCODES.has(subcode) && code !== 190) {
            console.warn(`[health-check] conn ${conn.id} OAuthException subcode ${subcode} — treating as transient`);
          } else {
            isHardAuthFailure = true;
          }
        } else {
          console.warn(`[health-check] conn ${conn.id} non-auth error (code=${code} type=${type}) — leaving connected`);
        }
      }
    } catch (e) {
      // Network/timeout — NEVER disconnect on this.
      console.error(`[health-check] conn ${conn.id} network error (ignored):`, e);
    }

    if (isHardAuthFailure) {
      console.log(`[health-check] conn ${conn.id} hard auth failure → disconnecting`);
      await markDisconnected(supabase, conn, today);
      disconnected++;
      notified++;
    }
  }

  console.log(`[health-check] done: checked=${checked} skipped=${skipped} disconnected=${disconnected} notified=${notified}`);
  return new Response(
    JSON.stringify({ checked, disconnected, notified }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function markDisconnected(supabase: any, conn: any, today: string) {
  await supabase.from("user_waba_connections").update({ status: "disconnected" }).eq("id", conn.id);
  try {
    await supabase.functions.invoke("send-email", {
      body: {
        user_id: conn.user_id,
        email_type: "META_NUMBER_DISCONNECTED",
        idempotency_key: `meta-disconnect-${conn.id}-${today}`,
        meta_pref_key: "notify_number_disconnected",
        payload: { phone_number: conn.display_phone_number, business_name: conn.business_name },
      },
    });
  } catch (e) {
    console.error(`[health-check] email error for ${conn.id}:`, e);
  }
}
