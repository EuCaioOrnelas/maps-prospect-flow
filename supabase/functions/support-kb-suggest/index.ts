// Sugere uma entrada de Knowledge Base a partir do conteúdo de um ticket resolvido.
// Admin clica "Transformar em conhecimento" → essa função usa GPT-4o-mini para sugerir
// title, category, pains, solution, tags. Não grava nada — apenas devolve sugestão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticketId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verifica admin
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await sb.rpc("is_current_user_admin");
    // is_current_user_admin uses auth.uid() — fall back to user_roles check via service role
    if (!isAdmin) {
      const { data: role } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: ticket } = await sb
      .from("support_tickets")
      .select("category, ai_summary, name")
      .eq("id", ticketId)
      .maybeSingle();
    const { data: msgs } = await sb
      .from("support_messages")
      .select("role, content")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(60);

    const transcript = (msgs || []).map((m: any) => `${m.role === "ai" ? "Wian" : "Usuário"}: ${m.content}`).join("\n").slice(0, 8000);

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), { status: 500, headers: corsHeaders });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Você ajuda a transformar atendimentos resolvidos em entradas de base de conhecimento da Wiize (B2B WhatsApp/Campanhas/CRM/IA). Retorne JSON estrito: {"title":string (máx 80c),"category":string ("WhatsApp"|"Campanhas"|"IA"|"CRM"|"Pagamento"|"Conta"|"Outro"),"pains":string (máx 200c, dores que o cliente expressa),"solution":string (passo a passo claro em markdown, 3-8 passos),"tags":string[] (3-7 palavras-chave em pt-BR)}. Sem invenção: use apenas o que está no atendimento.` },
          { role: "user", content: `Categoria atual do ticket: ${ticket?.category || "?"}\nResumo: ${ticket?.ai_summary || "(sem)"}\n\nTranscrição:\n${transcript}` },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("openai error", t);
      return new Response(JSON.stringify({ error: "ai_failed" }), { status: 502, headers: corsHeaders });
    }
    const j = await aiRes.json();
    const raw = j.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      ok: true,
      suggestion: {
        title: parsed.title || "",
        category: parsed.category || ticket?.category || "Outro",
        pains: parsed.pains || "",
        solution: parsed.solution || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      },
      tokens: j.usage,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("kb-suggest error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
