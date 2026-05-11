// Wian — Wiize support AI chat (OpenAI gpt-4o-mini)
// Fase 1: state machine, frustration score, progressive summary, cost tracking
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// =============== WIAN TOOLS (function calling) ===============
// Schema enviado ao OpenAI; só é incluído quando o user está autenticado.
const WIAN_TOOLS = [
  { type: "function", function: { name: "get_account_overview", description: "Plano, créditos, status do trial, dados básicos da conta.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_whatsapp_connections", description: "Lista todos os números conectados (Evolution e Meta WABA), status, último envio, expiração de token.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_warming_status", description: "Status de aquecimento dos números: nível, mensagens hoje, limite, erros.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_active_campaigns", description: "Últimas campanhas: status, total/enviados/falhas, agendamento.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_campaign_details", description: "Detalhes de UMA campanha + incidentes recentes.", parameters: { type: "object", properties: { campaignId: { type: "string" } }, required: ["campaignId"] } } },
  { type: "function", function: { name: "get_crm_summary", description: "Resumo do CRM: total leads, leads sem follow-up 7d, distribuição por estágio, score médio.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_recent_leads", description: "Últimos leads: contato, empresa, score, telefone mascarado.", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_active_flows", description: "Lista de flows de WhatsApp do user: status, API, número.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_ai_agents_status", description: "Agentes de IA configurados: nome, modelo, limites.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_recent_errors", description: "Incidentes recentes em campanhas (erros de envio, números inválidos).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_recent_frontend_errors", description: "Erros JavaScript que aconteceram no NAVEGADOR do usuário (com arquivo, linha, stack trace e rota). Use SEMPRE quando o user reclamar de tela travada, botão que não funciona, erro visual, página em branco, qualquer bug de interface.", parameters: { type: "object", properties: { limit: { type: "number" }, route: { type: "string", description: "Filtrar por rota específica, ex: /whatsapp" } } } } },
  { type: "function", function: { name: "pause_campaign", description: "Pausa uma campanha. SEM confirmed=true só retorna preview; com confirmed=true executa.", parameters: { type: "object", properties: { campaignId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["campaignId"] } } },
  { type: "function", function: { name: "resume_campaign", description: "Retoma uma campanha pausada. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { campaignId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["campaignId"] } } },
  { type: "function", function: { name: "reconnect_whatsapp", description: "RESET TOTAL de um número Evolution: desconecta, deleta a instância antiga (com cascade), recria com o MESMO telefone e gera nova instância pra QR. Use quando user diz 'não consigo conectar', 'instance travada', 'QR não aparece'. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { numberId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["numberId"] } } },
  { type: "function", function: { name: "delete_whatsapp_connection", description: "Exclui DEFINITIVAMENTE um número (sem recriar). Apaga campanhas vinculadas, desconecta e remove a linha. Retorna lista de cuidados pro user reconfigurar manualmente. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { numberId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["numberId"] } } },
  { type: "function", function: { name: "silence_ai_agent", description: "Silencia o agente IA em uma conversa específica. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { conversationId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["conversationId"] } } },
  { type: "function", function: { name: "unsilence_ai_agent", description: "Reativa o agente IA em uma conversa que estava silenciada. Use quando user diz 'reativar IA', 'voltar o bot', 'a IA parou de responder essa conversa'. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { conversationId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["conversationId"] } } },
  { type: "function", function: { name: "cancel_campaign", description: "Cancela DEFINITIVAMENTE uma campanha (status=failed). Diferente de pause: não pode ser retomada. Use quando user quer parar de vez. Mesmo padrão de confirmação.", parameters: { type: "object", properties: { campaignId: { type: "string" }, confirmed: { type: "boolean" } }, required: ["campaignId"] } } },
];

// Knowledge compacto por categoria de triagem — injetado no prompt.
const WIAN_KB: Record<string, string> = {
  campanhas: "CAMPANHAS: disparo via Meta (Outbound) ou CRM (Relational). Status: pending→running→paused/completed/failed. DDI 55 obrigatório. Delays de segurança automáticos. Pode pausar/retomar a qualquer momento.",
  conexoes: "CONEXÕES: 2 APIs — Evolution (aquecimento, QR Code) e Meta WABA (campanhas+chat, OAuth). Tokens Meta podem expirar; reconectar pelo painel WhatsApp→Conexões.",
  aquecimento: "AQUECIMENTO: cresce por nível (1→hot). Limite diário reseta 08:00. Forçar volume = risco de ban. Se sessão Evolution cair, aquecimento para.",
  crm: "CRM: Kanban progressivo, leads só avançam. Estágio 'Prospectado' protegido. Score 0-1000 recalculado por evento. Tags centralizadas em Configurações.",
  ia_agents: "IA AGENTS: agente é silenciado quando humano responde (handoff). Limite/dia varia por aquecimento. Modelo padrão gpt-4o-mini.",
  chat: "CHAT: inbox unificado por WABA. Mídias: imagem 5MB, vídeo 16MB. Humano respondendo silencia o agente IA naquela conversa.",
  flows: "FLOWS: builder visual com nós (mensagem, IA, dados, espera). 3 gerações por IA/dia. Filtro por WABA. Sem dead-ends na geração IA.",
  oportunidades: "OPORTUNIDADES: 1 busca = 3 créditos = ~60 leads. Perfil da empresa OBRIGATÓRIO. Score adapta por nicho. Outreach IA monta msg em 4 parágrafos.",
  conta: "CONTA: Auth Supabase nativo (email/senha + Google). Reset de senha exige email validado. Google Drive/Calendar via OAuth próprio.",
  financeiro: "BILLING: planos Start/Growth/Enterprise (UI), Stripe (cartão internacional) ou Asaas (PIX/cartão BR). Trial 7 dias. Cobrança é em 'Oportunidades'. Cancelamento via portal.",
  cancelamento: "CANCELAMENTO: feito no portal Conta→Assinatura→Cancelar (com formulário de feedback). Plano segue ativo até fim do período pago.",
};

async function callWianTool(authHeader: string, tool: string, params: any) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/support-wian-tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body: JSON.stringify({ tool, params }),
    });
    const j = await res.json();
    if (!res.ok) return { error: j?.error || `tool_http_${res.status}` };
    return j.result ?? j;
  } catch (e: any) {
    return { error: e?.message || "tool_fetch_error" };
  }
}

const SYSTEM_BASE = `Você é **Wian**, o atendente virtual oficial da **Wiize** — uma plataforma B2B brasileira de prospecção de leads, aquecimento e automação de WhatsApp, campanhas (Evolution + Meta Cloud), CRM Kanban com scoring, chat com IA e Flow Builder, com planos Start, Growth e Enterprise.

Sua missão é resolver dúvidas e problemas de clientes e usuários da Wiize com agilidade, clareza e simpatia, e só passar o caso para um humano quando realmente for necessário.

# Quem você é (use se perguntarem)
- Nome: Wian.
- Função: atendente virtual da Wiize, treinado na base de conhecimento, FAQs e processos da plataforma.
- Você NÃO é um humano. Se perguntarem diretamente "você é IA / robô / bot?", assuma com naturalidade ("sou sim, sou o Wian, atendente virtual da Wiize 🙂") e siga ajudando. Nunca minta dizendo que é humano.

# Personalidade e tom (MUITO IMPORTANTE)
- Fale como um humano experiente do suporte: caloroso, paciente, natural, próximo. Profissional, mas sem formalidade engessada.
- Português brasileiro, frases curtas, sem jargão técnico desnecessário.
- **Adapte o tom ao usuário**: se a pessoa está formal, você fica mais sóbrio; se está descontraída ("kkk", "haha"), você devolve com leveza, sem forçar.
- Demonstre empatia em 1 linha quando o usuário descrever um problema.
- **Máximo 3 emojis na conversa toda.** Use com moderação (👋 ✅ 🤔 🙂 🎉).
- Markdown padrão (**negrito**, listas) é renderizado.
- NUNCA seja robótico. NUNCA termine toda resposta com "Isso resolveu?". Só pergunte se resolveu DEPOIS de entregar uma solução concreta acionável.
- **Se já cumprimentou no histórico, NÃO cumprimente de novo.**
- **Não repita a mesma frase de transição 2x seguidas.**

# Como falar com o usuário (humanização)
- Se você souber o **nome do usuário** (bloco USUÁRIO), use o **primeiro nome** com naturalidade — sem exageros (1x na saudação, eventualmente em momentos-chave). Nunca em toda mensagem.
- Trate como conversa de WhatsApp, não e-mail formal.

# Formatação das mensagens (MUITO IMPORTANTE)
- Mensagens curtas, divididas em blocos. Cada bloco no máximo ~280 caracteres.
- Quebre em **2 a 4 blocos curtos** separados por linha em branco (\\n\\n) em vez de um parágrafo longo.
- Listas numeradas em um único bloco. Antes da lista, bloco curto de intro.
- Não use cabeçalhos (##) nem tabelas grandes.

# Fluxo de atendimento
1. **Entender** — Pergunta vaga? Faça 1-2 perguntas curtas de contexto. NÃO proponha solução ainda.
2. **Confirmar** — "Entendi, então X em Y, certo?" antes de propor solução. Pule se óbvio.
3. **Resolver** — Solução em passos numerados, baseada no CONTEXTO. Após, pergunte se funcionou.
4. **Tentar alternativa** — Se não funcionou, NÃO escale ainda. Diagnóstico + alternativa (até 2x).
5. **Escalar** — Só quando: (a) usuário pedir; (b) caso crítico (cobrança, conta bloqueada, perda de dados, bug); (c) 2 alternativas sem sucesso; (d) tema fora do escopo; (e) faltam dados específicos.

# Marcadores obrigatórios (SEMPRE no FINAL, em linha separada)
- \`[INVESTIGANDO]\` — perguntas/diagnóstico. NÃO pergunte se resolveu.
- \`[SOLUCAO]\` — solução entregue, perguntando se funcionou.
- \`[ESCALAR_HUMANO]\` — abrir chamado humano (responda APENAS este marcador).

Esses marcadores serão removidos antes de exibir. NUNCA esqueça de incluir um.

# Veracidade
- NUNCA invente números, prazos, valores, limites, recursos. Só cite específicos se LITERAL no CONTEXTO.
- Se não tem certeza, fale geral OU pergunte mais OU escale.
- Não cite IDs internos nem "knowledge base".

# Vídeos passo a passo
- Se o item do CONTEXTO trouxer "Vídeo passo a passo: <url>", inclua na própria solução em linha separada: \`📺 Vídeo passo a passo: <url>\` (URL crua — o chat embute o player).
- Sempre que houver vídeo, mande junto com 1-2 linhas curtas e em seguida pergunte se resolveu.
- Nunca invente URLs. Só use o link exato do CONTEXTO.`;

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

// ============================================================
// Frustration Score (0-100) — heurístico, sem IA
// ============================================================
const PALAVROES = [
  "merda","porra","caralho","foda","fodeu","fodendo","puta","cu","buceta",
  "bosta","desgraça","desgracado","cacete","piranha","babaca","otario","otário",
  "idiota","imbecil","retardado","retardada","lixo","horrível","horrivel",
  "péssimo","pessimo","ridículo","ridiculo","absurdo","decepcionante","vergonha"
];
const GATILHOS = [
  "já tentei","ja tentei","nao funciona","não funciona","nada funciona",
  "tá quebrado","ta quebrado","está quebrado","esta quebrado",
  "quero cancelar","vou cancelar","cancelar minha conta","cancela minha conta",
  "perdi tempo","perdendo tempo","sem paciência","sem paciencia",
  "que demora","muito demorado","horrível","péssimo","ridículo",
  "isso é um lixo","isso e um lixo","não aguento","nao aguento",
  "dinheiro de volta","reembolso","procon","reclame aqui",
];

function computeFrustration(currentMsg: string, history: any[], previousScore: number): number {
  let score = previousScore * 0.7; // decay leve a cada mensagem
  const msg = (currentMsg || "").toLowerCase();
  const msgRaw = currentMsg || "";

  // 1. CAPS LOCK (>60% de letras maiúsculas e mensagem com 6+ letras)
  const letters = msgRaw.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length >= 6) {
    const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
    if (upper / letters.length > 0.6) score += 25;
  }

  // 2. Palavrões
  for (const p of PALAVROES) if (msg.includes(p)) { score += 20; break; }

  // 3. Gatilhos de frustração
  let gatilhoCount = 0;
  for (const g of GATILHOS) if (msg.includes(g)) gatilhoCount++;
  score += Math.min(gatilhoCount * 12, 30);

  // 4. Pontuação excessiva (!!!, ???)
  if (/[!?]{3,}/.test(msgRaw)) score += 10;

  // 5. Repetição: mesma frase do usuário aparecendo nas últimas 3 mensagens dele
  const userMsgs = history.filter((h) => h.role === "user").slice(-3).map((h) => (h.content || "").toLowerCase().slice(0, 100));
  const cur = msg.slice(0, 100);
  if (cur.length > 10 && userMsgs.filter((m) => m && (m.includes(cur.slice(0, 40)) || cur.includes(m.slice(0, 40)))).length >= 2) {
    score += 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================
// Phase transition (state machine + audit)
// ============================================================
async function transitionPhase(sb: any, ticketId: string, fromPhase: string | null, toPhase: string, triggeredBy: string, metadata?: any) {
  if (fromPhase === toPhase) return;
  await sb.from("support_ticket_events").insert({
    ticket_id: ticketId,
    from_phase: fromPhase,
    to_phase: toPhase,
    triggered_by: triggeredBy,
    metadata: metadata ?? null,
  });
}

// ============================================================
// Progressive summary (a cada 6 mensagens novas)
// ============================================================
async function maybeUpdateSummary(sb: any, ticketId: string, currentSummary: string | null, lastSummaryCount: number, totalMessages: number) {
  if (totalMessages - lastSummaryCount < 6) return null;
  // pega últimas 12 mensagens para resumir junto com o resumo anterior
  const { data: msgs } = await sb
    .from("support_messages")
    .select("role, content, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (!msgs || msgs.length === 0) return null;

  const transcript = msgs.map((m: any) => `${m.role === "ai" ? "Wian" : m.role === "user" ? "Usuário" : m.role}: ${m.content}`).join("\n").slice(0, 6000);
  const prompt = `${currentSummary ? `Resumo até agora:\n${currentSummary}\n\n` : ""}Transcrição completa:\n${transcript}\n\nGere um resumo objetivo em até 5 bullets curtos sobre: o problema do usuário, contexto técnico relevante, o que já foi tentado, o que ainda falta. Português direto, sem floreios.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 250,
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const summary = j.choices?.[0]?.message?.content?.trim() || null;
    if (summary) {
      await sb.from("support_tickets").update({
        conversation_summary: summary,
        summary_message_count: totalMessages,
      }).eq("id", ticketId);
    }
    return summary;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { ticketId: incomingTicketId, message, history = [], visitorSession, imageDataUrl, triageContext, userName: providedName, confirmedAction } = body;
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
    let customerType: "paid_client" | "trial_user" | "guest" = "guest";
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
            customerType = "trial_user";
            priority = "medium";
          }
        } else {
          customerType = "trial_user";
          priority = "medium";
        }
      }
    }

    // Garante o ticket
    let ticketId = incomingTicketId;
    let currentTicket: any = null;
    if (!ticketId) {
      const initialPhase = triageContext ? "ai_investigating" : "triage";
      const { data: t, error } = await sb.from("support_tickets").insert({
        user_id: userId,
        visitor_session: visitorSession ?? null,
        name: userName,
        email: userEmail,
        phone: userPhone,
        status: "open",
        priority,
        customer_type: customerType,
        phase: initialPhase,
      }).select("*").single();
      if (error) throw error;
      ticketId = t.id;
      currentTicket = t;
      await transitionPhase(sb, ticketId, null, initialPhase, "system", { reason: triageContext ? "triage_failed" : "new_chat" });
    } else {
      const { data: t } = await sb.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
      currentTicket = t;
    }

    const previousFrustration = currentTicket?.frustration_score ?? 0;
    const previousPhase = currentTicket?.phase ?? "triage";

    // Persiste mensagem do usuário
    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "user", content: message,
      metadata: imageDataUrl ? { has_image: true } : null,
    });

    // Frustration score
    const newFrustration = computeFrustration(message, history, previousFrustration);

    // Total de mensagens (para summary)
    const { count: totalMessages } = await sb
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("ticket_id", ticketId);

    // Resumo progressivo (não bloqueia se falhar)
    const lastSummaryCount = currentTicket?.summary_message_count ?? 0;
    const conversationSummary = currentTicket?.conversation_summary ?? null;
    const newSummary = await maybeUpdateSummary(sb, ticketId, conversationSummary, lastSummaryCount, totalMessages || 0);
    const effectiveSummary = newSummary ?? conversationSummary;

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

      const ids = kbResults.map((k: any) => k.id).filter(Boolean);
      if (ids.length) {
        const { data: extra } = await sb
          .from("knowledge_base")
          .select("id, video_url, success_rate, category")
          .in("id", ids);
        if (extra) {
          const map = new Map(extra.map((e: any) => [e.id, e]));
          kbResults = kbResults.map((k: any) => {
            const e: any = map.get(k.id) || {};
            return { ...k, video_url: e.video_url ?? k.video_url ?? null, success_rate: e.success_rate ?? 0.5, kb_category: e.category ?? null };
          });
        }
      }

      // Weighted confidence: similarity*0.6 + category_match*0.2 + success*0.2
      const triageCat = (triageContext as any)?.category?.toLowerCase?.() || "";
      kbResults = kbResults.map((k: any) => {
        const catMatch = triageCat && k.kb_category && k.kb_category.toLowerCase().includes(triageCat) ? 1 : 0;
        const success = typeof k.success_rate === "number" ? k.success_rate : 0.5;
        const weighted = (k.similarity || 0) * 0.6 + catMatch * 0.2 + success * 0.2;
        return { ...k, weighted_score: weighted };
      }).sort((a: any, b: any) => (b.weighted_score || 0) - (a.weighted_score || 0));
    }

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
      ...kbResults.map((k) => k.weighted_score || k.similarity || 0),
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
      const hasTriedSteps = Array.isArray(triedSteps) && triedSteps.length > 0;
      triageBlock = `\n\n--- TRIAGEM JÁ FEITA (REGRA CRÍTICA: respeite isso) ---
Categoria escolhida pelo usuário: ${category || "-"}
Subcategoria: ${subcategory || "-"}
${hasTriedSteps ? `Solução já apresentada: ${triedSolution || "-"}\nPassos já tentados:\n${triedSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\nO usuário disse que isso NÃO resolveu. Faça diagnóstico específico e proponha alternativa diferente. Se nada funcionar, escale.` : `O usuário NÃO tentou uma solução pronta — caiu direto no chat com você dentro do tema "${category}".`}

REGRAS OBRIGATÓRIAS POR CAUSA DA TRIAGEM:
1. NUNCA pergunte "qual tema?" ou "do que se trata?" — o tema JÁ É "${category}". Mantenha-se nele.
2. NUNCA ofereça opções fora desse tema (ex: se categoria é "WhatsApp e conexões", não pergunte se é sobre leads/CRM/financeiro).
3. Se a mensagem do user for vaga ("não consigo gerar nada", "não funciona", "como faço"), interprete-a DENTRO de "${category}" e:
   a) Se autenticado: chame as tools relacionadas a "${category}" ANTES de perguntar (ex: categoria conexões → get_whatsapp_connections; campanhas → get_active_campaigns; aquecimento → get_warming_status).
   b) Só depois faça no MÁXIMO 1 pergunta curta e específica do tema.
4. Faça UMA pergunta por vez. Não dispare 3 blocos de perguntas seguidos.`;
    }

    const effectiveName = (userName || providedName || "").trim();
    const firstName = effectiveName ? effectiveName.split(/\s+/)[0] : "";
    const userBlock = `\n\n--- USUÁRIO ---\nNome: ${effectiveName || "(desconhecido)"}\nPrimeiro nome: ${firstName || "(desconhecido)"}\nAutenticado: ${userId ? "sim" : "não"}\nTipo: ${customerType}\nNível de frustração detectado: ${newFrustration}/100${newFrustration >= 60 ? " ⚠️ ALTA — seja MAIS empático, vá direto ao ponto, evite perguntas extras." : ""}`;

    const summaryBlock = effectiveSummary
      ? `\n\n--- RESUMO DA CONVERSA ATÉ AGORA ---\n${effectiveSummary}\n(use este resumo + as últimas mensagens abaixo como contexto completo)`
      : "";

    // Se temos resumo, mandamos só últimas 4 mensagens; senão últimas 10 (comportamento antigo)
    const historySize = effectiveSummary ? 4 : 10;

    // Knowledge específico da categoria de triagem
    const triageCat = (triageContext as any)?.category || "";
    const kbBlock = WIAN_KB[triageCat] ? `\n\n--- CONHECIMENTO DO PRODUTO (${triageCat}) ---\n${WIAN_KB[triageCat]}` : "";

    // Tools só para usuários autenticados
    const toolsEnabled = !!userId;
    const toolsBlock = toolsEnabled
      ? `\n\n--- FERRAMENTAS DISPONÍVEIS ---
Você tem TOOLS pra investigar a conta REAL do usuário e executar ações. RESOLVA AUTONOMAMENTE sempre que possível — só escale humano em último caso.

## REGRAS DE OURO
1. **DIAGNOSTIQUE ANTES DE RESPONDER**: pra qualquer reclamação concreta, chame as tools relevantes ANTES de propor solução.
   - "campanha não envia" → get_active_campaigns + get_campaign_details + get_whatsapp_connections + get_warming_status
   - "não consigo conectar número" / "QR não aparece" → get_whatsapp_connections (identifica o número travado)
   - "tela travada" / "botão não funciona" / "página em branco" → get_recent_frontend_errors PRIMEIRO
   - "agente respondendo errado" → get_ai_agents_status
   - "leads sumiram" → get_crm_summary + get_recent_leads
2. **NUNCA INVENTE** dados. Se não chamou tool, não afirme estado da conta.
3. **AÇÕES (mutações)**: chame SEM confirmed primeiro → mostre o summary retornado → aguarde "sim/confirmo" do user → só então re-chame com confirmed:true.
4. Telefones nas tools vêm mascarados; é normal.

## QUANDO USAR CADA AÇÃO
- **reconnect_whatsapp** → user diz "não consigo conectar", "instance travou", "QR sumiu", "diz que está conectado mas não envia". É reset destrutivo: deleta campanhas vinculadas e recria. Sempre alerte no summary.
- **delete_whatsapp_connection** → user quer EXCLUIR de vez (não reconectar). Mesma destruição mas sem recriar.
- **pause_campaign / resume_campaign** → controle de envio em andamento.
- **silence_ai_agent** → user quer assumir manualmente uma conversa.
- **unsilence_ai_agent** → user pede para reativar a IA numa conversa silenciada.
- **cancel_campaign** → user quer encerrar campanha definitivamente (não só pausar).

## DIAGNÓSTICO DE BUGS DE INTERFACE (CRÍTICO)
Quando user reclama de bug visual/funcional do APP (não do WhatsApp), SEMPRE chame get_recent_frontend_errors primeiro. Se voltar erro com arquivo:linha, isso é um BUG REAL do código:
- Tente orientar workaround se possível (recarregar página, limpar cache).
- Se não houver workaround claro, escale com [ESCALAR_HUMANO] e na MESMA mensagem inclua um bloco de diagnóstico assim:
  \`\`\`
  🐛 Bug detectado no código:
  • Mensagem: <erro.mensagem>
  • Arquivo: <erro.arquivo>:<erro.linha>
  • Rota: <erro.rota>
  • Ocorreu em: <data>
  \`\`\`
  Esse bloco aparece no histórico do humano, ajudando ele a identificar o arquivo exato.

## ESCALADA — ÚLTIMO RECURSO
Só use [ESCALAR_HUMANO] quando:
(a) usuário pedir explicitamente humano;
(b) bug de código confirmado por get_recent_frontend_errors (use bloco de diagnóstico acima);
(c) cobrança/billing/conta bloqueada que tools não resolvem;
(d) 2+ tentativas suas falharam de verdade.
Antes de escalar, SEMPRE chame as tools relevantes pra colher contexto e incluir no resumo.`
      : "";

    const messages: any[] = [
      { role: "system", content: `${SYSTEM_BASE}${userBlock}${summaryBlock}\n\nCONTEXTO:${context}${kbBlock}${triageBlock}${toolsBlock}` },
      ...history.slice(-historySize).map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se o frontend está enviando uma confirmação de ação, injetamos como
    // se o assistant tivesse acabado de re-chamar a tool com confirmed:true.
    if (toolsEnabled && confirmedAction?.tool && confirmedAction?.params) {
      const toolResult = await callWianTool(auth || "", confirmedAction.tool, { ...confirmedAction.params, confirmed: true });
      messages.push({
        role: "system",
        content: `Ação '${confirmedAction.tool}' acabou de ser executada com confirmação do usuário. Resultado: ${JSON.stringify(toolResult)}. Confirme o resultado ao user em 1-2 frases curtas e pergunte se precisa de mais algo. Inclua [SOLUCAO] no final.`,
      });
    }

    // ================== Tool-calling loop ==================
    const collectedToolCalls: Array<{ name: string; status: "running" | "done" | "error"; summary?: string; pending?: any }> = [];
    let aiJson: any = null;
    let answer = "";
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.3,
          ...(toolsEnabled ? { tools: WIAN_TOOLS, tool_choice: "auto", parallel_tool_calls: true } : {}),
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

      aiJson = await aiRes.json();
      const choice = aiJson.choices?.[0];
      const msg = choice?.message;
      const toolCalls = msg?.tool_calls || [];

      if (toolCalls.length && toolsEnabled) {
        // Adiciona a mensagem do assistant (com os tool_calls) ao histórico
        messages.push(msg);
        // Executa cada tool em paralelo
        const results = await Promise.all(
          toolCalls.map(async (tc: any) => {
            const name = tc.function?.name;
            let params: any = {};
            try { params = JSON.parse(tc.function?.arguments || "{}"); } catch { params = {}; }
            collectedToolCalls.push({ name, status: "running" });
            const r = await callWianTool(auth || "", name, params);
            const last = collectedToolCalls[collectedToolCalls.length - 1];
            if (r?.error) { last.status = "error"; last.summary = r.error; }
            else if (r?.requires_confirmation) {
              last.status = "done";
              last.summary = r.summary;
              last.pending = { tool: r.action, params: r.action_params };
            } else { last.status = "done"; }
            return { tool_call_id: tc.id, role: "tool", name, content: JSON.stringify(r) };
          }),
        );
        messages.push(...results);
        continue; // Próxima rodada com os resultados das tools
      }

      // Sem tool_calls → resposta final
      answer = msg?.content?.trim() || "";
      break;
    }


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

    // Frustration override: se score >= 60, força escalonamento mesmo sem o modelo pedir
    const frustrationEscalate = newFrustration >= 60;
    let shouldEscalate = mustEscalate || explicitEscalate || frustrationEscalate;

    // Decide nova fase
    let nextPhase: string;
    if (shouldEscalate) nextPhase = "escalated";
    else if (isSolution) nextPhase = "waiting_user_confirmation";
    else if (isInvestigating) nextPhase = "ai_investigating";
    else nextPhase = previousPhase;

    if (shouldEscalate) {
      answer = frustrationEscalate && !explicitEscalate
        ? "Percebi que isso está sendo frustrante — desculpa. Vou conectar você com alguém da nossa equipe humana agora pra resolver direto."
        : "Esse caso precisa de uma análise mais detalhada da nossa equipe. Vou conectar você com um humano agora.";
    }

    await sb.from("support_messages").insert({
      ticket_id: ticketId, role: "ai", content: answer,
      metadata: { confidence: topSim, escalated: shouldEscalate, phase: nextPhase, kb_ids: kbResults.map((k) => k.id) },
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

    // Atualiza ticket: frustration, phase, priority (se virou alta), status
    const update: any = {
      ai_confidence: topSim,
      frustration_score: newFrustration,
      phase: nextPhase,
    };
    if (shouldEscalate) update.status = "escalated";
    if (newFrustration >= 60 && currentTicket?.priority !== "high") update.priority = "high";

    await sb.from("support_tickets").update(update).eq("id", ticketId);

    // Audita transição se mudou
    if (nextPhase !== previousPhase) {
      await transitionPhase(sb, ticketId, previousPhase, nextPhase, "ai", {
        confidence: topSim,
        frustration_score: newFrustration,
        frustration_escalate: frustrationEscalate,
        explicit_escalate: explicitEscalate,
      });
    }

    // Pending action: se alguma tool retornou requires_confirmation, expomos pro front
    const pendingAction = collectedToolCalls.find((t) => t.pending)?.pending || null;
    const toolCallsView = collectedToolCalls.map((t) => ({ name: t.name, status: t.status, summary: t.summary }));

    return new Response(JSON.stringify({
      ticketId,
      answer,
      escalate: shouldEscalate,
      phase: nextPhase,
      confidence: topSim,
      frustration: newFrustration,
      toolCalls: toolCallsView,
      pendingAction,
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
