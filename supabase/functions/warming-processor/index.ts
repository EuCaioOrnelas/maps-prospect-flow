import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Warming level configurations
const WARMING_LEVELS = {
  1: {
    name: 'Ativação Inicial',
    days: [1, 5],
    leadsPerDay: 2,
    maxMessagesPerLead: 1,
    minDelayMinutes: 15,
    maxDelayMinutes: 30,
    initialMessages: ['Oi', 'Olá', 'Bom dia'],
    responseMessages: []
  },
  2: {
    name: 'Conversa Leve',
    days: [6, 10],
    leadsPerDay: 3,
    maxMessagesPerLead: 2,
    minDelayMinutes: 10,
    maxDelayMinutes: 25,
    initialMessages: ['Oi, tudo bem?', 'Bom dia, tudo certo?'],
    responseMessages: ['Tudo sim, obrigado!', 'Tudo certo por aqui']
  },
  3: {
    name: 'Interação Natural',
    days: [11, 15],
    leadsPerDay: 3,
    maxMessagesPerLead: 3,
    minDelayMinutes: 8,
    maxDelayMinutes: 20,
    initialMessages: ['Olá', 'Tudo bem por aí?'],
    responseMessages: ['Que bom!', 'Tudo certo!', 'Ótimo, obrigado por perguntar']
  },
  4: {
    name: 'Pré-Comercial',
    days: [16, 20],
    leadsPerDay: 2,
    maxMessagesPerLead: 1,
    minDelayMinutes: 15,
    maxDelayMinutes: 30,
    initialMessages: ['Oi, tudo bem? Trabalho com empresas da região, posso te mandar uma informação rápida depois?'],
    responseMessages: []
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

// Get random message from array
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

// Get random delay in milliseconds
function getRandomDelay(minMinutes: number, maxMinutes: number): number {
  const min = minMinutes * 60 * 1000
  const max = maxMinutes * 60 * 1000
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Check if current time is within business hours (8h-18h São Paulo time)
function isBusinessHours(): boolean {
  const now = new Date()
  const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const hour = saoPauloTime.getHours()
  return hour >= 8 && hour < 18
}

// Send message via Evolution API
async function sendMessage(
  instanceName: string,
  phoneNumber: string,
  message: string,
  evolutionApiUrl: string,
  evolutionApiKey: string
): Promise<boolean> {
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
      console.error('Error sending message:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending warming message:', error)
    return false
  }
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

    // Check business hours
    if (!isBusinessHours()) {
      console.log('Outside business hours, skipping warming')
      return new Response(
        JSON.stringify({ message: 'Outside business hours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all active warming sessions
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

    console.log(`Found ${sessions?.length || 0} active warming sessions`)

    let totalMessagesSent = 0

    for (const session of sessions || []) {
      try {
        // Check if number is connected
        if (!session.whatsapp_numbers.is_connected || !session.whatsapp_numbers.instance_name) {
          console.log(`Number ${session.whatsapp_number_id} not connected, skipping`)
          continue
        }

        // Calculate current day (days since started)
        const startDate = new Date(session.started_at)
        const now = new Date()
        const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const currentDay = Math.max(1, daysDiff)

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

        // Check if we need to reset daily count
        const today = new Date().toISOString().split('T')[0]
        if (session.last_reset_date !== today) {
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
          console.log(`Daily limit reached for session ${session.id}`)
          continue
        }

        // Check delay since last message
        if (session.last_message_at) {
          const lastMessageTime = new Date(session.last_message_at).getTime()
          const minDelay = levelConfig.minDelayMinutes * 60 * 1000
          if (Date.now() - lastMessageTime < minDelay) {
            console.log(`Waiting for delay, session ${session.id}`)
            continue
          }
        }

        // Get available leads from user's prospects
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, phone, contact_name')
          .eq('user_id', session.user_id)
          .not('phone', 'is', null)
          .limit(50)

        if (leadsError || !leads?.length) {
          console.log(`No leads available for session ${session.id}`)
          continue
        }

        // Get already used leads
        const { data: usedInteractions } = await supabase
          .from('warming_interactions')
          .select('lead_phone')
          .eq('warming_session_id', session.id)

        const usedPhones = new Set(usedInteractions?.map(i => i.lead_phone) || [])
        const availableLeads = leads.filter(l => !usedPhones.has(l.phone))

        if (!availableLeads.length) {
          console.log(`No more available leads for session ${session.id}`)
          continue
        }

        // Pick a random lead
        const lead = availableLeads[Math.floor(Math.random() * availableLeads.length)]
        const message = getRandomMessage(levelConfig.initialMessages)

        // Send message
        const success = await sendMessage(
          session.whatsapp_numbers.instance_name,
          lead.phone,
          message,
          evolutionApiUrl,
          evolutionApiKey
        )

        if (success) {
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
              status: 'in_progress',
              last_message_sent: message,
              last_message_at: new Date().toISOString()
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
          console.log(`Sent warming message to ${lead.phone} for session ${session.id}`)
        }

      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error)
        
        // Mark session as error
        await supabase
          .from('warming_sessions')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', session.id)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesSent: totalMessagesSent,
        sessionsProcessed: sessions?.length || 0
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
