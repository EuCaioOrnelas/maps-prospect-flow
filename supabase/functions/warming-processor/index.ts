import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url: normalizeApiUrl(url), apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url: normalizeApiUrl(url), apiKey, tier: 'free' };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================
// LÓGICA COMPLETA DOS DISPAROS DE AQUECIMENTO
// ============================================

// Warming level configurations based on spec - WITH MANY VARIATIONS
const WARMING_LEVELS = {
  1: {
    name: 'Frio - Ativação Inicial',
    daysRange: [1, 5],
    leadsPerDay: 2,
    maxMessagesPerLead: 1,
    minDelayMinutes: 20,
    maxDelayMinutes: 40,
    initialMessages: [
      // Variações de "Oi"
      'Oi', 'oi', 'Oii', 'oii', 'Oi!', 'oi!',
      // Variações de "Olá"
      'Olá', 'olá', 'Olá!', 'olá!', 'Ola', 'ola',
      // Variações de "Bom dia"
      'Bom dia', 'bom dia', 'Bom dia!', 'bom dia!', 'Bom diaa',
      // Variações de "Boa tarde"
      'Boa tarde', 'boa tarde', 'Boa tarde!', 'boa tarde!',
      // Variações de "E aí"
      'E aí', 'e aí', 'E ai', 'e ai', 'Eai',
      // Variações de "Opa"
      'Opa', 'opa', 'Opa!', 'opa!', 'Opaa',
      // Variações simples
      'Ei', 'ei', 'Hey', 'hey'
    ],
    followUpMessages: [],
    closingMessages: [],
    waitForResponse: false
  },
  2: {
    name: 'Morno - Conversa Leve',
    daysRange: [6, 10],
    leadsPerDay: 3,
    maxMessagesPerLead: 2,
    minDelayMinutes: 15,
    maxDelayMinutes: 30,
    initialMessages: [
      // Variações de "Oi, tudo bem?"
      'Oi, tudo bem?', 'oi, tudo bem?', 'Oi tudo bem?', 'oi tudo bem?',
      'Oi, tudo bem', 'oi, tudo bem', 'Oi! Tudo bem?', 'oi! tudo bem?',
      // Variações de "Bom dia, tudo certo?"
      'Bom dia, tudo certo?', 'bom dia, tudo certo?', 'Bom dia! Tudo certo?',
      'Bom dia, tudo bem?', 'bom dia, tudo bem?',
      // Variações de "Olá, tudo bem?"
      'Olá, tudo bem?', 'olá, tudo bem?', 'Olá! Tudo bem?', 'olá! tudo bem?',
      'Ola, tudo bem?', 'ola, tudo bem?',
      // Variações de "Olá, como vai?"
      'Olá, como vai?', 'olá, como vai?', 'Olá como vai?', 'olá como vai?',
      // Outras variações
      'E aí, tudo certo?', 'e aí, tudo certo?', 'Opa, tudo bem?', 'opa, tudo bem?',
      'Oi, td bem?', 'oi, td bem?', 'Oi, blz?', 'oi, blz?'
    ],
    followUpMessages: [
      'Tudo sim, obrigado!', 'tudo sim, obrigado!', 'Tudo sim obrigado!',
      'Tudo certo por aqui', 'tudo certo por aqui', 'Tudo certo por aqui!',
      'Tudo ótimo, valeu!', 'tudo ótimo, valeu!', 'Tudo ótimo valeu!',
      'Tudo bem sim!', 'tudo bem sim!', 'Tudo bem sim',
      'Tudo tranquilo!', 'tudo tranquilo!', 'Tudo tranquilo',
      'Por aqui tudo bem!', 'por aqui tudo bem!', 'Por aqui tudo bem',
      'Tudo certo!', 'tudo certo!', 'Tudo certo',
      'Tudo joia!', 'tudo joia!', 'Tudo joia'
    ],
    closingMessages: [],
    waitForResponse: true,
    responseWaitHours: 12,
    responseDelayMinutes: [3, 10]
  },
  3: {
    name: 'Morno Avançado - Interação Natural',
    daysRange: [11, 15],
    leadsPerDay: 3,
    maxMessagesPerLead: 3,
    minDelayMinutes: 10,
    maxDelayMinutes: 25,
    initialMessages: [
      // Variações simples
      'Olá', 'olá', 'Olá!', 'olá!', 'Ola', 'ola',
      'Oi, tudo bem?', 'oi, tudo bem?', 'Oi! Tudo bem?', 'oi! tudo bem?',
      'Oi!', 'oi!', 'Oii', 'oii',
      'E aí, tudo bem?', 'e aí, tudo bem?',
      'Opa, tudo bem?', 'opa, tudo bem?',
      'Olá, como vai?', 'olá, como vai?',
      'Oi, como vai?', 'oi, como vai?'
    ],
    followUpMessages: [
      'Tudo bem por aí?', 'tudo bem por aí?', 'Tudo bem por ai?', 'tudo bem por ai?',
      'Tudo certo hoje?', 'tudo certo hoje?', 'Tudo certo hj?', 'tudo certo hj?',
      'Como está?', 'como está?', 'Como esta?', 'como esta?',
      'Tudo tranquilo?', 'tudo tranquilo?', 'Tudo tranquilo',
      'Como vão as coisas?', 'como vão as coisas?',
      'Td bem?', 'td bem?', 'Td certo?', 'td certo?'
    ],
    closingMessages: [
      'Que bom!', 'que bom!', 'Que bom', 'que bom',
      'Perfeito, obrigado!', 'perfeito, obrigado!', 'Perfeito obrigado!',
      'Ótimo!', 'ótimo!', 'Ótimo', 'ótimo',
      'Que ótimo!', 'que ótimo!', 'Que ótimo',
      'Legal!', 'legal!', 'Legal',
      'Show!', 'show!', 'Show',
      'Muito bom!', 'muito bom!', 'Muito bom',
      'Bacana!', 'bacana!', 'Bacana'
    ],
    waitForResponse: true,
    responseWaitHours: 12,
    responseDelayMinutes: [2, 8],
    closingDelayMinutes: [3, 10]
  },
  4: {
    name: 'Aquecido - Pré-Comercial Leve',
    daysRange: [16, 20],
    leadsPerDay: 2,
    maxMessagesPerLead: 2,
    minDelayMinutes: 20,
    maxDelayMinutes: 45,
    initialMessages: [
      'Oi, tudo bem? Trabalho com empresas da região, posso te mandar uma informação rápida depois?',
      'oi, tudo bem? trabalho com empresas da região, posso te mandar uma informação rápida depois?',
      'Olá! Trabalho com empresas aqui da região, posso enviar uma informação depois?',
      'olá! trabalho com empresas aqui da região, posso enviar uma informação depois?',
      'Oi, tudo bem? Atuo com empresas aqui da região, posso te passar uma info depois?',
      'oi, tudo bem? atuo com empresas aqui da região, posso te passar uma info depois?',
      'Olá, tudo bem? Trabalho com negócios da região, posso enviar algo depois?',
      'olá, tudo bem? trabalho com negócios da região, posso enviar algo depois?'
    ],
    followUpMessages: [
      'Perfeito, obrigado!', 'perfeito, obrigado!', 'Perfeito obrigado!',
      'Combinado, agradeço!', 'combinado, agradeço!', 'Combinado agradeço!',
      'Ótimo, valeu!', 'ótimo, valeu!', 'Ótimo valeu!',
      'Show, obrigado!', 'show, obrigado!', 'Show obrigado!',
      'Beleza, obrigado!', 'beleza, obrigado!', 'Beleza obrigado!',
      'Combinado!', 'combinado!', 'Combinado',
      'Legal, agradeço!', 'legal, agradeço!', 'Legal agradeço!'
    ],
    closingMessages: [],
    waitForResponse: true,
    responseWaitHours: 24,
    responseDelayMinutes: [5, 15]
  }
}

