import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "wiize-meta-webhook-2026";

// Callback fixo no banco externo do usuário (projeto lqfqnqfeuneorxocybru).
// Pode ser sobrescrito via env META_WEBHOOK_CALLBACK_URL.
const CALLBACK_URL =
  Deno.env.get("META_WEBHOOK_CALLBACK_URL") ??
  "https://lqfqnqfeuneorxocybru.supabase.co/functions/v1/meta-webhook";

// Lista canônica de eventos obrigatórios para o sistema funcionar (chat, campanhas, métricas).
const REQUIRED_EVENTS = [
  "messages",
  "message_template_status_update",
  "message_template_quality_update",
  "account_update",
  "account_review_update",
  "phone_number_quality_update",
  "phone_number_name_update",
  "business_capability_update",
  "security",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (!claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "info";

    // -------- VALIDATE handshake against the live webhook --------
    if (action === "validate") {
      const connectionId: string | undefined = body.connection_id;
      if (!connectionId) return json({ error: "connection_id required" }, 400);

      // Ensure connection belongs to user
      const { data: conn, error: connErr } = await admin
        .from("user_waba_connections")
        .select("id, user_id")
        .eq("id", connectionId)
        .maybeSingle();
      if (connErr || !conn || conn.user_id !== userId) {
        return json({ error: "connection not found" }, 404);
      }

      const challenge = `lov-${crypto.randomUUID().slice(0, 12)}`;
      const url = `${CALLBACK_URL}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        VERIFY_TOKEN
      )}&hub.challenge=${challenge}`;

      let ok = false;
      let detail = "";
      try {
        const r = await fetch(url, { method: "GET" });
        const text = await r.text();
        ok = r.status === 200 && text.trim() === challenge;
        detail = ok ? "Handshake ok" : `status=${r.status} body=${text.slice(0, 80)}`;
      } catch (e) {
        detail = `fetch error: ${(e as Error).message}`;
      }

      if (ok) {
        await admin
          .from("user_waba_connections")
          .update({ webhook_verified_at: new Date().toISOString() })
          .eq("id", connectionId);
      }

      return json({ ok, detail });
    }

    // -------- DEFAULT: return URL + token + connections list --------
    const { data: connections } = await admin
      .from("user_waba_connections")
      .select("id, display_phone_number, business_name, status, webhook_verified_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    return json({
      callback_url: CALLBACK_URL,
      verify_token: VERIFY_TOKEN,
      connections: connections ?? [],
    });
  } catch (e) {
    console.error("[meta-webhook-config] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
