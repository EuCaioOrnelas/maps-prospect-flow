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
const GRAPH_VERSION = "v21.0";

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

type StepStatus = "ok" | "warning" | "error" | "skipped";
type DiagnosticStep = {
  key: string;
  label: string;
  status: StepStatus;
  summary: string;
  details?: string[];
  technical?: string;
  fbtrace_id?: string;
};

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type GraphResult = {
  ok: boolean;
  status: number;
  data: any;
  error: GraphError | null;
  raw: string;
};

function redact(value: string, token?: string | null) {
  let out = value;
  if (token) out = out.split(token).join("***TOKEN***");
  return out.replace(/access_token=([^&\s"]+)/g, "access_token=***TOKEN***");
}

async function graphRequest(
  path: string,
  token: string,
  opts: { method?: "GET" | "POST"; params?: Record<string, string>; body?: Record<string, unknown> } = {}
): Promise<GraphResult> {
  const method = opts.method ?? "GET";
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(opts.params ?? {})) url.searchParams.set(k, v);
  const init: RequestInit = { method };

  if (method === "GET") {
    url.searchParams.set("access_token", token);
  } else {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ access_token: token, ...(opts.body ?? {}) });
  }

  try {
    const response = await fetch(url.toString(), init);
    const text = redact(await response.text(), token).slice(0, 1200);
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const error = (data?.error ?? (!response.ok ? { message: text } : null)) as GraphError | null;
    return { ok: response.ok && !error, status: response.status, data, error, raw: text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: { message: (e as Error).message, type: "FetchError" },
      raw: (e as Error).message,
    };
  }
}

function explainGraphError(error: GraphError | null, status: number, context: "token" | "waba" | "phone" | "subscribe" | "events", ids: { wabaId?: string | null; phoneNumberId?: string | null }) {
  const msg = error?.message ?? "Erro desconhecido da Graph API";
  const lower = msg.toLowerCase();
  const code = error?.code;

  if (code === 190) {
    return {
      title: "Access token inválido ou expirado",
      cause: "A Graph rejeitou o token antes de validar a WABA.",
      action: "Gere um novo token do System User com business_management, whatsapp_business_management e whatsapp_business_messaging, depois reconecte o número na Wiize.",
    };
  }

  if (status === 403 || code === 200 || lower.includes("permission")) {
    return {
      title: "Permissão insuficiente no token ou no App",
      cause: "O token existe, mas não tem acesso de gerenciamento à WABA/App para instalar webhook.",
      action: "No Business Manager, dê Controle total ao System User no App e na Conta do WhatsApp, gere outro token marcando whatsapp_business_management e conecte novamente.",
    };
  }

  if (code === 100 && lower.includes("subscribed_apps")) {
    const sameId = ids.wabaId && ids.phoneNumberId && ids.wabaId === ids.phoneNumberId;
    return {
      title: sameId ? "WABA ID está igual ao Phone Number ID" : "ID usado não aceita subscribed_apps",
      cause: "O endpoint /subscribed_apps só funciona no ID da Conta do WhatsApp Business (WABA). Esse erro aparece quando foi salvo Phone Number ID, App ID, Business ID ou um objeto sem esse campo.",
      action: "Reconecte usando o ID da Conta do WhatsApp Business. Não use o ID do número aprovado. Se o ID estiver correto, vincule o App à WABA em Contas do WhatsApp → Apps e gere novo token.",
    };
  }

  if (code === 100 || lower.includes("unsupported get request") || lower.includes("object does not exist")) {
    return {
      title: context === "waba" ? "WABA ID inválido ou sem acesso" : "ID inválido ou sem acesso",
      cause: "A Graph não conseguiu abrir esse objeto com o token atual.",
      action: "Confira se o ID salvo como WABA ID é a Conta do WhatsApp Business e se o System User tem Controle total nela.",
    };
  }

  if (context === "events") {
    return {
      title: "Não foi possível listar os eventos inscritos",
      cause: "A assinatura pode existir, mas a Graph não retornou a lista de subscribed_fields.",
      action: "Confira manualmente no App da Meta se todos os Webhook fields estão marcados. O teste ainda tenta instalar a assinatura via POST.",
    };
  }

  return {
    title: "Erro inesperado da Graph API",
    cause: msg,
    action: "Refaça o token e valide se o App, WABA e número pertencem ao mesmo Business Manager.",
  };
}