// Contextual responses based on what the lead says
const CONTEXTUAL_RESPONSES = {
  // Respostas positivas do lead
  positive: {
    patterns: [
      /^tudo\s*(bem|certo|ótimo|otimo|bom|joia|beleza|tranquilo)?[.!?]?\s*$/i,
      /^bem\s*(obrigad[oa])?[.!?]?\s*$/i,
      /^ótimo[.!?]?\s*$/i,
      /^otimo[.!?]?\s*$/i,
      /^blz[.!?]?\s*$/i,
      /^td\s*bem[.!?]?\s*$/i,
      /^sim[.!?]?\s*$/i,
      /^ok[.!?]?\s*$/i,
      /^pode\s*(sim|mandar)?[.!?]?\s*$/i,
      /^claro[.!?]?\s*$/i,
      /^tranquilo[.!?]?\s*$/i,
      /^de\s*boa[.!?]?\s*$/i,
      /^suave[.!?]?\s*$/i
    ],
    responses: [
      'Que bom!', 'que bom!', 'Ótimo!', 'ótimo!', 'Legal!', 'legal!',
      'Que ótimo!', 'que ótimo!', 'Perfeito!', 'perfeito!', 'Show!', 'show!',
      'Bacana!', 'bacana!', 'Muito bom!', 'muito bom!'
    ]
  },
  // Lead pergunta "quem é você" ou similar
  whoAreYou: {
    patterns: [
      /quem\s*(é|e)\s*(voce|você|vc)/i,
      /quem\s*fala/i,
      /quem\s*ta\s*falando/i,
      /de\s*onde\s*(é|e)/i,
      /te\s*conheço/i,
      /conhece\s*(eu|a\s*gente)/i,
      /como\s*(conseguiu|pegou)\s*(meu|o)\s*número/i
    ],
    responses: [
      'Desculpa, acho que errei o número!', 'desculpa, acho que errei o número!',
      'Opa, desculpa! Acho que peguei o número errado', 'opa, desculpa! acho que peguei o número errado',
      'Ih, desculpa! Número errado', 'ih, desculpa! número errado',
      'Foi mal, errei o contato!', 'foi mal, errei o contato!'
    ]
  },
  // Lead diz que não conhece
  dontKnow: {
    patterns: [
      /não\s*(te\s*)?conheço/i,
      /nao\s*(te\s*)?conheco/i,
      /quem\s*é/i,
      /quem\s*e\s*vc/i,
      /não\s*sei\s*quem/i,
      /nao\s*sei\s*quem/i
    ],
    responses: [
      'Desculpa, número errado!', 'desculpa, número errado!',
      'Opa, desculpa! Errei o contato', 'opa, desculpa! errei o contato',
      'Foi mal, engano!', 'foi mal, engano!'
    ]
  },
  // Lead pede para parar
  stopRequest: {
    patterns: [
      /para\s*(de\s*)?mandar/i,
      /não\s*mande\s*mais/i,
      /nao\s*mande\s*mais/i,
      /me\s*bloqueia/i,
      /para\s*com\s*isso/i,
      /spam/i,
      /sai\s*fora/i
    ],
    responses: [
      'Desculpa pelo incômodo!', 'desculpa pelo incômodo!',
      'Desculpa, não vou mais incomodar!', 'desculpa, não vou mais incomodar!'
    ],
    shouldEndConversation: true
  }
}

// Get current warming level based on day
function getWarmingLevel(currentDay: number): number {
  if (currentDay <= 5) return 1
  if (currentDay <= 10) return 2
  if (currentDay <= 15) return 3
  if (currentDay <= 20) return 4
  return 4
}

// Get warming status based on level
function getWarmingStatus(level: number): 'cold' | 'warm' | 'hot' {
  if (level <= 1) return 'cold'
  if (level <= 3) return 'warm'
  return 'hot'
}

// Sync daily_limit on AI agents linked to a WhatsApp number based on warming status
async function syncAgentDailyLimit(supabase: any, whatsappNumberId: string, warmingStatus: string) {
  const AGENT_LIMITS: Record<string, number> = {
    cold: 20,
    warm: 100,
    hot: 999999, // effectively unlimited
  }
  const newLimit = AGENT_LIMITS[warmingStatus] ?? 20
  const isWarmed = warmingStatus === 'hot'
  
  const { error } = await supabase
    .from('ai_agents')
    .update({ daily_limit: newLimit, is_warmed: isWarmed })
    .eq('whatsapp_number_id', whatsappNumberId)
  
  if (error) {
    console.error(`Error syncing agent daily_limit for number ${whatsappNumberId}:`, error)
  } else {
    console.log(`Synced agent daily_limit to ${newLimit} (warming: ${warmingStatus}) for number ${whatsappNumberId}`)
  }
}


function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Get random delay in milliseconds
function getRandomDelay(minMinutes: number, maxMinutes: number): number {
  const min = minMinutes * 60 * 1000
  const max = maxMinutes * 60 * 1000
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Check if current time is within business hours (8h-18h São Paulo time, Mon-Fri)
function isBusinessHours(): boolean {
  const now = new Date()
  const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const hour = saoPauloTime.getHours()
  const dayOfWeek = saoPauloTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // Monday to Friday only (1-5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }
  
  return hour >= 8 && hour < 18
}

// Detect automated bot responses and generate appropriate reply variations
const BOT_RESPONSE_PATTERNS = [
  // Common auto-reply patterns in Portuguese
  /esta mensagem é automática/i,
  /mensagem automática/i,
  /resposta automática/i,
  /fora do horário/i,
  /atendimento das \d+/i,
  /aguarde.*atend/i,
  /em breve.*retornar/i,
  /atendente.*disponível/i,
  /digite.*opção/i,
  /para atendimento digite/i,
  /selecione.*opção/i,
  /escolha.*abaixo/i,
  /menu.*opções/i,
  /bot.*atendimento/i,
  /sou.*assistente virtual/i,
  /bem-vindo.*atendimento/i,
  /obrigad.*contato/i,
  /sua mensagem.*recebida/i,
  /retornaremos.*breve/i,
  /\d+\s*[-–]\s*\w+/i, // Menu options like "1 - Vendas, 2 - Suporte"
  /[1-9]\s*\)/i, // Menu options like "1) Vendas"
  /não responda este número/i,
  /contato.*comercial/i,
]

