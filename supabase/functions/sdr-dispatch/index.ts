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

const WEEKDAY_IDS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function isWithinSchedule(schedule: any): boolean {
  if (!schedule || schedule.mode !== "custom") return true;
  const d = nowInBrazil();
  const day = WEEKDAY_IDS[d.getUTCDay()];
  const days: string[] = Array.isArray(schedule.days) ? schedule.days : [];
  if (days.length && !days.includes(day)) return false;
  const start = String(schedule.start || "00:00");
  const end = String(schedule.end || "23:59");
  const cur = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return cur >= start && cur <= end;
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

    if (!isWithinSchedule(agent.schedule)) {
      return json({ skipped: "fora do horário configurado" });
    }

    // 2) Sessão (memória de longo prazo)
    const tail = String(contact_phone).replace(/\D/g, "").slice(-8);
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
        })
        .select("*")
        .maybeSingle();
      session = created;
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

    console.log(`[sdr-dispatch] SDR ${agent.name} respondeu ${sent} mensagem(ns) para ${contact_phone}`);
    return json({ ok: true, agent_id: agent.id, sent, next_action: nextAction });
  } catch (e) {
    console.error("[sdr-dispatch]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
