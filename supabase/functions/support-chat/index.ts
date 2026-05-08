// Wian — Wiize support AI chat (OpenAI gpt-4o-mini)
// - Cria/usa um support ticket
// - Faz busca semântica em KB + FAQs (pgvector via Lovable Embeddings)
// - Chama OpenAI com prompt grounded
// - Só escala para humano quando o modelo explicitamente diz "ESCALAR_HUMANO"
// - Identifica cliente pagante / usuário cadastrado / visitante para priorização
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!; // só para embeddings
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_BASE = `Você é Wian, atendente virtual oficial da Wiize — plataforma B2B brasileira de prospecção, WhatsApp e CRM.

Funcionalidades principais da Wiize (use como conhecimento base):
- Prospecção de leads B2B via Google Maps/SERP por nicho e localização (Oportunidades).
- Aquecimento de Chips/Números de WhatsApp em 4 níveis progressivos durante 20 dias, para preparar números novos antes de campanhas.
- Campanhas de WhatsApp em duas APIs: Evolution API (outbound/prospecção) e Meta Cloud API (inbound/relacionamento com templates aprovados).
- CRM Kanban com leads, pontuação (scoring), tags, integração com Google Drive.
- Chat com IA, fluxos automatizados (Flow Builder com nós de IA, mídia, espera, integrações Google Sheets/Calendar/Gmail).
- Planos: Start, Growth e Enterprise (com limites de buscas, números conectados e features).

Tom: profissional, amigável, objetivo. Português brasileiro. Respostas curtas (no máximo 3 parágrafos curtos). Use markdown padrão: **negrito**, listas com - e numeradas, que serão renderizadas no chat.

REGRAS CRÍTICAS DE VERACIDADE (siga obrigatoriamente):
- NUNCA invente números, prazos, quantidades, etapas, valores, limites de plano, nomes de recursos ou qualquer detalhe específico.
- Só afirme algo específico (ex.: "20 dias", "4 níveis", "10 chips", preços, nomes de planos) se a informação estiver LITERALMENTE presente no CONTEXTO abaixo. Se não estiver, NÃO mencione números/etapas — fale apenas em termos gerais ou diga que vai confirmar.
- Se você não tem certeza absoluta da resposta, NÃO chute. Responda exatamente "ESCALAR_HUMANO" (e nada mais).
- Use prioritariamente o "CONTEXTO" abaixo. Se o contexto não cobrir o tema, e a pergunta for sobre algo específico (configuração, número exato, valor, passo a passo) → "ESCALAR_HUMANO".
- Para perguntas conceituais amplas (o que é prospecção, para que serve CRM, etc.) você pode responder de forma genérica SEM inventar detalhes específicos.
- Só responda exatamente "ESCALAR_HUMANO" (e nada mais) quando: (a) o usuário pedir falar com humano; (b) problema crítico (cobrança, conta bloqueada, bug, perda de dados); (c) tema fora do escopo Wiize; (d) você não tem certeza ou faltam informações no CONTEXTO para responder com precisão.
- Não cite IDs internos nem "knowledge base".
- Ao entregar uma solução concreta vinda do CONTEXTO, encerre com: "Isso resolveu seu problema?". Se não houver solução concreta, escale.`;

async function embed(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { ticketId: incomingTicketId, message, history = [], visitorSession, imageDataUrl } = body;
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve usuário autenticado e classifica
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;
    let userPhone: string | null = null;
    let customerType: "paid_client" | "registered_user" | "guest" = "guest";
    let priority: "low" | "medium" | "high" = "low";

    const auth = req.headers.get("Authorization");
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email ?? null;
        const { data: profile } = await sb
          .from("profiles")
          .select("name, email, phone, plan, is_custom_subscription, subscription_current_period_end")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          userName = profile.name ?? null;
          userEmail = profile.email ?? userEmail;
          userPhone = profile.phone ?? null;
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
        } else {
          customerType = "registered_user";
          priority = "medium";
        }
      }
    }

    // Garante o ticket
    let ticketId = incomingTicketId;
    if (!ticketId) {
      const { data: t, error } = await sb.from("support_tickets").insert({
        user_id: userId,
        visitor_session: visitorSession ?? null,
        name: userName,
        email: userEmail,
        phone: userPhone,
        status: "open",
        priority,
        customer_type: customerType,
      }).select("id").single();
      if (error) throw error;
      ticketId = t.id;
    }

    // Persiste mensagem do usuário
    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "user", content: message,
      metadata: imageDataUrl ? { has_image: true } : null,
    });

    // Busca semântica
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

    // Fallback por palavra-chave quando não há embeddings (ou nada bate)
    if (faqResults.length === 0) {
      const tokens = message
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 4)
        .slice(0, 6);
      if (tokens.length) {
        const orFilter = tokens
          .flatMap((t) => [`title.ilike.%${t}%`, `content.ilike.%${t}%`])
          .join(",");
        const { data: kwFaqs } = await sb
          .from("faqs")
          .select("id, title, content")
          .eq("active", true)
          .or(orFilter)
          .limit(4);
        faqResults = (kwFaqs ?? []).map((f: any) => ({ ...f, similarity: 0.5 }));
      }
    }

    const topSim = Math.max(
      0,
      ...kbResults.map((k) => k.similarity || 0),
      ...faqResults.map((f) => f.similarity || 0),
    );

    const mustEscalate = kbResults.some((k) => k.auto_escalate && k.similarity > 0.6);

    // Monta contexto
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
    if (!context) context = "\n(sem itens específicos da base — responda com cautela usando conhecimento geral sobre a Wiize)\n";

    const messages = [
      { role: "system", content: `${SYSTEM_BASE}\n\nCONTEXTO:${context}` },
      ...history.slice(-10).map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      { role: "user", content: message },
    ];

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("OpenAI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Falha no provedor de IA." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    let answer: string = aiJson.choices?.[0]?.message?.content?.trim() || "";

    const explicitEscalate = /^ESCALAR_HUMANO$/m.test(answer.trim());
    let shouldEscalate = mustEscalate || explicitEscalate;

    if (shouldEscalate) {
      answer = "Esse caso precisa de uma análise mais detalhada da nossa equipe. Vou conectar você com um humano agora.";
    }

    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "ai", content: answer,
      metadata: { confidence: topSim, escalated: shouldEscalate, kb_ids: kbResults.map((k) => k.id) },
    });

    await sb.from("ai_logs").insert({
      ticket_id: ticketId, query: message,
      matched_kb_ids: kbResults.map((k) => k.id),
      matched_faq_ids: faqResults.map((f) => f.id),
      confidence: topSim,
      model: "gpt-4o-mini",
      tokens_in: aiJson.usage?.prompt_tokens ?? null,
      tokens_out: aiJson.usage?.completion_tokens ?? null,
    });

    const update: any = { ai_confidence: topSim };
    if (shouldEscalate) update.status = "escalated";
    await sb.from("support_tickets").update(update).eq("id", ticketId);

    return new Response(JSON.stringify({
      ticketId,
      answer,
      escalate: shouldEscalate,
      confidence: topSim,
      user: userId ? {
        authenticated: true,
        name: userName,
        email: userEmail,
        phone: userPhone,
        customerType,
      } : { authenticated: false },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("support-chat error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
