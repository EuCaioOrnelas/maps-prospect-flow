import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Buffer delay in milliseconds (2 minutes)
const BUFFER_DELAY_MS = 2 * 60 * 1000;

function getEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(Deno.env.get(name) ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

// Safety limits to avoid edge function timeout
const MAX_CONVERSATIONS_PER_RUN = getEnvNumber('AGENT_BUFFER_MAX_CONVERSATIONS', 3, 1, 25);
const RUN_TIME_BUDGET_MS = getEnvNumber('AGENT_BUFFER_RUN_BUDGET_MS', 100000, 15000, 120000);
const OPENAI_TIMEOUT_MS = getEnvNumber('AGENT_BUFFER_OPENAI_TIMEOUT_MS', 20000, 5000, 60000);
const EVOLUTION_TIMEOUT_MS = getEnvNumber('AGENT_BUFFER_EVOLUTION_TIMEOUT_MS', 15000, 3000, 60000);

// Fallback limits by warming status (used only when agent.daily_limit is missing)
const RESPONSE_LIMITS = {
  cold: 20,
  warm: 100,
  hot: null,
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

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

// Semantically split a long response into natural WhatsApp messages
// Splits by: double line breaks (explicit blocks), then by sentence boundaries
function smartSplitMessage(text: string, maxCharsPerChunk: number, maxChunks: number): string[] {
  const trimmed = text.trim();
  
  // Only return single message if VERY short (less than 50% of chunk size) OR maxChunks is 1
  if (maxChunks <= 1 || trimmed.length <= maxCharsPerChunk * 0.5) {
    return [trimmed];
  }

  // Step 1: Split by double line breaks (the AI's own paragraph structure)
  const rawBlocks = trimmed.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  // If AI gave us multiple paragraphs already, use them directly
  if (rawBlocks.length >= 2) {
    const chunks: string[] = [];
    let current = '';

    for (const block of rawBlocks) {
      if (block.length > maxCharsPerChunk) {
        if (current.trim()) {
          chunks.push(current.trim());
          current = '';
        }
        const sentenceChunks = splitBySentences(block, maxCharsPerChunk);
        chunks.push(...sentenceChunks);
      } else if (current.length + block.length + 2 > maxCharsPerChunk && current.length > 0) {
        chunks.push(current.trim());
        current = block;
      } else {
        current += (current ? '\n\n' : '') + block;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return enforceMaxChunks(chunks, maxChunks);
  }

  // Step 2: AI wrote one big block - force split by sentences
  if (trimmed.length > maxCharsPerChunk * 0.6) {
    const sentenceChunks = splitBySentences(trimmed, maxCharsPerChunk);
    if (sentenceChunks.length >= 2) {
      return enforceMaxChunks(sentenceChunks, maxChunks);
    }
  }

  return [trimmed];
}

// Split text by sentence boundaries into chunks
function splitBySentences(text: string, maxCharsPerChunk: number): string[] {
  const sentences = text.split(/(?<=[.!?;:)])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxCharsPerChunk && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Last resort: split by commas if single chunk is still too long
  if (chunks.length === 1 && chunks[0].length > maxCharsPerChunk) {
    const parts = chunks[0].split(/,\s+/);
    if (parts.length >= 2) {
      const commaChunks: string[] = [];
      let cur = '';
      for (const part of parts) {
        if (cur.length + part.length + 2 > maxCharsPerChunk && cur.length > 0) {
          commaChunks.push(cur.trim().replace(/,\s*$/, '.'));
          cur = part;
        } else {
          cur += (cur ? ', ' : '') + part;
        }
      }
      if (cur.trim()) commaChunks.push(cur.trim());
      return commaChunks;
    }
  }

  return chunks;
}

// Merge smallest adjacent chunks if we exceed maxChunks
function enforceMaxChunks(chunks: string[], maxChunks: number): string[] {
  while (chunks.length > maxChunks) {
    let minCombinedLen = Infinity;
    let mergeIdx = 0;
    for (let i = 0; i < chunks.length - 1; i++) {
      const combined = chunks[i].length + chunks[i + 1].length;
      if (combined < minCombinedLen) {
        minCombinedLen = combined;
        mergeIdx = i;
      }
    }
    chunks[mergeIdx] = chunks[mergeIdx] + '\n\n' + chunks[mergeIdx + 1];
    chunks.splice(mergeIdx + 1, 1);
  }

  return chunks.filter(c => c.trim().length > 0);
}

// Clean up incomplete responses - ensures responses don't end abruptly
function cleanIncompleteResponse(text: string, maxChars: number): string {
  let result = text.trim();
  
  // If already within limit and ends properly, return as-is
  if (result.length <= maxChars && /[.!?😊👍🙂)]$/.test(result)) {
    return result;
  }
  
  // If too long, try to cut at a natural break point
  if (result.length > maxChars) {
    // Find the last complete sentence within the limit
    const truncated = result.substring(0, maxChars);
    
    // Look for last sentence-ending punctuation
    const lastPeriod = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('!\n'),
      truncated.lastIndexOf('?\n')
    );
    
    // Also check for sentence ending at the very end
    if (/[.!?]$/.test(truncated)) {
      result = truncated;
    } else if (lastPeriod > maxChars * 0.5) {
      // Use the last complete sentence if it's not too short
      result = truncated.substring(0, lastPeriod + 1).trim();
    } else {
      // Otherwise, find a good break point and add a closing
      const lastComma = truncated.lastIndexOf(', ');
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastComma > maxChars * 0.7) {
        result = truncated.substring(0, lastComma) + '.';
      } else if (lastSpace > maxChars * 0.8) {
        result = truncated.substring(0, lastSpace) + '.';
      } else {
        result = truncated.trim() + '.';
      }
    }
  }
  
  // Remove any trailing "..." or incomplete markers
  result = result.replace(/\.{2,}$/, '.').replace(/,\s*$/, '.').replace(/:\s*$/, '.');
  
  // Ensure it ends with proper punctuation
  if (!/[.!?😊👍🙂)]$/.test(result)) {
    result = result.trim() + '.';
  }
  
  return result;
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

// Count unique leads responded to by this agent TODAY (São Paulo timezone)
async function countUniqueLeadsResponded(supabase: any, agentId: string): Promise<number> {
  // Get today's start in São Paulo timezone (UTC-3)
  const now = new Date();
  const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayStart = new Date(spNow);
  todayStart.setHours(0, 0, 0, 0);
  // Convert back to UTC for DB query
  const todayStartUTC = new Date(todayStart.getTime() + (3 * 3600000)).toISOString();

  const { count, error } = await supabase
    .from('agent_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('reply_sent', true)
    .gte('reply_sent_at', todayStartUTC);
  
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
  whatsappNumberId: string,
  agentDailyLimit?: number | null
): Promise<{ reached: boolean; currentCount: number; limit: number | null; warmingStatus: string; source: 'agent_daily_limit' | 'warming_status' }> {
  const warmingStatus = await getWarmingStatus(supabase, whatsappNumberId);
  const warmingLimit = RESPONSE_LIMITS[warmingStatus];

  const hasConfiguredLimit = typeof agentDailyLimit === 'number' && Number.isFinite(agentDailyLimit) && agentDailyLimit > 0;
  const configuredLimit = hasConfiguredLimit ? Math.floor(agentDailyLimit as number) : null;

  // 999999+ is treated as unlimited in UI and processing
  const limit = configuredLimit !== null
    ? (configuredLimit >= 999999 ? null : configuredLimit)
    : warmingLimit;

  const source: 'agent_daily_limit' | 'warming_status' = configuredLimit !== null ? 'agent_daily_limit' : 'warming_status';
  const currentCount = await countUniqueLeadsResponded(supabase, agentId);

  console.log(`Agent ${agentId} - Source: ${source}, Warming: ${warmingStatus}, Limit: ${limit ?? 'unlimited'}, Current: ${currentCount}`);

  if (limit === null) {
    return { reached: false, currentCount, limit, warmingStatus, source };
  }

  return {
    reached: currentCount >= limit,
    currentCount,
    limit,
    warmingStatus,
    source
  };
}

// Move lead to CRM stage by stage name - with flexible phone matching
// Updates ALL matching leads (handles duplicates with different phone formats)
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
    
    console.log(`=== MOVE LEAD TO CRM STAGE: ${stageName} ===`);
    console.log('Input phone:', phone);
    console.log('Last 8 digits:', last8Digits);
    
    // Fetch ALL user leads and find ALL matches by last 8 digits
    // This handles duplicates with different phone formats (e.g. 5544991236180 vs 55449991236180)
    const { data: allUserLeads } = await supabase
      .from('leads')
      .select('id, pipeline_stage_id, user_id, phone')
      .eq('user_id', userId);
    
    if (!allUserLeads || allUserLeads.length === 0) {
      console.log(`No leads found for user ${userId}`);
      return;
    }
    
    // Find ALL leads matching by last 8 digits
    const matchingLeads = allUserLeads.filter((l: any) => {
      const leadPhone = l.phone?.replace(/\D/g, '') || '';
      return leadPhone.slice(-8) === last8Digits;
    });
    
    if (matchingLeads.length === 0) {
      console.log(`No lead found for phone ${phone} (last 8: ${last8Digits})`);
      return;
    }
    
    console.log(`Found ${matchingLeads.length} matching lead(s):`, matchingLeads.map((l: any) => `${l.id} (${l.phone})`).join(', '));
    
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
    
    // Update ALL matching leads
    for (const lead of matchingLeads) {
      // Build update payload
      const updatePayload: Record<string, any> = { 
        pipeline_stage_id: stage.id,
        updated_at: new Date().toISOString()
      };
      
      // Add extra fields if provided (message timestamps, whatsapp_status)
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
        console.error(`Error updating lead ${lead.id}:`, error);
        continue;
      }
      
      // Log activity
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        user_id: userId,
        activity_type: 'stage_changed',
        description: `Movido automaticamente para ${stageName} pelo agente IA`,
        metadata: { automated: true, source: 'ai_agent' }
      });
      
      console.log(`Lead ${lead.id} (${lead.phone}) moved to "${stageName}"`);
    }
  } catch (err) {
    console.error('Error in moveLeadToCRMStage:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Evolution API credentials - resolved per-number tier
    const EVOLUTION_API_URL_FREE = Deno.env.get('EVOLUTION_API_URL')!;
    const EVOLUTION_API_KEY_FREE = Deno.env.get('EVOLUTION_API_KEY')!;
    const EVOLUTION_API_URL_PAID = Deno.env.get('EVOLUTION_API_URL_PAID');
    const EVOLUTION_API_KEY_PAID = Deno.env.get('EVOLUTION_API_KEY_PAID');

    function resolveEvolutionCredsSync(apiTier: string | null, userPlan: string | null): { url: string; apiKey: string } {
      const isPaid = apiTier === 'paid' || ['start', 'growth', 'scale'].includes((userPlan || 'free').toLowerCase());
      if (isPaid && EVOLUTION_API_URL_PAID && EVOLUTION_API_KEY_PAID) {
        const cleanUrl = EVOLUTION_API_URL_PAID.replace(/\/+$/, '').replace(/\/manager$/, '');
        return { url: cleanUrl, apiKey: EVOLUTION_API_KEY_PAID };
      }
      const cleanUrl = EVOLUTION_API_URL_FREE.replace(/\/+$/, '').replace(/\/manager$/, '');
      return { url: cleanUrl, apiKey: EVOLUTION_API_KEY_FREE };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const runStartedAt = Date.now();
    const runDeadline = runStartedAt + RUN_TIME_BUDGET_MS;
    console.log(`Agent buffer processor started... (max_conversations=${MAX_CONVERSATIONS_PER_RUN}, budget_ms=${RUN_TIME_BUDGET_MS})`);

    // Find conversations ready to process (process_after has passed and not currently processing)
    const now = new Date().toISOString();
    const { data: readyConversations, error: fetchError } = await supabase
      .from('agent_conversations')
      .select(`
        *,
        agent:ai_agents(*, whatsapp_number:whatsapp_numbers(id, instance_name, phone_number, user_id))
      `)
      .lte('process_after', now)
      .eq('is_processing', false)
      .not('process_after', 'is', null)
      .order('process_after', { ascending: true })
      .limit(MAX_CONVERSATIONS_PER_RUN);

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
    let skippedDueToLimit = 0;
    let stoppedByTimeBudget = false;

    for (const conv of readyConversations) {
      if (Date.now() >= runDeadline) {
        stoppedByTimeBudget = true;
        console.warn(`Stopping early due to time budget. Processed so far: ${processedCount}`);
        break;
      }

      try {
        const agent = conv.agent;
        
        if (!agent || agent.status !== 'active') {
          console.log(`Skipping conv ${conv.id}: agent not active`);
          continue;
        }

        const whatsappNumber = agent.whatsapp_number;
        if (!whatsappNumber) {
          console.log(`Skipping conv ${conv.id}: no WhatsApp number configured`);
          continue;
        }

        // Resolve Evolution API credentials based on number's tier
        const { data: numberProfile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', whatsappNumber.user_id)
          .maybeSingle();
        const creds = resolveEvolutionCredsSync(null, numberProfile?.plan);
        // Also check number's api_tier directly
        const { data: numInfo } = await supabase
          .from('whatsapp_numbers')
          .select('api_tier')
          .eq('id', whatsappNumber.id)
          .maybeSingle();
        const finalCreds = resolveEvolutionCredsSync(numInfo?.api_tier, numberProfile?.plan);
        const evolutionApiUrl = finalCreds.url;
        const evolutionApiKey = finalCreds.apiKey;
        console.log(`Resolved Evolution API for number ${whatsappNumber.id}: ${evolutionApiUrl}`);

        // Self-heal: reset agent messages_sent_today if last_reset_date is before today (São Paulo)
        const spToday = getSaoPauloTime().toISOString().split('T')[0];
        if (agent.last_reset_date && agent.last_reset_date < spToday && agent.messages_sent_today > 0) {
          console.log(`Self-healing: resetting agent ${agent.id} messages_sent_today (last_reset: ${agent.last_reset_date}, today: ${spToday})`);
          await supabase
            .from('ai_agents')
            .update({ messages_sent_today: 0, last_reset_date: spToday, updated_at: new Date().toISOString() })
            .eq('id', agent.id);
          agent.messages_sent_today = 0;
          agent.last_reset_date = spToday;
        }

        // Check if this is a NEW lead (first reply) - only count unique leads
        const isFirstReplyToLead = !conv.reply_sent;
        
        // Check response limits based on warming status (only for new leads)
        if (isFirstReplyToLead) {
          const limitCheck = await hasReachedResponseLimit(
            supabase,
            agent.id,
            whatsappNumber.id,
            agent.daily_limit
          );
          
          if (limitCheck.reached) {
            console.log(`Agent ${agent.id} reached limit: ${limitCheck.currentCount}/${limitCheck.limit} (${limitCheck.warmingStatus})`);
            skippedDueToLimit++;
            
            // Move lead to configured stage since we can't respond
            const crmStageNewLead = agent.crm_stage_on_new_lead || 'Respondeu Mensagem';
            await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageNewLead);
            
            // Clear buffer and mark as completed
            await supabase.from('agent_message_buffer').delete().eq('conversation_id', conv.id);
            await supabase
              .from('agent_conversations')
              .update({ 
                status: 'limit_reached',
                process_after: null,
                is_processing: false
              })
              .eq('id', conv.id);
            
            continue;
          }
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
            message_type: (msg as any).message_type || null,
          });
        }

        // Reply count tracking
        const currentReplyCount = conv.reply_count || 0;

        // Generate AI response
        if (openaiApiKey) {
          const maxChars = agent.max_response_chars || 300;
          
          // Get FULL conversation history for complete context
          const { data: messageHistory } = await supabase
            .from('agent_message_logs')
            .select('direction, content, created_at, message_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true })
            .limit(50);

          const conversationContext = messageHistory?.map((msg: any) => {
            const role = msg.direction === 'sent' ? 'Você' : 'Lead';
            const typeLabel = msg.message_type === 'audio' ? ' [áudio transcrito]' : 
                             msg.message_type === 'image' ? ' [imagem]' : 
                             msg.message_type === 'document' ? ' [documento]' : '';
            const timestamp = new Date(msg.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            return `[${timestamp}] ${role}${typeLabel}: ${msg.content}`;
          }).join('\n') || '';

          const stylePrompts: Record<string, string> = {
            formal: 'Responda de forma formal e profissional.',
            neutral: 'Responda de forma neutra e amigável.',
            informal: 'Responda de forma informal e descontraída.',
          };

          const baseSystemPrompt = agent.system_prompt || `Você é um assistente de prospecção via WhatsApp.`;
          const agentGoal = agent.agent_objective || 'Responder de forma útil e encerrar a conversa.';
          const endCriteria = agent.end_conversation_criteria || 'Encerre após responder a dúvida principal.';

          // Read maxConsecutiveMessages from wizard_data (fallback to 3)
          const wizardMaxConsecutive = parseInt(
            (agent.wizard_data as Record<string, any>)?.maxConsecutiveMessages || '3', 10
          );
          const maxConsecutiveMessages = Math.min(Math.max(wizardMaxConsecutive, 1), 5);

          // Allow enough tokens for multiple messages - generous budget so AI writes full multi-paragraph responses
          const estimatedMaxTokens = Math.max(400, Math.ceil((maxChars * maxConsecutiveMessages) / 2));

          const fullSystemPrompt = `${baseSystemPrompt}

OBJETIVO: ${agentGoal}

CRITÉRIOS DE ENCERRAMENTO: ${endCriteria}

REGRAS DE CONTEXTO E HISTÓRICO:
1. Você tem acesso ao HISTÓRICO COMPLETO de todas as conversas anteriores com este lead.
2. USE o histórico para personalizar sua resposta - referencie assuntos, orçamentos, propostas ou informações já discutidas.
3. Se o lead perguntar sobre algo que já foi discutido (preço, proposta, orçamento, etc.), consulte o histórico e responda com base nele.
4. Se o lead voltar depois de dias/semanas, reconheça isso naturalmente (ex: "Que bom ter seu retorno!").
5. Mensagens marcadas como [áudio transcrito] foram áudios do lead convertidos em texto - responda normalmente ao conteúdo.
6. NUNCA repita informações que já foram enviadas, a menos que o lead peça.

REGRAS OBRIGATÓRIAS DE FORMATO:
1. Escreva sua resposta SEPARANDO cada assunto em parágrafos distintos com linha em branco entre eles.
   Exemplo: Saudação num parágrafo, resposta principal em outro, pergunta/CTA em outro.
2. CADA PARÁGRAFO deve ter no máximo ${maxChars} caracteres. O sistema vai enviar cada bloco como mensagem separada no WhatsApp.
3. NUNCA termine um parágrafo com frase incompleta ou "..."
4. Seja DIRETO e OBJETIVO - vá direto ao ponto
5. ${stylePrompts[agent.communication_style] || stylePrompts.neutral}
6. Para WhatsApp: use frases curtas e naturais
7. Finalize sempre com uma frase que faça sentido

REGRA DE ENCERRAMENTO DE CONVERSA:
- Quando os CRITÉRIOS DE ENCERRAMENTO forem atendidos, ou quando o lead claramente não tem mais interesse, ou quando a conversa chegou a uma conclusão natural, adicione EXATAMENTE o marcador [CONVERSA_ENCERRADA] no FINAL da sua resposta (após o texto da mensagem).
- Exemplos de quando encerrar: lead agradeceu e se despediu, lead disse que não tem interesse, objetivo foi atingido, lead pediu para parar de enviar mensagens.
- NÃO encerre prematuramente - apenas quando realmente fizer sentido.
- O marcador [CONVERSA_ENCERRADA] NÃO será enviado ao lead, é apenas um sinal interno.

EXEMPLOS DE BOM FORMATO:
- "Ótimo! O serviço custa R$99/mês. Quer saber mais detalhes?"
- "Claro! Trabalhamos com consultoria empresarial. Posso te explicar melhor?"
- "Perfeito, fico à disposição! Qualquer dúvida é só chamar. 😊 [CONVERSA_ENCERRADA]"

EXEMPLOS DE MAU FORMATO (NUNCA FAÇA ISSO):
- "Trabalhamos com diversos serviços como consultoria, marketing, vendas..."
- "O processo funciona assim: primeiro você..."

REGRA CRÍTICA SOBRE ARQUIVOS E MÍDIA:
- Se o prompt contém arquivos configurados (PDFs, imagens) com condições de envio, você DEVE enviá-los quando a condição for atendida, INDEPENDENTE da política de preço.
- A política de preço (ex: "nunca mencionar preço") se aplica apenas ao TEXTO que você escreve, NÃO aos arquivos pré-configurados pelo usuário.
- Se há um PDF de orçamento configurado para enviar "quando o lead pedir preço/orçamento", envie-o usando o marcador [ENVIAR_PDF:...] junto com uma mensagem neutra como "Segue nosso material!" - sem mencionar valores no texto.`;

          const userPrompt = `HISTÓRICO DA CONVERSA:
${conversationContext}

NOVAS MENSAGENS DO LEAD (${bufferedMessages.length} mensagens):
${combinedMessage}

Responda de forma COMPLETA e CONCISA. Separe cada assunto em parágrafos distintos (saudação, resposta, pergunta). Cada parágrafo será enviado como mensagem separada.`;

          console.log(`Generating AI response for conv ${conv.id} (maxChars=${maxChars}, maxConsecutive=${maxConsecutiveMessages}, maxTokens=${estimatedMaxTokens + 50}, historyMessages=${messageHistory?.length || 0})...`);
          
          const aiResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
              max_tokens: estimatedMaxTokens + 50, // Small buffer for safety
              temperature: 0.7,
            }),
          }, OPENAI_TIMEOUT_MS);

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            let replyContent = aiData.choices?.[0]?.message?.content || 'Entendi, obrigado! 👍';

            // Detect conversation end marker
            const shouldEndConversation = replyContent.includes('[CONVERSA_ENCERRADA]');
            if (shouldEndConversation) {
              console.log(`AI signaled conversation end for conv ${conv.id}`);
            }
            
            // Remove the marker from the actual message
            replyContent = replyContent.replace(/\s*\[CONVERSA_ENCERRADA\]\s*/g, '').trim();

            // Check if agent is allowed to send media (from wizard_data)
            const wizardData = agent.wizard_data as Record<string, any> | null;
            const canSendMedia = wizardData?.canSendMedia === true;

            // Extract media markers before cleaning
            const mediaToSend: { type: 'image' | 'pdf'; url: string; caption: string }[] = [];
            
            if (canSendMedia) {
              // Match [ENVIAR_IMAGEM:url|caption] pattern
              const imageRegex = /\[ENVIAR_IMAGEM:([^|\]]+)\|?([^\]]*)\]/g;
              let imageMatch;
              while ((imageMatch = imageRegex.exec(replyContent)) !== null) {
                mediaToSend.push({ type: 'image', url: imageMatch[1].trim(), caption: imageMatch[2]?.trim() || '' });
              }
              
              // Match [ENVIAR_PDF:url|filename] pattern
              const pdfRegex = /\[ENVIAR_PDF:([^|\]]+)\|?([^\]]*)\]/g;
              let pdfMatch;
              while ((pdfMatch = pdfRegex.exec(replyContent)) !== null) {
                mediaToSend.push({ type: 'pdf', url: pdfMatch[1].trim(), caption: pdfMatch[2]?.trim() || 'documento.pdf' });
              }
            } else {
              console.log(`Media sending disabled for agent ${agent.id} — stripping any media markers`);
            }
            
            // Remove media markers from text
            replyContent = replyContent
              .replace(/\s*\[ENVIAR_IMAGEM:[^\]]+\]\s*/g, ' ')
              .replace(/\s*\[ENVIAR_PDF:[^\]]+\]\s*/g, ' ')
              .replace(/\s{2,}/g, ' ')
              .trim();

            // Clean up incomplete endings (fallback safety)
            // Light cleanup per chunk happens inside smartSplitMessage

            // Smart split into multiple WhatsApp messages by semantic blocks
            const messages = smartSplitMessage(replyContent, maxChars, maxConsecutiveMessages);
            
            const instanceName = whatsappNumber.instance_name;
            if (instanceName) {
              let sentCount = 0;
              
              // Send text messages first
              for (let i = 0; i < messages.length; i++) {
                const msgPart = messages[i];
                
                // Add delay between messages (bounded to avoid function timeout)
                if (i > 0) {
                  const delay = calculateTypingDelay(msgPart.length);
                  await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1500)));
                }

                console.log(`Sending message ${i + 1}/${messages.length} to ${conv.lead_phone}...`);
                
                const sendResponse = await fetchWithTimeout(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: {
                    'apikey': evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    number: conv.lead_phone,
                    text: msgPart,
                  }),
                }, EVOLUTION_TIMEOUT_MS);

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

              // Send media files after text
              for (const media of mediaToSend) {
                try {
                  await new Promise(resolve => setTimeout(resolve, 1500)); // Delay before media
                  
                  const mediaPayload: Record<string, any> = {
                    number: conv.lead_phone,
                    mediatype: media.type === 'image' ? 'image' : 'document',
                    mimetype: media.type === 'image' ? 'image/jpeg' : 'application/pdf',
                    media: media.url,
                    caption: media.type === 'image' ? media.caption : '',
                    fileName: media.type === 'pdf' ? media.caption : undefined,
                  };

                  console.log(`Sending ${media.type} to ${conv.lead_phone}: ${media.url}`);
                  
                  const mediaResponse = await fetchWithTimeout(`${evolutionApiUrl}/message/sendMedia/${instanceName}`, {
                    method: 'POST',
                    headers: {
                      'apikey': evolutionApiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(mediaPayload),
                  }, EVOLUTION_TIMEOUT_MS);

                  if (mediaResponse.ok) {
                    sentCount++;
                    await supabase.from('agent_message_logs').insert({
                      agent_id: agent.id,
                      conversation_id: conv.id,
                      direction: 'sent',
                      content: `[${media.type === 'image' ? 'Imagem' : 'PDF'} enviado: ${media.caption || media.url}]`,
                      message_type: media.type === 'image' ? 'image' : 'document',
                    });
                    console.log(`${media.type} sent successfully`);
                  } else {
                    const errText = await mediaResponse.text();
                    console.error(`Failed to send ${media.type}:`, errText);
                  }
                } catch (mediaErr) {
                  console.error(`Error sending ${media.type}:`, mediaErr);
                }
              }

              if (sentCount > 0) {
                const newReplyCount = currentReplyCount + 1;
                
                // Determine if conversation should be marked as completed
                const maxReplies = agent.max_replies;
                const reachedMaxReplies = maxReplies && newReplyCount >= maxReplies;
                const isConversationEnded = shouldEndConversation || reachedMaxReplies;
                
                if (isConversationEnded) {
                  console.log(`Conversation ${conv.id} ended. Reason: ${shouldEndConversation ? 'AI signal' : 'max_replies reached'} (${newReplyCount}/${maxReplies ?? '∞'})`);
                }

                // Update conversation
                await supabase
                  .from('agent_conversations')
                  .update({
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                    reply_content: replyContent,
                    reply_count: newReplyCount,
                    status: isConversationEnded ? 'completed' : 'awaiting_response',
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

                // CRM Integration: Move lead based on conversation state and update timestamps
                const crmStageReply = agent.crm_stage_on_reply || 'Mensagem Enviada';
                const crmStageEnd = agent.crm_stage_on_end;
                const nowISO = new Date().toISOString();
                
                // Build extras with message timestamps
                const crmExtras = {
                  last_message_sent: replyContent,
                  last_message_sent_at: nowISO,
                  last_response: combinedMessage,
                  last_response_at: conv.response_received_at || nowISO,
                  whatsapp_status: isConversationEnded ? 'replied' : 'in_conversation',
                };
                
                if (isConversationEnded && crmStageEnd) {
                  await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageEnd, crmExtras);
                } else {
                  await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageReply, crmExtras);
                }

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

    console.log(`Buffer processor finished. Processed: ${processedCount}, Errors: ${errorCount}, Skipped (limit): ${skippedDueToLimit}, StoppedByBudget: ${stoppedByTimeBudget}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        errors: errorCount,
        skipped_limit: skippedDueToLimit,
        total: readyConversations.length,
        stopped_by_time_budget: stoppedByTimeBudget
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
