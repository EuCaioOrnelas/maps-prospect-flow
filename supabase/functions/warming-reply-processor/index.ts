// Warming Reply Processor
// =========================
// Dois modos de invocação:
//
// 1) MODE: 'inbound' — chamado pelo webhook do WhatsApp quando o lead responde.
//    Body: { mode: 'inbound', user_id, from_phone, message_text, instance_name? }
//    Faz: encontra interação ativa pelo phone+user, adiciona msg ao history,
//         calcula next_reply_at (5-10min + horário comercial + tamanho msg).
//
// 2) MODE: 'cron' (default) — roda periodicamente. Busca interações com
//    next_reply_at <= now() e status = 'pending_response', gera réplica via IA,
//    envia via Evolution e limpa next_reply_at (ou agenda fim de conversa).
//
// IMPORTANTE: TUDO usa OpenAI direto (gpt-4o-mini), NUNCA Lovable AI.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAID_PLANS = ['start', 'growth', 'scale'];
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getEvoCreds(plan: string | null) {
  const isPaid = PAID_PLANS.includes((plan || '').toLowerCase());
  if (isPaid) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID');
    const key = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && key) return { url: normalizeApiUrl(url), apiKey: key };
  }
  const url = Deno.env.get('EVOLUTION_API_URL')!;
  const key = Deno.env.get('EVOLUTION_API_KEY')!;
  return { url: normalizeApiUrl(url), apiKey: key };
}

function getLevelInstructions(level: number): string {
  switch (level) {
    case 1: return 'NÍVEL 1 (Ativação): resposta MUITO curta, 5-10 palavras, casual. Nunca venda.';
    case 2: return 'NÍVEL 2 (Conversa Leve): 1-2 frases, mantenha conversa fluindo. Pergunta simples sobre o negócio dele se cabível. Nunca venda.';
    case 3: return 'NÍVEL 3 (Interação Natural): 2-3 frases. Mostre que conhece o nicho dele. Ainda não venda diretamente.';
    case 4:
    default: return 'NÍVEL 4 (Pré-Comercial): 2-4 frases. Pode se apresentar e ligar o serviço à dor do lead, sem fechar venda — proponha "vamos conversar".';
  }
}

function buildLeadCtx(diag: any): string {
  if (!diag) return '- (sem diagnóstico do lead)';
  const parts: string[] = [];
  if (diag.company_name) parts.push(`- Empresa: ${diag.company_name}`);
  if (diag.contact_name) parts.push(`- Contato: ${diag.contact_name}`);
  if (diag.category) parts.push(`- Nicho: ${diag.category}`);
  if (diag.city) parts.push(`- Cidade: ${diag.city}`);
  if (diag.address) parts.push(`- Endereço: ${diag.address}`);
  if (diag.rating) parts.push(`- Avaliação: ${diag.rating}/5 (${diag.review_count || 0} reviews)`);
  if (diag.ai_diagnosis) parts.push(`- Diagnóstico IA: ${String(diag.ai_diagnosis).slice(0, 400)}`);
  const enr = diag.enrichment_data || {};
  if (Array.isArray(enr.pontos_fortes) && enr.pontos_fortes.length) parts.push(`- Pontos fortes: ${enr.pontos_fortes.slice(0,3).join('; ')}`);
  if (Array.isArray(enr.pontos_fracos) && enr.pontos_fracos.length) parts.push(`- Pontos fracos: ${enr.pontos_fracos.slice(0,3).join('; ')}`);
  return parts.join('\n');
}

function buildUserCtx(profile: any): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.attendant_name) parts.push(`- Você é: ${profile.attendant_name}`);
  if (profile.company_name) parts.push(`- Empresa: ${profile.company_name}`);
  if (profile.company_products) parts.push(`- Vende: ${profile.company_products}`);
  return parts.length ? `\nQUEM VOCÊ É:\n${parts.join('\n')}` : '';
}

