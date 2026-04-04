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

// Split AI response by semantic blocks (paragraphs separated by \n\n).
// The AI is instructed to write: Block 1 = greeting, Block 2 = response, Block 3 = CTA/question.
// Each block becomes a separate WhatsApp message. Only the "response" block (longest one)
// gets further split by sentences if it exceeds maxCharsPerChunk.
function smartSplitMessage(text: string, maxCharsPerChunk: number, maxChunks: number): string[] {
  const trimmed = text.trim();
  
  if (maxChunks <= 1 || trimmed.length <= 80) {
    return [trimmed];
  }

  // Split by double line breaks — these are the AI's semantic blocks
  const blocks = trimmed.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  // If AI only wrote 1 block, try to split by sentences as fallback
  if (blocks.length <= 1) {
    return splitLongBlock(trimmed, maxCharsPerChunk, maxChunks);
  }

  // Process each block: keep short blocks as-is, split long blocks by sentences
  const finalMessages: string[] = [];
  
  for (const block of blocks) {
    if (block.length <= maxCharsPerChunk) {
      // Block fits — send as one message
      finalMessages.push(block);
    } else {
      // Block too long (usually the "response" block) — split by sentences
      const subChunks = splitLongBlock(block, maxCharsPerChunk, Math.max(2, maxChunks - blocks.length + 1));
      finalMessages.push(...subChunks);
    }
  }

  return enforceMaxChunks(finalMessages, maxChunks);
}

