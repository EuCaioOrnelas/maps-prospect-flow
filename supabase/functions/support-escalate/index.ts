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
    const { ticketId, name, email, phone, extra, category: userCategory } = await req.json();
    if (!ticketId || !name || !email) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega ticket atual para preservar customer_type já definido
    const { data: existing } = await sb
      .from("support_tickets")
      .select("customer_type, user_id, priority")
      .eq("id", ticketId)
      .maybeSingle();

    let customerType: "paid_client" | "registered_user" | "guest" =
      (existing?.customer_type as any) ?? "guest";
    let priority: "low" | "medium" | "high" =
      (existing?.priority as any) ?? "low";
    let matchedUserId: string | null = existing?.user_id ?? null;

    // Se ainda é guest, tenta achar usuário pelo email
    if (customerType === "guest" && email) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id, plan, is_custom_subscription, subscription_current_period_end")
        .ilike("email", email.trim())
        .maybeSingle();
      if (profile) {
        matchedUserId = profile.id;
        const activePlan = profile.plan && profile.plan !== "free" && profile.plan !== "trial";
        const activeSub = profile.subscription_current_period_end
          ? new Date(profile.subscription_current_period_end).getTime() > Date.now()
          : false;
        if (activePlan || activeSub || profile.is_custom_subscription) {
          customerType = "paid_client";
          priority = "high";
        } else {
          customerType = "registered_user";
          priority = "medium";
        }
      }
    }

    // Transcrição
    const { data: msgs } = await sb
      .from("support_messages")
      .select("role, content")
      .eq("ticket_id", ticketId)
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
      category,
      status: "escalated",
      priority,
      internal_notes: internalNote,
      due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }).eq("id", ticketId).select("ticket_number").maybeSingle();
    if (updErr) throw updErr;

    if (extra) {
      await sb.from("support_messages").insert({
        ticket_id: ticketId, role: "user", content: extra,
        metadata: { type: "escalation_extra" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      ticketId,
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
