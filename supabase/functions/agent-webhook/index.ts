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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    // === ACTION: RECEIVE MESSAGE (from n8n when lead responds) ===
    if (action === 'receive') {
      const { phone, message, lead_name } = body;

      if (!phone || !message) {
        return new Response(
          JSON.stringify({ error: 'phone and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('lead_phone', phone)
        .single();

      if (existingConv) {
        // Check reply limits - use effective max replies if warming limited
        // max_replies: null/0 = unlimited, 1+ = limited
        // _warmingLimited: true means apply warming limits even if agent has no limit
        let maxReplies = agent.max_replies;
        
        // If warming is active and agent is warming limited, use the effective limit
        if (agent._warmingLimited && agent._effectiveMaxReplies) {
          // Use the more restrictive limit
          maxReplies = agent.max_replies 
            ? Math.min(agent.max_replies, agent._effectiveMaxReplies)
            : agent._effectiveMaxReplies;
          console.log(`Warming active - using limited replies: ${maxReplies}`);
        }
        
        const currentReplyCount = existingConv.reply_count || 0;
        
        // If max_replies is set and we've reached the limit, don't reply
        if (maxReplies && maxReplies > 0 && currentReplyCount >= maxReplies) {
          console.log(`Reply limit reached (${currentReplyCount}/${maxReplies}), ignoring`);
          
          // Log the received message anyway
          await supabase.from('agent_message_logs').insert({
            agent_id: agentId,
            conversation_id: existingConv.id,
            direction: 'received',
            content: message,
          });

          return new Response(
            JSON.stringify({ 
              success: false, 
              reason: 'reply_limit_reached',
              message: `Agent reached reply limit (${currentReplyCount}/${maxReplies})${agent._warmingLimited ? ' (warming active)' : ''}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update conversation with response
        await supabase
          .from('agent_conversations')
          .update({
            response_received: true,
            response_received_at: new Date().toISOString(),
            response_content: message,
            status: 'responded',
          })
          .eq('id', existingConv.id);

        // Log the message
        await supabase.from('agent_message_logs').insert({
          agent_id: agentId,
          conversation_id: existingConv.id,
          direction: 'received',
          content: message,
        });

        // Generate and send AI response
        if (lovableApiKey) {
          // Get max response chars from agent config (default 300)
          const maxChars = agent.max_response_chars || 300;
          
          // Build system prompt from agent configuration
          const stylePrompts = {
            formal: 'Responda de forma formal e profissional.',
            neutral: 'Responda de forma neutra e amigável.',
            informal: 'Responda de forma informal e descontraída.',
          };

          // Check if this is a response to a campaign (greeting/interest)
          const isCampaignResponse = isResponseToCampaign(message);
          
          // Get conversation history for context
          const { data: messageHistory } = await supabase
            .from('agent_message_logs')
            .select('direction, content, created_at')
            .eq('conversation_id', existingConv.id)
            .order('created_at', { ascending: true })
            .limit(10);

          // Build context from history
          const conversationContext = messageHistory?.map(msg => 
            `${msg.direction === 'sent' ? 'Você' : 'Lead'}: ${msg.content}`
          ).join('\n') || '';

          // Use custom system prompt if available, otherwise generate default
          const baseSystemPrompt = agent.system_prompt || `Você é um assistente de prospecção via WhatsApp.`;
          const agentGoal = agent.agent_objective || 'Responder de forma útil e encerrar a conversa.';
          const endCriteria = agent.end_conversation_criteria || 'Encerre após responder a dúvida principal.';

          // Enhanced prompt for campaign responses - use custom post_response_behavior if set
          const postResponseBehavior = agent.post_response_behavior;
          const campaignResponseGuide = isCampaignResponse ? (postResponseBehavior 
            ? `\nCONTEXTO IMPORTANTE: Este lead ESTÁ RESPONDENDO A UM DISPARO de prospecção.
INSTRUÇÃO ESPECÍFICA DO USUÁRIO PARA RESPOSTAS PÓS-CAMPANHA:
${postResponseBehavior}`
            : `\nCONTEXTO IMPORTANTE: Este lead ESTÁ RESPONDENDO A UM DISPARO de prospecção que você enviou anteriormente.
Isso significa que ELE JÁ demonstrou interesse ao responder. NÃO cumprimente novamente, NÃO pergunte "como posso ajudar?".
ENTRE DIRETO NO ASSUNTO: apresente o produto/serviço, destaque benefícios, e convide para o próximo passo (demo, call, mais info).
Seja PROATIVO e VENDEDOR, mas não agressivo.`) : '';

          const fullSystemPrompt = `${baseSystemPrompt}

OBJETIVO: ${agentGoal}

CRITÉRIOS DE ENCERRAMENTO: ${endCriteria}
${campaignResponseGuide}

REGRAS CRÍTICAS:
- Responda com NO MÁXIMO ${maxChars} caracteres
- Seja breve e natural
- ${stylePrompts[agent.communication_style as keyof typeof stylePrompts]}
- Quando apropriado, encerre a conversa naturalmente
- Use o histórico da conversa para contexto`;

          const userPrompt = conversationContext 
            ? `HISTÓRICO DA CONVERSA:\n${conversationContext}\n\nNova mensagem do lead: "${message}"\n\nGere uma resposta (max ${maxChars} chars).`
            : `Lead respondeu: "${message}"\n\nGere uma resposta (max ${maxChars} chars).`;

          console.log(`Generating AI response. Campaign response: ${isCampaignResponse}`);
          
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                {
                  role: 'system',
                  content: fullSystemPrompt
                },
                {
                  role: 'user',
                  content: userPrompt
                }
              ],
              max_tokens: 200,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            let replyContent = aiData.choices?.[0]?.message?.content || 'Entendi, obrigado! 👍';
            
            // Get max chars from agent config
            const maxChars = agent.max_response_chars || 300;
            
            // Ensure max chars limit
            if (replyContent.length > maxChars) {
              replyContent = replyContent.substring(0, maxChars - 3) + '...';
            }

            // Calculate realistic typing delay based on message length
            const typingDelay = calculateTypingDelay(replyContent.length);
            console.log(`Waiting ${(typingDelay/1000).toFixed(1)}s (typing delay for ${replyContent.length} chars)...`);
            await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 15000))); // Max 15s in edge function

            // Send via Evolution API
            const instanceName = agent.whatsapp_number?.instance_name;
            if (instanceName) {
              const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                  'apikey': evolutionApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  number: phone,
                  text: replyContent,
                }),
              });

              if (sendResponse.ok) {
                const newReplyCount = (existingConv.reply_count || 0) + 1;
                const maxReplies = agent.max_replies;
                
                // Determine if conversation should be marked as completed
                // Complete if: max_replies is set AND we've reached the limit
                const shouldComplete = maxReplies && maxReplies > 0 && newReplyCount >= maxReplies;
                
                // Update conversation with reply count
                await supabase
                  .from('agent_conversations')
                  .update({
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                    reply_content: replyContent,
                    reply_count: newReplyCount,
                    status: shouldComplete ? 'completed' : 'awaiting_response',
                  })
                  .eq('id', existingConv.id);

                // Log the reply
                await supabase.from('agent_message_logs').insert({
                  agent_id: agentId,
                  conversation_id: existingConv.id,
                  direction: 'sent',
                  content: replyContent,
                });

                // Increment daily message count
                await supabase
                  .from('ai_agents')
                  .update({
                    messages_sent_today: agent.messages_sent_today + 1,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', agentId);

                console.log(`Reply ${newReplyCount}/${maxReplies || '∞'} sent successfully. Daily count: ${agent.messages_sent_today + 1}`);
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'response_processed',
            conversation_id: existingConv.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // New conversation from unknown lead - create conversation AND respond
        const { data: newConv } = await supabase
          .from('agent_conversations')
          .insert({
            agent_id: agentId,
            lead_phone: phone,
            lead_name: lead_name,
            response_received: true,
            response_received_at: new Date().toISOString(),
            response_content: message,
            status: 'responded',
            reply_count: 0,
          })
          .select()
          .single();

        if (newConv) {
          await supabase.from('agent_message_logs').insert({
            agent_id: agentId,
            conversation_id: newConv.id,
            direction: 'received',
            content: message,
          });

          // Generate and send AI response for new conversation
          if (lovableApiKey) {
            // Get max response chars from agent config (default 300)
            const maxChars = agent.max_response_chars || 300;
            
            // Build system prompt from agent configuration
            const stylePrompts = {
              formal: 'Responda de forma formal e profissional.',
              neutral: 'Responda de forma neutra e amigável.',
              informal: 'Responda de forma informal e descontraída.',
            };

            // Check if this is a response to a campaign
            const isCampaignResponse = isResponseToCampaign(message);

            // Use custom system prompt if available, otherwise generate default
            const baseSystemPrompt = agent.system_prompt || `Você é um assistente de prospecção via WhatsApp.`;
            const agentGoal = agent.agent_objective || 'Responder de forma útil e encerrar a conversa.';
            const endCriteria = agent.end_conversation_criteria || 'Encerre após responder a dúvida principal.';

            // Enhanced prompt for campaign responses - use custom post_response_behavior if set
            const postResponseBehavior = agent.post_response_behavior;
            const campaignResponseGuide = isCampaignResponse ? (postResponseBehavior 
              ? `\nCONTEXTO IMPORTANTE: Este lead ESTÁ RESPONDENDO A UM DISPARO de prospecção.
INSTRUÇÃO ESPECÍFICA DO USUÁRIO PARA RESPOSTAS PÓS-CAMPANHA:
${postResponseBehavior}`
              : `\nCONTEXTO IMPORTANTE: Este lead ESTÁ RESPONDENDO A UM DISPARO de prospecção que você enviou anteriormente.
Isso significa que ELE JÁ demonstrou interesse ao responder. NÃO cumprimente novamente, NÃO pergunte "como posso ajudar?".
ENTRE DIRETO NO ASSUNTO: apresente o produto/serviço, destaque benefícios, e convide para o próximo passo (demo, call, mais info).
Seja PROATIVO e VENDEDOR, mas não agressivo.`) : '';

            const fullSystemPrompt = `${baseSystemPrompt}

OBJETIVO: ${agentGoal}

CRITÉRIOS DE ENCERRAMENTO: ${endCriteria}
${campaignResponseGuide}

REGRAS CRÍTICAS:
- Responda com NO MÁXIMO ${maxChars} caracteres
- Seja breve e natural
- ${stylePrompts[agent.communication_style as keyof typeof stylePrompts]}
- Quando apropriado, encerre a conversa naturalmente
${!isCampaignResponse ? '- Esta é a PRIMEIRA mensagem do lead, então seja acolhedor' : ''}`;

            console.log(`Generating AI response for new conversation. Campaign response: ${isCampaignResponse}`);
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [
                  {
                    role: 'system',
                    content: fullSystemPrompt
                  },
                  {
                    role: 'user',
                    content: isCampaignResponse 
                      ? `Lead respondeu ao disparo com: "${message}"\n\nGere uma resposta focada em venda (max ${maxChars} chars).`
                      : `Lead enviou primeira mensagem: "${message}"\n\nGere uma resposta acolhedora (max ${maxChars} chars).`
                  }
                ],
                max_tokens: 200,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              let replyContent = aiData.choices?.[0]?.message?.content || 'Olá! Como posso ajudar? 👋';
              
              // Ensure max chars limit
              if (replyContent.length > maxChars) {
                replyContent = replyContent.substring(0, maxChars - 3) + '...';
              }

              // Calculate realistic typing delay based on message length
              const typingDelay = calculateTypingDelay(replyContent.length);
              console.log(`Waiting ${(typingDelay/1000).toFixed(1)}s (typing delay for ${replyContent.length} chars)...`);
              await new Promise(resolve => setTimeout(resolve, Math.min(typingDelay, 15000))); // Max 15s in edge function

              // Send via Evolution API
              const instanceName = agent.whatsapp_number?.instance_name;
              if (instanceName) {
                console.log(`Sending reply to ${phone} via ${instanceName}...`);
                const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: {
                    'apikey': evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: phone,
                    text: replyContent,
                  }),
                });

                if (sendResponse.ok) {
                  const maxReplies = agent.max_replies;
                  const shouldComplete = maxReplies && maxReplies > 0 && 1 >= maxReplies;
                  
                  // Update conversation with reply info
                  await supabase
                    .from('agent_conversations')
                    .update({
                      reply_sent: true,
                      reply_sent_at: new Date().toISOString(),
                      reply_content: replyContent,
                      reply_count: 1,
                      status: shouldComplete ? 'completed' : 'awaiting_response',
                    })
                    .eq('id', newConv.id);

                  // Log the reply
                  await supabase.from('agent_message_logs').insert({
                    agent_id: agentId,
                    conversation_id: newConv.id,
                    direction: 'sent',
                    content: replyContent,
                  });

                  // Increment daily message count
                  await supabase
                    .from('ai_agents')
                    .update({
                      messages_sent_today: agent.messages_sent_today + 1,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', agentId);

                  console.log(`First reply sent successfully. Daily count: ${agent.messages_sent_today + 1}`);
                } else {
                  console.error('Failed to send first reply:', await sendResponse.text());
                }
              }
            } else {
              console.error('AI response failed:', await aiResponse.text());
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'new_conversation_created_and_replied',
            conversation_id: newConv?.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