// Split a long text block by sentence boundaries, respecting maxChars
function splitLongBlock(text: string, maxCharsPerChunk: number, maxChunks: number): string[] {
  // Try splitting by sentence endings
  const sentences = text.split(/(?<=[.!?;)])\s+/);
  
  if (sentences.length <= 1) {
    // Can't split by sentences, return as-is
    return [text];
  }

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

  return enforceMaxChunks(chunks, maxChunks);
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
    leadName?: string;
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
    
    // Find ALL leads matching by last 8 digits
    const matchingLeads: any[] = [];
    
    if (allUserLeads && allUserLeads.length > 0) {
      const matches = allUserLeads.filter((l: any) => {
        const leadPhone = l.phone?.replace(/\D/g, '') || '';
        return leadPhone.slice(-8) === last8Digits;
      });
      matchingLeads.push(...matches);
    }
    
    if (matchingLeads.length === 0) {
      console.log(`No lead found for phone ${phone} (last 8: ${last8Digits}) — auto-creating lead in CRM`);
      
      // Auto-create lead in CRM
      // Find the default pipeline stage for this user
      const { data: defaultStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      // Normalize phone for storage (E.164 BR format)
      let phoneForStorage = phoneDigitsOnly;
      if (phoneForStorage.length >= 10 && phoneForStorage.length <= 11 && !phoneForStorage.startsWith('55')) {
        phoneForStorage = '55' + phoneForStorage;
      }
      
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          user_id: userId,
          phone: phoneForStorage,
          contact_name: extras?.leadName || null,
          origin: 'Agente IA',
          pipeline_stage_id: defaultStage?.id || null,
          whatsapp_status: 'in_conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, phone, pipeline_stage_id')
        .single();
      
      if (createError) {
        console.error('Error auto-creating lead:', createError);
        return;
      }
      
      console.log(`Auto-created lead ${newLead.id} for phone ${phoneForStorage}`);
      matchingLeads.push(newLead);
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
          // Clear process_after so it doesn't get picked up again
          await supabase.from('agent_conversations').update({ process_after: null, is_processing: false }).eq('id', conv.id);
          continue;
        }

        // Secondary group detection: block group phone numbers
        const convPhoneDigits = conv.lead_phone?.replace(/\D/g, '') || '';
        const isGroupPhone = convPhoneDigits.startsWith('120363') || convPhoneDigits.length > 15 || conv.lead_phone?.includes('@g.us');
        
        if (isGroupPhone && !agent.respond_to_groups) {
          console.log(`Skipping conv ${conv.id}: group phone detected (${conv.lead_phone}) and respond_to_groups=false`);
          await supabase.from('agent_conversations').update({ process_after: null, is_processing: false, status: 'lost' }).eq('id', conv.id);
          continue;
        }

        // Check manual pause
        if (conv.agent_manually_paused) {
          console.log(`Skipping conv ${conv.id}: manually paused`);
          continue;
        }

        // Check time-based auto-pause
        if (conv.agent_paused_until && new Date(conv.agent_paused_until) > new Date()) {
          console.log(`Skipping conv ${conv.id}: auto-paused until ${conv.agent_paused_until}`);
          continue;
        }

        // Check if lead is in human support CRM stage
        if (agent.crm_stage_on_unknown) {
          const whatsappNumber = agent.whatsapp_number;
          if (whatsappNumber) {
            const { data: humanStage } = await supabase
              .from('pipeline_stages')
              .select('id')
              .eq('user_id', whatsappNumber.user_id)
              .eq('name', agent.crm_stage_on_unknown)
              .maybeSingle();

            if (humanStage) {
              const phoneDigits = conv.lead_phone.replace(/\D/g, '');
              const last8 = phoneDigits.slice(-8);
              let normalized = phoneDigits;
              if (phoneDigits.length >= 10 && phoneDigits.length <= 11 && !phoneDigits.startsWith('55')) {
                normalized = '55' + phoneDigits;
              }
              let { data: leadInHuman } = await supabase
                .from('leads')
                .select('id')
                .eq('user_id', whatsappNumber.user_id)
                .eq('pipeline_stage_id', humanStage.id)
                .or(`phone.eq.${normalized},phone.eq.${conv.lead_phone},phone.eq.${phoneDigits}`)
                .limit(1);

              if (!leadInHuman?.length && last8.length === 8) {
                const { data: allLeads } = await supabase
                  .from('leads')
                  .select('id, phone, pipeline_stage_id')
                  .eq('user_id', whatsappNumber.user_id)
                  .eq('pipeline_stage_id', humanStage.id);
                leadInHuman = allLeads?.filter((l: any) => l.phone?.replace(/\D/g, '').slice(-8) === last8) || [];
              }

              if (leadInHuman?.length) {
                console.log(`Skipping conv ${conv.id}: lead in human support stage "${agent.crm_stage_on_unknown}"`);
                continue;
              }
            }
          }
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

        // ============================================================
        // ANTI-LOOP MODULE: Detect bot/menu/automation patterns
        // This runs BEFORE the AI response to prevent loops
        // ============================================================
        const currentBotState = (conv as any).bot_detection_state || 'normal';
        const antiloopAlreadySent = currentBotState === 'antiloop_sent' || currentBotState === 'blocked_by_loop';

        // Get recent message history for the classifier
        const { data: recentHistory } = await supabase
          .from('agent_message_logs')
          .select('direction, content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(20);

        const leadMsgs = (recentHistory || [])
          .filter((m: any) => m.direction === 'received')
          .slice(0, 5)
          .map((m: any) => m.content || '');
        const agentMsgs = (recentHistory || [])
          .filter((m: any) => m.direction === 'sent')
          .slice(0, 3)
          .map((m: any) => m.content || '');

        const contextForClassifier = (recentHistory || [])
          .reverse()
          .map((m: any) => {
            const role = m.direction === 'sent' ? 'Agente' : 'Lead';
            return `${role}: ${m.content}`;
          })
          .join('\n');

        let antiloopDecision: {
          classification: string;
          should_trigger_antiloop: boolean;
          should_maintain_block: boolean;
          suggested_next_state: string;
          confidence: number;
          reasons: string[];
          has_real_progress: boolean;
        } = {
          classification: 'NORMAL',
          should_trigger_antiloop: false,
          should_maintain_block: false,
          suggested_next_state: 'normal',
          confidence: 0,
          reasons: [],
          has_real_progress: true,
        };

        try {
          const classifierPayload = {
            lead_messages: leadMsgs,
            agent_messages: agentMsgs,
            current_state: currentBotState,
            antiloop_already_sent: antiloopAlreadySent,
            conversation_context: contextForClassifier,
          };

          console.log(`[anti-loop] Classifying conv ${conv.id} (state: ${currentBotState})...`);

          const classifierResponse = await supabase.functions.invoke('anti-loop-classifier', {
            body: classifierPayload,
          });

          if (classifierResponse.data && !classifierResponse.error) {
            antiloopDecision = classifierResponse.data;
            console.log(`[anti-loop] Conv ${conv.id}: classification=${antiloopDecision.classification}, confidence=${antiloopDecision.confidence}, trigger=${antiloopDecision.should_trigger_antiloop}, block=${antiloopDecision.should_maintain_block}, next_state=${antiloopDecision.suggested_next_state}`);

            // Log the classification for auditing
            await supabase.from('agent_message_logs').insert({
              agent_id: agent.id,
              conversation_id: conv.id,
              direction: 'sent',
              content: `[ANTI-LOOP] classification=${antiloopDecision.classification} confidence=${antiloopDecision.confidence} reasons=${(antiloopDecision.reasons || []).join(', ')} next_state=${antiloopDecision.suggested_next_state}`,
              message_type: 'system',
            });
          } else {
            console.error(`[anti-loop] Classifier error for conv ${conv.id}:`, classifierResponse.error);
          }
        } catch (classifierErr) {
          console.error(`[anti-loop] Classifier invocation failed for conv ${conv.id}:`, classifierErr);
          // On error, continue with normal flow (fail-open)
        }

        // === ANTI-LOOP ACTION: Send anti-loop message ===
        if (antiloopDecision.should_trigger_antiloop && currentBotState === 'normal') {
          const antiloopVariations = [
            'Percebi que esse contato pode estar em atendimento automático. Pode me encaminhar para o responsável comercial ou informar um contato direto?',
            'Opa, acho que caí no atendimento automático de vocês 😅 Tem como me passar o contato direto do comercial?',
            'Parece que estou falando com um sistema automático. Consegue me direcionar pra alguém da equipe comercial?',
            'Ei, acho que não estou conseguindo falar com uma pessoa diretamente. Tem algum contato direto que posso usar?',
            'Notei que as respostas parecem automáticas. Teria um contato direto do responsável pra eu falar?',
            'Opa, parece que estou no atendimento automático. Pode me indicar o WhatsApp ou e-mail de alguém da área comercial?',
            'Acho que estou conversando com um robô rs. Tem como me passar pra alguém da equipe?',
            'Desculpa insistir, mas acho que não estou conseguindo falar com uma pessoa. Tem outro contato que eu possa usar?',
          ];
          const antiloopMessage = antiloopVariations[Math.floor(Math.random() * antiloopVariations.length)];

          console.log(`[anti-loop] TRIGGERING anti-loop message for conv ${conv.id}`);

          const instanceName = whatsappNumber.instance_name;
          if (instanceName) {
            // Send anti-loop message via Evolution API
            const sendResponse = await fetchWithTimeout(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
              method: 'POST',
              headers: {
                'apikey': evolutionApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                number: conv.lead_phone,
                text: antiloopMessage,
              }),
            }, EVOLUTION_TIMEOUT_MS);

            if (sendResponse.ok) {
              console.log(`[anti-loop] Anti-loop message sent successfully for conv ${conv.id}`);

              // Log the sent message
              await supabase.from('agent_message_logs').insert({
                agent_id: agent.id,
                conversation_id: conv.id,
                direction: 'sent',
                content: antiloopMessage,
                message_type: 'antiloop',
              });
            } else {
              console.error(`[anti-loop] Failed to send anti-loop message:`, await sendResponse.text());
            }
          }

          // Update conversation state
          await supabase
            .from('agent_conversations')
            .update({
              bot_detection_state: 'antiloop_sent',
              antiloop_sent_at: new Date().toISOString(),
              bot_detection_reason: (antiloopDecision.reasons || []).join(', '),
              bot_confidence_score: antiloopDecision.confidence,
              is_processing: false,
              process_after: null,
              status: 'awaiting_response',
            })
            .eq('id', conv.id);

          // Clear buffer
          await supabase.from('agent_message_buffer').delete().eq('conversation_id', conv.id);

          processedCount++;
          console.log(`[anti-loop] Conv ${conv.id} moved to antiloop_sent state, skipping AI response`);
          continue; // Skip normal AI response generation
        }

        // === ANTI-LOOP ACTION: Maintain block (post-antiloop, still detecting bot) ===
        if (antiloopDecision.should_maintain_block && (currentBotState === 'antiloop_sent' || currentBotState === 'blocked_by_loop')) {
          console.log(`[anti-loop] MAINTAINING BLOCK for conv ${conv.id} (still detecting automation)`);

          // Update to blocked state
          await supabase
            .from('agent_conversations')
            .update({
              bot_detection_state: 'blocked_by_loop',
              bot_detection_reason: (antiloopDecision.reasons || []).join(', '),
              bot_confidence_score: antiloopDecision.confidence,
              is_processing: false,
              process_after: null,
            })
            .eq('id', conv.id);

          // Log the block decision
          await supabase.from('agent_message_logs').insert({
            agent_id: agent.id,
            conversation_id: conv.id,
            direction: 'sent',
            content: `[ANTI-LOOP] Conversa bloqueada: padrão de automação continua após anti-loop. Reasons: ${(antiloopDecision.reasons || []).join(', ')}`,
            message_type: 'system',
          });

          // Clear buffer
          await supabase.from('agent_message_buffer').delete().eq('conversation_id', conv.id);

          processedCount++;
          continue; // Skip normal AI response generation
        }

        // === ANTI-LOOP ACTION: Unblock (conversation returned to normal) ===
        if (currentBotState !== 'normal' && antiloopDecision.suggested_next_state === 'normal') {
          console.log(`[anti-loop] UNBLOCKING conv ${conv.id} — conversation appears normal again`);

          await supabase
            .from('agent_conversations')
            .update({
              bot_detection_state: 'normal',
              bot_detection_reason: null,
              bot_confidence_score: null,
            })
            .eq('id', conv.id);

          // Log the unblock
          await supabase.from('agent_message_logs').insert({
            agent_id: agent.id,
            conversation_id: conv.id,
            direction: 'sent',
            content: `[ANTI-LOOP] Conversa desbloqueada: padrão voltou ao normal. Reasons: ${(antiloopDecision.reasons || []).join(', ')}`,
            message_type: 'system',
          });
        }

        // ============================================================
        // END ANTI-LOOP MODULE — Continue with normal AI response
        // ============================================================

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

          // ============================================================
          // LEAD DIAGNOSTIC CONTEXT: Fetch lead data for enriched responses
          // This is SUPPLEMENTARY — the user's configured prompt is always primary
          // ============================================================
          let leadDiagnosticContext = '';
          try {
            const diagPhoneDigits = conv.lead_phone.replace(/\D/g, '');
            const diagLast8 = diagPhoneDigits.slice(-8);

            // Fetch matching lead by phone (last 8 digits)
            const { data: diagUserLeads } = await supabase
              .from('leads')
              .select('phone, company_name, category, city, address, rating, review_count, website, social_media, ai_diagnosis, ai_score, ai_recommended_action, opportunity_level, closing_probability, enrichment_data')
              .eq('user_id', whatsappNumber.user_id);

            const matchedLead = diagUserLeads?.find((l: any) => {
              const lPhone = (l.phone || '').replace(/\D/g, '');
              return lPhone.slice(-8) === diagLast8;
            }) || null;

            // Also fetch company profile for business context
            const { data: companyProfile } = await supabase
              .from('company_profiles')
              .select('company_name, company_niche, company_products, company_differential, company_objective, company_target_audience, attendant_name')
              .eq('user_id', whatsappNumber.user_id)
              .maybeSingle();

            if (matchedLead || companyProfile) {
              leadDiagnosticContext = `\n\n# CONTEXTO SUPLEMENTAR — DIAGNÓSTICO E PERFIL (use como DIRECIONAMENTO, não como verdade absoluta)

⚠️ IMPORTANTE: As informações abaixo são um DIRECIONAMENTO gerado por análise prévia. Use-as para enriquecer suas respostas e quebrar objeções com mais precisão, mas NÃO as trate como verdade absoluta. O PROMPT DO OPERADOR (acima) é sempre a prioridade máxima.
`;

              if (companyProfile) {
                leadDiagnosticContext += `
## PERFIL DA EMPRESA QUE VOCÊ REPRESENTA
- Empresa: ${companyProfile.company_name || 'N/A'}
- Nicho: ${companyProfile.company_niche || 'N/A'}
- Produtos/Serviços: ${companyProfile.company_products || 'N/A'}
- Diferencial: ${companyProfile.company_differential || 'N/A'}
- Objetivo comercial: ${companyProfile.company_objective || 'N/A'}
- Público-alvo: ${companyProfile.company_target_audience || 'N/A'}
`;
              }

              if (matchedLead) {
                leadDiagnosticContext += `
## DIAGNÓSTICO DO LEAD (análise prévia)
- Empresa do lead: ${matchedLead.company_name || 'N/A'}
- Categoria/Nicho do lead: ${matchedLead.category || 'N/A'}
- Cidade: ${matchedLead.city || 'N/A'}
${matchedLead.ai_score ? `- Score de oportunidade: ${matchedLead.ai_score}/100` : ''}
${matchedLead.opportunity_level ? `- Nível: ${matchedLead.opportunity_level}` : ''}
${matchedLead.closing_probability ? `- Probabilidade de fechamento: ${matchedLead.closing_probability}` : ''}
${matchedLead.ai_diagnosis ? `- Diagnóstico: ${matchedLead.ai_diagnosis}` : ''}
${matchedLead.ai_recommended_action ? `- Ação recomendada: ${matchedLead.ai_recommended_action}` : ''}
`;
                const enrichment = matchedLead.enrichment_data && typeof matchedLead.enrichment_data === 'object' ? matchedLead.enrichment_data as Record<string, any> : {};
                const pontosFortes = Array.isArray(enrichment.pontos_fortes) ? enrichment.pontos_fortes : [];
                const pontosFracos = Array.isArray(enrichment.pontos_fracos) ? enrichment.pontos_fracos : [];
                const concorrencia = enrichment.analise_concorrencia_regional || '';
                const demanda = enrichment.analise_demanda_regional || '';

                if (pontosFortes.length > 0) leadDiagnosticContext += `- Pontos fortes identificados: ${pontosFortes.join('; ')}\n`;
                if (pontosFracos.length > 0) leadDiagnosticContext += `- Pontos fracos/dores identificados: ${pontosFracos.join('; ')}\n`;
                if (concorrencia) leadDiagnosticContext += `- Concorrência regional: ${concorrencia}\n`;
                if (demanda) leadDiagnosticContext += `- Demanda regional: ${demanda}\n`;

                const approachAnalysis = enrichment.approach_analysis as Record<string, any> | undefined;
                if (approachAnalysis) {
                  if (approachAnalysis.estrategia) leadDiagnosticContext += `- Estratégia sugerida: ${approachAnalysis.estrategia}\n`;
                  if (approachAnalysis.produto_sugerido) leadDiagnosticContext += `- Produto sugerido: ${approachAnalysis.produto_sugerido}\n`;
                }

                // Custom diagnosis from user
                const customDiag = enrichment.custom_diagnosis as string | undefined;
                if (customDiag) {
                  leadDiagnosticContext += `\n## OBSERVAÇÕES DO PROSPECTOR (diagnóstico adicional do usuário — PRIORIZE estas informações)\n${customDiag}\n`;
                }

                leadDiagnosticContext += `
COMO USAR ESTE DIAGNÓSTICO:
- Use os PONTOS FRACOS como oportunidade para apresentar soluções durante a conversa
- Use a CONCORRÊNCIA REGIONAL para se diferenciar quando o lead comparar opções
- Use o SCORE e PROBABILIDADE para calibrar a intensidade do follow-up
- Se o lead mencionar dores que coincidem com o diagnóstico, reforce com dados contextuais
- NÃO cite estes dados diretamente ao lead (ex: "nosso sistema identificou que..."). Use de forma natural.
`;
              }
            }
          } catch (diagErr) {
            console.error('Error fetching lead diagnostic context:', diagErr);
          }

          // Build CRM context for the prompt so the AI knows how to classify outcomes
          const crmStageEnd = agent.crm_stage_on_end;
          const crmStageLost = (agent as any).crm_stage_on_lost;
          const crmStageUnknownName = agent.crm_stage_on_unknown;

          let crmClassificationRules = '';
          if (crmStageEnd || crmStageLost || crmStageUnknownName) {
            crmClassificationRules = `
REGRA CRÍTICA — CLASSIFICAÇÃO DO DESFECHO DA CONVERSA:
Você DEVE classificar o desfecho de cada conversa usando os marcadores abaixo. Isso é ESSENCIAL para que os leads sejam movidos para as colunas corretas no CRM.

MARCADORES DE CLASSIFICAÇÃO (adicione no FINAL da sua resposta, não será enviado ao lead):
`;
            if (crmStageEnd) {
              crmClassificationRules += `
- [CONVERSA_ENCERRADA] → Use quando a conversa terminou com SUCESSO ou desfecho positivo:
  • Lead agendou reunião, ligação ou demonstração
  • Lead forneceu contato do decisor
  • Lead mostrou interesse real e pediu proposta
  • Lead aceitou próximo passo concreto
  • Objetivo da conversa foi atingido
  → O lead será movido para a coluna "${crmStageEnd}"
`;
            }
            if (crmStageLost) {
              crmClassificationRules += `
- [LEAD_PERDIDO] → Use quando o lead CLARAMENTE não tem interesse:
  • Lead disse explicitamente "não tenho interesse", "não quero", "não preciso"
  • Lead pediu para não ser mais contactado
  • Lead disse que já tem fornecedor e não quer mudar
  • Lead recusou todas as tentativas de contato
  • Lead encerrou a conversa de forma negativa
  → O lead será movido para a coluna "${crmStageLost}"
`;
            }
            if (crmStageUnknownName) {
              crmClassificationRules += `
- [NAO_SEI] → Use quando você NÃO consegue responder algo que o lead perguntou:
  • Lead fez pergunta técnica que você não sabe responder
  • Lead pediu informação específica que não está no seu treinamento
  • A conversa precisa de intervenção humana
  → O lead será movido para a coluna "${crmStageUnknownName}" para atendimento humano
`;
            }
            crmClassificationRules += `
⚠️ IMPORTANTE: 
- Use APENAS UM marcador por resposta
- Só use [LEAD_PERDIDO] quando o lead for CLARAMENTE negativo (não use para incerteza)
- Só use [CONVERSA_ENCERRADA] quando o objetivo foi alcançado ou o desfecho foi positivo
- Se estiver em dúvida entre perdido e encerrado, prefira NÃO marcar e continue a conversa
- Os marcadores são INVISÍVEIS para o lead — eles só servem para classificação interna
`;
          }

          // ============================================================
          // PROMPT STRUCTURE: User's instructions are THE PRIORITY
          // Everything else is secondary operational rules
          // ============================================================
          const fullSystemPrompt = `# ⚠️ INSTRUÇÃO PRIMÁRIA — LEIA COM ATENÇÃO MÁXIMA

O texto abaixo é a instrução principal do seu operador. Ele define QUEM você é, O QUE você vende, COMO você deve conduzir a conversa, QUAIS perguntas fazer e QUAL o objetivo final. SIGA RIGOROSAMENTE estas instruções.

${baseSystemPrompt}
${leadDiagnosticContext}
---

# REGRAS OPERACIONAIS DO SISTEMA

## OBJETIVO DA CONVERSA
${agentGoal}

## CRITÉRIOS DE ENCERRAMENTO
${endCriteria}

## REGRA CRÍTICA — SIGA O ROTEIRO DO PROMPT
1. O prompt acima define perguntas e informações que você DEVE coletar do lead.
2. NÃO pule etapas. Faça UMA pergunta por vez, na ordem lógica do prompt.
3. Antes de responder, CONSULTE o histórico e verifique quais perguntas JÁ FORAM respondidas.
4. Se o lead desviar do assunto, reconduza de forma suave: "Entendi! Mas antes de seguir, preciso entender uma coisa..."
5. Quando TODAS as informações solicitadas no prompt forem coletadas, encerre a conversa com sucesso.
6. Se o lead disser que não tem interesse, encerre como lead perdido.
7. NUNCA invente informações que não estão no prompt. Se não souber, diga que vai verificar.

## REGRA CRÍTICA — NUNCA INVENTE INFORMAÇÕES
Se você NÃO souber a resposta para algo que o lead perguntou, NÃO invente. Em vez disso:
1. Diga algo natural como "Deixa eu verificar isso com o time e já te retorno"
2. Adicione o marcador [NAO_SEI] no final da sua resposta (não será enviado ao lead)
${crmClassificationRules}

## CONTEXTO E HISTÓRICO
1. Você tem acesso ao HISTÓRICO COMPLETO. USE-O para não repetir perguntas já respondidas.
2. Referencie assuntos já discutidos quando relevante.
3. Se o lead voltar depois de dias, reconheça naturalmente.
4. Mensagens [áudio transcrito] são áudios convertidos — responda normalmente.
5. NUNCA repita informações já enviadas, a menos que o lead peça.

## FORMATO DAS MENSAGENS
- Separe cada assunto em blocos com LINHA EM BRANCO entre eles (cada bloco = 1 mensagem no WhatsApp).
- Máximo ${maxChars} caracteres por bloco.
- Mínimo 2, máximo ${maxConsecutiveMessages} blocos por resposta.
- NUNCA escreva tudo em um bloco corrido.
- NUNCA termine um bloco com frase incompleta.

## NATURALIDADE
1. NÃO repita saudações se já foram ditas no histórico.
2. NÃO force perguntas ou CTAs se não fizer sentido.
3. Seja natural como uma conversa real de WhatsApp.
4. ${stylePrompts[agent.communication_style] || stylePrompts.neutral}

## ENCERRAMENTO
- Quando os critérios de encerramento forem atendidos com desfecho POSITIVO → [CONVERSA_ENCERRADA]
- Quando o lead CLARAMENTE não tem interesse → [LEAD_PERDIDO]
- Os marcadores NÃO serão enviados ao lead.

## ARQUIVOS E MÍDIA
- Se há arquivos configurados, use [ENVIAR_PDF:...] ou [ENVIAR_IMAGEM:...] quando a condição for atendida.`;

          const userPrompt = `HISTÓRICO DA CONVERSA:
${conversationContext}

NOVAS MENSAGENS DO LEAD (${bufferedMessages.length} mensagens):
${combinedMessage}

Responda de forma natural. Separe cada assunto em blocos com linha em branco entre eles. Cada bloco será uma mensagem separada no WhatsApp. Consulte o histórico para não repetir saudações ou informações já ditas.`;

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

            // Detect conversation outcome markers
            const shouldEndConversation = replyContent.includes('[CONVERSA_ENCERRADA]');
            if (shouldEndConversation) {
              console.log(`AI signaled conversation end (SUCCESS) for conv ${conv.id}`);
            }

            // Detect "lead lost" marker — lead is not interested
            const isLeadLost = replyContent.includes('[LEAD_PERDIDO]');
            if (isLeadLost) {
              console.log(`AI signaled lead LOST for conv ${conv.id}`);
            }

            // Detect "don't know" marker — agent couldn't answer the question
            const agentDoesntKnow = replyContent.includes('[NAO_SEI]');
            if (agentDoesntKnow) {
              console.log(`AI signaled it doesn't know the answer for conv ${conv.id}`);
            }
            
            // Remove all markers from the actual message
            replyContent = replyContent
              .replace(/\s*\[CONVERSA_ENCERRADA\]\s*/g, '')
              .replace(/\s*\[LEAD_PERDIDO\]\s*/g, '')
              .replace(/\s*\[NAO_SEI\]\s*/g, '')
              .trim();

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
                const isConversationEnded = shouldEndConversation || isLeadLost || reachedMaxReplies;
                
                if (isConversationEnded) {
                  const reason = isLeadLost ? 'lead_lost' : shouldEndConversation ? 'AI signal (success)' : 'max_replies reached';
                  console.log(`Conversation ${conv.id} ended. Reason: ${reason} (${newReplyCount}/${maxReplies ?? '∞'})`);
                }

                // Update conversation
                await supabase
                  .from('agent_conversations')
                  .update({
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                    reply_content: replyContent,
                    reply_count: newReplyCount,
                    status: isConversationEnded ? (isLeadLost ? 'lost' : 'completed') : 'awaiting_response',
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

                // CRM Integration: Move lead based on conversation outcome and update timestamps
                const crmStageReply = agent.crm_stage_on_reply || 'Mensagem Enviada';
                const crmStageEndSuccess = agent.crm_stage_on_end;
                const crmStageLost = (agent as any).crm_stage_on_lost;
                const crmStageUnknown = agent.crm_stage_on_unknown;
                const nowISO = new Date().toISOString();
                
                // Build extras with message timestamps
                const crmExtras = {
                  last_message_sent: replyContent,
                  last_message_sent_at: nowISO,
                  last_response: combinedMessage,
                  last_response_at: conv.response_received_at || nowISO,
                  whatsapp_status: isConversationEnded ? 'replied' : 'in_conversation',
                  leadName: conv.lead_name || undefined,
                };
                
                if (agentDoesntKnow && crmStageUnknown) {
                  // Agent doesn't know the answer — transfer to human
                  console.log(`Agent doesn't know answer, moving lead to "${crmStageUnknown}" for human handling`);
                  crmExtras.whatsapp_status = 'in_conversation';
                  await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageUnknown, crmExtras);

                  // Send email notification to user about human handoff
                  try {
                    // Build a contextual reason using the lead's last message
                    const lastLeadMessage = combinedMessage?.substring(0, 200) || '';
                    const handoffReason = lastLeadMessage
                      ? `O agente não soube responder à seguinte mensagem do lead: "${lastLeadMessage}${combinedMessage && combinedMessage.length > 200 ? '...' : ''}"`
                      : 'O agente identificou que não consegue responder adequadamente e transferiu para atendimento humano.';

                    await supabase.functions.invoke('send-email', {
                      body: {
                        user_id: whatsappNumber.user_id,
                        email_type: 'AGENT_HUMAN_HANDOFF',
                        payload: {
                          agent_name: agent.name,
                          lead_phone: conv.lead_phone,
                          lead_name: conv.lead_name || null,
                          stage_name: crmStageUnknown,
                          reason: handoffReason,
                        },
                        idempotency_key: `handoff_${conv.id}_${Date.now()}`,
                      },
                    });
                    console.log(`Human handoff email sent for conv ${conv.id}`);
                  } catch (emailErr) {
                    console.error(`Failed to send human handoff email for conv ${conv.id}:`, emailErr);
                  }
                } else if (isLeadLost && crmStageLost) {
                  // Lead explicitly not interested — move to lost stage
                  console.log(`Lead lost, moving to "${crmStageLost}"`);
                  crmExtras.whatsapp_status = 'lost';
                  await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageLost, crmExtras);
                } else if (isConversationEnded && crmStageEndSuccess) {
                  // Conversation ended successfully — objective achieved
                  console.log(`Objective achieved, moving lead to "${crmStageEndSuccess}"`);
                  await moveLeadToCRMStage(supabase, conv.lead_phone, whatsappNumber.user_id, crmStageEndSuccess, crmExtras);

                  // Send email notification about objective completion
                  try {
                    const lastLeadMessage = combinedMessage?.substring(0, 200) || '';
                    const objectiveReason = lastLeadMessage
                      ? `O agente concluiu o objetivo após a seguinte interação do lead: "${lastLeadMessage}${combinedMessage && combinedMessage.length > 200 ? '...' : ''}"`
                      : 'O agente identificou que o objetivo da conversa foi atingido com sucesso.';

                    await supabase.functions.invoke('send-email', {
                      body: {
                        user_id: whatsappNumber.user_id,
                        email_type: 'AGENT_OBJECTIVE_COMPLETED',
                        payload: {
                          agent_name: agent.name,
                          lead_phone: conv.lead_phone,
                          lead_name: conv.lead_name || null,
                          stage_name: crmStageEndSuccess,
                          reason: objectiveReason,
                        },
                        idempotency_key: `objective_${conv.id}_${Date.now()}`,
                      },
                    });
                    console.log(`Objective completed email sent for conv ${conv.id}`);
                  } catch (emailErr) {
                    console.error(`Failed to send objective completed email for conv ${conv.id}:`, emailErr);
                  }
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
