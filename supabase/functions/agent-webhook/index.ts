import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Response limits by warming status
const RESPONSE_LIMITS = {
  cold: 20,      // Número frio: 20 leads respondidos
  warm: 100,     // Número morno: 100 leads respondidos
  hot: null,     // Número aquecido: sem limite
};

// Get São Paulo time
function getSaoPauloTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

// Check if current time is within operating hours (supports overnight ranges, e.g. 18:00 -> 00:00)
function isWithinOperatingHours(startTime: string, endTime: string): boolean {
  // 24 hours mode: 00:00 to 23:59
  const startNormalized = startTime.slice(0, 5);
  const endNormalized = endTime.slice(0, 5);
  
  if (startNormalized === "00:00" && (endNormalized === "23:59" || endNormalized === "23:59:00")) {
    console.log('24-hour mode detected, always within operating hours');
    return true;
  }
  
  const now = getSaoPauloTime();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Normal same-day window (e.g. 08:00 -> 18:00)
  if (endMinutes >= startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Overnight window (e.g. 18:00 -> 00:00, or 22:00 -> 06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

// Get random delay between min and max seconds
function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

// Calculate typing delay based on message length (realistic human typing)
function calculateTypingDelay(messageLength: number): number {
  const charsPerSecond = 3.5;
  const typingTime = (messageLength / charsPerSecond) * 1000;
  const thinkingBuffer = Math.random() * 3000 + 2000;
  const readingTime = Math.random() * 2000 + 1000;
  return Math.floor(typingTime + thinkingBuffer + readingTime);
}

// Check if message appears to be a response to a prospecting campaign
function isResponseToCampaign(message: string): boolean {
  const greetingPatterns = [
    /^(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|eai|fala|hello|hi|hey)/i,
    /tudo (bem|bom|certo|tranquilo|ótimo)/i,
    /^(sim|ok|beleza|pode|claro|quero|interesse)/i,
    /como (funciona|é|faz)/i,
    /^(qual|quanto|quando|onde|como)\b/i,
    /mais (informações|informacoes|detalhes|sobre)/i,
    /^(obrigado|obrigada|valeu|thanks)/i,
  ];
  
  const normalizedMessage = message.toLowerCase().trim();
  return greetingPatterns.some(pattern => pattern.test(normalizedMessage));
}

// Get warming status for a WhatsApp number
async function getWarmingStatus(supabase: any, whatsappNumberId: string): Promise<'cold' | 'warm' | 'hot'> {
  const { data: session } = await supabase
    .from('warming_sessions')
    .select('warming_status')
    .eq('whatsapp_number_id', whatsappNumberId)
    .single();
  
  if (!session) return 'cold';
  return session.warming_status || 'cold';
}

// Count unique leads responded to by this agent
async function countUniqueLeadsResponded(supabase: any, agentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('agent_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('reply_sent', true);
  
  if (error) {
    console.error('Error counting unique leads:', error);
    return 0;
  }
  
  return count || 0;
}

// Check if agent has reached response limit
async function hasReachedResponseLimit(
  supabase: any, 
  agentId: string, 
  whatsappNumberId: string
): Promise<{ reached: boolean; currentCount: number; limit: number | null; warmingStatus: string }> {
  const warmingStatus = await getWarmingStatus(supabase, whatsappNumberId);
  const limit = RESPONSE_LIMITS[warmingStatus];
  const currentCount = await countUniqueLeadsResponded(supabase, agentId);
  
  console.log(`Agent ${agentId} - Warming: ${warmingStatus}, Limit: ${limit ?? 'unlimited'}, Current: ${currentCount}`);
  
  if (limit === null) {
    return { reached: false, currentCount, limit, warmingStatus };
  }
  
  return { 
    reached: currentCount >= limit, 
    currentCount, 
    limit, 
    warmingStatus 
  };
}

// Move lead to CRM stage by stage name - with flexible phone matching
// Also updates message timestamps and whatsapp_status on the lead
async function moveLeadToCRMStage(
  supabase: any, 
  phone: string, 
  userId: string, 
  stageName: string,
  extras?: {
    last_message_sent?: string;
    last_message_sent_at?: string;
    last_response?: string;
    last_response_at?: string;
    whatsapp_status?: string;
  }
): Promise<void> {
  try {
    // Normalize phone to match leads table format
    const phoneDigitsOnly = phone.replace(/\D/g, '');
    const last8Digits = phoneDigitsOnly.slice(-8);
    
    // Build multiple format attempts for matching
    let normalizedPhone = phoneDigitsOnly;
    if (phoneDigitsOnly.length >= 10 && phoneDigitsOnly.length <= 11 && !phoneDigitsOnly.startsWith('55')) {
      normalizedPhone = '55' + phoneDigitsOnly;
    }
    
    console.log(`=== MOVE LEAD TO CRM STAGE: ${stageName} ===`);
    console.log('Input phone:', phone);
    console.log('Normalized phone:', normalizedPhone);
    console.log('Last 8 digits:', last8Digits);
    
    // First try exact match with multiple formats
    let { data: leads } = await supabase
      .from('leads')
      .select('id, pipeline_stage_id, user_id, phone')
      .eq('user_id', userId)
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone},phone.eq.${phoneDigitsOnly},phone.eq.55${phoneDigitsOnly.slice(-11)},phone.eq.55${phoneDigitsOnly.slice(-10)}`);
    
    let lead = leads?.[0];
    
    // If no exact match, try matching by last 8 digits
    if (!lead && last8Digits.length === 8) {
      const { data: allUserLeads } = await supabase
        .from('leads')
        .select('id, pipeline_stage_id, user_id, phone')
        .eq('user_id', userId);
      
      if (allUserLeads && allUserLeads.length > 0) {
        lead = allUserLeads.find((l: any) => {
          const leadPhone = l.phone?.replace(/\D/g, '') || '';
          const leadLast8 = leadPhone.slice(-8);
          return leadLast8 === last8Digits;
        }) || null;
        
        if (lead) {
          console.log('Lead found by last 8 digits match:', lead.phone);
        }
      }
    }
    
    if (!lead) {
      console.log(`No lead found for phone ${phone} (last 8: ${last8Digits})`);
      return;
    }
    
    console.log('Found lead:', lead.id, 'phone:', lead.phone);
    
    // Find the target stage
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('user_id', userId)
      .eq('name', stageName)
      .single();
    
    if (!stage) {
      console.log(`Stage "${stageName}" not found for user ${userId}`);
      return;
    }
    
    // Don't move if already in target stage (but still update extras)
    if (lead.pipeline_stage_id === stage.id && !extras) {
      console.log(`Lead ${lead.id} already in stage "${stageName}"`);
      return;
    }
    
    // Update lead's stage and optional message fields
    const updatePayload: Record<string, any> = { 
      pipeline_stage_id: stage.id,
      updated_at: new Date().toISOString()
    };
    
    if (extras) {
      if (extras.last_message_sent !== undefined) updatePayload.last_message_sent = extras.last_message_sent;
      if (extras.last_message_sent_at !== undefined) updatePayload.last_message_sent_at = extras.last_message_sent_at;
      if (extras.last_response !== undefined) updatePayload.last_response = extras.last_response;
      if (extras.last_response_at !== undefined) updatePayload.last_response_at = extras.last_response_at;
      if (extras.whatsapp_status !== undefined) updatePayload.whatsapp_status = extras.whatsapp_status;
    }
    
    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id);
    
    if (error) {
      console.error(`Error moving lead to ${stageName}:`, error);
      return;
    }
    
    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: userId,
      activity_type: 'stage_changed',
      description: `Movido automaticamente para ${stageName} pelo agente IA`,
      metadata: { automated: true, source: 'ai_agent' }
    });
    
    console.log(`Lead ${lead.id} moved to "${stageName}"`);
  } catch (err) {
    console.error('Error in moveLeadToCRMStage:', err);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Evolution API credentials will be resolved per-number tier
    const EVOLUTION_API_URL_FREE = Deno.env.get('EVOLUTION_API_URL')!;
    const EVOLUTION_API_KEY_FREE = Deno.env.get('EVOLUTION_API_KEY')!;
    const EVOLUTION_API_URL_PAID = Deno.env.get('EVOLUTION_API_URL_PAID');
    const EVOLUTION_API_KEY_PAID = Deno.env.get('EVOLUTION_API_KEY_PAID');

    // Helper to resolve Evolution credentials based on number's api_tier
    async function resolveEvolutionCreds(numberId: string): Promise<{ url: string; apiKey: string }> {
      const { data: numRow } = await supabase
        .from('whatsapp_numbers')
        .select('api_tier, user_id')
        .eq('id', numberId)
        .maybeSingle();

      const isPaidByNumber = numRow?.api_tier === 'paid';
      let isPaidByPlan = false;

      if (!isPaidByNumber && numRow?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', numRow.user_id)
          .maybeSingle();
        const plan = (profile?.plan || 'free').toLowerCase();
        isPaidByPlan = ['start', 'growth', 'scale'].includes(plan);
      }

      if ((isPaidByNumber || isPaidByPlan) && EVOLUTION_API_URL_PAID && EVOLUTION_API_KEY_PAID) {
        const cleanUrl = EVOLUTION_API_URL_PAID.replace(/\/+$/, '').replace(/\/manager$/, '');
        return { url: cleanUrl, apiKey: EVOLUTION_API_KEY_PAID };
      }
      const cleanUrl = EVOLUTION_API_URL_FREE.replace(/\/+$/, '').replace(/\/manager$/, '');
      return { url: cleanUrl, apiKey: EVOLUTION_API_KEY_FREE };
    }

    // Default credentials (will be overridden per-number when available)
    let evolutionApiUrl = EVOLUTION_API_URL_FREE.replace(/\/+$/, '').replace(/\/manager$/, '');
    let evolutionApiKey = EVOLUTION_API_KEY_FREE;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    let agentId = url.searchParams.get('agent_id');
    const action = url.searchParams.get('action') || 'receive'; // receive, send, process
    const instanceName = url.searchParams.get('instance'); // Instance name from Evolution webhook

    let agent: any = null;
    let whatsappNumberId: string | null = null;

    // If agent_id provided, fetch directly
    if (agentId) {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*, whatsapp_number:whatsapp_numbers(id, instance_name, phone_number, user_id)')
        .eq('id', agentId)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Agent not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      agent = data;
      whatsappNumberId = agent.whatsapp_number?.id;
    } 
    // If instance name provided, find agent by WhatsApp number
    else if (instanceName) {
      console.log('Looking up agent by instance name:', instanceName);
      
      // First find the whatsapp_number by instance_name
      const { data: whatsappNumber } = await supabase
        .from('whatsapp_numbers')
        .select('id, user_id')
        .eq('instance_name', instanceName)
        .single();
      
      if (whatsappNumber) {
        whatsappNumberId = whatsappNumber.id;
        
        // Find ALL active agents using this number (warming + user agents can coexist)
        const { data: agents } = await supabase
          .from('ai_agents')
          .select('*, whatsapp_number:whatsapp_numbers(id, instance_name, phone_number, user_id)')
          .eq('whatsapp_number_id', whatsappNumber.id)
          .eq('status', 'active');
        
        if (agents && agents.length > 0) {
          // Prioritize warming agent if exists, otherwise use user agent
          const warmingAgent = agents.find((a: any) => a.objective === 'warming');
          const userAgent = agents.find((a: any) => a.objective !== 'warming');
          
          // Use warming agent if number is still warming, otherwise user agent
          // Check warming session status
          const { data: warmingSession } = await supabase
            .from('warming_sessions')
            .select('status, warming_status, agent_reply_limit')
            .eq('whatsapp_number_id', whatsappNumber.id)
            .single();
          
          const isWarming = warmingSession && 
            (warmingSession.status === 'active' || warmingSession.status === 'paused') &&
            warmingSession.warming_status !== 'hot';
          
          // Get custom reply limit from session, default to 2
          const warmingReplyLimit = warmingSession?.agent_reply_limit ?? 2;
          
          if (isWarming && warmingAgent) {
            // Number is warming - use warming agent
            agent = warmingAgent;
            agentId = warmingAgent.id;
            console.log('Using warming agent:', agent.name, agent.id);
          } else if (userAgent) {
            // Number is warmed or no warming agent - use user agent
            agent = userAgent;
            agentId = userAgent.id;
            
            // If warming is active, apply response limits to user agent
            if (isWarming) {
              agent._warmingLimited = true;
              // Use custom limit from session, 0 means no limit
              agent._effectiveMaxReplies = warmingReplyLimit === 0 ? null : warmingReplyLimit;
              console.log(`User agent with warming limits: ${agent.name}, limit: ${warmingReplyLimit === 0 ? 'unlimited' : warmingReplyLimit}`);
            } else {
              agent._warmingLimited = false;
              console.log('User agent without limits (warmed):', agent.name);
            }
          } else if (warmingAgent) {
            // Only warming agent exists
            agent = warmingAgent;
            agentId = warmingAgent.id;
            console.log('Only warming agent found:', agent.name);
          }
        }
      }
    }

    // If no agent found, return appropriate message
    if (!agent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'no_agent',
          message: 'No active agent found for this number' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve Evolution API credentials based on number's tier
    if (whatsappNumberId) {
      const creds = await resolveEvolutionCreds(whatsappNumberId);
      evolutionApiUrl = creds.url;
      evolutionApiKey = creds.apiKey;
      console.log(`Resolved Evolution API tier for number ${whatsappNumberId}: ${creds.url}`);
    }

    // Check if agent is active
    if (agent.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Agent is not active', status: agent.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check operating hours
    if (!isWithinOperatingHours(agent.operating_hours_start, agent.operating_hours_end)) {
      console.log('Outside operating hours, skipping');
      
      // CRM: Move lead to configured stage when outside operating hours (agent can't respond)
      const userId = agent.whatsapp_number?.user_id;
      if (userId && action === 'receive') {
        const body = await req.clone().json();
        if (body.phone) {
          const crmStageNewLead = agent.crm_stage_on_new_lead || 'Respondeu Mensagem';
          await moveLeadToCRMStage(supabase, body.phone, userId, crmStageNewLead, {
            last_response: body.message,
            last_response_at: new Date().toISOString(),
            whatsapp_status: 'replied',
          });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'outside_hours',
          message: `Agent operates between ${agent.operating_hours_start} and ${agent.operating_hours_end}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // === ACTION: RECEIVE MESSAGE (buffer for delayed response) ===
    if (action === 'receive') {
      const { phone, message, lead_name, message_id } = body;

      if (!phone || !message) {
        return new Response(
          JSON.stringify({ error: 'phone and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buffer delay: 2 minutes
      const BUFFER_DELAY_MS = 2 * 60 * 1000;
      const processAfter = new Date(Date.now() + BUFFER_DELAY_MS).toISOString();

      // Check for duplicate message within last 30 seconds
      const { data: recentSameMessage } = await supabase
        .from('agent_message_buffer')
        .select('id')
        .eq('agent_id', agentId)
        .eq('lead_phone', phone)
        .eq('message_content', message)
        .gte('received_at', new Date(Date.now() - 30000).toISOString())
        .limit(1)
        .maybeSingle();
      
      if (recentSameMessage) {
        console.log(`Duplicate message detected, skipping`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: 'duplicate_message',
            message: 'Duplicate message detected' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if conversation exists
      let { data: existingConv } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('lead_phone', phone)
        .single();

      // If conversation is completed or limit_reached, handle smartly
      if (existingConv && (existingConv.status === 'completed' || existingConv.status === 'limit_reached')) {
        const completedAt = existingConv.reply_sent_at || existingConv.updated_at;
        const hoursSinceCompletion = completedAt 
          ? (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60) 
          : 999;
        
        const REOPEN_COOLDOWN_HOURS = 3;
        
        if (hoursSinceCompletion < REOPEN_COOLDOWN_HOURS) {
          // Too soon to reopen - but SAVE the message for context when it reopens
          console.log(`Conversation ${existingConv.id} completed ${hoursSinceCompletion.toFixed(1)}h ago (< ${REOPEN_COOLDOWN_HOURS}h cooldown), buffering message without processing`);
          
          // Save to message logs so the AI has full context when conversation reopens
          await supabase.from('agent_message_logs').insert({
            agent_id: agentId,
            conversation_id: existingConv.id,
            direction: 'received',
            content: message,
          });
          
          // Update CRM with latest response
          const userId = agent.whatsapp_number?.user_id;
          if (userId) {
            const crmStageOnNewLead = agent.crm_stage_on_new_lead || 'Respondeu Mensagem';
            await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
              last_response: message,
              last_response_at: new Date().toISOString(),
              whatsapp_status: 'replied',
            });
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              reason: 'cooldown_active_message_logged',
              message: `Message saved to history. Conversation will reopen after cooldown (${(REOPEN_COOLDOWN_HOURS - hoursSinceCompletion).toFixed(1)}h remaining)` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Cooldown passed - REOPEN the conversation with full history (don't delete!)
        console.log(`Reopening conversation ${existingConv.id} for ${phone} (completed ${hoursSinceCompletion.toFixed(1)}h ago, history preserved)`);
        
        const processAfterReopen = new Date(Date.now() + BUFFER_DELAY_MS).toISOString();
        await supabase
          .from('agent_conversations')
          .update({
            status: 'buffering',
            process_after: processAfterReopen,
            is_processing: false,
            response_received: true,
            response_received_at: new Date().toISOString(),
            response_content: message,
          })
          .eq('id', existingConv.id);
        
        // Buffer the new message (history in agent_message_logs is preserved!)
        await supabase.from('agent_message_buffer').insert({
          agent_id: agentId,
          conversation_id: existingConv.id,
          lead_phone: phone,
          lead_name: lead_name,
          message_content: message,
          received_at: new Date().toISOString(),
        });
        
        // Update CRM
        const userId = agent.whatsapp_number?.user_id;
        if (userId) {
          const crmStageOnNewLead = agent.crm_stage_on_new_lead || 'Respondeu Mensagem';
          await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
            last_response: message,
            last_response_at: new Date().toISOString(),
            whatsapp_status: 'in_conversation',
          });
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'conversation_reopened',
            conversation_id: existingConv.id,
            process_after: processAfterReopen,
            message: 'Conversation reopened with full history'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get configurable CRM stage names from agent
      const crmStageOnNewLead = agent.crm_stage_on_new_lead || 'Respondeu Mensagem';

      // Check if user (owner) responded to this lead today - agent should not respond
      // EXCEPTION: "atendimento" objective agents continue responding even if user responded
      if (existingConv && agent.objective !== 'atendimento') {
        const today = new Date().toISOString().split('T')[0];
        if (existingConv.user_responded_date === today) {
          console.log(`User responded to lead ${phone} today, agent ${agentId} paused for this lead`);
          
          // CRM: Move to configured stage since agent won't respond
          const userId = agent.whatsapp_number?.user_id;
          if (userId) {
            await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
              last_response: message,
              last_response_at: new Date().toISOString(),
              whatsapp_status: 'replied',
            });
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              reason: 'user_responded_today',
              message: 'User already responded to this lead today, agent paused' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // If user responded yesterday or before, reset the flag and allow agent to continue
        if (existingConv.user_responded_date && existingConv.user_responded_date !== today) {
          console.log(`User responded on ${existingConv.user_responded_date}, but today is ${today}. Resetting flag.`);
          await supabase
            .from('agent_conversations')
            .update({
              user_responded_date: null,
              user_responded_at: null,
              status: 'buffering',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConv.id);
        }
      }

      // Create new conversation if doesn't exist
      if (!existingConv) {
        // Check response limits BEFORE creating conversation
        if (whatsappNumberId) {
          const limitCheck = await hasReachedResponseLimit(supabase, agentId!, whatsappNumberId);
          
          if (limitCheck.reached) {
            console.log(`Agent ${agentId} reached limit for new lead: ${limitCheck.currentCount}/${limitCheck.limit}`);
            
             // CRM: Move to configured stage since we can't respond
            const userId = agent.whatsapp_number?.user_id;
            if (userId) {
              await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
                last_response: message,
                last_response_at: new Date().toISOString(),
                whatsapp_status: 'replied',
              });
            }
            
            return new Response(
              JSON.stringify({ 
                success: false, 
                reason: 'limit_reached',
                message: `Response limit reached: ${limitCheck.currentCount}/${limitCheck.limit} (${limitCheck.warmingStatus})` 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        const { data: newConv, error: createError } = await supabase
          .from('agent_conversations')
          .insert({
            agent_id: agentId,
            lead_phone: phone,
            lead_name: lead_name,
            response_received: true,
            response_received_at: new Date().toISOString(),
            response_content: message,
            status: 'buffering',
            reply_count: 0,
            process_after: processAfter,
            is_processing: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }
        existingConv = newConv;
        console.log(`Created new conversation ${newConv.id} for ${phone}`);
        
        // CRM Integration: Move lead to configured stage when lead responds (new conversation)
        const userId = agent.whatsapp_number?.user_id;
        if (userId) {
          await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
            last_response: message,
            last_response_at: new Date().toISOString(),
            whatsapp_status: 'replied',
          });
        }
      } else {
        // Existing conversation - lead is responding again
        // CRM Integration: Move lead to configured stage
        const userId = agent.whatsapp_number?.user_id;
        if (userId) {
          await moveLeadToCRMStage(supabase, phone, userId, crmStageOnNewLead, {
            last_response: message,
            last_response_at: new Date().toISOString(),
            whatsapp_status: 'in_conversation',
          });
        }
      }

      // Reply count tracking
      const currentReplyCount = existingConv.reply_count || 0;
      console.log(`Current reply count: ${currentReplyCount}`);

      // Add message to buffer
      await supabase.from('agent_message_buffer').insert({
        agent_id: agentId,
        conversation_id: existingConv.id,
        lead_phone: phone,
        lead_name: lead_name,
        message_content: message,
        received_at: new Date().toISOString(),
      });

      // Update conversation: extend process_after deadline (reset 2 min timer)
      const { error: updateError } = await supabase
        .from('agent_conversations')
        .update({
          response_received: true,
          response_received_at: new Date().toISOString(),
          response_content: message,
          status: 'buffering',
          process_after: processAfter,
          is_processing: false,
        })
        .eq('id', existingConv.id);
      
      if (updateError) {
        console.error('Error updating conversation:', updateError);
      } else {
        console.log(`Conversation ${existingConv.id} updated with process_after: ${processAfter}`);
      }

      console.log(`Message buffered for conv ${existingConv.id}. Will process after ${processAfter}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'message_buffered',
          conversation_id: existingConv.id,
          process_after: processAfter 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === ACTION: SEND INITIAL MESSAGE (proactive prospecting) ===
    if (action === 'send') {
      const { phone, lead_name, message } = body;

      if (!phone) {
        return new Response(
          JSON.stringify({ error: 'phone is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already contacted this lead
      const { data: existingConv } = await supabase
        .from('agent_conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('lead_phone', phone)
        .single();

      if (existingConv) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: 'already_contacted',
            message: 'Lead already contacted by this agent' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get message template
      const templates = agent.message_templates as string[] || [];
      let messageToSend = message;
      
      if (!messageToSend && templates.length > 0) {
        // Pick random template
        messageToSend = templates[Math.floor(Math.random() * templates.length)];
        // Replace variables
        messageToSend = messageToSend
          .replace('{nome}', lead_name || 'você')
          .replace('{categoria}', agent.target_audience || 'sua área');
      }

      if (!messageToSend) {
        messageToSend = 'Olá! Tudo bem?';
      }

      // Random delay before sending
      const delay = getRandomDelay(30, 180);
      console.log(`Waiting ${delay/1000}s before sending...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));

      // Send via Evolution API
      const whatsappInstanceName = agent.whatsapp_number?.instance_name;
      if (!whatsappInstanceName) {
        return new Response(
          JSON.stringify({ error: 'WhatsApp number not configured properly' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${whatsappInstanceName}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phone,
          text: messageToSend,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error('Failed to send message:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to send message', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create conversation record
      const { data: newConv } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          lead_phone: phone,
          lead_name: lead_name,
          initial_message_sent_at: new Date().toISOString(),
          initial_message_content: messageToSend,
          status: 'awaiting_response',
        })
        .select()
        .single();

      // Log the message
      if (newConv) {
        await supabase.from('agent_message_logs').insert({
          agent_id: agentId,
          conversation_id: newConv.id,
          direction: 'sent',
          content: messageToSend,
        });
      }

      // Increment daily count
      await supabase
        .from('ai_agents')
        .update({ 
          messages_sent_today: agent.messages_sent_today + 1,
          last_reset_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', agentId);

      // CRM Integration: Move lead to configured stage when agent sends initial message
      const userId = agent.whatsapp_number?.user_id;
      if (userId) {
        const crmStageReply = agent.crm_stage_on_reply || 'Mensagem Enviada';
        await moveLeadToCRMStage(supabase, phone, userId, crmStageReply, {
          last_message_sent: messageToSend,
          last_message_sent_at: new Date().toISOString(),
          whatsapp_status: 'message_sent',
        });
      }

      // Forward to n8n webhook if configured
      if (agent.n8n_webhook_url) {
        try {
          await fetch(agent.n8n_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'message_sent',
              agent_id: agentId,
              conversation_id: newConv?.id,
              phone,
              lead_name,
              message: messageToSend,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (e) {
          console.error('Failed to notify n8n:', e);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'message_sent',
          conversation_id: newConv?.id,
          message: messageToSend,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: receive, send' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
