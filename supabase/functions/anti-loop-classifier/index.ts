import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// ---- Registro de custo de IA (inline; sem módulo compartilhado) ----
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};
async function logAiUsage(p: {
  feature: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const model = p.model.replace(/^openai\//, "").trim();
    const tin = p.tokens_in ?? p.usage?.prompt_tokens ?? 0;
    const tout = p.tokens_out ?? p.usage?.completion_tokens ?? 0;
    const price = AI_PRICES[model] ?? AI_PRICES["gpt-4o-mini"];
    const cost = p.cost_usd ?? tin * price.in + tout * price.out;
    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: p.feature,
        model,
        user_id: p.user_id ?? null,
        tokens_in: Math.round(tin),
        tokens_out: Math.round(tout),
        cost_usd: Number(cost.toFixed(8)),
        metadata: p.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}
// ---- fim registro de custo de IA ----

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * ANTI-LOOP CLASSIFIER
 * 
 * Modular classification service that analyzes conversation context to detect
 * bot/menu/automation patterns in lead responses.
 * 
 * This module does NOT respond to leads. It only classifies.
 * 
 * Input: conversation context (recent messages, current state)
 * Output: structured classification with recommended action
 */

// ============================
// TYPES
// ============================

interface ClassifierInput {
  // Recent messages from the lead (newest first)
  lead_messages: string[];
  // Recent messages from the agent (newest first)
  agent_messages: string[];
  // Current bot detection state of the conversation
  current_state: 'normal' | 'antiloop_sent' | 'blocked_by_loop';
  // Whether anti-loop message was already sent
  antiloop_already_sent: boolean;
  // Full conversation context (alternating turns, chronological)
  conversation_context: string;
}

interface ClassifierOutput {
  classification: 'NORMAL' | 'SUSPEITA_BOT' | 'INCERTO';
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  has_real_progress: boolean;
  should_trigger_antiloop: boolean;
  should_maintain_block: boolean;
  suggested_next_state: 'normal' | 'antiloop_sent' | 'blocked_by_loop';
}

// ============================
// HEURISTIC PRE-FILTER
// ============================

/**
 * Fast heuristic check before calling the LLM.
 * Returns a preliminary signal to help the LLM and to short-circuit obvious cases.
 */
function heuristicAnalysis(leadMessages: string[]): {
  bot_signals: string[];
  repetition_detected: boolean;
  menu_detected: boolean;
  greeting_loop_detected: boolean;
  signal_strength: 'none' | 'weak' | 'strong';
} {
  const signals: string[] = [];
  let menuDetected = false;
  let repetitionDetected = false;
  let greetingLoopDetected = false;

  if (leadMessages.length === 0) {
    return { bot_signals: [], repetition_detected: false, menu_detected: false, greeting_loop_detected: false, signal_strength: 'none' };
  }

  const latest = leadMessages[0]?.toLowerCase().trim() || '';

  // --- Menu / option patterns ---
  const menuPatterns = [
    /digite\s*\d/i,
    /escolha\s*(uma|a)\s*op[çc][ãa]o/i,
    /menu\s*principal/i,
    /op[çc][ãa]o\s*\d/i,
    /\d\s*[-–—\.]\s*.{3,}/,  // "1 - Comercial" / "2. Suporte"
    /tecle\s*\d/i,
    /pressione\s*\d/i,
    /selecione/i,
  ];

  for (const p of menuPatterns) {
    if (p.test(latest)) {
      menuDetected = true;
      signals.push('menu_pattern_detected');
      break;
    }
  }

  // Multiple numbered options in same message (strong menu signal)
  const numberedOptions = latest.match(/(?:^|\n)\s*\d\s*[-–—\.)\]]\s*.{3,}/gm);
  if (numberedOptions && numberedOptions.length >= 2) {
    menuDetected = true;
    signals.push(`menu_with_${numberedOptions.length}_options`);
  }

  // --- Bot self-identification ---
  const botIdentPatterns = [
    /assistente\s*virtual/i,
    /atendimento\s*(autom[áa]tico|digital|virtual)/i,
    /sou\s*(um|uma|o|a)?\s*(rob[ôo]|bot)/i,
    /chatbot/i,
    /intelig[êe]ncia\s*artificial/i,
    /atendente\s*virtual/i,
    /autom[áa]tico/i,
  ];

  for (const p of botIdentPatterns) {
    if (p.test(latest)) {
      signals.push('bot_self_identification');
      break;
    }
  }

  // --- Repetition detection ---
  if (leadMessages.length >= 2) {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const latestNorm = normalize(leadMessages[0]);

    // Exact repetition
    for (let i = 1; i < leadMessages.length; i++) {
      if (normalize(leadMessages[i]) === latestNorm) {
        repetitionDetected = true;
        signals.push('exact_repetition');
        break;
      }
    }

    // Near-duplicate (>80% similarity by character overlap)
    if (!repetitionDetected && leadMessages.length >= 2) {
      const prev = normalize(leadMessages[1]);
      if (latestNorm.length > 20 && prev.length > 20) {
        const shorter = latestNorm.length < prev.length ? latestNorm : prev;
        const longer = latestNorm.length < prev.length ? prev : latestNorm;
        let matchChars = 0;
        for (const ch of shorter) {
          if (longer.includes(ch)) matchChars++;
        }
        const similarity = matchChars / shorter.length;
        if (similarity > 0.85) {
          repetitionDetected = true;
          signals.push('near_duplicate_messages');
        }
      }
    }
  }

  // --- Greeting loop (same greeting repeated without progress) ---
  if (leadMessages.length >= 2) {
    const greetingPattern = /^(oi|olá|ola|bom dia|boa tarde|boa noite|ol[áa]\s*(tudo\s*bem)?|oi\s*(tudo\s*bem)?)\s*[!?.,]*$/i;
    const greetingCount = leadMessages.filter(m => greetingPattern.test(m.trim())).length;
    if (greetingCount >= 2) {
      greetingLoopDetected = true;
      signals.push('greeting_loop');
    }
  }

  // --- Flow restart without context ---
  const flowRestartPatterns = [
    /bem[- ]vindo/i,
    /como\s*posso\s*(te\s*)?ajudar\s*\?/i,
    /em\s*que\s*posso\s*(te\s*)?ajudar/i,
    /ol[áa].*seja\s*bem[- ]vindo/i,
  ];

  for (const p of flowRestartPatterns) {
    if (p.test(latest)) {
      signals.push('flow_restart_pattern');
      break;
    }
  }

  // Determine signal strength
  let strength: 'none' | 'weak' | 'strong' = 'none';
  if (signals.length >= 3 || (menuDetected && signals.length >= 2)) {
    strength = 'strong';
  } else if (signals.length >= 1) {
    strength = 'weak';
  }

  return {
    bot_signals: signals,
    repetition_detected: repetitionDetected,
    menu_detected: menuDetected,
    greeting_loop_detected: greetingLoopDetected,
    signal_strength: strength,
  };
}

