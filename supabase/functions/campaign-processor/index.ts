import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT_PER_NUMBER = 200;
const SAO_PAULO_OFFSET_HOURS = -3; // UTC-3

interface Lead {
  name: string;
  phone?: string;
  telefone?: string;
}

// Get current time in São Paulo timezone
function getSaoPauloTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (SAO_PAULO_OFFSET_HOURS * 3600000));
}

// Get midnight in São Paulo timezone as UTC
function getSaoPauloMidnightUTC(): Date {
  const spNow = getSaoPauloTime();
  const spMidnight = new Date(spNow);
  spMidnight.setHours(0, 0, 0, 0);
  return new Date(spMidnight.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));
}

// Check if we should reset daily count
function shouldResetDailyCount(lastSentAt: string | null): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt);
  const spMidnightUTC = getSaoPauloMidnightUTC();
  return lastSent < spMidnightUTC;
}

// Check if enough time has passed since last message
function canSendNextMessage(lastMessageSentAt: string | null, delaySeconds: number): boolean {
  if (!lastMessageSentAt) return true;
  const lastSent = new Date(lastMessageSentAt).getTime();
  const now = Date.now();
  const elapsedSeconds = (now - lastSent) / 1000;
  return elapsedSeconds >= delaySeconds;
}

// Get random delay between min and max
function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

// Normalize phone number - supports international numbers
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  
  // If number has 10-11 digits without country code, assume Brazil (55)
  // International numbers should already have country code (12+ digits)
  if (normalized.length >= 10 && normalized.length <= 11 && !normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  
  return normalized;
}

// Check if instance is connected with retry logic
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string,
  maxRetries: number = 3
): Promise<boolean> {
  let lastError: string | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        console.log(`⚠️ Connection check attempt ${attempt}/${maxRetries} failed: ${lastError}`);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return false;
      }

      const data = await response.json();
      const isConnected = data.state === 'open' || data.instance?.state === 'open';
      
      if (isConnected) {
        return true;
      }
      
      // If not connected but API responded, check if it's a temporary state
      const state = data.state || data.instance?.state;
      
      // States that might be temporary - retry
      if (state === 'connecting' || state === 'close') {
        console.log(`⏳ Instance state is "${state}", waiting... (attempt ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
      
      console.log(`📱 Instance connection state: ${state}`);
      return false;
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️ Connection check attempt ${attempt}/${maxRetries} error: ${lastError}`);
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }
  
  console.log(`❌ Connection check failed after ${maxRetries} attempts: ${lastError}`);
  return false;
}

