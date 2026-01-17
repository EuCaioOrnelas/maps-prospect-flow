import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Buffer delay in milliseconds (2 minutes)
const BUFFER_DELAY_MS = 2 * 60 * 1000;

// Get São Paulo time
function getSaoPauloTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

// Check if current time is within operating hours
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

  if (endMinutes >= startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

// Calculate typing delay based on message length
function calculateTypingDelay(messageLength: number): number {
  const charsPerSecond = 3.5;
  const typingTime = (messageLength / charsPerSecond) * 1000;
  const thinkingBuffer = Math.random() * 3000 + 2000;
  const readingTime = Math.random() * 2000 + 1000;
  return Math.floor(typingTime + thinkingBuffer + readingTime);
}

// Split long response into readable paragraphs
function formatResponseAsParagraphs(text: string): string[] {
  // If text is short, return as single message
  if (text.length <= 200) {
    return [text];
  }

  // Split by sentences or logical breaks
  const sentences = text.split(/(?<=[.!?])\s+/);
  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const sentence of sentences) {
    // If adding this sentence would make paragraph too long, start new paragraph
    if (currentParagraph.length + sentence.length > 250 && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = sentence;
    } else {
      currentParagraph += (currentParagraph ? ' ' : '') + sentence;
    }
  }

  // Add remaining text
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }

  // Limit to max 3 messages to avoid spam
  return paragraphs.slice(0, 3);
}