async function generateAIReply(
  diag: any,
  userProfile: any,
  level: number,
  history: Array<{ role: string; text: string }>,
  latest: string,
): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) { console.error('[reply] OPENAI_API_KEY missing'); return null; }

  const histText = history.slice(-10).map(m => `${m.role === 'us' ? 'EU' : 'LEAD'}: ${m.text}`).join('\n');
  const sys = `Você é uma pessoa REAL no WhatsApp dando continuidade a uma conversa. NÃO é robô, NÃO faz venda agressiva.

DADOS DO LEAD:
${buildLeadCtx(diag)}
${buildUserCtx(userProfile)}

${getLevelInstructions(level)}

HISTÓRICO (mais recente embaixo):
${histText}

ÚLTIMA MENSAGEM DO LEAD: "${latest}"

REGRAS:
- Responda APENAS com a próxima mensagem (sem aspas, sem prefixo).
- Português BR coloquial, como WhatsApp real.
- Faça SENTIDO com a última msg dele.
- Se ele rejeitou ("não tenho interesse", "para com isso", "tira meu número"), responda "tudo bem, obrigado!" e nada mais.
- Use endereço/cidade do lead quando relevante (ex: restaurante "vocês entregam em [bairro]?").
- Máx 1 emoji.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: 'Gere sua próxima mensagem agora.' },
        ],
        temperature: 0.95,
        max_tokens: 220,
      }),
    });
    if (!r.ok) { console.error('[reply] openai error', r.status); return null; }
    const d = await r.json();
    let m: string | undefined = d.choices?.[0]?.message?.content?.trim();
    if (!m) return null;
    return m.replace(/^["'`]+|["'`]+$/g, '').trim();
  } catch (e) {
    console.error('[reply] openai exception', e);
    return null;
  }
}

