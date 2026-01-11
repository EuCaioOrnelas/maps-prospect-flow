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
  
  const { data: recentInteractions } = await supabase
    .from('warming_interactions')
    .select('messages_received')
    .eq('warming_session_id', sessionId)
    .gte('created_at', fiveDaysAgo.toISOString())
  
  if (!recentInteractions || recentInteractions.length < 5) {
    return false
  }
  
  // Check if all recent interactions have 0 responses
  const allNoResponse = recentInteractions.every((i: any) => i.messages_received === 0)
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

    console.log('=== WARMING PROCESSOR START ===')
    console.log('Time:', new Date().toISOString())

    // Check business hours (Mon-Fri, 8h-18h São Paulo)
    if (!isBusinessHours()) {
      console.log('Outside business hours (Mon-Fri, 08:00-18:00 São Paulo), skipping')
      return new Response(
        JSON.stringify({ message: 'Outside business hours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    for (const session of sessions || []) {
      try {
        console.log(`\n--- Processing session ${session.id} ---`)
        
        // Check if number is connected
        if (!session.whatsapp_numbers.is_connected || !session.whatsapp_numbers.instance_name) {
          console.log(`Number ${session.whatsapp_number_id} not connected, skipping`)
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

        // Get available leads from user's prospects (exclude already used)
        const { data: usedInteractions } = await supabase
          .from('warming_interactions')
          .select('lead_phone')
          .eq('warming_session_id', session.id)

        const usedPhones = new Set(usedInteractions?.map((i: any) => i.lead_phone) || [])

        // Get the search assignment for this number
        const assignment = assignments?.find((a: any) => a.whatsapp_number_id === session.whatsapp_number_id)
        
        // Build leads query - filter by assigned search if available
        let leadsQuery = supabase
          .from('leads')
          .select('id, phone, contact_name, category, city')
          .eq('user_id', session.user_id)
          .not('phone', 'is', null)

        // Filter by assigned search (category = keyword, city = location)
        if (assignment) {
          console.log(`Filtering leads by assigned search: "${assignment.search_query}" in "${assignment.search_city}"`)
          leadsQuery = leadsQuery.eq('category', assignment.search_query)
          if (assignment.search_city) {
            leadsQuery = leadsQuery.eq('city', assignment.search_city)
          }
        } else if (session.assigned_search_query) {
          // Fallback to session's own assigned search
          console.log(`Filtering leads by session search: "${session.assigned_search_query}" in "${session.assigned_search_city}"`)
          leadsQuery = leadsQuery.eq('category', session.assigned_search_query)
          if (session.assigned_search_city) {
            leadsQuery = leadsQuery.eq('city', session.assigned_search_city)
          }
        }

        const { data: leads, error: leadsError } = await leadsQuery.limit(100)

        if (leadsError || !leads?.length) {
          console.log(`No leads available for session ${session.id} (check search assignment)`)
          continue
        }

        const availableLeads = leads.filter((l: any) => !usedPhones.has(l.phone))

        if (!availableLeads.length) {
          console.log(`No more available leads for session ${session.id}`)
          
          // If we've run out of leads before 50, complete the warming
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
          }
          continue
        }

        // Pick a random lead
        const lead = getRandomElement(availableLeads)
        const message = getUniqueMessage(levelConfig.initialMessages)

        console.log(`Sending to lead ${lead.phone}: "${message.substring(0, 30)}..."`)

        // Send message
        const sendResult = await sendMessage(
          session.whatsapp_numbers.instance_name,
          lead.phone,
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

        if (sendResult.success) {
          // Create interaction record
          await supabase
            .from('warming_interactions')
            .insert({
              warming_session_id: session.id,
              user_id: session.user_id,
              lead_phone: lead.phone,
              lead_name: lead.contact_name,
              lead_id: lead.id,
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
    console.log(`Messages sent: ${totalMessagesSent}, Sessions processed: ${sessionsProcessed}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesSent: totalMessagesSent,
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
