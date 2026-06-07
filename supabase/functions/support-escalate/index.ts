// Coleta dados de contato, gera resumo via OpenAI, marca ticket como escalado.
// Se o email informado já é cliente/usuário, classifica para priorização.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ticketId, name, email, phone, extra, category: userCategory, visitorSession, initialMessage } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization");
    let requesterUserId: string | null = null;
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(token);
      requesterUserId = user?.id ?? null;
    }

    let resolvedTicketId: string | null = ticketId || null;
    let createdTicketNow = false;

    if (!resolvedTicketId) {
      const { data: created, error: createErr } = await sb.from("support_tickets").insert({
        visitor_session: typeof visitorSession === "string" ? visitorSession : null,
        name,
        email,
        phone: phone ?? null,
        status: "open",
        priority: "medium",
        customer_type: "guest",
        phase: "ai_investigating",
      }).select("id").single();
      if (createErr) throw createErr;
      resolvedTicketId = created.id;
      createdTicketNow = true;

      await sb.from("support_messages").insert({
        ticket_id: resolvedTicketId,
        role: "user",
        content: typeof initialMessage === "string" && initialMessage.trim()
          ? initialMessage.trim()
          : (extra ? String(extra) : "Atendimento direto com o time."),
        metadata: { type: "initial_escalation" },
      });
    }

    // Carrega ticket atual para preservar customer_type já definido
    const { data: existing } = await sb
      .from("support_tickets")
      .select("customer_type, user_id, priority, phase")
      .eq("id", resolvedTicketId)
      .maybeSingle();
    if (!existing) throw new Error("ticket not found");
    if (existing.user_id && existing.user_id !== requesterUserId) throw new Error("ticket access denied");
    if (!existing.user_id && !createdTicketNow) {
      if (!visitorSession || typeof visitorSession !== "string") throw new Error("ticket session required");
      const { data: sessionTicket } = await sb
        .from("support_tickets")
        .select("id")
        .eq("id", resolvedTicketId)
        .eq("visitor_session", visitorSession)
        .maybeSingle();
      if (!sessionTicket) throw new Error("ticket session mismatch");
    }
    const previousPhase = existing?.phase ?? "ai_investigating";

    let customerType: "paid_client" | "trial_user" | "guest" =
      (existing?.customer_type as any) ?? "guest";
    let priority: "low" | "medium" | "high" =
      (existing?.priority as any) ?? "low";
    let matchedUserId: string | null = existing?.user_id ?? null;

    // Se ainda é guest, tenta achar usuário pelo email
    let matchedPlan: string | null = null;
    if (customerType === "guest" && email) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id, plan, is_custom_subscription, subscription_current_period_end")
        .ilike("email", email.trim())
        .maybeSingle();
      if (profile) {
        matchedUserId = profile.id;
        matchedPlan = profile.plan ?? null;
        const activePlan = profile.plan && profile.plan !== "free" && profile.plan !== "trial";
        const activeSub = profile.subscription_current_period_end
          ? new Date(profile.subscription_current_period_end).getTime() > Date.now()
          : false;
        if (activePlan || activeSub || profile.is_custom_subscription) {
          customerType = "paid_client";
          priority = "high";
        } else {
          customerType = "trial_user";
          priority = "medium";
        }
      }
    }
    // Se já tinha user_id mas plano desconhecido, busca para enviar no e-mail de comprovante
    if (!matchedPlan && matchedUserId) {
      const { data: prof2 } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", matchedUserId)
        .maybeSingle();
      matchedPlan = prof2?.plan ?? null;
    }

    // Transcrição
    const { data: msgs } = await sb
      .from("support_messages")
      .select("role, content")
      .eq("ticket_id", resolvedTicketId)
      .order("created_at", { ascending: true });

    const transcript = (msgs ?? [])
      .map((m: any) => `${m.role === "user" ? "Usuário" : "Wian"}: ${m.content}`)
      .join("\n");

    // Resumo via OpenAI
    let summary = "Atendimento escalado para análise humana.";
    let category = "Outro";
    if (OPENAI_API_KEY) {
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Resuma o atendimento abaixo em até 3 frases objetivas em pt-BR. Identifique a categoria principal entre: WhatsApp, Campanhas, IA, CRM, Pagamento, Conta, Outro. Retorne JSON {\"summary\":string,\"category\":string}." },
              { role: "user", content: transcript + (extra ? `\n\nInfo extra do usuário: ${extra}` : "") },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });
        const j = await aiRes.json();
        const raw = j.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(raw);
        if (parsed.summary) summary = parsed.summary;
        if (parsed.category) category = parsed.category;
      } catch (err) {
        console.error("summary error", err);
      }
    }
    // Categoria escolhida pelo usuário tem prioridade
    if (userCategory && typeof userCategory === "string") {
      category = userCategory;
    }

    // Nota interna enxuta — a transcrição já está visível na aba Conversa.
    const internalNote = extra
      ? `Descrição adicional do usuário:\n${extra}`
      : null;

    const { data: updated, error: updErr } = await sb.from("support_tickets").update({
      name,
      email,
      phone: phone ?? null,
      user_id: matchedUserId,
      customer_type: customerType,
      ai_summary: summary,
      subject: (extra ? extra.slice(0, 160) : summary?.slice(0, 160)) || category,
      category,
      status: "escalated",
      phase: "escalated",
      priority,
      internal_notes: internalNote,
      due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }).eq("id", resolvedTicketId).select("ticket_number").maybeSingle();
    if (updErr) throw updErr;

    // Audita transição de estado
    await sb.from("support_ticket_events").insert({
      ticket_id: resolvedTicketId,
      from_phase: previousPhase,
      to_phase: "escalated",
      triggered_by: "user",
      metadata: { reason: "manual_escalation_form", category, customer_type: customerType },
    });

    if (extra && !createdTicketNow) {
      await sb.from("support_messages").insert({
        ticket_id: resolvedTicketId, role: "user", content: extra,
        metadata: { type: "escalation_extra" },
      });
    }

    // Dispara notificação ao admin (wiize.app@gmail.com) — best-effort, não bloqueia
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/support-email-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ type: "admin_new_ticket", ticketId: resolvedTicketId }),
      });
    } catch (notifyErr) {
      console.error("[support-escalate] admin notify failed", notifyErr);
    }

    // Dispara comprovante para o cliente — best-effort
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/support-email-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ type: "customer_ticket_receipt", ticketId: resolvedTicketId, plan: matchedPlan }),
      });
    } catch (receiptErr) {
      console.error("[support-escalate] customer receipt failed", receiptErr);
    }

    return new Response(JSON.stringify({
      ok: true,
      ticketId: resolvedTicketId,
      ticketNumber: updated?.ticket_number ?? null,
      summary,
      category,
      customerType,
      priority,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
