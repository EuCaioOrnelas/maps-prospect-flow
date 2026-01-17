import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get São Paulo time
function getSaoPauloTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

// Check if current time is within operating hours (supports overnight ranges, e.g. 18:00 -> 00:00)
function isWithinOperatingHours(startTime: string, endTime: string): boolean {
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
// Average typing speed: 200 chars per minute = ~3.3 chars per second
// Add buffer time for "thinking" and reading
function calculateTypingDelay(messageLength: number): number {
  const charsPerSecond = 3.5; // slightly faster than average
  const typingTime = (messageLength / charsPerSecond) * 1000;
  const thinkingBuffer = Math.random() * 3000 + 2000; // 2-5 seconds "thinking"
  const readingTime = Math.random() * 2000 + 1000; // 1-3 seconds reading
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    let agentId = url.searchParams.get('agent_id');
    const action = url.searchParams.get('action') || 'receive'; // receive, send, process
    const instanceName = url.searchParams.get('instance'); // Instance name from Evolution webhook

    let agent: any = null;

    // If agent_id provided, fetch directly
    if (agentId) {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*, whatsapp_number:whatsapp_numbers(instance_name, phone_number)')
        .eq('id', agentId)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Agent not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      agent = data;
    } 
    // If instance name provided, find agent by WhatsApp number
    else if (instanceName) {
      console.log('Looking up agent by instance name:', instanceName);
      
      // First find the whatsapp_number by instance_name
      const { data: whatsappNumber } = await supabase
        .from('whatsapp_numbers')
        .select('id')
        .eq('instance_name', instanceName)
        .single();
      
      if (whatsappNumber) {
        // Find ALL active agents using this number (warming + user agents can coexist)
        const { data: agents } = await supabase
          .from('ai_agents')
          .select('*, whatsapp_number:whatsapp_numbers(instance_name, phone_number)')
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

      // Create new conversation if doesn't exist
      if (!existingConv) {
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
      }

      // Check reply limits
      const maxReplies = agent.max_replies;
      const currentReplyCount = existingConv.reply_count || 0;
      
      if (maxReplies && maxReplies > 0 && currentReplyCount >= maxReplies) {
        console.log(`Reply limit reached (${currentReplyCount}/${maxReplies}), buffering but won't reply`);
      }

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
      await supabase
        .from('agent_conversations')
        .update({
          response_received: true,
          response_received_at: new Date().toISOString(),
          response_content: message,
          status: existingConv.status === 'completed' ? 'completed' : 'buffering',
          process_after: processAfter,
          is_processing: false,
        })
        .eq('id', existingConv.id);

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

      // No daily limit check - removed per user request

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
      const instanceName = agent.whatsapp_number?.instance_name;
      if (!instanceName) {
        return new Response(
          JSON.stringify({ error: 'WhatsApp number not configured properly' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
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