function calculateSmartReplyDelay(leadMsg: string): Date {
  let delayMs = (5 + Math.random() * 5) * 60 * 1000; // 5-10min
  const len = (leadMsg || '').length;
  if (len > 200) delayMs += 4 * 60 * 1000;
  else if (len > 80) delayMs += 2 * 60 * 1000;
  let target = new Date(Date.now() + delayMs);
  // Janela comercial 8h-19h SP
  const sp = new Date(target.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const h = sp.getHours();
  if (h < 8) {
    sp.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    target = new Date(sp.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  } else if (h >= 19) {
    sp.setDate(sp.getDate() + 1);
    sp.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    target = new Date(sp.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }
  return target;
}

async function sendEvoMessage(instanceName: string, phone: string, text: string, evoUrl: string, evoKey: string) {
  const formatted = phone.replace(/\D/g, '');
  try {
    const r = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evoKey },
      body: JSON.stringify({ number: formatted, text }),
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    console.error('[reply] send error', e);
    return { ok: false, status: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* cron sem body ok */ }
  const mode: 'inbound' | 'cron' = body?.mode === 'inbound' ? 'inbound' : 'cron';

  // ===== MODE INBOUND =====
  if (mode === 'inbound') {
    const { user_id, from_phone, message_text } = body;
    if (!user_id || !from_phone) {
      return new Response(JSON.stringify({ error: 'user_id and from_phone required' }), { status: 400, headers: corsHeaders });
    }
    const tail = String(from_phone).replace(/\D/g, '').slice(-8);
    if (tail.length < 8) return new Response(JSON.stringify({ skipped: 'invalid_phone' }), { headers: corsHeaders });

    // Encontrar interação ativa em sessão com ai_mode
    const { data: interactions } = await supabase
      .from('warming_interactions')
      .select('*, warming_sessions!inner(ai_mode, status)')
      .eq('user_id', user_id)
      .ilike('lead_phone', `%${tail}`)
      .eq('status', 'pending_response')
      .eq('conversation_ended', false)
      .order('last_message_at', { ascending: false })
      .limit(1);

    const interaction = interactions?.[0];
    if (!interaction) {
      return new Response(JSON.stringify({ skipped: 'no_active_interaction' }), { headers: corsHeaders });
    }
    if ((interaction as any).warming_sessions?.ai_mode === false) {
      return new Response(JSON.stringify({ skipped: 'ai_mode_disabled' }), { headers: corsHeaders });
    }

    const history = Array.isArray(interaction.conversation_history) ? interaction.conversation_history : [];
    history.push({ role: 'lead', text: String(message_text || '').slice(0, 2000), at: new Date().toISOString() });
    const nextAt = calculateSmartReplyDelay(String(message_text || ''));

    await supabase.from('warming_interactions').update({
      conversation_history: history,
      messages_received: (interaction.messages_received || 0) + 1,
      last_response_at: new Date().toISOString(),
      next_reply_at: nextAt.toISOString(),
    }).eq('id', interaction.id);

    console.log(`[reply/inbound] scheduled reply for interaction ${interaction.id} at ${nextAt.toISOString()}`);
    return new Response(JSON.stringify({ scheduled: true, next_reply_at: nextAt.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ===== MODE CRON =====
  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from('warming_interactions')
    .select('*, warming_sessions!inner(id, ai_mode, status, whatsapp_number_id, user_id), whatsapp_numbers:warming_sessions(whatsapp_number_id)')
    .eq('status', 'pending_response')
    .eq('conversation_ended', false)
    .lte('next_reply_at', nowIso)
    .not('next_reply_at', 'is', null)
    .limit(20);

  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let processed = 0;
  for (const inter of due) {
    try {
      const session = (inter as any).warming_sessions;
      if (!session || session.ai_mode === false || session.status !== 'active') {
        await supabase.from('warming_interactions').update({ next_reply_at: null }).eq('id', inter.id);
        continue;
      }
      // Get whatsapp_number details
      const { data: waNum } = await supabase
        .from('whatsapp_numbers')
        .select('instance_name, profile_id')
        .eq('id', session.whatsapp_number_id)
        .maybeSingle();
      if (!waNum?.instance_name) {
        await supabase.from('warming_interactions').update({ next_reply_at: null, last_ai_error: 'no_instance' }).eq('id', inter.id);
        continue;
      }

      // User plan for evolution creds
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', inter.user_id).maybeSingle();
      const evo = getEvoCreds(profile?.plan);

      // User company profile
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('company_name, attendant_name, company_niche, company_products, company_differential')
        .eq('user_id', inter.user_id)
        .maybeSingle();

      const history: Array<any> = Array.isArray(inter.conversation_history) ? inter.conversation_history : [];
      const lastLeadMsg = [...history].reverse().find((m: any) => m.role === 'lead')?.text || '';
      const diag = inter.lead_diagnostic_snapshot;

      // Limite de turnos por nível (1=1, 2=2, 3=3, 4=4)
      const usMessages = history.filter((m: any) => m.role === 'us').length;
      const maxTurns = inter.warming_level >= 4 ? 4 : inter.warming_level;
      if (usMessages >= maxTurns) {
        await supabase.from('warming_interactions').update({
          status: 'completed', conversation_ended: true, next_reply_at: null,
        }).eq('id', inter.id);
        continue;
      }

      const reply = await generateAIReply(diag, companyProfile, inter.warming_level, history, lastLeadMsg);
      if (!reply || reply.length < 2) {
        await supabase.from('warming_interactions').update({
          next_reply_at: null, last_ai_error: 'ai_empty_reply',
        }).eq('id', inter.id);
        continue;
      }

      const send = await sendEvoMessage(waNum.instance_name, inter.lead_phone, reply, evo.url, evo.apiKey);
      if (!send.ok) {
        await supabase.from('warming_interactions').update({
          next_reply_at: null, last_ai_error: `send_failed_${send.status}`,
        }).eq('id', inter.id);
        continue;
      }

      const nowIso2 = new Date().toISOString();
      history.push({ role: 'us', text: reply, at: nowIso2, ai: true });
      await supabase.from('warming_interactions').update({
        conversation_history: history,
        messages_sent: (inter.messages_sent || 0) + 1,
        last_message_sent: reply,
        last_message_at: nowIso2,
        next_reply_at: null,
        ai_generated: true,
        last_ai_error: null,
      }).eq('id', inter.id);
      processed++;
      console.log(`[reply/cron] sent reply for interaction ${inter.id}`);
    } catch (e) {
      console.error('[reply/cron] error processing interaction', inter.id, e);
    }
  }

  return new Response(JSON.stringify({ processed, total_due: due.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
