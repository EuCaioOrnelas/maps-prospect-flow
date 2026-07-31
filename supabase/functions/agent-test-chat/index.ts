import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { agentId, messages, simulateEvents } = await req.json();

    if (!agentId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing agentId or messages' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch agent (verify ownership)
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const maxChars = agent.max_response_chars || 300;
    const wizardMaxConsecutive = parseInt(
      (agent.wizard_data as Record<string, any>)?.maxConsecutiveMessages || '3', 10
    );
    const maxConsecutiveMessages = Math.min(Math.max(wizardMaxConsecutive, 1), 5);
    const estimatedMaxTokens = Math.max(400, Math.ceil((maxChars * maxConsecutiveMessages) / 2));

    const stylePrompts: Record<string, string> = {
      formal: 'Responda de forma formal e profissional.',
      neutral: 'Responda de forma neutra e amigável.',
      informal: 'Responda de forma informal e descontraída.',
    };

    const baseSystemPrompt = agent.system_prompt || 'Você é um assistente de prospecção via WhatsApp.';
    const agentGoal = agent.agent_objective || 'Responder de forma útil e encerrar a conversa.';
    const endCriteria = agent.end_conversation_criteria || 'Encerre após responder a dúvida principal.';

    // Build CRM classification rules (same as production)
    const crmStageEnd = agent.crm_stage_on_end;
    const crmStageLost = (agent as any).crm_stage_on_lost;
    const crmStageUnknownName = agent.crm_stage_on_unknown;

    let crmClassificationRules = '';
    if (crmStageEnd || crmStageLost || crmStageUnknownName) {
      crmClassificationRules = `
REGRA CRÍTICA — CLASSIFICAÇÃO DO DESFECHO DA CONVERSA:
Você DEVE classificar o desfecho de cada conversa usando os marcadores abaixo.

MARCADORES DE CLASSIFICAÇÃO (adicione no FINAL da sua resposta):
`;
      if (crmStageEnd) {
        crmClassificationRules += `
- [CONVERSA_ENCERRADA] → Conversa terminou com SUCESSO (objetivo atingido)
  → O lead será movido para "${crmStageEnd}"
`;
      }
      if (crmStageLost) {
        crmClassificationRules += `
- [LEAD_PERDIDO] → Lead CLARAMENTE não tem interesse
  → O lead será movido para "${crmStageLost}"
`;
      }
      if (crmStageUnknownName) {
        crmClassificationRules += `
- [NAO_SEI] → Você NÃO consegue responder algo que o lead perguntou
  → O lead será movido para "${crmStageUnknownName}" para atendimento humano
`;
      }
      crmClassificationRules += `
⚠️ Use APENAS UM marcador por resposta. Os marcadores são INVISÍVEIS para o lead.
`;
    }

    const fullSystemPrompt = `# ⚠️ INSTRUÇÃO PRIMÁRIA

${baseSystemPrompt}

---

# REGRAS OPERACIONAIS DO SISTEMA

## OBJETIVO DA CONVERSA
${agentGoal}

## CRITÉRIOS DE ENCERRAMENTO
${endCriteria}

## REGRAS DO PROMPT
1. Siga o roteiro. Faça UMA pergunta por vez.
2. Consulte o histórico e não repita perguntas já respondidas.
3. NUNCA invente informações. Se não souber, use [NAO_SEI].
${crmClassificationRules}

## FORMATO DAS MENSAGENS
- Separe cada assunto em blocos com LINHA EM BRANCO.
- Máximo ${maxChars} caracteres por bloco.
- Mínimo 2, máximo ${maxConsecutiveMessages} blocos por resposta.

## NATURALIDADE
1. NÃO repita saudações se já foram ditas.
2. Seja natural como uma conversa real de WhatsApp.
3. ${stylePrompts[agent.communication_style] || stylePrompts.neutral}

## ENCERRAMENTO
- Desfecho positivo → [CONVERSA_ENCERRADA]
- Lead sem interesse → [LEAD_PERDIDO]
- Não sabe responder → [NAO_SEI]

## ARQUIVOS E MÍDIA
- Se há arquivos configurados, use [ENVIAR_PDF:...] ou [ENVIAR_IMAGEM:...] quando a condição for atendida.`;

    // Build conversation for OpenAI
    const conversationHistory = messages.map((msg: any) => {
      const role = msg.direction === 'sent' ? 'Você' : 'Lead';
      const typeLabel = msg.type === 'audio' ? ' [áudio transcrito]' : '';
      return `${role}${typeLabel}: ${msg.content}`;
    }).join('\n');

    const lastUserMessages = messages.filter((m: any) => m.direction === 'received');
    const lastMessage = lastUserMessages[lastUserMessages.length - 1];

    const userPrompt = `HISTÓRICO DA CONVERSA:
${conversationHistory}

NOVA MENSAGEM DO LEAD:
${lastMessage?.content || ''}

Responda de forma natural. Separe cada assunto em blocos com linha em branco entre eles.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: estimatedMaxTokens + 50,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    logAiUsage({ feature: 'agent-test-chat', model: 'gpt-4o-mini', usage: aiData.usage });
    let replyContent = aiData.choices?.[0]?.message?.content || 'Entendi, obrigado! 👍';

    // Detect markers and generate all events
    const events: { type: string; label: string; stage?: string }[] = [];

    // CRM stage events from the new lead
    const crmStageReply = agent.crm_stage_on_reply;
    const crmStageNewLead = agent.crm_stage_on_new_lead;
    const isFirstMessage = messages.filter((m: any) => m.direction === 'received').length <= 1;

    if (isFirstMessage && crmStageReply) {
      events.push({
        type: 'crm_move',
        label: `📋 Lead movido para "${crmStageReply}" (agente respondeu)`,
        stage: crmStageReply
      });
    }

    if (replyContent.includes('[CONVERSA_ENCERRADA]')) {
      events.push({ 
        type: 'objective_completed', 
        label: `✅ Objetivo atingido — Lead transferido para "${crmStageEnd || 'coluna configurada'}"`,
        stage: crmStageEnd || undefined
      });
    }
    if (replyContent.includes('[LEAD_PERDIDO]')) {
      events.push({ 
        type: 'lead_lost', 
        label: `❌ Lead perdido — Transferido para "${crmStageLost || 'coluna configurada'}"`,
        stage: crmStageLost || undefined
      });
    }
    if (replyContent.includes('[NAO_SEI]')) {
      events.push({ 
        type: 'human_handoff', 
        label: `🤝 Agente não soube responder — Transferido para "${crmStageUnknownName || 'atendimento humano'}"`,
        stage: crmStageUnknownName || undefined
      });
    }

    // Simulate bot detection patterns (check if lead messages look automated)
    const leadMessages = messages.filter((m: any) => m.direction === 'received').map((m: any) => m.content || '');
    const botPatterns = [
      /^(1|2|3|4|5|6|7|8|9|0)$/,
      /menu|voltar|sair|^#/i,
      /digite|escolha uma opção|selecione/i,
    ];
    const recentLeadMsgs = leadMessages.slice(-3);
    const looksLikeBot = recentLeadMsgs.length >= 2 && recentLeadMsgs.filter((m: string) => 
      botPatterns.some(p => p.test(m.trim()))
    ).length >= 2;

    if (looksLikeBot) {
      events.push({
        type: 'bot_detected',
        label: '🤖 Padrão de bot/automação detectado nas respostas do lead'
      });
      events.push({
        type: 'antiloop_sent',
        label: '⚡ Anti-loop ativado — Mensagem de verificação enviada ao lead'
      });
    }

    // Check operating hours simulation
    const now = new Date();
    const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMinutes = spNow.getHours() * 60 + spNow.getMinutes();
    const [startH, startM] = (agent.operating_hours_start || '08:00').split(':').map(Number);
    const [endH, endM] = (agent.operating_hours_end || '18:00').split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const is24h = startH === 0 && startM === 0 && endH === 23 && endM === 59;
    const isInHours = is24h || (endMin >= startMin ? (currentMinutes >= startMin && currentMinutes <= endMin) : (currentMinutes >= startMin || currentMinutes <= endMin));
    
    if (!isInHours) {
      events.push({
        type: 'outside_hours',
        label: `⏰ Fora do horário de operação (${agent.operating_hours_start?.slice(0,5)} – ${agent.operating_hours_end?.slice(0,5)}) — Mensagem seria enfileirada`
      });
    }

    // Check max replies simulation
    const agentSentCount = messages.filter((m: any) => m.direction === 'sent' && m.type !== 'event').length;
    const maxReplies = agent.max_replies || 1;
    if (agentSentCount >= maxReplies) {
      events.push({
        type: 'agent_paused',
        label: `⏸️ Limite de ${maxReplies} rodada(s) atingido — Agente pausaria até lead enviar nova mensagem`
      });
    }

    // Detect media markers
    const mediaMarkers: { type: string; url: string; caption: string }[] = [];
    const imageRegex = /\[ENVIAR_IMAGEM:([^|\]]+)\|?([^\]]*)\]/g;
    let match;
    while ((match = imageRegex.exec(replyContent)) !== null) {
      mediaMarkers.push({ type: 'image', url: match[1].trim(), caption: match[2]?.trim() || '' });
    }
    const pdfRegex = /\[ENVIAR_PDF:([^|\]]+)\|?([^\]]*)\]/g;
    while ((match = pdfRegex.exec(replyContent)) !== null) {
      mediaMarkers.push({ type: 'pdf', url: match[1].trim(), caption: match[2]?.trim() || 'documento.pdf' });
    }

    // Clean markers from response
    replyContent = replyContent
      .replace(/\s*\[CONVERSA_ENCERRADA\]\s*/g, '')
      .replace(/\s*\[LEAD_PERDIDO\]\s*/g, '')
      .replace(/\s*\[NAO_SEI\]\s*/g, '')
      .replace(/\s*\[ENVIAR_IMAGEM:[^\]]+\]\s*/g, ' ')
      .replace(/\s*\[ENVIAR_PDF:[^\]]+\]\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return new Response(JSON.stringify({ 
      reply: replyContent, 
      events,
      media: mediaMarkers,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('agent-test-chat error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