// ============================
// LLM CLASSIFIER
// ============================

const CLASSIFIER_PROMPT = `Você é um classificador de conversas especializado em detectar se um lead está usando bot, menu automático, assistente virtual ou qualquer forma de automação.

IMPORTANTE:
- Você NÃO responde ao lead.
- Você NÃO gera mensagens.
- Você APENAS classifica a conversa e retorna um JSON estruturado.

CONTEXTO:
Você receberá o histórico recente de uma conversa entre um agente de prospecção (nosso sistema) e um lead. Sua tarefa é analisar as mensagens do LEAD e determinar se elas parecem ser de um humano real ou de um sistema automatizado.

SINAIS DE AUTOMAÇÃO (peso alto):
1. Mensagens que se identificam como "assistente virtual", "atendimento automático", "bot", "robô"
2. Estruturas de menu: "Digite 1 para...", "Escolha uma opção", listas numeradas de opções
3. Mensagens que reiniciam fluxo ignorando o contexto do agente
4. Respostas genéricas tipo "Bem-vindo", "Como posso ajudar?" repetidas
5. Repetição exata ou quase exata de mensagens anteriores
6. Ausência total de progresso real ao longo de várias interações

SINAIS DE HUMANO (peso alto):
1. Responde ao contexto específico da mensagem anterior
2. Fornece informações pessoais: nome, cargo, email, telefone
3. Faz perguntas específicas sobre o assunto
4. Demonstra compreensão do que foi proposto
5. Encaminha para outra pessoa
6. Usa linguagem natural com variação

PROGRESSO REAL significa:
- Lead contextualizou o assunto
- Lead se identificou ou identificou responsável
- Lead forneceu dados de contato úteis
- Lead fez pergunta coerente com o contexto
- Lead demonstrou entendimento do que foi pedido
- Mensagem NÃO segue padrão automático

NÃO é progresso real:
- Respostas genéricas que mantêm ciclo
- Menus
- Repetições
- Saudações vazias repetidas
- Fluxos que devolvem ao início

REGRA PÓS-ANTI-LOOP:
Se o estado atual é "antiloop_sent", seja mais tolerante:
- Mantenha bloqueio APENAS se a nova mensagem continua CLARAMENTE automatizada
- Se a mensagem parece humana ou é ambígua, LIBERE para fluxo normal
- A ideia é: se não tem evidência CLARA de continuação do bot, deixa seguir

FORMATO DE SAÍDA (JSON estrito, sem texto adicional):
{
  "classification": "NORMAL" | "SUSPEITA_BOT" | "INCERTO",
  "confidence": 0.0 a 1.0,
  "reasons": ["razão 1", "razão 2"],
  "has_real_progress": true | false,
  "should_trigger_antiloop": true | false,
  "should_maintain_block": true | false,
  "suggested_next_state": "normal" | "antiloop_sent" | "blocked_by_loop"
}

REGRAS DE DECISÃO:
1. classification=NORMAL + has_real_progress=true → suggested_next_state="normal", should_trigger_antiloop=false
2. classification=SUSPEITA_BOT + current_state=normal → suggested_next_state="antiloop_sent", should_trigger_antiloop=true
3. classification=SUSPEITA_BOT + current_state=antiloop_sent → suggested_next_state="blocked_by_loop", should_maintain_block=true
4. classification=INCERTO + current_state=normal → suggested_next_state="normal", should_trigger_antiloop=false (dar o benefício da dúvida)
5. classification=INCERTO + current_state=antiloop_sent → suggested_next_state="normal", should_maintain_block=false (pragmatismo: liberar se não é claro)
6. classification=NORMAL + current_state=antiloop_sent → suggested_next_state="normal", should_maintain_block=false (desbloqueio)
7. classification=NORMAL + current_state=blocked_by_loop → suggested_next_state="normal" (desbloqueio se voltou ao normal)

Responda APENAS com o JSON. Nenhum texto antes ou depois.`;