// Responses to bypass bots - natural conversational replies
const BOT_BYPASS_RESPONSES = [
  'Oi, é com você mesmo que falo?',
  'Olá, gostaria de falar com alguém do atendimento',
  'Tem alguém disponível pra conversar?',
  'Bom dia, consegue me passar pra alguém?',
  'Olá, é atendimento humano?',
  'Oi! Posso falar com uma pessoa?',
  'Olá, tudo bem? Queria falar com alguém',
  'Oi, tem alguém que possa me atender?',
  'Bom dia! Preciso falar com um atendente',
  'Olá! Pode me transferir pra um atendente?',
]

function isAutomatedResponse(message: string): boolean {
  if (!message) return false
  return BOT_RESPONSE_PATTERNS.some(pattern => pattern.test(message))
}

function getBotBypassResponse(): string {
  return getRandomElement(BOT_BYPASS_RESPONSES)
}

// Vary message to avoid patterns - with more variation
function varyMessage(message: string): string {
  const rand = Math.random()
  
  // Apply random variations
  if (rand < 0.15) {
    // Remove punctuation
    return message.replace(/[.!?]+$/, '')
  } else if (rand < 0.25) {
    // Add space before punctuation (natural typing)
    return message.replace(/([.!?])$/, ' $1')
  } else if (rand < 0.35) {
    // Add wave emoji
    return message + ' 👋'
  } else if (rand < 0.40) {
    // Lowercase first letter (casual)
    return message.charAt(0).toLowerCase() + message.slice(1)
  } else if (rand < 0.45) {
    // Double punctuation
    return message.replace(/([!?])$/, '$1$1')
  }
  
  return message
}

// Get unique message - avoiding repetition from recent database entries
async function getUniqueMessageFromDB(
  supabase: any,
  sessionId: string,
  messages: string[]
): Promise<string> {
  // Get last 10 messages sent in this session
  const { data: recentInteractions } = await supabase
    .from('warming_interactions')
    .select('last_message_sent')
    .eq('warming_session_id', sessionId)
    .not('last_message_sent', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)
  
  const recentMessages = recentInteractions?.map((i: any) => i.last_message_sent?.toLowerCase().trim()) || []
  
  // Try to find a message that wasn't sent recently
  let attempts = 0
  let finalMessage: string
  
  do {
    const baseMessage = getRandomElement(messages)
    finalMessage = varyMessage(baseMessage)
    attempts++
    
    // Check if this message (or similar) was sent recently
    const isRecent = recentMessages.some((recent: string) => {
      if (!recent) return false
      const normalizedFinal = finalMessage.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ]/g, '')
      const normalizedRecent = recent.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ]/g, '')
      return normalizedFinal === normalizedRecent
    })
    
    if (!isRecent) break
  } while (attempts < 15)
  
  console.log(`Selected message after ${attempts} attempts: "${finalMessage}"`)
  return finalMessage
}

// Legacy function for backward compatibility
function getUniqueMessage(messages: string[]): string {
  return varyMessage(getRandomElement(messages))
}

// Normalize phone number to format 5511999999999
function normalizePhoneForValidation(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  
  // Remove country code if present, then re-add it
  if (clean.startsWith('55') && clean.length >= 12) {
    clean = clean.substring(2)
  }
  
  // Add country code
  return '55' + clean
}

// Validate if phone number exists on WhatsApp
async function validateWhatsAppNumber(
  instanceName: string,
  phoneNumber: string,
  evolutionApiUrl: string,
  evolutionApiKey: string
): Promise<{ exists: boolean; formattedNumber?: string }> {
  try {
    const formattedPhone = normalizePhoneForValidation(phoneNumber)
    console.log(`Checking WhatsApp for: ${formattedPhone}`)
    
    const response = await fetch(`${evolutionApiUrl}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        numbers: [formattedPhone]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Validation request failed for ${formattedPhone}: ${errorText}`)
      return { exists: false }
    }

    const result = await response.json()
    console.log(`Validation result for ${formattedPhone}:`, JSON.stringify(result))
    
    // Check if the number exists in the response
    if (Array.isArray(result) && result.length > 0) {
      const numberInfo = result[0]
      if (numberInfo.exists === true || numberInfo.exists === 'true') {
        return { 
          exists: true, 
          formattedNumber: numberInfo.jid?.replace('@s.whatsapp.net', '') || formattedPhone 
        }
      }
    }
    
    return { exists: false }
  } catch (error) {
    console.error('Error validating WhatsApp number:', error)
    return { exists: false }
  }
}

// =====================================================================
// AQUECIMENTO POR IA — geração contextual usando diagnóstico do lead
// =====================================================================
// Estratégia por nível:
//  - N1 (dias 1-5):  quebra-gelo curto, hiper-natural, sem vender. 1 frase.
//  - N2 (dias 6-10): mensagem leve com gancho específico do nicho/cidade. ~2 frases.
//  - N3 (dias 11-15): conversa contextual usando endereço/categoria/pontos do diagnóstico.
//  - N4 (dias 16+):  pré-comercial — cita o que o lead faz, sugere troca de ideia (sem fechar).
//
// SEMPRE injeta:
//  - Empresa, nome contato, categoria, cidade, endereço (crítico para nichos como restaurante/delivery)
//  - Diagnóstico IA (ai_diagnosis, pontos fortes/fracos, análise site/redes)
//  - Avaliação Google e número de reviews
//  - Perfil da empresa do USUÁRIO (quem está prospectando) para alinhar o tom
// =====================================================================

interface LeadDiagnostic {
  company_name?: string | null;
  contact_name?: string | null;
  category?: string | null;
  city?: string | null;
  address?: string | null;
  rating?: number | null;
  review_count?: number | null;
  website?: string | null;
  ai_diagnosis?: string | null;
  ai_score?: number | null;
  enrichment_data?: any;
}

interface UserCompanyProfile {
  company_name?: string | null;
  attendant_name?: string | null;
  company_niche?: string | null;
  company_products?: string | null;
  company_differential?: string | null;
}

