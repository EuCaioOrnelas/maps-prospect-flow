// Wian — Wiize support AI chat
// - Creates/uses a support ticket
// - Embeds the user query, finds relevant KB + FAQs via pgvector
// - Calls Lovable AI Gateway with grounded system prompt
// - Persists messages, computes confidence, decides escalation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_BASE = `Você é Wian, atendente virtual oficial da Wiize (plataforma B2B de prospecção, WhatsApp e CRM).
Tom: profissional, amigável, objetivo. Português brasileiro. Respostas curtas (no máximo 3 parágrafos curtos).
Regras absolutas:
- NUNCA invente informações. Use APENAS o "CONTEXTO" fornecido abaixo.
- Se o contexto não tiver a resposta, responda exatamente: "ESCALAR_HUMANO" e nada mais.
- Não cite IDs internos nem o nome "knowledge base".
- Encerre suas respostas perguntando: "Isso resolveu seu problema?" quando entregar uma solução.`;

async function embed(text: string): Promise<number[] | null> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.data?.[0]?.embedding ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { ticketId: incomingTicketId, message, history = [], visitorSession } = body;
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve user
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) userId = user.id;
    }

    // Ensure ticket
    let ticketId = incomingTicketId;
    if (!ticketId) {
      const { data: t, error } = await sb.from("support_tickets").insert({
        user_id: userId,
        visitor_session: visitorSession ?? null,
        status: "open",
        priority: "medium",
      }).select("id").single();
      if (error) throw error;
      ticketId = t.id;
    }

    // Persist user message
    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "user", content: message,
    });

    // Semantic search
    const queryEmbedding = await embed(message);
    let kbResults: any[] = [];
    let faqResults: any[] = [];
    if (queryEmbedding) {
      const [{ data: kb }, { data: faqs }] = await Promise.all([
        sb.rpc("match_knowledge", { query_embedding: queryEmbedding, match_threshold: 0.4, match_count: 4 }),
        sb.rpc("match_faqs", { query_embedding: queryEmbedding, match_threshold: 0.4, match_count: 3 }),
      ]);
      kbResults = kb ?? [];
      faqResults = faqs ?? [];
    }

    const topSim = Math.max(
      0,
      ...kbResults.map((k) => k.similarity || 0),
      ...faqResults.map((f) => f.similarity || 0),
    );

    const mustEscalate = kbResults.some((k) => k.auto_escalate && k.similarity > 0.6);
    const noContext = kbResults.length === 0 && faqResults.length === 0;

    // Build context
    let context = "";
    if (kbResults.length) {
      context += "\n--- BASE DE CONHECIMENTO ---\n";
      kbResults.forEach((k, i) => {
        context += `\n[KB ${i + 1}] ${k.title}\nDores: ${k.pains || "-"}\nSolução: ${k.solution || "-"}\n`;
      });
    }
    if (faqResults.length) {
      context += "\n--- FAQ ---\n";
      faqResults.forEach((f, i) => {
        context += `\n[FAQ ${i + 1}] ${f.title}\n${(f.content || "").replace(/<[^>]+>/g, " ").slice(0, 800)}\n`;
      });
    }
    if (!context) context = "\n(sem contexto relevante encontrado)\n";

    // Call AI
    const messages = [
      { role: "system", content: `${SYSTEM_BASE}\n\nCONTEXTO:${context}` },
      ...history.slice(-10).map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.3,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      throw new Error("AI gateway error");
    }

    const aiJson = await aiRes.json();
    let answer: string = aiJson.choices?.[0]?.message?.content?.trim() || "";

    let shouldEscalate = mustEscalate || noContext || answer.includes("ESCALAR_HUMANO") || topSim < 0.45;

    if (shouldEscalate) {
      answer = "Esse caso precisa de uma análise mais detalhada da nossa equipe. Vou conectar você com nosso time agora — preciso de alguns dados rápidos para abrir o seu chamado.";
    }

    // Persist AI message
    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "ai", content: answer,
      metadata: { confidence: topSim, escalated: shouldEscalate, kb_ids: kbResults.map((k) => k.id) },
    });

    // Log
    await sb.from("ai_logs").insert({
      ticket_id: ticketId, query: message,
      matched_kb_ids: kbResults.map((k) => k.id),
      matched_faq_ids: faqResults.map((f) => f.id),
      confidence: topSim,
      model: "google/gemini-3-flash-preview",
      tokens_in: aiJson.usage?.prompt_tokens ?? null,
      tokens_out: aiJson.usage?.completion_tokens ?? null,
    });

    if (shouldEscalate) {
      await sb.from("support_tickets").update({ status: "escalated", ai_confidence: topSim }).eq("id", ticketId);
    } else {
      await sb.from("support_tickets").update({ ai_confidence: topSim }).eq("id", ticketId);
    }

    return new Response(JSON.stringify({
      ticketId, answer, escalate: shouldEscalate, confidence: topSim,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("support-chat error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
