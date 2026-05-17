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
        .select("id, user_id, waba_id, access_token")
        .eq("id", connectionId)
        .maybeSingle();
      if (connErr || !conn || conn.user_id !== userId) {
        return json({ error: "connection not found" }, 404);
      }

      // ---------- 1) Handshake real contra o webhook ----------
      const challenge = `lov-${crypto.randomUUID().slice(0, 12)}`;
      const handshakeUrl = `${CALLBACK_URL}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        VERIFY_TOKEN
      )}&hub.challenge=${challenge}`;

      let handshakeOk = false;
      let handshakeDetail = "";
      try {
        const r = await fetch(handshakeUrl, { method: "GET" });
        const text = await r.text();
        handshakeOk = r.status === 200 && text.trim() === challenge;
        handshakeDetail = handshakeOk ? "ok" : `status=${r.status} body=${text.slice(0, 80)}`;
      } catch (e) {
        handshakeDetail = `fetch error: ${(e as Error).message}`;
      }

      // ---------- 2) Verifica eventos inscritos na WABA via Graph API ----------
      // Faz 1 GET para descobrir quais dos 9 eventos obrigatórios estão inscritos no número do usuário.
      // Se algum estiver faltando, tenta inscrever automaticamente em 1 POST e re-verifica.
      let subscribedEvents: string[] = [];
      let missingEvents: string[] = [...REQUIRED_EVENTS];
      let eventsDetail = "";
      let eventsOk = false;

      async function fetchSubscribedFields(): Promise<string[] | null> {
        try {
          const r = await fetch(
            `https://graph.facebook.com/v21.0/${conn.waba_id}/subscribed_apps?access_token=${encodeURIComponent(conn.access_token)}`,
            { method: "GET" }
          );
          const data = await r.json();
          if (!r.ok) {
            eventsDetail = `graph status=${r.status} ${JSON.stringify(data?.error || data).slice(0, 160)}`;
            return null;
          }
          const apps: any[] = Array.isArray(data?.data) ? data.data : [];
          // Une todos os subscribed_fields de qualquer app inscrito (normalmente é só o nosso).
          const fields = new Set<string>();
          for (const app of apps) {
            const arr: any[] = Array.isArray(app?.subscribed_fields) ? app.subscribed_fields : [];
            for (const f of arr) {
              // pode vir como string ou objeto { name }
              const name = typeof f === "string" ? f : f?.name;
              if (name) fields.add(String(name));
            }
          }
          return Array.from(fields);
        } catch (e) {
          eventsDetail = `graph fetch error: ${(e as Error).message}`;
          return null;
        }
      }

      if (!conn.access_token) {
        eventsDetail = "Sem access_token salvo para esta conexão. Reconecte o número.";
      } else {
        let fields = await fetchSubscribedFields();

        // Se algum dos 9 está faltando, tenta inscrever automaticamente e re-verifica.
        if (fields) {
          const present = new Set(fields);
          const missing = REQUIRED_EVENTS.filter((e) => !present.has(e));
          if (missing.length > 0) {
            try {
              await fetch(
                `https://graph.facebook.com/v21.0/${conn.waba_id}/subscribed_apps`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    access_token: conn.access_token,
                    subscribed_fields: REQUIRED_EVENTS,
                  }),
                }
              );
            } catch (_) { /* ignore — re-fetch valida abaixo */ }
            fields = await fetchSubscribedFields();
          }
        }

        if (fields) {
          const present = new Set(fields);
          subscribedEvents = REQUIRED_EVENTS.filter((e) => present.has(e));
          missingEvents = REQUIRED_EVENTS.filter((e) => !present.has(e));
          eventsOk = missingEvents.length === 0;
          if (!eventsOk) {
            eventsDetail = `Faltando ${missingEvents.length}/${REQUIRED_EVENTS.length}: ${missingEvents.join(", ")}`;
          } else {
            eventsDetail = `Todos os ${REQUIRED_EVENTS.length} eventos inscritos`;
          }
        }
      }

      const ok = handshakeOk && eventsOk;
      const detail = ok
        ? `Handshake ok + ${REQUIRED_EVENTS.length}/${REQUIRED_EVENTS.length} eventos inscritos`
        : !handshakeOk
          ? `Handshake falhou (${handshakeDetail})`
          : eventsDetail || "Eventos não validados";

      // Só marca como verificado se TUDO estiver ok
      if (ok) {
        await admin
          .from("user_waba_connections")
          .update({ webhook_verified_at: new Date().toISOString() })
          .eq("id", connectionId);
      } else {
        // Limpa marcação anterior — não queremos status "verde" se algo regrediu
        await admin
          .from("user_waba_connections")
          .update({ webhook_verified_at: null })
          .eq("id", connectionId);
      }

      return json({
        ok,
        detail,
        handshake: { ok: handshakeOk, detail: handshakeDetail },
        events: {
          required: REQUIRED_EVENTS,
          subscribed: subscribedEvents,
          missing: missingEvents,
          ok: eventsOk,
        },
      });
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
      required_events: REQUIRED_EVENTS,
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