// Send a single message (or simulate it)
async function sendMessage(
  evolutionUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string,
  simulationMode: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
  // If simulation mode, log and return success without actually sending
  if (simulationMode) {
    const simulatedMessageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[SIMULATION] Would send to ${phone}: "${message.substring(0, 50)}..."`);
    console.log(`[SIMULATION] Instance: ${instanceName}, MessageId: ${simulatedMessageId}`);
    return { success: true, messageId: simulatedMessageId, simulated: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ number: phone, text: message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      return { success: true, messageId: result?.key?.id };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if contact is in ignored list (should not receive new messages)
async function isContactIgnored(
  supabase: any,
  userId: string,
  phone: string
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const { data } = await supabase
    .from('ignored_contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('phone', normalizedPhone)
    .single();
  
  return !!data;
}

// Add contact to ignored list
async function addToIgnoredList(
  supabase: any,
  userId: string,
  phone: string,
  campaignId: string,
  whatsappNumberId: string
): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  try {
    await supabase.from('ignored_contacts').upsert({
      user_id: userId,
      phone: normalizedPhone,
      campaign_id: campaignId,
      whatsapp_number_id: whatsappNumberId,
      first_message_sent_at: new Date().toISOString(),
    }, { onConflict: 'user_id,phone' });
  } catch (e) {
    console.log('Contact already in ignored list or error:', e);
  }
}

// Check for incidents (blocks/reports)
async function hasIncidents(
  supabase: any,
  campaignId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('campaign_incidents')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  
  return (count || 0) > 0;
}

// Get available daily balance for a number
async function getAvailableBalance(
  supabase: any,
  numberId: string,
  targetDate: Date
): Promise<number> {
  const dateStr = targetDate.toISOString().split('T')[0];
  const spNow = getSaoPauloTime();
  const isToday = spNow.toISOString().split('T')[0] === dateStr;
  
  let usedToday = 0;
  
  if (isToday) {
    const { data: numberData } = await supabase
      .from('whatsapp_numbers')
      .select('daily_sent_count, last_sent_at')
      .eq('id', numberId)
      .single();
    
    if (numberData) {
      if (shouldResetDailyCount(numberData.last_sent_at)) {
        usedToday = 0;
        await supabase.from('whatsapp_numbers').update({ 
          daily_sent_count: 0 
        }).eq('id', numberId);
      } else {
        usedToday = numberData.daily_sent_count || 0;
      }
    }
  }
  
  const { data: reservations } = await supabase
    .from('campaign_daily_reservations')
    .select('reserved_count')
    .eq('whatsapp_number_id', numberId)
    .eq('reserved_date', dateStr);
  
  const totalReserved = (reservations || []).reduce(
    (sum: number, r: any) => sum + (r.reserved_count || 0), 
    0
  );
  
  return Math.max(0, DAILY_LIMIT_PER_NUMBER - usedToday - totalReserved);
}

// Process a single campaign - send ONE message (simplified without window system)
async function processSingleMessage(
  supabase: any,
  evolutionUrl: string,
  evolutionApiKey: string,
  campaign: any,
  numberData: any
): Promise<{ processed: boolean; completed: boolean; skipped: boolean; error?: string }> {
  
  const campaignLog = (level: string, msg: string, data?: any) => {
    const prefix = `[Campaign ${campaign.id.slice(0,8)}]`;
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`${level} ${prefix} ${msg}${dataStr}`);
  };

  campaignLog('📊', `=== PROCESSING START ===`);
  campaignLog('📊', `Campaign: ${campaign.name}`);
  
  // Check delay
  const delayMin = campaign.delay_seconds || 40;
  const delayMax = campaign.delay_seconds_max || 60;
  const requiredDelay = getRandomDelay(delayMin, delayMax);
  
  if (!canSendNextMessage(campaign.last_message_sent_at, requiredDelay)) {
    const elapsed = campaign.last_message_sent_at 
      ? Math.floor((Date.now() - new Date(campaign.last_message_sent_at).getTime()) / 1000)
      : 0;
    campaignLog('⏳', `Waiting for delay`, { elapsed, required: requiredDelay });
    return { processed: false, completed: false, skipped: true };
  }

  // Parse leads and messages
  let leads: Lead[] = campaign.leads;
  if (typeof leads === 'string') {
    try { leads = JSON.parse(leads); } catch { leads = []; }
  }

  let messages: string[] = campaign.messages;
  if (typeof messages === 'string') {
    try { messages = JSON.parse(messages); } catch { messages = []; }
  }

  const validMessages = messages.filter(m => m?.trim());
  if (!Array.isArray(leads) || leads.length === 0 || validMessages.length === 0) {
    campaignLog('❌', `Invalid campaign data`, { leadsCount: leads?.length, messagesCount: validMessages.length });
    return { processed: false, completed: false, skipped: false, error: 'Invalid campaign data' };
  }

  const currentIndex = campaign.current_lead_index || 0;
  let sentCount = campaign.sent_count || 0;
  let failedCount = campaign.failed_count || 0;

  campaignLog('📈', `Current State`, {
    leadIndex: currentIndex,
    totalLeads: leads.length,
    sent: sentCount,
    failed: failedCount
  });

  // Check if completed
  if (currentIndex >= leads.length) {
    await supabase.from('whatsapp_campaigns').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount
    }).eq('id', campaign.id);

    await supabase.from('campaign_daily_reservations')
      .delete()
      .eq('campaign_id', campaign.id);

    campaignLog('✅', `COMPLETED`, { sent: sentCount, failed: failedCount });
    return { processed: false, completed: true, skipped: false };
  }

  // Check for incidents (blocks/reports)
  const hasIncident = await hasIncidents(supabase, campaign.id);
  if (hasIncident) {
    campaignLog('🚨', `INCIDENT DETECTED - Pausing campaign immediately`);
    
    await supabase.from('whatsapp_campaigns').update({
      status: 'paused',
      pause_reason: 'incident_detected',
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);
    
    return { processed: false, completed: false, skipped: false };
  }

  // Get daily count
  let dailySentCount = numberData.daily_sent_count || 0;
  
  if (shouldResetDailyCount(numberData.last_sent_at)) {
    campaignLog('🔄', `Daily count reset triggered`);
    dailySentCount = 0;
    await supabase.from('whatsapp_numbers').update({ 
      daily_sent_count: 0 
    }).eq('id', numberData.id);
  }

  campaignLog('📅', `Daily limit check`, {
    dailySentCount,
    dailyLimit: DAILY_LIMIT_PER_NUMBER,
    remaining: DAILY_LIMIT_PER_NUMBER - dailySentCount
  });

  // Check daily limit
  if (dailySentCount >= DAILY_LIMIT_PER_NUMBER) {
    const spNow = getSaoPauloTime();
    const spTomorrow = new Date(spNow);
    spTomorrow.setDate(spTomorrow.getDate() + 1);
    spTomorrow.setHours(0, 0, 0, 0);
    const tomorrowUTC = new Date(spTomorrow.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));

    campaignLog('🛑', `DAILY LIMIT REACHED - Pausing until tomorrow`, {
      resumeAt: tomorrowUTC.toISOString()
    });

    await supabase.from('whatsapp_campaigns').update({
      status: 'paused',
      pause_reason: 'daily_limit',
      paused_at_limit: true,
      resume_at: tomorrowUTC.toISOString(),
      current_lead_index: currentIndex,
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);

    return { processed: false, completed: false, skipped: false, error: 'Daily limit reached' };
  }

  // Smart pause check
  if (campaign.enable_smart_pause && campaign.pause_after_contacts > 0) {
    const messagesSinceLastPause = sentCount % campaign.pause_after_contacts;
    if (messagesSinceLastPause === 0 && sentCount > 0) {
      const pauseMs = (campaign.pause_minutes || 5) * 60 * 1000;
      const resumeAt = new Date(Date.now() + pauseMs).toISOString();
      
      campaignLog('☕', `SMART PAUSE activated`, {
        pauseAfter: campaign.pause_after_contacts,
        pauseMinutes: campaign.pause_minutes,
        resumeAt
      });
      
      await supabase.from('whatsapp_campaigns').update({
        status: 'paused',
        pause_reason: 'smart_pause',
        resume_at: resumeAt,
        updated_at: new Date().toISOString()
      }).eq('id', campaign.id);
      
      return { processed: false, completed: false, skipped: false };
    }
  }

  // Get the lead to process
  const lead = leads[currentIndex];
  const phone = lead?.phone || lead?.telefone;
  
  if (!phone) {
    campaignLog('⚠️', `Lead ${currentIndex + 1} has no phone`, { leadName: lead?.name });
    failedCount++;
    await supabase.from('whatsapp_campaigns').update({
      current_lead_index: currentIndex + 1,
      failed_count: failedCount,
      last_message_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);
    
    return { processed: true, completed: false, skipped: false };
  }

  const formattedPhone = normalizePhone(phone);

  // Check if contact is ignored
  const isIgnored = await isContactIgnored(supabase, campaign.user_id, formattedPhone);
  if (isIgnored) {
    campaignLog('🚫', `Skipping IGNORED contact`, { phone: formattedPhone });
    failedCount++;
    
    await supabase.from('whatsapp_campaigns').update({
      current_lead_index: currentIndex + 1,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);
    
    return { processed: true, completed: false, skipped: false };
  }

  // Select message (random variation)
  const messageIndex = Math.floor(Math.random() * validMessages.length);
  const randomMessage = validMessages[messageIndex];
  const personalizedMessage = randomMessage
    .replace(/\{nome\}/gi, lead.name || 'Cliente')
    .replace(/\{empresa\}/gi, lead.name || 'Empresa');

  campaignLog('📤', `SENDING MESSAGE`, {
    leadIndex: currentIndex + 1,
    totalLeads: leads.length,
    phone: formattedPhone,
    messageVariation: messageIndex + 1,
    messagePreview: personalizedMessage.substring(0, 50) + '...'
  });

  // Re-check campaign status
  const { data: statusCheck } = await supabase
    .from('whatsapp_campaigns')
    .select('status')
    .eq('id', campaign.id)
    .single();

  if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
    campaignLog('⛔', `Campaign status changed externally`, { newStatus: statusCheck?.status });
    return { processed: false, completed: false, skipped: false };
  }

  // Send the message (or simulate it)
  const isSimulation = campaign.simulation_mode === true;
  if (isSimulation) {
    campaignLog('🧪', `SIMULATION MODE ACTIVE - Message will be logged but not sent`);
  }
  
  const result = await sendMessage(
    evolutionUrl,
    evolutionApiKey,
    numberData.instance_name,
    formattedPhone,
    personalizedMessage,
    isSimulation
  );

  const now = new Date().toISOString();

  if (result.success) {
    sentCount++;
    
    // Only increment daily count for real messages (not simulations)
    if (!isSimulation) {
      dailySentCount++;
    }
    
    const logEmoji = isSimulation ? '🧪' : '✅';
    const logMsg = isSimulation ? 'MESSAGE SIMULATED' : 'MESSAGE SENT SUCCESSFULLY';
    
    campaignLog(logEmoji, logMsg, {
      phone: formattedPhone,
      messageId: result.messageId,
      simulated: isSimulation,
      progress: `${sentCount}/${leads.length}`,
      dailyProgress: `${dailySentCount}/${DAILY_LIMIT_PER_NUMBER}`
    });

    // Add to ignored list (will only be removed if contact responds) - skip for simulations
    if (!isSimulation) {
      await addToIgnoredList(supabase, campaign.user_id, formattedPhone, campaign.id, numberData.id);
    }
  } else {
    campaignLog('❌', `MESSAGE FAILED`, {
      phone: formattedPhone,
      error: result.error,
      failedCount: failedCount + 1
    });
    failedCount++;
  }

  // Update campaign progress
  await supabase.from('whatsapp_campaigns').update({
    current_lead_index: currentIndex + 1,
    sent_count: sentCount,
    failed_count: failedCount,
    last_message_sent_at: now,
    updated_at: now
  }).eq('id', campaign.id);

  // Update number daily count
  await supabase.from('whatsapp_numbers').update({
    daily_sent_count: dailySentCount,
    last_sent_at: now,
    updated_at: now
  }).eq('id', numberData.id);

  // Check if now completed
  if (currentIndex + 1 >= leads.length) {
    await supabase.from('whatsapp_campaigns').update({
      status: 'completed',
      completed_at: now,
      sent_count: sentCount,
      failed_count: failedCount
    }).eq('id', campaign.id);

    await supabase.from('campaign_daily_reservations')
      .delete()
      .eq('campaign_id', campaign.id);

    campaignLog('🎉', `=== CAMPAIGN COMPLETED ===`, {
      totalSent: sentCount,
      totalFailed: failedCount,
      successRate: `${Math.round((sentCount / (sentCount + failedCount)) * 100)}%`
    });
    return { processed: true, completed: true, skipped: false };
  }

  campaignLog('📊', `=== PROCESSING END ===`, {
    nextLeadIndex: currentIndex + 1,
    campaignProgress: `${sentCount}/${leads.length}`
  });

  return { processed: true, completed: false, skipped: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { campaignId, action } = body;

    // Action: start
    if (action === 'start') {
      if (!campaignId) {
        return new Response(JSON.stringify({ error: 'campaignId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: campaign, error: campaignError } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return new Response(JSON.stringify({ error: 'Campaign not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (!numberData?.instance_name) {
        await supabase.from('whatsapp_campaigns').update({
          status: 'failed',
          pause_reason: 'Número WhatsApp não encontrado'
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ error: 'WhatsApp number not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isConnected = await checkInstanceConnection(
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        numberData.instance_name
      );

      if (!isConnected) {
        await supabase.from('whatsapp_numbers').update({
          is_connected: false,
          updated_at: new Date().toISOString()
        }).eq('id', numberData.id);

        await supabase.from('whatsapp_campaigns').update({
          status: 'paused',
          pause_reason: 'WhatsApp desconectado'
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'WhatsApp disconnected' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('whatsapp_campaigns').update({
        status: 'running',
        started_at: campaign.started_at || new Date().toISOString(),
        pause_reason: null,
        updated_at: new Date().toISOString()
      }).eq('id', campaignId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Campaign started'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: process - Called by cron every minute
    if (action === 'process') {
      const now = new Date();
      const spNow = getSaoPauloTime();
      const heartbeatId = crypto.randomUUID();
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 CAMPAIGN PROCESSOR - ${spNow.toISOString()} (São Paulo)`);
      console.log(`${'='.repeat(60)}`);
      
      await supabase.from('campaign_processor_heartbeats').insert({
        id: heartbeatId,
        action: 'process',
        status: 'running',
        started_at: now.toISOString()
      });
      
      // Find running campaigns
      const { data: runningCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'running')
        .order('updated_at', { ascending: true })
        .limit(10);

      // Find scheduled campaigns that should start
      const { data: scheduledCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, scheduled_at, whatsapp_number_id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString());

      // Find paused campaigns that should resume (smart pause, daily limit)
      const { data: pausedCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'paused')
        .not('resume_at', 'is', null)
        .lte('resume_at', now.toISOString());

      console.log(`📊 Campaign Summary:`, {
        running: runningCampaigns?.length || 0,
        scheduled: scheduledCampaigns?.length || 0,
        pausedToResume: pausedCampaigns?.length || 0
      });

      let messagesProcessed = 0;
      let campaignsProcessed = 0;
      let skippedDueToDelay = 0;

      // Start scheduled campaigns
      for (const scheduled of (scheduledCampaigns || [])) {
        console.log(`📅 Starting SCHEDULED campaign: ${scheduled.name}`);
        
        await supabase.from('campaign_daily_reservations')
          .delete()
          .eq('campaign_id', scheduled.id);

        await supabase.from('whatsapp_campaigns').update({
          status: 'running',
          started_at: now.toISOString(),
          scheduled_at: null,
          updated_at: now.toISOString()
        }).eq('id', scheduled.id);
        
        campaignsProcessed++;
      }

      // Resume paused campaigns
      for (const paused of (pausedCampaigns || [])) {
        console.log(`▶️ Resuming PAUSED campaign: ${paused.name}`, {
          pauseReason: paused.pause_reason,
          resumeAt: paused.resume_at
        });
        
        await supabase.from('whatsapp_campaigns').update({
          status: 'running',
          pause_reason: null,
          paused_at_limit: false,
          resume_at: null,
          updated_at: now.toISOString()
        }).eq('id', paused.id);
        
        campaignsProcessed++;
      }

      // Process running campaigns
      for (const campaign of (runningCampaigns || [])) {
        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('id', campaign.whatsapp_number_id)
          .single();

        if (!numberData?.instance_name) {
          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'Número não configurado'
          }).eq('id', campaign.id);
          continue;
        }

        // Check connection with more retries for running campaigns
        const isConnected = await checkInstanceConnection(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          numberData.instance_name,
          3 // 3 retry attempts
        );

        if (!isConnected) {
          // NEVER disconnect the number from campaign-processor
          // Just skip this cycle and try again next time
          console.log(`⏳ Connection check failed for ${numberData.instance_name}, skipping this cycle (will retry next cycle)`);
          continue;
        }

        const result = await processSingleMessage(
          supabase,
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          campaign,
          numberData
        );

        if (result.processed) {
          messagesProcessed++;
        }
        if (result.skipped) {
          skippedDueToDelay++;
        }
        campaignsProcessed++;
      }

      console.log(`\n📊 PROCESSOR SUMMARY:`, {
        campaignsProcessed,
        messagesProcessed,
        skippedDueToDelay,
        scheduledStarted: scheduledCampaigns?.length || 0,
        pausedResumed: pausedCampaigns?.length || 0
      });
      console.log(`${'='.repeat(60)}\n`);

      await supabase.from('campaign_processor_heartbeats').update({
        status: 'completed',
        campaigns_processed: campaignsProcessed,
        messages_sent: messagesProcessed,
        completed_at: new Date().toISOString()
      }).eq('id', heartbeatId);

      return new Response(JSON.stringify({ 
        success: true,
        campaignsProcessed,
        messagesProcessed,
        skippedDueToDelay,
        scheduledStarted: scheduledCampaigns?.length || 0,
        pausedResumed: pausedCampaigns?.length || 0,
        saoPauloTime: spNow.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check-balance
    if (action === 'check-balance') {
      const { numberId, targetDate } = body;
      
      if (!numberId) {
        return new Response(JSON.stringify({ error: 'numberId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const date = targetDate ? new Date(targetDate) : getSaoPauloTime();
      const available = await getAvailableBalance(supabase, numberId, date);

      return new Response(JSON.stringify({ 
        success: true,
        availableBalance: available,
        dailyLimit: DAILY_LIMIT_PER_NUMBER,
        date: date.toISOString().split('T')[0],
        saoPauloTime: getSaoPauloTime().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: register-response - Called when a contact responds
    if (action === 'register-response') {
      const { contactPhone, campaignId: respCampaignId, userId, messageContent } = body;
      
      console.log(`📩 REGISTER RESPONSE called:`, {
        contactPhone,
        campaignId: respCampaignId?.slice(0, 8),
        userId: userId?.slice(0, 8),
        messagePreview: messageContent?.substring(0, 30)
      });
      
      if (!contactPhone || !userId) {
        return new Response(JSON.stringify({ error: 'contactPhone and userId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const normalizedPhone = normalizePhone(contactPhone);
      console.log(`📱 Normalized phone: ${normalizedPhone}`);

      // Remove from ignored list since they responded
      const { error: deleteError } = await supabase.from('ignored_contacts')
        .delete()
        .eq('user_id', userId)
        .eq('phone', normalizedPhone);
      
      console.log(`🗑️ Removed from ignored list:`, { success: !deleteError, error: deleteError?.message });

      // If campaign specified, register response
      if (respCampaignId) {
        const { data: campaign } = await supabase
          .from('whatsapp_campaigns')
          .select('name, status')
          .eq('id', respCampaignId)
          .single();

        console.log(`📋 Campaign for response:`, {
          name: campaign?.name,
          status: campaign?.status
        });

        await supabase.from('campaign_responses').insert({
          campaign_id: respCampaignId,
          user_id: userId,
          contact_phone: normalizedPhone,
          message_content: messageContent,
          window_number: 1,
          responded_at: new Date().toISOString()
        });

        // Update campaign response count
        const { count } = await supabase
          .from('campaign_responses')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', respCampaignId);

        console.log(`📊 Total responses for campaign: ${count}`);

        await supabase.from('whatsapp_campaigns').update({
          total_responses: count || 0,
          updated_at: new Date().toISOString()
        }).eq('id', respCampaignId);
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Response registered'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in campaign-processor:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
