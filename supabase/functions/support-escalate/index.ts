// Collect contact info, generate AI summary, mark ticket as escalated
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ticketId, name, email, phone, extra } = await req.json();
    if (!ticketId || !name || !email) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: msgs } = await sb
      .from("support_messages")
      .select("role, content")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    const transcript = (msgs ?? []).map((m: any) => `${m.role === "user" ? "Usuário" : "Wian"}: ${m.content}`).join("\n");

    // Summary
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Resuma o atendimento abaixo em até 3 frases objetivas em pt-BR. Identifique a categoria principal entre: WhatsApp, Campanhas, IA, CRM, Pagamento, Conta, Outro. Retorne JSON {\"summary\":string,\"category\":string}." },
          { role: "user", content: transcript + (extra ? `\n\nInfo extra do usuário: ${extra}` : "") },
        ],
        temperature: 0.2,
      }),
    });

    let summary = "Atendimento escalado para análise humana.";
    let category = "Outro";
    try {
      const j = await aiRes.json();
      const raw = j.choices?.[0]?.message?.content || "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.summary) summary = parsed.summary;
        if (parsed.category) category = parsed.category;
      }
    } catch (_) { /* ignore */ }

    await sb.from("support_tickets").update({
      name, email, phone: phone ?? null,
      ai_summary: summary, category, status: "escalated", priority: "high",
    }).eq("id", ticketId);

    if (extra) {
      await sb.from("support_messages").insert({
        ticket_id: ticketId, role: "user", content: extra,
        metadata: { type: "escalation_extra" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ticketId, summary, category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
