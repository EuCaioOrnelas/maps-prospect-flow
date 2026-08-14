import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function isWithinSchedule(schedule: any) {
  if (!schedule || schedule.mode !== "custom") return true;
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const days = Array.isArray(schedule.days) ? schedule.days.map(Number) : [];
  if (days.length && !days.includes(local.getUTCDay())) return false;
  const current = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  return current >= String(schedule.start || "00:00") && current <= String(schedule.end || "23:59");
}

function nextScheduleOpening(schedule: any): string {
  const localNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const days: number[] = Array.isArray(schedule?.days) && schedule.days.length
    ? schedule.days.map(Number)
    : [1, 2, 3, 4, 5];
  const [hours, minutes] = String(schedule?.start || "08:30").split(":").map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(Date.UTC(
      localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + offset, hours || 0, minutes || 0,
    ));
    if (!days.includes(candidate.getUTCDay()) || candidate.getTime() <= localNow.getTime()) continue;
    return new Date(candidate.getTime() + 3 * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Backend configuration unavailable" }, 500);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const apiKeyHeader = req.headers.get("apikey")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const cronSecret = Deno.env.get("SDR_CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret");
  const jwtRole = (t?: string | null) => {
    try {
      const part = String(t || "").split(".")[1];
      if (!part) return null;
      const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      return payload?.role ?? null;
    } catch { return null; }
  };
  const roleOk = ["anon", "service_role", "authenticated"].includes(jwtRole(token) || jwtRole(apiKeyHeader) || "");
  const authorized =
    token === serviceKey ||
    (!!cronSecret && cronHeader === cronSecret) ||
    (!!anonKey && (token === anonKey || apiKeyHeader === anonKey)) ||
    roleOk;
  if (!authorized) return json({ error: "Unauthorized" }, 401);




  const backend = createClient(url, serviceKey);
  const { data: sessions, error } = await backend
    .from("sdr_sessions")
    .select("*")
    .eq("status", "active")
    .not("next_followup_at", "is", null)
    .lte("next_followup_at", new Date().toISOString())
    .order("next_followup_at", { ascending: true })
    .limit(25);
  if (error) {
    console.error("[sdr-followup-processor] load failed", error);
    return json({
      error: "Unable to load due follow-ups",
      details: error.message,
      code: (error as { code?: string }).code ?? null,
      hint: (error as { hint?: string }).hint ?? null,
    }, 500);
  }

  let dispatched = 0;
  let deferred = 0;
  let handedOff = 0;

  async function applyAfterLimit(agent: any, session: any) {
    const actions: string[] = Array.isArray(agent.closing?.after_limit_actions)
      ? agent.closing.after_limit_actions
      : agent.closing?.after_limit ? [agent.closing.after_limit] : [];
    if (session.lead_id && actions.includes("arquivar")) {
      await backend.from("leads").update({ archived_at: new Date().toISOString() }).eq("id", session.lead_id);
    }
    if (session.lead_id && actions.includes("mover_pipeline") && agent.closing?.after_limit_stage_id) {
      await backend.from("leads").update({ pipeline_stage_id: agent.closing.after_limit_stage_id }).eq("id", session.lead_id);
    }
    const sellers = agent.closing?.notify_seller === false
      ? []
      : Array.isArray(agent.closing?.notify_sellers) ? agent.closing.notify_sellers : [];
    for (const seller of sellers) {
      if (!seller?.email) continue;
      await fetch(`${url}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: session.owner_user_id,
          email_type: "SDR_SELLER_HANDOFF",
          override_email: seller.email,
          idempotency_key: `sdr-followup-limit-${session.id}-${seller.email}`,
          payload: {
            sdr_name: agent.name,
            contact_name: session.contact_name || session.phone,
            contact_phone: session.phone,
            reason: "O SDR atingiu o limite de follow-ups configurado.",
            summary: session.followup_reason || session.current_goal || "Ciclo automático encerrado.",
            next_step: "Revise a conversa e decida se haverá uma abordagem humana.",
          },
        }),
      }).catch((error) => console.error("[sdr-followup-processor] seller notification failed", error));
    }
  }

  for (const session of sessions ?? []) {
    const { data: agent } = await backend.from("sdr_agents").select("*").eq("id", session.agent_id).maybeSingle();
    if (!agent || agent.status !== "active") {
      await backend.from("sdr_sessions").update({ next_followup_at: null }).eq("id", session.id);
      continue;
    }
    if (agent.triggers?.outbound_followup === false) {
      await backend.from("sdr_sessions").update({ next_followup_at: null }).eq("id", session.id);
      continue;
    }
    if (!(agent.whatsapp_number_ids ?? []).includes(session.waba_connection_id)) {
      await backend.from("sdr_sessions").update({
        status: "closed",
        next_followup_at: null,
        closed_reason: "waba_connection_removed_from_agent",
      }).eq("id", session.id);
      continue;
    }

    const stopCriteria: string[] = Array.isArray(agent.closing?.stop_criteria)
      ? agent.closing.stop_criteria
      : [];
    const inactivityHours = Math.max(1, Number(agent.closing?.stop_no_reply_hours) || 48);
    const lastCustomerReply = session.last_reply_at ? new Date(session.last_reply_at).getTime() : 0;
    if (
      stopCriteria.includes("sem_resposta") &&
      lastCustomerReply > 0 &&
      Date.now() - lastCustomerReply >= inactivityHours * 60 * 60 * 1000
    ) {
      await backend.from("sdr_sessions").update({
        status: "abandoned",
        next_followup_at: null,
        closed_reason: "no_reply_timeout",
      }).eq("id", session.id);
      continue;
    }
    if (!isWithinSchedule(agent.schedule)) {
      await backend.from("sdr_sessions").update({
        next_followup_at: nextScheduleOpening(agent.schedule),
      }).eq("id", session.id);
      deferred += 1;
      continue;
    }

    const isQueuedInbound = session.followup_reason === "outside_business_hours";

    const maximum = Math.max(0, Number(agent.closing?.followup_max) || 0);
    if (!isQueuedInbound && (session.followups_sent ?? 0) >= maximum) {
      await applyAfterLimit(agent, session);
      await backend.from("sdr_sessions").update({
        status: agent.closing?.notify_seller !== false && (agent.closing?.notify_sellers ?? []).length ? "handoff" : "closed",
        next_followup_at: null,
        closed_reason: "followup_limit_reached",
      }).eq("id", session.id);
      handedOff += 1;
      continue;
    }

    const lastReplyAt = session.last_reply_at ? new Date(session.last_reply_at).getTime() : 0;
    const outsideCustomerWindow = !lastReplyAt || Date.now() - lastReplyAt >= 23 * 60 * 60 * 1000;
    const templateIds = Array.isArray(agent.closing?.followup_templates) ? agent.closing.followup_templates : [];

    // Fora da janela de atendimento da Meta, texto livre é proibido. Sem template
    // aprovado, o caso vai para humano em vez de tentar um envio inválido.
    if (!isQueuedInbound && outsideCustomerWindow && templateIds.length === 0) {
      await backend.from("sdr_sessions").update({
        status: "handoff",
        next_followup_at: null,
        closed_reason: "meta_template_required",
      }).eq("id", session.id);
      handedOff += 1;
      continue;
    }

    if (!session.waba_connection_id || !session.phone) {
      await backend.from("sdr_sessions").update({
        next_followup_at: null,
        closed_reason: "missing_dispatch_context",
      }).eq("id", session.id);
      continue;
    }

    if (!isQueuedInbound && outsideCustomerWindow) {
      const { data: template } = await backend
        .from("wiize_message_templates")
        .select("name,language,body")
        .in("id", templateIds)
        .eq("archived", false)
        .limit(1)
        .maybeSingle();
      const { data: connection } = await backend
        .from("user_waba_connections")
        .select("access_token,phone_number_id")
        .eq("id", session.waba_connection_id)
        .maybeSingle();
      if (!template || !connection?.access_token) {
        await backend.from("sdr_sessions").update({
          status: "handoff",
          next_followup_at: null,
          closed_reason: "approved_template_unavailable",
        }).eq("id", session.id);
        handedOff += 1;
        continue;
      }
      const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${session.phone_number_id || connection.phone_number_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: String(session.phone).replace(/\D/g, ""),
          type: "template",
          template: { name: template.name, language: { code: template.language || "pt_BR" } },
        }),
      });
      if (!metaResponse.ok) {
        console.error("[sdr-followup-processor] Meta template failed:", metaResponse.status, await metaResponse.text());
        continue;
      }
      if (session.conversation_id) {
        await backend.from("chat_messages").insert({
          conversation_id: session.conversation_id,
          user_id: session.user_id || session.owner_user_id,
          owner_user_id: session.owner_user_id,
          direction: "outbound",
          message_type: "template",
          content: template.body || `[${template.name}]`,
          status: "sent",
        });
      }
      await backend.from("sdr_sessions").update({
        followups_sent: (session.followups_sent ?? 0) + 1,
        next_followup_at: null,
        last_processed_at: new Date().toISOString(),
      }).eq("id", session.id);
      dispatched += 1;
      continue;
    }

    const response = await fetch(`${url}/functions/v1/sdr-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        owner_user_id: session.owner_user_id,
        user_id: session.user_id || session.owner_user_id,
        waba_connection_id: session.waba_connection_id,
        phone_number_id: session.phone_number_id,
        conversation_id: session.conversation_id,
        contact_phone: session.phone,
        contact_name: session.contact_name,
        message: "",
        trigger_type: isQueuedInbound ? "queued_inbound" : "followup",
      }),
    });
    if (response.ok) dispatched += 1;
    else console.error("[sdr-followup-processor] dispatch failed:", response.status, await response.text());
  }

  return json({ ok: true, processed: sessions?.length ?? 0, dispatched, deferred, handed_off: handedOff });
});