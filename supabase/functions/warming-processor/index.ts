import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// LÓGICA COMPLETA DOS DISPAROS DE AQUECIMENTO
// ============================================

// Warming level configurations based on spec
const WARMING_LEVELS = {
  1: {
    name: 'Frio - Ativação Inicial',
    daysRange: [1, 5],
    leadsPerDay: 2,
    maxMessagesPerLead: 1,
    minDelayMinutes: 20,
    maxDelayMinutes: 40,
    initialMessages: [
      'Oi',
      'oi',
      'Olá',
      'olá',
      'Bom dia',
      'bom dia',
      'Boa tarde',
      'boa tarde'
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
      'Oi, tudo bem?',
      'oi, tudo bem?',
      'Bom dia, tudo certo?',
      'bom dia, tudo certo?',
      'Olá, tudo bem?',
      'olá, como vai?'
    ],
    followUpMessages: [
      'Tudo sim, obrigado!',
      'tudo sim, obrigado!',
      'Tudo certo por aqui',
      'tudo certo por aqui',
      'Tudo ótimo, valeu!',
      'tudo bem sim!'
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
      'Olá',
      'olá',
      'Oi, tudo bem?',
      'oi, tudo bem?',
      'Oi!',
      'oi!'
    ],
    followUpMessages: [
      'Tudo bem por aí?',
      'tudo bem por aí?',
      'Tudo certo hoje?',
      'tudo certo hoje?',
      'Como está?',
      'como está?'
    ],
    closingMessages: [
      'Que bom!',
      'que bom!',
      'Perfeito, obrigado!',
      'perfeito, obrigado!',
      'Ótimo!',
      'ótimo!'
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
      'Olá! Trabalho com empresas aqui da região, posso enviar uma informação depois?'
    ],
    followUpMessages: [
      'Perfeito, obrigado!',
      'perfeito, obrigado!',
      'Combinado, agradeço!',
      'combinado, agradeço!',
      'Ótimo, valeu!',
      'ótimo, valeu!'
    ],
    closingMessages: [],
    waitForResponse: true,
    responseWaitHours: 24,
    responseDelayMinutes: [5, 15]
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

// Get random element from array
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

// Vary message to avoid patterns
function varyMessage(message: string): string {
  const variations = [
    // No change
    message,
    // Remove punctuation at end
    message.replace(/[.!?]+$/, ''),
    // Add emoji occasionally
    Math.random() > 0.7 ? message + ' 👋' : message,
  ]
  return getRandomElement(variations)
}

// Track messages sent in last period to avoid patterns
let lastMessageTexts: string[] = []

function getUniqueMessage(messages: string[]): string {
  let attempts = 0
  let message: string
  
  do {
    message = varyMessage(getRandomElement(messages))
    attempts++
  } while (lastMessageTexts.includes(message) && attempts < 10)
  
  // Keep track of last 5 messages
  lastMessageTexts.push(message)
  if (lastMessageTexts.length > 5) {
    lastMessageTexts.shift()
  }
  
  return message
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

// Send message via Evolution API
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
async function checkForAutoPause(
  supabase: any,
  sessionId: string
): Promise<boolean> {
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  
  // Only count SENT messages (not invalid_number entries)
  const { data: recentInteractions } = await supabase
    .from('warming_interactions')
    .select('messages_received, messages_sent, status')
    .eq('warming_session_id', sessionId)
    .gte('created_at', fiveDaysAgo.toISOString())
  
  // Filter to only sent messages (exclude invalid_number)
  const sentMessages = recentInteractions?.filter((i: any) => 
    i.status !== 'invalid_number' && i.messages_sent > 0
  ) || []
  
  // Need at least 5 actual sent messages to trigger pause
  if (sentMessages.length < 5) {
    return false
  }
  
  // Check if all recent sent messages have 0 responses
  const allNoResponse = sentMessages.every((i: any) => i.messages_received === 0)
  return allNoResponse
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
          is_connected
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
          whatsapp_numbers!inner(instance_name, is_connected)
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
        
        console.log(`Sending follow-up to ${interaction.lead_phone}: "${interaction.last_message_sent}"`)
        
        const sendResult = await sendMessage(
          instanceName,
          interaction.lead_phone,
          interaction.last_message_sent,
          evolutionApiUrl,
          evolutionApiKey
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
        
        // Check if number is connected - PAUSE if disconnected instead of just skipping
        if (!session.whatsapp_numbers.is_connected || !session.whatsapp_numbers.instance_name) {
          console.log(`Number ${session.whatsapp_number_id} not connected, pausing warming session`)
          
          // Pause the session so it can be resumed when reconnected
          await supabase
            .from('warming_sessions')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              error_message: 'Número desconectado - reconecte para continuar o aquecimento'
            })
            .eq('id', session.id)
          
          continue
        }

        // Check for auto-pause conditions
        const shouldAutoPause = await checkForAutoPause(supabase, session.id)
        if (shouldAutoPause) {
          console.log(`Auto-pausing session ${session.id} due to 5 days without responses`)
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

        // Calculate current day (days since started)
        const startDate = new Date(session.started_at)
        const now = new Date()
        const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const currentDay = Math.max(1, daysDiff)

        console.log(`Session day: ${currentDay}, leads used: ${session.leads_used}/${session.leads_limit}`)

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
          
          console.log(`Warming completed for session ${session.id}`)
          continue
        }

        // Get warming level config
        const level = getWarmingLevel(currentDay)
        const levelConfig = WARMING_LEVELS[level as keyof typeof WARMING_LEVELS]

        console.log(`Warming level: ${level} (${levelConfig.name})`)

        // Check if we need to reset daily count (based on São Paulo date)
        const saoPauloNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        const today = saoPauloNow.toISOString().split('T')[0]
        
        if (session.last_reset_date !== today) {
          console.log(`Resetting daily count for new day: ${today}`)
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
            evolutionApiUrl,
            evolutionApiKey
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

        const message = getUniqueMessage(levelConfig.initialMessages)
        console.log(`Sending to validated lead ${validatedPhone}: "${message.substring(0, 30)}..."`)

        // Send message
        const sendResult = await sendMessage(
          session.whatsapp_numbers.instance_name,
          validatedPhone,
          message,
          evolutionApiUrl,
          evolutionApiKey
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
          // Create interaction record
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
              status: levelConfig.waitForResponse ? 'in_progress' : 'completed',
              last_message_sent: message,
              last_message_at: new Date().toISOString(),
              conversation_ended: !levelConfig.waitForResponse
            })

          // Update session
          await supabase
            .from('warming_sessions')
            .update({
              leads_used: session.leads_used + 1,
              messages_sent_today: session.messages_sent_today + 1,
              last_message_at: new Date().toISOString(),
              current_day: currentDay,
              warming_level: level,
              warming_status: getWarmingStatus(level)
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
