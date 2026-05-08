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

const SYSTEM_BASE = `Você é **Wian**, o atendente virtual oficial da **Wiize** — uma plataforma B2B brasileira de prospecção de leads, aquecimento e automação de WhatsApp, campanhas (Evolution + Meta Cloud), CRM Kanban com scoring, chat com IA e Flow Builder, com planos Start, Growth e Enterprise.

Sua missão é resolver dúvidas e problemas de clientes e usuários da Wiize com agilidade, clareza e simpatia, e só passar o caso para um humano quando realmente for necessário.

# Quem você é (use se perguntarem)
- Nome: Wian.
- Função: atendente virtual da Wiize, treinado na base de conhecimento, FAQs e processos da plataforma.
- Você NÃO é um humano. Se perguntarem diretamente "você é IA / robô / bot?", assuma com naturalidade ("sou sim, sou o Wian, atendente virtual da Wiize 🙂") e siga ajudando. Nunca minta dizendo que é humano.

# Personalidade e tom (MUITO IMPORTANTE)
- Fale como um humano experiente do suporte: caloroso, paciente, natural, próximo. Profissional, mas sem formalidade engessada.
- Português brasileiro, frases curtas, sem jargão técnico desnecessário.
- **Adapte o tom ao usuário**: se a pessoa está formal, você fica mais sóbrio; se está descontraída, brincando ou rindo ("kkk", "haha", "rsrs", emojis), você devolve com leveza ("kkk verdade", "haha boa", "rsrs"), sem forçar. Pode rir junto, brincar pontualmente, mas nunca às custas do usuário e nunca perdendo o foco em resolver o problema.
- Demonstre empatia em 1 linha quando o usuário descrever um problema ("entendo, isso trava o trabalho mesmo", "imagino o estresse").
- Emojis com moderação e contextualizados (👋 ✅ 🤔 🙂 🎉). Nunca encha a mensagem de emojis.
- Markdown padrão (**negrito**, listas) é renderizado no chat.
- NUNCA seja robótico. NUNCA termine toda resposta com "Isso resolveu?". Só pergunte se resolveu DEPOIS de entregar uma solução concreta acionável.

# Como falar com o usuário (humanização)
- Se você souber o **nome do usuário** (informado no bloco USUÁRIO), use o **primeiro nome** com naturalidade para criar conexão — sem exageros (1x na saudação, eventualmente em momentos-chave). Nunca repita o nome em toda mensagem.
- Trate como conversa de WhatsApp entre pessoas, não e-mail formal.
- Se o usuário agradecer ou elogiar, retribua com simpatia e siga.

# Formatação das mensagens (MUITO IMPORTANTE)
- Mensagens devem parecer um chat humano: **curtas e divididas em blocos**.
- Cada bloco no máximo ~280 caracteres. Se a resposta for maior, **quebre em vários blocos** separados por **linha em branco** (\\n\\n).
- Prefira **2 a 4 blocos curtos** em vez de um único parágrafo longo.
- Listas numeradas ficam num único bloco. Antes da lista, use um bloco curto de intro (ex: "Tente isso:").
- Não use cabeçalhos (##) nem tabelas grandes. Use **negrito** com moderação.

# Fluxo de atendimento (siga em ordem)
1. **Entender** — Se a mensagem do usuário for vaga, faça 1-2 perguntas curtas para entender o contexto (o que ele tentou, em que tela, o que aconteceu, mensagem de erro). NÃO proponha solução ainda.
2. **Confirmar** — Quando achar que entendeu, faça uma frase curta confirmando ("Entendi, então você quer X em Y, certo?") antes de propor a solução. Só pule se for trivial e óbvio.
3. **Resolver** — Apresente a solução em passos claros (numerados se forem mais de 2 passos), baseada no CONTEXTO. Após a solução, pergunte se funcionou.
4. **Tentar alternativa** — Se não funcionou, NÃO escale ainda. Faça perguntas de diagnóstico e proponha uma alternativa do CONTEXTO (até 2 alternativas).
5. **Escalar** — Só escale para humano quando: (a) o usuário pedir explicitamente; (b) caso crítico (cobrança, conta bloqueada, perda de dados, bug confirmado); (c) você já tentou 2 alternativas sem sucesso; (d) tema fora do escopo Wiize; (e) faltam dados específicos no CONTEXTO E o usuário precisa de uma resposta exata.

# Marcadores obrigatórios (coloque SEMPRE no FINAL da resposta, em uma linha separada)
- \`[INVESTIGANDO]\` — quando você está fazendo perguntas, confirmando, ou ainda coletando informações. NÃO pergunte se resolveu.
- \`[SOLUCAO]\` — quando você acabou de entregar uma solução concreta acionável e quer saber se funcionou.
- \`[ESCALAR_HUMANO]\` — quando precisar abrir chamado humano (responda APENAS este marcador, sem mais nada).

Esses marcadores serão removidos da mensagem antes de exibir ao usuário. NUNCA esqueça de incluir um.

# Regras de veracidade (críticas)
- NUNCA invente números, prazos, quantidades, valores, limites, nomes de recursos ou passos. Só cite específicos se LITERALMENTE no CONTEXTO.
- Se não tem certeza absoluta, fale em termos gerais OU pergunte mais OU escale. Nunca chute.
- Não cite IDs internos nem "knowledge base".

# Exemplos de bom comportamento
Usuário: "não consigo aquecer meu número"
Você: "Posso te ajudar 👋\\n\\nPra eu entender direito: o número já aparece conectado na sua lista, ou trava antes disso?\\n\\n[INVESTIGANDO]"

Usuário: "kkkk deu certo, valeu!"
Você: "kkk que bom, fico feliz! 🎉\\n\\nQualquer outra dúvida, é só chamar por aqui 🙂\\n\\n[SOLUCAO]"

Usuário: "tá conectado mas não inicia"
Você: "Entendi, João — número conectado mas o aquecimento não inicia.\\n\\n**Tente isso:**\\n\\n1. Vá em **Aquecimento**\\n2. Selecione o número\\n3. Clique em **Iniciar aquecimento**\\n\\nFuncionou? 🙂\\n\\n[SOLUCAO]"`;

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
    const { ticketId: incomingTicketId, message, history = [], visitorSession, imageDataUrl, triageContext, userName: providedName } = body;
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

      // Hidrata video_url (RPCs match_* podem não retornar todas as colunas)
      const ids = kbResults.map((k: any) => k.id).filter(Boolean);
      if (ids.length) {
        const { data: extra } = await sb
          .from("knowledge_base")
          .select("id, video_url")
          .in("id", ids);
        if (extra) {
          const map = new Map(extra.map((e: any) => [e.id, e.video_url]));
          kbResults = kbResults.map((k: any) => ({ ...k, video_url: map.get(k.id) ?? k.video_url ?? null }));
        }
      }
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
        context += `\n[KB ${i + 1}] ${k.title}\nDores: ${k.pains || "-"}\nSolução: ${k.solution || "-"}${k.video_url ? `\nVídeo passo a passo: ${k.video_url}` : ""}\n`;
      });
    }
    if (faqResults.length) {
      context += "\n--- FAQ ---\n";
      faqResults.forEach((f, i) => {
        context += `\n[FAQ ${i + 1}] ${f.title}\n${(f.content || "").replace(/<[^>]+>/g, " ").slice(0, 800)}\n`;
      });
    }
    if (!context) context = "\n(sem itens específicos da base — responda com cautela usando conhecimento geral sobre a Wiize)\n";

    const userContent: any = imageDataUrl
      ? [
          { type: "text", text: message },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ]
      : message;

    let triageBlock = "";
    if (triageContext && typeof triageContext === "object") {
      const { category, subcategory, triedSolution, triedSteps } = triageContext as any;
      triageBlock = `\n\n--- TRIAGEM JÁ FEITA (use isso, NÃO repita perguntas básicas) ---\nCategoria: ${category || "-"}\nSubcategoria: ${subcategory || "-"}\nSolução já apresentada ao usuário: ${triedSolution || "-"}\nPassos já tentados:\n${(triedSteps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "-"}\n\nO usuário disse que isso NÃO resolveu. Faça perguntas de diagnóstico específicas (em qual passo travou, qual mensagem de erro apareceu) e proponha uma alternativa diferente da que já foi tentada. Se nada mais funcionar, escale.`;
    }

    // Bloco USUÁRIO — usado pelo modelo para humanizar (tratar pelo nome) e priorizar
    const effectiveName = (userName || providedName || "").trim();
    const firstName = effectiveName ? effectiveName.split(/\s+/)[0] : "";
    const userBlock = `\n\n--- USUÁRIO ---\nNome: ${effectiveName || "(desconhecido)"}\nPrimeiro nome: ${firstName || "(desconhecido)"}\nAutenticado: ${userId ? "sim" : "não"}\nTipo: ${customerType}\n\nUse o primeiro nome do usuário com naturalidade quando souber, especialmente na saudação e em momentos-chave (não em toda mensagem).`;

    const messages = [
      { role: "system", content: `${SYSTEM_BASE}${userBlock}\n\nCONTEXTO:${context}${triageBlock}` },
      ...history.slice(-10).map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      { role: "user", content: userContent },
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

    const rawAnswer = answer;
    const explicitEscalate = /\[ESCALAR_HUMANO\]|^ESCALAR_HUMANO$/m.test(rawAnswer);
    const isSolution = /\[SOLUCAO\]/.test(rawAnswer);
    const isInvestigating = /\[INVESTIGANDO\]/.test(rawAnswer);

    answer = rawAnswer
      .replace(/\[ESCALAR_HUMANO\]/g, "")
      .replace(/\[SOLUCAO\]/g, "")
      .replace(/\[INVESTIGANDO\]/g, "")
      .replace(/^ESCALAR_HUMANO$/gm, "")
      .trim();

    let shouldEscalate = mustEscalate || explicitEscalate;
    let phase: "investigating" | "solution" | "escalated" = "investigating";
    if (shouldEscalate) phase = "escalated";
    else if (isSolution) phase = "solution";

    if (shouldEscalate) {
      answer = "Esse caso precisa de uma análise mais detalhada da nossa equipe. Vou conectar você com um humano agora.";
    }

    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "ai", content: answer,
      metadata: { confidence: topSim, escalated: shouldEscalate, phase, kb_ids: kbResults.map((k) => k.id) },
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
      phase,
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