async function classifyWithLLM(input: ClassifierInput, apiKey: string): Promise<ClassifierOutput> {
  const userPrompt = `ESTADO ATUAL DA CONVERSA: ${input.current_state}
ANTI-LOOP JÁ ENVIADO: ${input.antiloop_already_sent ? 'SIM' : 'NÃO'}

HISTÓRICO DA CONVERSA:
${input.conversation_context}

ÚLTIMAS MENSAGENS DO LEAD (mais recente primeiro):
${input.lead_messages.map((m, i) => `[Lead msg ${i + 1}]: ${m}`).join('\n')}

ÚLTIMAS MENSAGENS DO AGENTE (mais recente primeiro):
${input.agent_messages.map((m, i) => `[Agent msg ${i + 1}]: ${m}`).join('\n')}

Classifique esta conversa agora.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM classifier error:', response.status, errorText);
    // Fallback: return safe default (don't block on error)
    return {
      classification: 'INCERTO',
      confidence: 0,
      reasons: ['classifier_api_error'],
      has_real_progress: false,
      should_trigger_antiloop: false,
      should_maintain_block: false,
      suggested_next_state: input.current_state,
    };
  }

  const data = await response.json();
  logAiUsage({ feature: 'anti-loop-classifier', model: 'gpt-4o-mini', usage: data.usage });
  const content = data.choices?.[0]?.message?.content?.trim() || '';

  try {
    // Extract JSON from response (handle possible markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize output
    const validClassifications = ['NORMAL', 'SUSPEITA_BOT', 'INCERTO'];
    const validStates = ['normal', 'antiloop_sent', 'blocked_by_loop'];

    return {
      classification: validClassifications.includes(parsed.classification) ? parsed.classification : 'INCERTO',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5) : [],
      has_real_progress: Boolean(parsed.has_real_progress),
      should_trigger_antiloop: Boolean(parsed.should_trigger_antiloop),
      should_maintain_block: Boolean(parsed.should_maintain_block),
      suggested_next_state: validStates.includes(parsed.suggested_next_state) ? parsed.suggested_next_state : input.current_state,
    };
  } catch (parseErr) {
    console.error('Failed to parse classifier response:', content, parseErr);
    // Safe fallback
    return {
      classification: 'INCERTO',
      confidence: 0,
      reasons: ['parse_error', content.substring(0, 100)],
      has_real_progress: false,
      should_trigger_antiloop: false,
      should_maintain_block: false,
      suggested_next_state: input.current_state,
    };
  }
}

// ============================
// MAIN HANDLER
// ============================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          classification: 'INCERTO',
          confidence: 0,
          reasons: ['api_key_missing'],
          has_real_progress: false,
          should_trigger_antiloop: false,
          should_maintain_block: false,
          suggested_next_state: 'normal',
          _meta: { error: 'OPENAI_API_KEY not configured' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ClassifierInput = await req.json();

    // Validate input
    if (!body.lead_messages || !Array.isArray(body.lead_messages) || body.lead_messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'lead_messages is required and must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Run heuristic pre-filter
    const heuristics = heuristicAnalysis(body.lead_messages);
    console.log(`[anti-loop] Heuristic analysis:`, JSON.stringify(heuristics));

    // Step 2: Short-circuit for obvious cases
    // If heuristic finds STRONG signals and we're in normal state → skip LLM, go straight to SUSPEITA_BOT
    if (heuristics.signal_strength === 'strong' && body.current_state === 'normal') {
      console.log('[anti-loop] Strong heuristic signals detected, short-circuiting to SUSPEITA_BOT');
      const result: ClassifierOutput & { _meta: any } = {
        classification: 'SUSPEITA_BOT',
        confidence: 0.85,
        reasons: heuristics.bot_signals,
        has_real_progress: false,
        should_trigger_antiloop: true,
        should_maintain_block: false,
        suggested_next_state: 'antiloop_sent',
        _meta: { method: 'heuristic_shortcircuit', heuristics },
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If heuristic finds NO signals at all and state is normal → skip LLM, return NORMAL
    if (heuristics.signal_strength === 'none' && body.current_state === 'normal') {
      console.log('[anti-loop] No heuristic signals, short-circuiting to NORMAL');
      const result: ClassifierOutput & { _meta: any } = {
        classification: 'NORMAL',
        confidence: 0.7,
        reasons: ['no_automation_signals_detected'],
        has_real_progress: true,
        should_trigger_antiloop: false,
        should_maintain_block: false,
        suggested_next_state: 'normal',
        _meta: { method: 'heuristic_shortcircuit', heuristics },
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: For weak signals or post-antiloop states, call LLM for nuanced analysis
    console.log('[anti-loop] Calling LLM classifier for nuanced analysis...');
    const llmResult = await classifyWithLLM(body, OPENAI_API_KEY);

    const result = {
      ...llmResult,
      _meta: { method: 'llm_classification', heuristics },
    };

    console.log(`[anti-loop] Final classification:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Anti-loop classifier error:', error);
    // Safe fallback: never break the flow
    return new Response(
      JSON.stringify({
        classification: 'INCERTO',
        confidence: 0,
        reasons: ['internal_error'],
        has_real_progress: false,
        should_trigger_antiloop: false,
        should_maintain_block: false,
        suggested_next_state: 'normal',
        _meta: { error: error instanceof Error ? error.message : 'Unknown error' },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