function buildLeadContextBlock(lead: LeadDiagnostic): string {
  const parts: string[] = [];
  if (lead.company_name) parts.push(`- Empresa: ${lead.company_name}`);
  if (lead.contact_name) parts.push(`- Contato: ${lead.contact_name}`);
  if (lead.category) parts.push(`- Nicho/Categoria: ${lead.category}`);
  if (lead.city) parts.push(`- Cidade: ${lead.city}`);
  if (lead.address) parts.push(`- Endereço: ${lead.address}`);
  if (lead.rating) parts.push(`- Avaliação Google: ${lead.rating}/5 (${lead.review_count || 0} reviews)`);
  if (lead.website) parts.push(`- Site: ${lead.website}`);

  const enr = (lead.enrichment_data && typeof lead.enrichment_data === 'object') ? lead.enrichment_data : {};
  const pf = Array.isArray(enr.pontos_fortes) ? enr.pontos_fortes : [];
  const pfr = Array.isArray(enr.pontos_fracos) ? enr.pontos_fracos : [];
  if (lead.ai_diagnosis) parts.push(`- Diagnóstico IA: ${lead.ai_diagnosis}`);
  if (pf.length) parts.push(`- Pontos fortes: ${pf.slice(0,3).join('; ')}`);
  if (pfr.length) parts.push(`- Pontos fracos: ${pfr.slice(0,3).join('; ')}`);
  if (enr.analise_site) parts.push(`- Análise site: ${String(enr.analise_site).slice(0,200)}`);

  return parts.length ? parts.join('\n') : '- (sem dados detalhados deste lead)';
}

function buildUserContextBlock(profile: UserCompanyProfile | null): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.attendant_name) parts.push(`- Você se chama: ${profile.attendant_name}`);
  if (profile.company_name) parts.push(`- Trabalha na: ${profile.company_name}`);
  if (profile.company_niche) parts.push(`- Nicho: ${profile.company_niche}`);
  if (profile.company_products) parts.push(`- Vende: ${profile.company_products}`);
  return parts.length ? `\nQUEM VOCÊ É (perfil do remetente):\n${parts.join('\n')}` : '';
}

function getLevelInstructions(level: number): string {
  switch (level) {
    case 1:
      return `NÍVEL 1 — ATIVAÇÃO INICIAL (dias 1-5):
- Mensagem CURTA, 1 frase apenas (~10-15 palavras).
- Quebra-gelo MUITO natural, parecendo digitação humana de WhatsApp.
- NÃO venda nada. NÃO se apresente ainda. NÃO faça pergunta direta sobre o negócio dele.
- Pode ser um cumprimento + referência leve à cidade ou ao tipo de negócio.
- Objetivo: provocar uma resposta curta tipo "Oi, tudo bem?".`;
    case 2:
      return `NÍVEL 2 — CONVERSA LEVE (dias 6-10):
- Mensagem CURTA, 1-2 frases (~20-30 palavras).
- Faça uma pergunta SIMPLES e RELEVANTE sobre o negócio (horário, se atende na região X, etc).
- Use o ENDEREÇO/CIDADE do lead para personalizar — ex: restaurante "vocês entregam em [bairro]?", provedor "vocês atendem [cidade]?".
- NÃO venda. NÃO se apresente como vendedor. Pareça um cliente curioso ou alguém da região.`;
    case 3:
      return `NÍVEL 3 — INTERAÇÃO NATURAL (dias 11-15):
- Mensagem 2-3 frases (~40-60 palavras).
- Mostre que você sabe O QUE eles fazem (use a categoria + diagnóstico).
- Faça uma pergunta mais aberta, ainda como CURIOSO, não como vendedor.
- Pode citar algo do diagnóstico (ex: "vi que vocês têm boa avaliação no Google", "vi o site de vocês").`;
    case 4:
    default:
      return `NÍVEL 4 — PRÉ-COMERCIAL (dia 16+):
- Mensagem 2-4 frases (~50-80 palavras).
- Você JÁ pode se apresentar e dizer brevemente o que faz, MAS sem fechar venda.
- Conecte o que VOCÊ vende (perfil do remetente) com uma DOR REAL identificada no diagnóstico do lead.
- Termine com pergunta leve tipo "faz sentido conversarmos?" ou "posso te mandar uma info?".`;
  }
}