function graphTechnical(r: GraphResult, token?: string | null) {
  const e = r.error;
  const err = e ? ` ${JSON.stringify(e)}` : ` ${r.raw}`;
  return redact(`graph status=${r.status}${err}`, token).slice(0, 500);
}

function parseSubscribedFields(apps: any[]) {
  const fields = new Set<string>();
  for (const app of apps) {
    const arr: any[] = Array.isArray(app?.subscribed_fields) ? app.subscribed_fields : [];
    for (const f of arr) {
      const name = typeof f === "string" ? f : f?.name;
      if (name) fields.add(String(name));
    }
  }
  return Array.from(fields);
}

function parseSubscribedAppLabels(apps: any[]) {
  return apps
    .map((app) => {
      const data = app?.whatsapp_business_api_data ?? app;
      const label = data?.name || data?.id || app?.id;
      return label ? String(label) : null;
    })
    .filter(Boolean) as string[];
}

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
        .select("id, user_id, waba_id, phone_number_id, display_phone_number, business_name, status, access_token")
        .eq("id", connectionId)
        .maybeSingle();
      if (connErr || !conn || conn.user_id !== userId) {
        return json({ error: "connection not found" }, 404);
      }

      const diagnostics: DiagnosticStep[] = [];
      let mainIssue: ReturnType<typeof explainGraphError> | null = null;
      const ids = { wabaId: conn.waba_id, phoneNumberId: conn.phone_number_id };

      const pushStep = (step: DiagnosticStep) => diagnostics.push(step);
      const setIssueFrom = (r: GraphResult, context: "token" | "waba" | "phone" | "subscribe" | "events") => {
        if (!mainIssue) mainIssue = explainGraphError(r.error, r.status, context, ids);
      };

      pushStep({
        key: "saved_ids",
        label: "IDs salvos na Wiize",
        status: !conn.access_token || !conn.waba_id ? "error" : conn.phone_number_id && conn.phone_number_id === conn.waba_id ? "warning" : "ok",
        summary: !conn.access_token
          ? "Esta conexão não tem access token salvo."
          : !conn.waba_id
            ? "Esta conexão não tem WABA ID salvo."
            : conn.phone_number_id && conn.phone_number_id === conn.waba_id
              ? "O WABA ID salvo está igual ao Phone Number ID; isso geralmente está errado."
              : "WABA ID, Phone Number ID e token existem na conexão.",
        details: [
          `WABA ID salvo: ${conn.waba_id || "—"}`,
          `Phone Number ID salvo: ${conn.phone_number_id || "—"}`,
          `Número: ${conn.display_phone_number || "—"}`,
        ],
      });

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

      pushStep({
        key: "callback_handshake",
        label: "Callback URL e Verify Token",
        status: handshakeOk ? "ok" : "error",
        summary: handshakeOk ? "A URL respondeu o challenge corretamente." : "A Callback URL não respondeu o challenge esperado.",
        technical: handshakeDetail,
      });

      // ---------- 2) Diagnóstico completo contra a Graph API ----------
      let subscribedEvents: string[] = [];
      let missingEvents: string[] = [...REQUIRED_EVENTS];
      let eventsDetail = "";
      let eventsOk = false;
      let tokenOk = false;
      let wabaOk = false;
      let phoneInWabaOk = true;
      let subscriptionOk = false;

      if (!conn.access_token) {
        eventsDetail = "Sem access_token salvo para esta conexão. Reconecte o número.";
        mainIssue = {
          title: "Access token ausente",
          cause: "A conexão foi salva sem token de acesso para chamar a Graph API.",
          action: "Reconecte o número e gere um novo token do System User.",
        };
      } else {
        const me = await graphRequest("me", conn.access_token, { params: { fields: "id,name" } });
        tokenOk = me.ok;
        pushStep({
          key: "token",
          label: "Access token",
          status: me.ok ? "ok" : "error",
          summary: me.ok ? "Token aceito pela Graph API." : "Token recusado pela Graph API.",
          details: me.ok ? [`Token pertence ao objeto: ${me.data?.name || me.data?.id || "identificado"}`] : undefined,
          technical: me.ok ? undefined : graphTechnical(me, conn.access_token),
          fbtrace_id: me.error?.fbtrace_id,
        });
        if (!me.ok) setIssueFrom(me, "token");

        const waba = await graphRequest(conn.waba_id, conn.access_token, {
          params: { fields: "id,name,currency,timezone_id,account_review_status,business_verification_status" },
        });
        wabaOk = waba.ok;
        pushStep({
          key: "waba_object",
          label: "WABA ID",
          status: waba.ok ? "ok" : "error",
          summary: waba.ok ? "A Graph abriu o objeto salvo como WABA ID." : "A Graph não conseguiu abrir o WABA ID salvo.",
          details: waba.ok ? [`Nome/ID retornado: ${waba.data?.name || waba.data?.id || conn.waba_id}`] : undefined,
          technical: waba.ok ? undefined : graphTechnical(waba, conn.access_token),
          fbtrace_id: waba.error?.fbtrace_id,
        });
        if (!waba.ok) setIssueFrom(waba, "waba");

        const phoneNumbers = await graphRequest(`${conn.waba_id}/phone_numbers`, conn.access_token, {
          params: { fields: "id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status", limit: "50" },
        });
        const phones: any[] = Array.isArray(phoneNumbers.data?.data) ? phoneNumbers.data.data : [];
        if (phoneNumbers.ok) {
          wabaOk = true;
          const savedPhoneFound = conn.phone_number_id ? phones.some((p) => String(p.id) === String(conn.phone_number_id)) : true;
          const displayPhoneFound = conn.display_phone_number ? phones.some((p) => String(p.display_phone_number || "").replace(/\D/g, "") === String(conn.display_phone_number || "").replace(/\D/g, "")) : true;
          phoneInWabaOk = savedPhoneFound || displayPhoneFound;
          pushStep({
            key: "waba_phone_numbers",
            label: "Número dentro da WABA",
            status: phoneInWabaOk ? "ok" : "error",
            summary: phoneInWabaOk
              ? `A WABA retornou ${phones.length} número(s) e o número salvo pertence a ela.`
              : "A WABA abriu, mas o Phone Number ID salvo não aparece dentro dela.",
            details: phones.slice(0, 5).map((p) => `${p.display_phone_number || p.verified_name || "Número"} — ID ${p.id}`),
          });
          if (!phoneInWabaOk) {
            mainIssue = mainIssue ?? {
              title: "WABA ID e Phone Number ID não combinam",
              cause: "O número salvo na conexão não pertence à WABA usada no teste.",
              action: "Reconecte selecionando a WABA correta para esse número ou remova a conexão antiga e conecte de novo.",
            };
          }
        } else {
          pushStep({
            key: "waba_phone_numbers",
            label: "Número dentro da WABA",
            status: "error",
            summary: "Não foi possível listar os números dessa WABA.",
            technical: graphTechnical(phoneNumbers, conn.access_token),
            fbtrace_id: phoneNumbers.error?.fbtrace_id,
          });
          setIssueFrom(phoneNumbers, "waba");
        }

        if (conn.phone_number_id) {
          const phone = await graphRequest(conn.phone_number_id, conn.access_token, {
            params: { fields: "id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status" },
          });
          pushStep({
            key: "phone_object",
            label: "Phone Number ID",
            status: phone.ok ? "ok" : "warning",
            summary: phone.ok ? "O Phone Number ID também é acessível com o token." : "Não consegui abrir o Phone Number ID diretamente.",
            details: phone.ok ? [`Número retornado: ${phone.data?.display_phone_number || phone.data?.verified_name || conn.phone_number_id}`] : undefined,
            technical: phone.ok ? undefined : graphTechnical(phone, conn.access_token),
            fbtrace_id: phone.error?.fbtrace_id,
          });
        }

        if (wabaOk) {
          let subscribe = await graphRequest(`${conn.waba_id}/subscribed_apps`, conn.access_token, {
            method: "POST",
            body: { subscribed_fields: REQUIRED_EVENTS },
          });

          if (!subscribe.ok) {
            const fallback = await graphRequest(`${conn.waba_id}/subscribed_apps`, conn.access_token, { method: "POST" });
            if (fallback.ok) subscribe = fallback;
          }

          subscriptionOk = subscribe.ok;
          pushStep({
            key: "subscribe_post",
            label: "Instalação do webhook na WABA",
            status: subscribe.ok ? "ok" : "error",
            summary: subscribe.ok ? "A Graph aceitou o POST em /{WABA_ID}/subscribed_apps." : "A Graph recusou a instalação do webhook na WABA.",
            technical: subscribe.ok ? undefined : graphTechnical(subscribe, conn.access_token),
            fbtrace_id: subscribe.error?.fbtrace_id,
          });
          if (!subscribe.ok) setIssueFrom(subscribe, "subscribe");

          const list = await graphRequest(`${conn.waba_id}/subscribed_apps`, conn.access_token);
          if (list.ok) {
            const apps: any[] = Array.isArray(list.data?.data) ? list.data.data : [];
            const fields = parseSubscribedFields(apps);
            if (fields.length > 0) {
              const present = new Set(fields);
              subscribedEvents = REQUIRED_EVENTS.filter((e) => present.has(e));
              missingEvents = REQUIRED_EVENTS.filter((e) => !present.has(e));
              eventsOk = missingEvents.length === 0;
              eventsDetail = eventsOk
                ? `Todos os ${REQUIRED_EVENTS.length} eventos inscritos`
                : `Faltando ${missingEvents.length}/${REQUIRED_EVENTS.length}: ${missingEvents.join(", ")}`;
              pushStep({
                key: "subscribed_fields",
                label: "Eventos inscritos",
                status: eventsOk ? "ok" : "error",
                summary: eventsDetail,
                details: subscribedEvents.length ? [`Inscritos: ${subscribedEvents.join(", ")}`] : undefined,
              });
            } else {
              eventsOk = subscriptionOk;
              missingEvents = [];
              eventsDetail = "A Meta confirmou a assinatura, mas não retornou a lista de eventos.";
              pushStep({
                key: "subscribed_fields",
                label: "Eventos inscritos",
                status: subscriptionOk ? "warning" : "skipped",
                summary: eventsDetail,
                details: ["Confira manualmente no App da Meta se os Webhook fields estão marcados."],
              });
            }
          } else {
            eventsOk = subscriptionOk;
            missingEvents = [];
            eventsDetail = subscriptionOk
              ? "Webhook instalado, mas a Graph não permitiu listar subscribed_apps via GET."
              : graphTechnical(list, conn.access_token);
            pushStep({
              key: "subscribed_fields",
              label: "Eventos inscritos",
              status: subscriptionOk ? "warning" : "error",
              summary: eventsDetail,
              technical: graphTechnical(list, conn.access_token),
              fbtrace_id: list.error?.fbtrace_id,
            });
            if (!subscriptionOk) setIssueFrom(list, "events");
          }
        } else {
          pushStep({
            key: "subscribe_post",
            label: "Instalação do webhook na WABA",
            status: "skipped",
            summary: "Etapa pulada porque o WABA ID falhou antes.",
          });
        }
      }

      const ok = handshakeOk && wabaOk && phoneInWabaOk && subscriptionOk && eventsOk;
      const firstError = diagnostics.find((s) => s.status === "error");
      const detail = ok
        ? `Webhook validado: callback ok + WABA acessível + assinatura instalada${subscribedEvents.length ? ` + ${subscribedEvents.length}/${REQUIRED_EVENTS.length} eventos` : ""}`
        : mainIssue
          ? `${mainIssue.title}: ${mainIssue.cause}`
          : firstError
            ? `${firstError.label}: ${firstError.summary}`
            : eventsDetail || "Webhook não validado";

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
        issue: mainIssue,
        diagnostics,
        connection: {
          waba_id: conn.waba_id,
          phone_number_id: conn.phone_number_id,
          display_phone_number: conn.display_phone_number,
          business_name: conn.business_name,
        },
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
      .select("id, waba_id, phone_number_id, display_phone_number, business_name, status, webhook_verified_at")
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