serve(async (req) => {
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

    console.log('Agent buffer processor started...');

    // Find conversations ready to process (process_after has passed and not currently processing)
    const now = new Date().toISOString();
    const { data: readyConversations, error: fetchError } = await supabase
      .from('agent_conversations')
      .select(`
        *,
        agent:ai_agents(*, whatsapp_number:whatsapp_numbers(instance_name, phone_number))
      `)
      .lte('process_after', now)
      .eq('is_processing', false)
      .not('process_after', 'is', null);

    if (fetchError) {
      console.error('Error fetching ready conversations:', fetchError);
      throw fetchError;
    }

    if (!readyConversations || readyConversations.length === 0) {
      console.log('No conversations ready to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No conversations to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${readyConversations.length} conversations ready to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const conv of readyConversations) {
      try {
        const agent = conv.agent;
        
        if (!agent || agent.status !== 'active') {
          console.log(`Skipping conv ${conv.id}: agent not active`);
          continue;
        }

        // Check operating hours
        if (!isWithinOperatingHours(agent.operating_hours_start, agent.operating_hours_end)) {
          console.log(`Skipping conv ${conv.id}: outside operating hours`);
          // Reschedule to next day's start
          continue;
        }

        // Mark as processing to prevent duplicate processing
        await supabase
          .from('agent_conversations')
          .update({ is_processing: true })
          .eq('id', conv.id);

        // Fetch all buffered messages for this conversation
        const { data: bufferedMessages } = await supabase
          .from('agent_message_buffer')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('received_at', { ascending: true });

        if (!bufferedMessages || bufferedMessages.length === 0) {
          console.log(`No buffered messages for conv ${conv.id}`);
          await supabase
            .from('agent_conversations')
            .update({ is_processing: false, process_after: null })
            .eq('id', conv.id);
          continue;
        }

        // Combine all messages into one context
        const combinedMessage = bufferedMessages.map(m => m.message_content).join('\n\n');
        console.log(`Processing ${bufferedMessages.length} buffered messages for conv ${conv.id}`);

        // Log all received messages
        for (const msg of bufferedMessages) {
          await supabase.from('agent_message_logs').insert({
            agent_id: agent.id,
            conversation_id: conv.id,
            direction: 'received',
            content: msg.message_content,
          });
        }

        // Check reply limits
        let maxReplies = agent.max_replies;
        const currentReplyCount = conv.reply_count || 0;

        if (maxReplies && maxReplies > 0 && currentReplyCount >= maxReplies) {
          console.log(`Reply limit reached for conv ${conv.id}`);
          
          // Clean up
          await supabase.from('agent_message_buffer').delete().eq('conversation_id', conv.id);
          await supabase.from('agent_conversations').update({
            is_processing: false,
            process_after: null,
            status: 'completed',
          }).eq('id', conv.id);
          
          continue;
        }

        // Generate AI response
        if (openaiApiKey) {
          const maxChars = agent.max_response_chars || 300;
          
          // Get conversation history
          const { data: messageHistory } = await supabase
            .from('agent_message_logs')
            .select('direction, content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true })
            .limit(15);

          const conversationContext = messageHistory?.map((msg: any) => 
            `${msg.direction === 'sent' ? 'Você' : 'Lead'}: ${msg.content}`
          ).join('\n') || '';

          const stylePrompts: Record<string, string> = {
            formal: 'Responda de forma formal e profissional.',
            neutral: 'Responda de forma neutra e amigável.',
            informal: 'Responda de forma informal e descontraída.',
          };

          const baseSystemPrompt = agent.system_prompt || `Você é um assistente de prospecção via WhatsApp.`;
          const agentGoal = agent.agent_objective || 'Responder de forma útil e encerrar a conversa.';
          const endCriteria = agent.end_conversation_criteria || 'Encerre após responder a dúvida principal.';

          const fullSystemPrompt = `${baseSystemPrompt}

OBJETIVO: ${agentGoal}

CRITÉRIOS DE ENCERRAMENTO: ${endCriteria}

REGRAS CRÍTICAS:
- Responda com NO MÁXIMO ${maxChars} caracteres
- Seja breve e natural
- ${stylePrompts[agent.communication_style] || stylePrompts.neutral}
- Quando apropriado, encerre a conversa naturalmente
- Use o histórico da conversa para contexto
- IMPORTANTE: Divida sua resposta em parágrafos curtos (2-3 frases por parágrafo) para melhor legibilidade no WhatsApp
- NÃO envie um textão longo - quebre em blocos`;

          const userPrompt = `HISTÓRICO DA CONVERSA:
${conversationContext}

NOVAS MENSAGENS DO LEAD (${bufferedMessages.length} mensagens agrupadas):
${combinedMessage}

Gere UMA resposta que aborde TODOS os pontos levantados. Divida em parágrafos curtos. (max ${maxChars} chars total)`;

          console.log(`Generating AI response for conv ${conv.id}...`);
          
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
              max_tokens: 400,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            let replyContent = aiData.choices?.[0]?.message?.content || 'Entendi, obrigado! 👍';

            // Ensure max chars limit
            if (replyContent.length > maxChars) {
              replyContent = replyContent.substring(0, maxChars - 3) + '...';
            }

            // Split into multiple messages if needed
            const messages = formatResponseAsParagraphs(replyContent);
            
            const instanceName = agent.whatsapp_number?.instance_name;
            if (instanceName) {
              let sentCount = 0;
              
              for (let i = 0; i < messages.length; i++) {
                const msgPart = messages[i];
                
                // Add delay between messages
                if (i > 0) {
                  const delay = calculateTypingDelay(msgPart.length);
                  await new Promise(resolve => setTimeout(resolve, Math.min(delay, 8000)));
                }

                console.log(`Sending message ${i + 1}/${messages.length} to ${conv.lead_phone}...`);
                
                const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: {
                    'apikey': evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: conv.lead_phone,
                    text: msgPart,
                  }),
                });

                if (sendResponse.ok) {
                  sentCount++;
                  
                  // Log the message
                  await supabase.from('agent_message_logs').insert({
                    agent_id: agent.id,
                    conversation_id: conv.id,
                    direction: 'sent',
                    content: msgPart,
                  });
                } else {
                  console.error(`Failed to send message ${i + 1}:`, await sendResponse.text());
                }
              }

              if (sentCount > 0) {
                const newReplyCount = currentReplyCount + 1;
                const shouldComplete = maxReplies && maxReplies > 0 && newReplyCount >= maxReplies;

                // Update conversation
                await supabase
                  .from('agent_conversations')
                  .update({
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                    reply_content: replyContent,
                    reply_count: newReplyCount,
                    status: shouldComplete ? 'completed' : 'awaiting_response',
                    is_processing: false,
                    process_after: null,
                  })
                  .eq('id', conv.id);

                // Update agent daily count
                await supabase
                  .from('ai_agents')
                  .update({
                    messages_sent_today: agent.messages_sent_today + sentCount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', agent.id);

                // Clear buffer
                await supabase.from('agent_message_buffer').delete().eq('conversation_id', conv.id);

                processedCount++;
                console.log(`Successfully processed conv ${conv.id} (${sentCount} messages sent)`);
              }
            }
          } else {
            console.error('AI response failed:', await aiResponse.text());
            errorCount++;
          }
        }

        // Reset processing flag if something went wrong
        await supabase
          .from('agent_conversations')
          .update({ is_processing: false })
          .eq('id', conv.id);

      } catch (convError) {
        console.error(`Error processing conversation ${conv.id}:`, convError);
        errorCount++;
        
        // Reset processing flag
        await supabase
          .from('agent_conversations')
          .update({ is_processing: false })
          .eq('id', conv.id);
      }
    }

    console.log(`Buffer processor finished. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        errors: errorCount,
        total: readyConversations.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Buffer processor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
