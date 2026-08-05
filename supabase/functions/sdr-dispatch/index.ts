import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BR_TZ_OFFSET = -3; // America/Sao_Paulo

function nowInBrazil() {
  const now = new Date();
  return new Date(now.getTime() + BR_TZ_OFFSET * 60 * 60 * 1000);
}

function isWithinSchedule(schedule: any): boolean {
  if (!schedule || schedule.mode !== "custom") return true;
  const d = nowInBrazil();
  const day = d.getUTCDay();
  const days: number[] = Array.isArray(schedule.days) ? schedule.days.map(Number) : [];
  if (days.length && !days.includes(day)) return false;
  const start = String(schedule.start || "00:00");
  const end = String(schedule.end || "23:59");
  const cur = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return cur >= start && cur <= end;
}

function nextScheduleOpening(schedule: any): string {
  const now = nowInBrazil();
  const days: number[] = Array.isArray(schedule?.days) && schedule.days.length
    ? schedule.days.map(Number)
    : [1, 2, 3, 4, 5];
  const [hours, minutes] = String(schedule?.start || "08:30").split(":").map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateLocal = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hours || 0, minutes || 0,
    ));
    if (!days.includes(candidateLocal.getUTCDay())) continue;
    if (candidateLocal.getTime() <= now.getTime()) continue;
    return new Date(candidateLocal.getTime() - BR_TZ_OFFSET * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function responseDelayMs(agent: any, inbound: string, outbound: string, triggerType: string) {
  if (triggerType === "followup") return 0;
  const mode = agent.triggers?.reply_delay ?? "smart";
  if (mode === "immediate") return 0;
  if (mode === "30s") return 30_000;
  if (mode === "1min") return 60_000;
  if (mode === "custom") return Math.min(300, Math.max(0, Number(agent.triggers?.reply_delay_custom_seconds) || 0)) * 1_000;
  const readingMs = Math.min(30_000, Math.max(8_000, inbound.trim().length * 45));
  const typingMs = Math.min(45_000, Math.max(5_000, outbound.trim().length * 55));
  return readingMs + typingMs;
}

function isOptOutMessage(value: unknown) {
  const text = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return /^(pare|stop|sair|cancelar|descadastrar|remover)(\b|$)/.test(text) ||
    /\b(nao quero mais|nao me envie|nao mandar mais|remova meu numero|retire meu contato|pare de mandar|pare de enviar)\b/.test(text);
}

function isExplicitRejection(value: unknown) {
  const text = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return /\b(nao tenho interesse|nao estou interessado|nao quero contratar|nao quero comprar|nao preciso disso|sem interesse|pode encerrar)\b/.test(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Apenas chamadas internas (webhook / cron) com service role key
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (token !== SERVICE_KEY) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const {
      owner_user_id,
      user_id,
      waba_connection_id,
      phone_number_id,
      conversation_id,
      contact_phone,
      contact_name,
      message,
      trigger_type = "inbound",
    } = body || {};

    if (!owner_user_id || !waba_connection_id || !contact_phone) {
      return json({ error: "Campos obrigatórios ausentes" }, 400);
    }

    // 1) Encontrar SDR ativo responsável por este número
    const { data: agents } = await supabase
      .from("sdr_agents")
      .select("*")
      .eq("owner_user_id", owner_user_id)
      .eq("status", "active");

    const agent = (agents || []).find((a: any) =>
      (a.whatsapp_number_ids || []).includes(waba_connection_id)
    );
    if (!agent) return json({ skipped: "nenhum SDR ativo para este número" });

    const tail = String(contact_phone).replace(/\D/g, "").slice(-8);
    if (trigger_type === "inbound" && isOptOutMessage(message)) {
      const { data: existingOptOut } = await supabase
        .from("sdr_sessions")
        .select("id")
        .eq("agent_id", agent.id)
        .ilike("phone", `%${tail}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingOptOut) {
        await supabase.from("sdr_sessions").update({
          status: "opted_out",
          next_followup_at: null,
          closed_reason: "explicit_opt_out",
        }).eq("id", existingOptOut.id);
      } else {
        await supabase.from("sdr_sessions").insert({
          agent_id: agent.id,
          owner_user_id,
          user_id: user_id || owner_user_id,
          phone: contact_phone,
          contact_name: contact_name || null,
          conversation_id: conversation_id || null,
          waba_connection_id,
          phone_number_id: phone_number_id || null,
          status: "opted_out",
          closed_reason: "explicit_opt_out",
        });
      }
      return json({ ok: true, opted_out: true, sent: 0 });
    }
    if (trigger_type === "inbound" && isExplicitRejection(message)) {
      await supabase
        .from("sdr_sessions")
        .update({ status: "closed", next_followup_at: null, closed_reason: "explicit_rejection" })
        .eq("agent_id", agent.id)
        .ilike("phone", `%${tail}`);
      return json({ ok: true, rejected: true, sent: 0 });
    }

    const { data: optedOutSession } = await supabase
      .from("sdr_sessions")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("status", "opted_out")
      .ilike("phone", `%${tail}`)
      .limit(1)
      .maybeSingle();
    if (optedOutSession) return json({ skipped: "contato descadastrado" });

    const activation: string[] = Array.isArray(agent.triggers?.activation) ? agent.triggers.activation : ["inbound_all"];
    if (trigger_type === "inbound" && !activation.includes("inbound_all") && !activation.includes("first_only")) {
      return json({ skipped: "gatilho inbound não habilitado" });
    }
    if (trigger_type === "followup" && agent.triggers?.outbound_followup === false) {
      return json({ skipped: "follow-up automático desabilitado" });
    }
    if (trigger_type === "prospect" && agent.triggers?.outbound_prospect === false) {
      return json({ skipped: "prospecção automática desabilitada" });
    }
    if (trigger_type === "reactivate" && agent.triggers?.outbound_reactivate === false) {
      return json({ skipped: "reativação automática desabilitada" });
    }

    // 2) Sessão (memória de longo prazo)
    let { data: session } = await supabase
      .from("sdr_sessions")
      .select("*")
      .eq("agent_id", agent.id)
      .ilike("phone", `%${tail}`)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const { data: created } = await supabase
        .from("sdr_sessions")
        .insert({
          agent_id: agent.id,
          owner_user_id,
          phone: contact_phone,
          contact_name: contact_name || null,
          status: "active",
          conversation_id: conversation_id || null,
          waba_connection_id,
          phone_number_id: phone_number_id || null,
          user_id: user_id || owner_user_id,
        })
        .select("*")
        .maybeSingle();
      session = created;
    } else {
      const { data: updated } = await supabase
        .from("sdr_sessions")
        .update({
          conversation_id: conversation_id || session.conversation_id,
          waba_connection_id,
          phone_number_id: phone_number_id || session.phone_number_id,
          user_id: user_id || owner_user_id,
          ...(trigger_type === "inbound" ? { next_followup_at: null, followup_reason: null } : {}),
        })
        .eq("id", session.id)
        .select("*")
        .maybeSingle();
      session = updated ?? session;
    }

    if (!isWithinSchedule(agent.schedule)) {
      if (agent.schedule?.queue_outside_hours && session?.id && trigger_type === "inbound") {
        const resumeAt = nextScheduleOpening(agent.schedule);
        await supabase.from("sdr_sessions").update({
          next_followup_at: resumeAt,
          followup_reason: "outside_business_hours",
          last_reply_at: new Date().toISOString(),
        }).eq("id", session.id);
        return json({ queued: true, resume_at: resumeAt, sent: 0 });
      }
      return json({ skipped: "fora do horário configurado", sent: 0 });
    }

    if (trigger_type === "inbound" && activation.includes("first_only") && (session?.replies_received ?? 0) > 0) {
      return json({ skipped: "gatilho configurado apenas para o primeiro contato" });
    }

    // Interrompe se o lead pediu para parar ou já foi encerrado
    if (session?.status && session.status !== "active") {
      return json({ skipped: "sessão encerrada" });
    }

    // 3) Histórico da conversa
    let history: { role: string; content: string }[] = [];
    if (conversation_id) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("direction, content, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(20);
      history = (msgs || [])
        .reverse()
        .filter((m: any) => m.content)
        .map((m: any) => ({
          role: m.direction === "outbound" ? "assistant" : "user",
          content: m.content,
        }));
    }

    // 4) Contexto do lead no CRM
    let leadContext: Record<string, unknown> = { phone: contact_phone, name: contact_name };
    try {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, name, company_name, stage, whatsapp_status, notes, score")
        .eq("user_id", user_id || owner_user_id)
        .ilike("phone", `%${tail}`)
        .limit(1)
        .maybeSingle();
      if (lead) {
        leadContext = { ...leadContext, ...lead };
        if (session && !session.lead_id) {
          await supabase.from("sdr_sessions").update({ lead_id: lead.id }).eq("id", session.id);
        }
      }
    } catch (_) { /* contexto é opcional */ }

    // 5) Cérebro (9 camadas)
    const brainRes = await fetch(`${SUPABASE_URL}/functions/v1/sdr-brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        agentId: agent.id,
        message: message || "",
        triggerType: trigger_type,
        history,
        leadContext,
        sessionId: session?.id ?? null,
      }),
    });

    if (!brainRes.ok) {
      const err = await brainRes.text();
      console.error("[sdr-dispatch] sdr-brain falhou:", brainRes.status, err);
      return json({ error: "brain_failed", status: brainRes.status, details: err }, 502);
    }

    const brain = await brainRes.json();
    const messages: string[] = Array.isArray(brain.messages) ? brain.messages : [];
    const nextAction: string = brain.next_action || "aguardar";

    if (nextAction === "aguardar" || messages.length === 0) {
      return json({ ok: true, sent: 0, next_action: nextAction });
    }

    if (nextAction === "encerrar" || nextAction === "chamar_vendedor") {
      await supabase
        .from("sdr_sessions")
        .update({ status: nextAction === "encerrar" ? "closed" : "handoff" })
        .eq("id", session?.id);

      // Vendedores a avisar: handoff usa strategy.handoff_sellers, encerramento usa closing.notify_sellers
      const sellers: any[] =
        nextAction === "chamar_vendedor"
          ? (agent.strategy?.handoff_sellers ?? [])
          : (agent.closing?.notify_sellers ?? []);

      const firstSellerId = sellers.find((s: any) => s?.user_id)?.user_id ?? null;
      if (nextAction === "chamar_vendedor" && firstSellerId && conversation_id) {
        await supabase
          .from("chat_conversations")
          .update({ responsible_user_id: firstSellerId })
          .eq("id", conversation_id);
      }

      const wabaLabel = (() => {
        return phone_number_id || "";
      })();

      for (const seller of sellers) {
        if (!seller?.email) continue;
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
              user_id: owner_user_id,
              email_type: "SDR_SELLER_HANDOFF",
              override_email: seller.email,
              idempotency_key: `sdr-handoff-${session?.id ?? contact_phone}-${nextAction}-${seller.email}`,
              payload: {
                sdr_name: agent.name,
                contact_name: contact_name || contact_phone,
                contact_phone,
                waba_number: wabaLabel,
                reason:
                  nextAction === "chamar_vendedor"
                    ? "O SDR identificou que este lead precisa de um vendedor humano agora."
                    : "O SDR concluiu o ciclo de follow-ups e encerrou a conversa.",
                summary: brain.strategy?.estrategia || brain.analysis?.estrategia || "",
                next_step:
                  nextAction === "chamar_vendedor"
                    ? "Assuma a conversa no chat: você já é o responsável por este lead."
                    : "Avalie se vale uma nova tentativa manual com este lead.",
              },
            }),
          });
        } catch (err) {
          console.error("[sdr-dispatch] falha ao avisar vendedor", seller.email, err);
        }
      }
    }

    // 6) Envio pelo WhatsApp (Meta Cloud API)
    const { data: connection } = await supabase
      .from("user_waba_connections")
      .select("access_token, phone_number_id")
      .eq("id", waba_connection_id)
      .maybeSingle();

    if (!connection?.access_token) {
      return json({ error: "Conexão WhatsApp não encontrada" }, 404);
    }
    const pnid = phone_number_id || connection.phone_number_id;

    let sent = 0;
    const initialDelay = responseDelayMs(agent, message || "", messages.join(" "), trigger_type);
    if (initialDelay > 0) await new Promise((resolve) => setTimeout(resolve, initialDelay));
    if (!isWithinSchedule(agent.schedule)) {
      return json({ skipped: "horário de atendimento encerrado durante o processamento", sent: 0 });
    }
    for (const text of messages) {
      // pausa curta entre mensagens para soar humano
      if (sent > 0) await new Promise((r) => setTimeout(r, 1800));

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${pnid}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: String(contact_phone).replace(/\D/g, ""),
          type: "text",
          text: { body: text },
        }),
      });
      const metaJson = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        console.error("[sdr-dispatch] Meta erro:", metaRes.status, JSON.stringify(metaJson));
        break;
      }
      sent++;

      if (conversation_id) {
        await supabase.from("chat_messages").insert({
          conversation_id,
          user_id: user_id || owner_user_id,
          owner_user_id,
          waba_message_id: metaJson?.messages?.[0]?.id || null,
          direction: "outbound",
          message_type: "text",
          content: text,
          status: "sent",
        });
      }
    }

    if (conversation_id && sent > 0) {
      await supabase
        .from("chat_conversations")
        .update({
          last_message_text: messages[sent - 1],
          last_message_at: new Date().toISOString(),
          last_message_type: "text",
          last_message_direction: "outbound",
        })
        .eq("id", conversation_id);
    }

    if (session?.id) {
      await supabase.from("sdr_sessions").update({
        last_processed_at: new Date().toISOString(),
        ...(trigger_type === "followup" ? { followups_sent: (session.followups_sent ?? 0) + 1 } : {}),
      }).eq("id", session.id);
    }

    console.log(`[sdr-dispatch] SDR ${agent.name} respondeu ${sent} mensagem(ns) para ${contact_phone}`);
    return json({ ok: true, agent_id: agent.id, sent, next_action: nextAction });
  } catch (e) {
    console.error("[sdr-dispatch]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