async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens = 250): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.log('[AI Warming] OPENAI_API_KEY missing');
    return null;
  }
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.95,
        max_tokens: maxTokens,
      }),
    });
    if (!resp.ok) {
      console.error('[AI Warming] OpenAI error', resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const data = await resp.json();
    let msg: string | undefined = data.choices?.[0]?.message?.content?.trim();
    if (!msg) return null;
    // Remove cercas/aspas wrap
    msg = msg.replace(/^["'`]+|["'`]+$/g, '').trim();
    return msg;
  } catch (e) {
    console.error('[AI Warming] OpenAI exception', e);
    return null;
  }
}

/**
 * Gera mensagem de abertura usando IA + diagnóstico completo do lead.
 * Retorna null se IA falhar (caller deve usar fallback de template).
 */
async function generateAIWarmingOpener(
  lead: LeadDiagnostic,
  userProfile: UserCompanyProfile | null,
  level: number,
): Promise<string | null> {
  const leadCtx = buildLeadContextBlock(lead);
  const userCtx = buildUserContextBlock(userProfile);
  const levelRules = getLevelInstructions(level);

  const systemPrompt = `Você é uma pessoa REAL conversando pelo WhatsApp brasileiro. Seu objetivo é AQUECER um número novo de WhatsApp criando uma conversa NATURAL com um lead real — NÃO é venda direta, é construção de histórico de conversa que pareça humano.

DADOS DO LEAD (para personalizar):
${leadCtx}
${userCtx}

${levelRules}

REGRAS UNIVERSAIS:
- Responda APENAS com a mensagem final, sem aspas, sem prefixo, sem explicação.
- Português BR coloquial, como WhatsApp real (pode usar "vc", "tá", minúsculas iniciais às vezes).
- NÃO use saudação temporal ("bom dia", "boa tarde") — a mensagem pode chegar a qualquer hora.
- NÃO use "Tudo bem?" / "Como vai?" como abertura genérica.
- NO MÁXIMO 1 emoji, opcional.
- NUNCA mencione "aquecimento", "automação", "IA", "robô", "teste".
- Se nicho for restaurante/delivery, USE o endereço/cidade ("vocês entregam aqui no [bairro/cidade]?").
- Se nicho for serviço local (provedor, solar, segurança), pergunte sobre área de atendimento.
- Se nicho for loja/produto, pergunte sobre disponibilidade ou horário.`;

  return await callOpenAI(systemPrompt, `Gere a mensagem de aquecimento (nível ${level}) agora.`, 200);
}

/**
 * Gera RÉPLICA contextual quando o lead respondeu — usa histórico completo.
 */
async function generateAIWarmingReply(
  lead: LeadDiagnostic,
  userProfile: UserCompanyProfile | null,
  level: number,
  conversationHistory: Array<{ role: 'us' | 'lead'; text: string; at: string }>,
  latestLeadMessage: string,
): Promise<string | null> {
  const leadCtx = buildLeadContextBlock(lead);
  const userCtx = buildUserContextBlock(userProfile);
  const levelRules = getLevelInstructions(level);
  const histText = conversationHistory.slice(-10).map(m =>
    `${m.role === 'us' ? 'EU' : 'LEAD'}: ${m.text}`
  ).join('\n');

  const systemPrompt = `Você é uma pessoa REAL conversando pelo WhatsApp. O lead acabou de te responder e você precisa dar uma réplica NATURAL para manter a conversa viva.

DADOS DO LEAD:
${leadCtx}
${userCtx}

${levelRules}

HISTÓRICO DA CONVERSA (mais recente embaixo):
${histText}

ÚLTIMA MENSAGEM DO LEAD: "${latestLeadMessage}"

REGRAS:
- Responda APENAS com sua próxima mensagem, sem aspas/explicação.
- Faça SENTIDO com o que ele acabou de dizer (não ignore a resposta dele).
- Curta (1-3 frases). Português BR coloquial.
- Se ele perguntou algo, responda primeiro e DEPOIS continue a conversa.
- Se ele demonstrou desinteresse ("não tenho interesse", "para com isso"), responda gentilmente "tudo bem, obrigado!" e nada mais.
- NUNCA force venda no nível ${level <= 2 ? '1-2' : 'atual'}, mantenha o tom conversacional.
- Use o endereço/nicho do lead se for relevante para a continuidade.`;

  return await callOpenAI(systemPrompt, 'Gere sua próxima mensagem agora.', 200);
}

/**
 * Calcula delay inteligente para a próxima resposta.
 * Base: 5-10min aleatório + ajuste por tamanho da mensagem do lead + horário comercial.
 * Retorna timestamp ISO de quando responder.
 */
function calculateSmartReplyDelay(leadMessage: string): Date {
  // Base: 5-10 min aleatório
  let delayMs = (5 + Math.random() * 5) * 60 * 1000;
  // Ajuste por tamanho: msg longa do lead → resposta mais demorada (até +5min)
  const len = leadMessage.length;
  if (len > 200) delayMs += 4 * 60 * 1000;
  else if (len > 80) delayMs += 2 * 60 * 1000;

  let target = new Date(Date.now() + delayMs);
  // Horário comercial São Paulo: 8h-19h. Fora disso, agenda p/ próximo dia útil 9-11h.
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

/**
 * Busca diagnóstico completo do lead na tabela leads (via lead_id ou phone).
 */
async function fetchLeadDiagnostic(supabase: any, userId: string, leadId: string | null, phone: string): Promise<LeadDiagnostic | null> {
  let q = supabase.from('leads')
    .select('id, company_name, contact_name, category, city, address, rating, review_count, website, ai_diagnosis, ai_score, enrichment_data, phone')
    .eq('user_id', userId)
    .limit(1);
  if (leadId) {
    const { data } = await q.eq('id', leadId).maybeSingle();
    if (data) return data;
  }
  // fallback por últimos 8 dígitos do telefone
  const tail = String(phone || '').replace(/\D/g, '').slice(-8);
  if (tail.length >= 8) {
    const { data } = await supabase.from('leads')
      .select('id, company_name, contact_name, category, city, address, rating, review_count, website, ai_diagnosis, ai_score, enrichment_data, phone')
      .eq('user_id', userId)
      .ilike('phone', `%${tail}`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function fetchUserCompanyProfile(supabase: any, userId: string): Promise<UserCompanyProfile | null> {
  const { data } = await supabase.from('company_profiles')
    .select('company_name, attendant_name, company_niche, company_products, company_differential')
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

// Wrapper de compatibilidade (mantém assinatura antiga caso seja chamado em outro lugar)
async function generateContextualOpeningMessage(
  companyName: string,
  contactName: string | null,
  category: string | null,
  city: string | null,
  level: number,
): Promise<string> {
  const ai = await generateAIWarmingOpener(
    { company_name: companyName, contact_name: contactName, category, city },
    null,
    level,
  );
  return ai || `Oi! Vi o trabalho de vocês com ${category || 'empresas da região'}, queria trocar uma ideia.`;
}


async function sendMessage(
  instanceName: string,
  phoneNumber: string,
  message: string,
  evolutionApiUrl: string,
  evolutionApiKey: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '')
    
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error sending message:', errorText)
      
      // Check for blocking indicators
      if (errorText.includes('blocked') || errorText.includes('ban') || errorText.includes('spam')) {
        return { success: false, messageId: 'BLOCKED' }
      }
      
      // Check for "not exists" error
      if (errorText.includes('exists":false') || errorText.includes('not on WhatsApp')) {
        return { success: false, messageId: 'NOT_EXISTS' }
      }
      
      return { success: false }
    }

    const result = await response.json()
    return { 
      success: true, 
      messageId: result.key?.id || result.id || undefined 
    }
  } catch (error) {
    console.error('Error sending warming message:', error)
    return { success: false }
  }
}

// Check for consecutive days without responses (auto-pause)
// Only triggers if session has been running for at least 5 days AND has 5+ messages with no responses
async function checkForAutoPause(
  supabase: any,
  sessionId: string,
  sessionStartedAt: string
): Promise<boolean> {
  // First, check if the session has been running for at least 5 days
  const startDate = new Date(sessionStartedAt)
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Don't auto-pause if session is less than 5 days old
  if (daysSinceStart < 5) {
    console.log(`Session only ${daysSinceStart} days old, skipping auto-pause check`)
    return false
  }
  
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  
  // Only count SENT messages (not invalid_number entries)
  const { data: recentInteractions } = await supabase
    .from('warming_interactions')
    .select('messages_received, messages_sent, status, created_at')
    .eq('warming_session_id', sessionId)
    .gte('created_at', fiveDaysAgo.toISOString())
  
  // Filter to only sent messages (exclude invalid_number)
  const sentMessages = recentInteractions?.filter((i: any) => 
    i.status !== 'invalid_number' && i.messages_sent > 0
  ) || []
  
  // Need at least 10 actual sent messages over 5 days to trigger pause
  // This means the system has been actively trying but getting no responses
  if (sentMessages.length < 10) {
    console.log(`Only ${sentMessages.length} messages sent in last 5 days, need 10+ for auto-pause`)
    return false
  }
  
  // Check if all recent sent messages have 0 responses
  const allNoResponse = sentMessages.every((i: any) => i.messages_received === 0)
  
  if (allNoResponse) {
    console.log(`All ${sentMessages.length} messages in last 5 days have no responses, triggering auto-pause`)
  }
  
  return allNoResponse
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Default Evolution API credentials (fallback)
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check for force parameter (admin only)
    let forceRun = false
    try {
      const body = await req.json()
      if (body.force === true) {
        // Verify admin via authorization header
        const authHeader = req.headers.get('authorization')
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user } } = await supabase.auth.getUser(token)
          
          if (user) {
            // Check if user is admin directly in user_roles table
            const { data: adminRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .single()
            
            if (adminRole) {
              forceRun = true
              console.log('[WARMING] Force mode enabled by admin:', user.email)
            } else {
              console.log('[WARMING] Force mode denied - user is not admin')
            }
          }
        }
      }
    } catch {
      // No body or invalid JSON, continue normally
    }

    console.log('=== WARMING PROCESSOR START ===')
    console.log('Time:', new Date().toISOString())

    // Check business hours (Mon-Fri, 8h-18h São Paulo) - skip if force mode
    if (!forceRun && !isBusinessHours()) {
      console.log('Outside business hours (Mon-Fri, 08:00-18:00 São Paulo), skipping')
      return new Response(
        JSON.stringify({ message: 'Outside business hours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (forceRun) {
      console.log('[WARMING] Bypassing business hours check (force mode)')
    }

    // Get all active warming sessions with their search assignments
    const { data: sessions, error: sessionsError } = await supabase
      .from('warming_sessions')
      .select(`
      *,
        whatsapp_numbers!inner(
          id,
          instance_name,
          phone_number,
          is_connected,
          api_tier
        )
      `)
      .eq('status', 'active')

    if (sessionsError) {
      throw sessionsError
    }

    // Get search assignments for all active sessions
    const sessionNumberIds = sessions?.map((s: any) => s.whatsapp_number_id) || []
    const { data: assignments } = await supabase
      .from('warming_search_assignments')
      .select('whatsapp_number_id, search_query, search_city')
      .in('whatsapp_number_id', sessionNumberIds)

    console.log(`Found ${sessions?.length || 0} active warming sessions`)

    let totalMessagesSent = 0
    let sessionsProcessed = 0
    let followUpsSent = 0

    // ========== FIRST: Process pending follow-up responses ==========
    console.log('\n=== Processing pending follow-up responses ===')
    
    const { data: pendingResponses } = await supabase
      .from('warming_interactions')
      .select(`
      *,
        warming_sessions!inner(
          id,
          user_id,
          whatsapp_number_id,
          whatsapp_numbers!inner(instance_name, is_connected, api_tier)
        )
      `)
      .eq('status', 'pending_response')
      .eq('warming_sessions.status', 'active')
    
    if (pendingResponses && pendingResponses.length > 0) {
      console.log(`Found ${pendingResponses.length} pending follow-up responses`)
      
      for (const interaction of pendingResponses) {
        if (!interaction.last_message_sent) continue
        if (!interaction.warming_sessions.whatsapp_numbers.is_connected) continue
        
        const instanceName = interaction.warming_sessions.whatsapp_numbers.instance_name
        
        // Resolve Evolution API credentials based on number's api_tier
        const followUpEvoCredentials = getEvolutionCredentials(interaction.warming_sessions.whatsapp_numbers.api_tier)
        
        console.log(`Sending follow-up to ${interaction.lead_phone}: "${interaction.last_message_sent}"`)
        
        const sendResult = await sendMessage(
          instanceName,
          interaction.lead_phone,
          interaction.last_message_sent,
          followUpEvoCredentials.url,
          followUpEvoCredentials.apiKey
        )
        
        if (sendResult.success) {
          await supabase
            .from('warming_interactions')
            .update({
              status: interaction.conversation_ended ? 'completed' : 'in_progress',
              messages_sent: interaction.messages_sent + 1,
              last_message_at: new Date().toISOString()
            })
            .eq('id', interaction.id)
          
          followUpsSent++
          console.log(`✓ Follow-up sent successfully`)
        } else {
          console.log(`✗ Failed to send follow-up`)
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`\n=== Processing new warming messages ===`)

    for (const session of sessions || []) {
      try {
        console.log(`\n--- Processing session ${session.id} ---`)
        
        // Resolve Evolution API credentials based on number's api_tier
        const sessionEvoCredentials = getEvolutionCredentials(session.whatsapp_numbers.api_tier)
        const sessionEvoUrl = sessionEvoCredentials.url
        const sessionEvoKey = sessionEvoCredentials.apiKey
        
        // Check if number is connected - PAUSE if disconnected instead of just skipping
        if (!session.whatsapp_numbers.is_connected || !session.whatsapp_numbers.instance_name) {
          console.log(`Number ${session.whatsapp_number_id} not connected, pausing warming session`)
          
          // Compute and store phone_key for matching on reconnection
          const phoneDigits = (session.whatsapp_numbers.phone_number || '').replace(/\D/g, '')
          const phoneKey = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : null
          
          // Pause the session so it can be resumed when reconnected
          await supabase
            .from('warming_sessions')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              error_message: 'Número desconectado - reconecte para continuar o aquecimento',
              ...(phoneKey ? { phone_key: phoneKey } : {})
            })
            .eq('id', session.id)
          
          continue
        }

        // Check for auto-pause conditions (only if session is at least 5 days old)
        const shouldAutoPause = await checkForAutoPause(supabase, session.id, session.started_at)
        if (shouldAutoPause) {
          console.log(`Auto-pausing session ${session.id} due to 5+ days without responses`)
          await supabase
            .from('warming_sessions')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              error_message: 'Pausado automaticamente: 5 dias consecutivos sem respostas'
            })
            .eq('id', session.id)
          continue
        }

        // Activity-based day counting: current_day only advances when warming
        // actually runs on a new date. Paused time does NOT count.
        const currentDay = session.current_day || 1

        console.log(`Session day: ${currentDay} (activity-based), leads used: ${session.leads_used}/${session.leads_limit}`)

        // Check if warming is complete
        if (currentDay > 20 || session.leads_used >= session.leads_limit) {
          await supabase
            .from('warming_sessions')
            .update({
              status: 'completed',
              warming_status: 'hot',
              warming_level: 4,
              completed_at: new Date().toISOString()
            })
            .eq('id', session.id)
          
          // Sync daily_limit on linked AI agents
          await syncAgentDailyLimit(supabase, session.whatsapp_number_id, 'hot')
          
          console.log(`Warming completed for session ${session.id}`)
          continue
        }

        // Get warming level config
        const level = getWarmingLevel(currentDay)
        const levelConfig = WARMING_LEVELS[level as keyof typeof WARMING_LEVELS]

        console.log(`Warming level: ${level} (${levelConfig.name})`)

        // Check if we need to reset daily count (based on São Paulo date)
        const now = new Date()
        const saoPauloNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        const today = saoPauloNow.toISOString().split('T')[0]
        
        // Activity-based day advancement: increment current_day only on a new active date
        const isNewActiveDay = session.last_active_date !== today
        let advancedDay = currentDay
        
        if (isNewActiveDay) {
          // Only advance if this is truly a new active day (not first day)
          if (session.last_active_date) {
            advancedDay = currentDay + 1
          }
          console.log(`New active day: ${today}, advancing to day ${advancedDay}`)
          
          const level = getWarmingLevel(advancedDay)
          const newWarmingStatus = getWarmingStatus(level)
          await supabase
            .from('warming_sessions')
            .update({
              messages_sent_today: 0,
              last_reset_date: today,
              last_active_date: today,
              current_day: advancedDay,
              warming_level: level,
              warming_status: newWarmingStatus
            })
            .eq('id', session.id)
          
          // Keep agent daily_limit always in sync with warming status
          await syncAgentDailyLimit(supabase, session.whatsapp_number_id, newWarmingStatus)
          
          session.messages_sent_today = 0
        } else if (session.last_reset_date !== today) {
          console.log(`Resetting daily count for date: ${today}`)
          await supabase
            .from('warming_sessions')
            .update({
              messages_sent_today: 0,
              last_reset_date: today
            })
            .eq('id', session.id)
          
          session.messages_sent_today = 0
        }

        // Check daily lead limit
        if (session.messages_sent_today >= levelConfig.leadsPerDay) {
          console.log(`Daily limit reached (${session.messages_sent_today}/${levelConfig.leadsPerDay}), skipping`)
          continue
        }

        // Check delay since last message (random variation)
        if (session.last_message_at) {
          const lastMessageTime = new Date(session.last_message_at).getTime()
          const minDelayMs = levelConfig.minDelayMinutes * 60 * 1000
          const maxDelayMs = levelConfig.maxDelayMinutes * 60 * 1000
          const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs
          
          if (Date.now() - lastMessageTime < randomDelay) {
            console.log(`Waiting for random delay (${Math.round(randomDelay / 60000)}min), skipping`)
            continue
          }
        }

        // Get available leads from user's prospects (exclude already used and invalid numbers)
        const { data: usedInteractions } = await supabase
          .from('warming_interactions')
          .select('lead_phone, status')
          .eq('warming_session_id', session.id)

        // Exclude both used phones and invalid numbers
        const usedPhones = new Set(usedInteractions?.map((i: any) => i.lead_phone) || [])

        // Get the search assignment for this number
        const assignment = assignments?.find((a: any) => a.whatsapp_number_id === session.whatsapp_number_id)
        
        let allLeads: any[] = []
        
        // First try to get leads from search_history (where the prospected leads are stored)
        const searchQuery = assignment?.search_query || session.assigned_search_query
        const searchCity = assignment?.search_city || session.assigned_search_city
        
        if (searchQuery) {
          console.log(`Looking for leads from search history: "${searchQuery}" in "${searchCity || 'any'}"`)
          
          // Build search history query
          let historyQuery = supabase
            .from('search_history')
            .select('leads, keyword, location')
            .eq('user_id', session.user_id)
            .ilike('keyword', `%${searchQuery}%`)
          
          if (searchCity) {
            historyQuery = historyQuery.ilike('location', `%${searchCity}%`)
          }
          
          const { data: searchResults } = await historyQuery.order('created_at', { ascending: false }).limit(10)
          
          if (searchResults && searchResults.length > 0) {
            console.log(`Found ${searchResults.length} search history entries`)
            
            // Extract leads from all matching searches
            for (const search of searchResults) {
              if (search.leads && Array.isArray(search.leads)) {
                for (const lead of search.leads) {
                  // Only add if has phone and not already in list
                  if (lead.phone && !allLeads.some((l: any) => l.phone === lead.phone)) {
                    allLeads.push({
                      id: lead.id || null,
                      phone: lead.phone,
                      contact_name: lead.name || lead.contact_name || lead.company || null,
                      company_name: lead.company || lead.company_name || null
                    })
                  }
                }
              }
            }
            console.log(`Extracted ${allLeads.length} unique leads from search history`)
          }
        }
        
        // Fallback: also check the leads table if no leads found in search_history
        if (allLeads.length === 0) {
          console.log(`No leads in search history, checking leads table...`)
          
          let leadsQuery = supabase
            .from('leads')
            .select('id, phone, contact_name, company_name, category, city')
            .eq('user_id', session.user_id)
            .not('phone', 'is', null)
          
          if (searchQuery) {
            leadsQuery = leadsQuery.ilike('category', `%${searchQuery}%`)
          }
          if (searchCity) {
            leadsQuery = leadsQuery.ilike('city', `%${searchCity}%`)
          }
          
          const { data: tableLeads } = await leadsQuery.limit(100)
          
          if (tableLeads && tableLeads.length > 0) {
            allLeads = tableLeads
            console.log(`Found ${allLeads.length} leads in leads table`)
          }
        }

        if (!allLeads.length) {
          console.log(`No leads available for session ${session.id} - pausing and requesting new leads`)
          
          // Pause session and request new leads
          await supabase
            .from('warming_sessions')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              error_message: 'NEEDS_LEADS:Sem leads disponíveis - selecione uma nova busca para continuar'
            })
            .eq('id', session.id)
          
          continue
        }

        const availableLeads = allLeads.filter((l: any) => !usedPhones.has(l.phone))

        if (!availableLeads.length) {
          console.log(`No more available leads for session ${session.id} (all ${allLeads.length} already used)`)
          
          // If we've run out of leads and used at least 40, complete the warming
          if (session.leads_used >= 40) {
            await supabase
              .from('warming_sessions')
              .update({
                status: 'completed',
                warming_status: 'hot',
                warming_level: 4,
                completed_at: new Date().toISOString()
              })
              .eq('id', session.id)
            
            // Sync daily_limit on linked AI agents
            await syncAgentDailyLimit(supabase, session.whatsapp_number_id, 'hot')
          } else {
            // Otherwise, pause and request new leads
            console.log(`Pausing session ${session.id} - needs more leads to continue`)
            await supabase
              .from('warming_sessions')
              .update({
                status: 'paused',
                paused_at: new Date().toISOString(),
                error_message: 'NEEDS_LEADS:Leads esgotados - selecione uma nova busca para continuar o aquecimento'
              })
              .eq('id', session.id)
          }
          continue
        }
        
        console.log(`${availableLeads.length} leads available for warming`)

        // Try to find a valid WhatsApp number (up to 20 attempts to handle landlines)
        let validLead = null
        let validatedPhone = ''
        const invalidPhones: string[] = []
        const maxValidationAttempts = Math.min(20, availableLeads.length)
        
        console.log(`Will try up to ${maxValidationAttempts} validation attempts from ${availableLeads.length} available leads`)
        
        for (let attempt = 0; attempt < maxValidationAttempts; attempt++) {
          // Pick a random lead that hasn't been marked invalid in this session
          const candidateLeads = availableLeads.filter((l: any) => !invalidPhones.includes(l.phone))
          if (candidateLeads.length === 0) break
          
          const candidate = getRandomElement(candidateLeads)
          console.log(`Validating WhatsApp number: ${candidate.phone} (attempt ${attempt + 1})`)
          
          const validation = await validateWhatsAppNumber(
            session.whatsapp_numbers.instance_name,
            candidate.phone,
            sessionEvoUrl,
            sessionEvoKey
          )
          
          if (validation.exists) {
            validLead = candidate
            validatedPhone = validation.formattedNumber || candidate.phone
            console.log(`✓ Number validated: ${validatedPhone}`)
            break
          } else {
            console.log(`✗ Number not on WhatsApp: ${candidate.phone}`)
            invalidPhones.push(candidate.phone)
            
            // Mark as invalid in warming_interactions so we don't try again
            await supabase
              .from('warming_interactions')
              .insert({
                warming_session_id: session.id,
                user_id: session.user_id,
                lead_phone: candidate.phone,
                lead_name: candidate.contact_name,
                lead_id: candidate.id || null,
                warming_level: level,
                messages_sent: 0,
                messages_received: 0,
                status: 'invalid_number',
                last_message_sent: null,
                last_message_at: new Date().toISOString(),
                conversation_ended: true
              })
            
            // Small delay between validations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        if (!validLead) {
          console.log(`No valid WhatsApp numbers found after ${invalidPhones.length} attempts`)
          continue
        }

        // ===========================================================
        // GERAÇÃO DE MENSAGEM — IA + DIAGNÓSTICO (com fallback clássico)
        // ===========================================================
        const currentLevel = getWarmingLevel(advancedDay);
        const aiMode = (session as any).ai_mode !== false; // default true

        let message: string;
        let aiUsed = false;
        let aiError: string | null = null;
        let leadDiagnostic: LeadDiagnostic | null = null;

        if (aiMode) {
          // Busca diagnóstico completo do lead na tabela leads (rico em endereço/categoria/ai_diagnosis)
          leadDiagnostic = await fetchLeadDiagnostic(supabase, session.user_id, validLead.id || null, validatedPhone);
          // Merge dados básicos do candidate caso lead não esteja na tabela
          const mergedLead: LeadDiagnostic = {
            company_name: leadDiagnostic?.company_name || validLead.company_name || null,
            contact_name: leadDiagnostic?.contact_name || validLead.contact_name || null,
            category: leadDiagnostic?.category || (validLead as any).category || null,
            city: leadDiagnostic?.city || (validLead as any).city || null,
            address: leadDiagnostic?.address || null,
            rating: leadDiagnostic?.rating || null,
            review_count: leadDiagnostic?.review_count || null,
            website: leadDiagnostic?.website || null,
            ai_diagnosis: leadDiagnostic?.ai_diagnosis || null,
            ai_score: leadDiagnostic?.ai_score || null,
            enrichment_data: leadDiagnostic?.enrichment_data || null,
          };
          const userProfile = await fetchUserCompanyProfile(supabase, session.user_id);

          const aiMsg = await generateAIWarmingOpener(mergedLead, userProfile, currentLevel);
          if (aiMsg && aiMsg.length >= 5 && aiMsg.length <= 600) {
            message = aiMsg;
            aiUsed = true;
            console.log(`[AI Warming] N${currentLevel} message generated for ${mergedLead.company_name || validatedPhone}`);
          } else {
            aiError = 'ai_returned_invalid_or_null';
            console.log(`[AI Warming] Falling back to template (${aiError})`);
            message = await getUniqueMessageFromDB(supabase, session.id, levelConfig.initialMessages);
          }
          leadDiagnostic = mergedLead;
        } else {
          // Modo clássico legado
          if (currentLevel >= 3 && validLead.company_name) {
            message = await generateContextualOpeningMessage(
              validLead.company_name,
              validLead.contact_name || null,
              (validLead as any).category || null,
              (validLead as any).city || null,
              currentLevel,
            );
          } else {
            message = await getUniqueMessageFromDB(supabase, session.id, levelConfig.initialMessages);
          }
        }
        console.log(`Sending to validated lead ${validatedPhone}: "${message}"`)

        // Send message
        const sendResult = await sendMessage(
          session.whatsapp_numbers.instance_name,
          validatedPhone,
          message,
          sessionEvoUrl,
          sessionEvoKey
        )

        if (sendResult.messageId === 'BLOCKED') {
          console.log(`BLOCKED detected! Pausing session ${session.id}`)
          await supabase
            .from('warming_sessions')
            .update({
              status: 'error',
              error_message: 'Bloqueio detectado na API. Número pode estar em risco.'
            })
            .eq('id', session.id)
          continue
        }
        
        if (sendResult.messageId === 'NOT_EXISTS') {
          console.log(`Number doesn't exist (post-validation), skipping`)
          continue
        }

        if (sendResult.success) {
          const nowIso = new Date().toISOString();
          // Create interaction record (ai-aware)
          await supabase
            .from('warming_interactions')
            .insert({
              warming_session_id: session.id,
              user_id: session.user_id,
              lead_phone: validatedPhone,
              lead_name: validLead.contact_name,
              lead_id: validLead.id || null,
              warming_level: level,
              messages_sent: 1,
              messages_received: 0,
              status: levelConfig.waitForResponse ? 'pending_response' : 'completed',
              last_message_sent: message,
              last_message_at: nowIso,
              conversation_ended: !levelConfig.waitForResponse,
              ai_generated: aiUsed,
              last_ai_error: aiError,
              lead_diagnostic_snapshot: leadDiagnostic || null,
              conversation_history: [{ role: 'us', text: message, at: nowIso, ai: aiUsed }],
            })

          // Update session
          await supabase
            .from('warming_sessions')
            .update({
              leads_used: session.leads_used + 1,
              messages_sent_today: session.messages_sent_today + 1,
              last_message_at: new Date().toISOString(),
              current_day: advancedDay,
              warming_level: getWarmingLevel(advancedDay),
              warming_status: getWarmingStatus(getWarmingLevel(advancedDay))
            })
            .eq('id', session.id)

          totalMessagesSent++
          sessionsProcessed++
          console.log(`✓ Message sent successfully`)
        } else {
          console.log(`✗ Failed to send message`)
        }

      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error)
        
        // Mark session as error
        await supabase
          .from('warming_sessions')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .eq('id', session.id)
      }
    }

    console.log(`\n=== WARMING PROCESSOR END ===`)
    console.log(`Messages sent: ${totalMessagesSent}, Follow-ups sent: ${followUpsSent}, Sessions processed: ${sessionsProcessed}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesSent: totalMessagesSent,
        followUpsSent: followUpsSent,
        sessionsProcessed: sessionsProcessed,
        totalSessions: sessions?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Warming processor error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
