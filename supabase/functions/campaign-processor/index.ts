import { createClient } from "npm:@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAILY_LIMIT_PER_NUMBER = 200;
const FREE_DAILY_LIMIT = 20;
const FREE_TRIAL_MESSAGE_LIMIT = 400;

// Start next postponed campaign for a number when the current one finishes
async function startNextPostponedCampaign(
  supabase: any,
  numberId: string,
  userId: string
): Promise<void> {
  try {
    const { data: postponedCampaign } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name')
      .eq('whatsapp_number_id', numberId)
      .eq('status', 'postponed')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!postponedCampaign) return;

    console.log(`[Queue] Starting postponed campaign: ${postponedCampaign.name}`);

    await supabase.from('whatsapp_campaigns').update({
      status: 'running',
      started_at: new Date().toISOString(),
      pause_reason: null,
      updated_at: new Date().toISOString()
    }).eq('id', postponedCampaign.id);
  } catch (e) {
    console.error('Error starting postponed campaign:', e);
  }
}
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

// Normalize phone number for Brazilian campaigns
function normalizePhone(phone: string): string {
  let normalized = String(phone || '').replace(/\D/g, '');

  // Convert international prefix 00XX... -> XX...
  if (normalized.startsWith('00') && normalized.length > 4) {
    normalized = normalized.slice(2);
  }

  // Restore previous behavior: local BR numbers receive +55
  if (!normalized.startsWith('55') && normalized.length >= 10 && normalized.length <= 11) {
    normalized = `55${normalized}`;
  }

  return normalized;
}

function validateBrazilianCampaignPhone(phone: string): { isValid: boolean; normalized: string; reason?: string } {
  const normalized = normalizePhone(phone);

  if (!normalized.startsWith('55')) {
    return { isValid: false, normalized, reason: 'international_not_supported' };
  }

  const local = normalized.slice(2);

  // BR WhatsApp campaign support: only mobile format (DDD + 9 + 8 digits)
  if (local.length !== 11) {
    return { isValid: false, normalized, reason: 'invalid_length_or_landline' };
  }

  if (local.charAt(2) !== '9') {
    return { isValid: false, normalized, reason: 'landline_not_supported' };
  }

  return { isValid: true, normalized };
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

// Get user plan info
async function getUserPlanInfo(supabase: any, userId: string): Promise<{ plan: string; trialMessagesSent: number; isTrialExpired: boolean }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_messages_sent, trial_start_at')
    .eq('id', userId)
    .single();

  if (!profile) return { plan: 'free', trialMessagesSent: 0, isTrialExpired: false };

  const isTrialExpired = profile.trial_start_at
    ? (Date.now() - new Date(profile.trial_start_at).getTime()) > 30 * 24 * 60 * 60 * 1000
    : false;

  return {
    plan: profile.plan || 'free',
    trialMessagesSent: profile.trial_messages_sent || 0,
    isTrialExpired
  };
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
  let windowSentCount = campaign.window_sent_count || 0;

  campaignLog('📈', `Current State`, {
    leadIndex: currentIndex,
    totalLeads: leads.length,
    sent: sentCount,
    failed: failedCount,
    windowSent: windowSentCount
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

  // Check free plan limits
  const userInfo = await getUserPlanInfo(supabase, campaign.user_id);
  const isFreePlan = userInfo.plan === 'free';

  // Free plan: check total trial limit (400)
  if (isFreePlan && userInfo.trialMessagesSent >= FREE_TRIAL_MESSAGE_LIMIT) {
    campaignLog('🛑', `FREE TRIAL LIMIT REACHED - Cancelling campaign`, {
      trialMessagesSent: userInfo.trialMessagesSent,
      limit: FREE_TRIAL_MESSAGE_LIMIT
    });

    await supabase.from('whatsapp_campaigns').update({
      status: 'completed',
      pause_reason: 'Limite gratuito de 400 disparos atingido',
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount
    }).eq('id', campaign.id);

    return { processed: false, completed: true, skipped: false, error: 'Trial limit reached' };
  }

  // Free plan: check daily limit (20 per day)
  if (isFreePlan) {
    // Count messages sent today by this user (across all campaigns)
    const spNowForFreeLimit = getSaoPauloTime();
    const todayStr = spNowForFreeLimit.toISOString().split('T')[0];

    const { count: todayUserSent } = await supabase
      .from('whatsapp_campaigns')
      .select('sent_count', { count: 'exact', head: false })
      .eq('user_id', campaign.user_id)
      .eq('status', 'running')
      .gte('updated_at', todayStr + 'T00:00:00-03:00');

    // Simple approach: use a dedicated counter or check via sent_count today
    // For simplicity, track via daily_sent_count on the number (already tracked)
    if (dailySentCount >= FREE_DAILY_LIMIT) {
      const spNowFree = getSaoPauloTime();
      const spTomorrowFree = new Date(spNowFree);
      spTomorrowFree.setDate(spTomorrowFree.getDate() + 1);
      spTomorrowFree.setHours(0, 0, 0, 0);
      const tomorrowUTCFree = new Date(spTomorrowFree.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));

      campaignLog('🛑', `FREE DAILY LIMIT REACHED (20/day) - Pausing until tomorrow`, {
        dailySentCount,
        freeLimit: FREE_DAILY_LIMIT,
        resumeAt: tomorrowUTCFree.toISOString()
      });

      await supabase.from('whatsapp_campaigns').update({
        status: 'paused',
        pause_reason: 'Limite diário de 20 disparos (plano gratuito)',
        paused_at_limit: true,
        resume_at: tomorrowUTCFree.toISOString(),
        current_lead_index: currentIndex,
        sent_count: sentCount,
        failed_count: failedCount,
        updated_at: new Date().toISOString()
      }).eq('id', campaign.id);

      return { processed: false, completed: false, skipped: false, error: 'Free daily limit reached' };
    }
  }

  // Check daily limit (per number - 200)
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

  // Smart pause check - trigger BEFORE sending the message that would hit the threshold
  // This means if pause_after_contacts=10, we pause AFTER sending message #10, #20, #30...
  if (campaign.enable_smart_pause && campaign.pause_after_contacts > 0) {
    // Use window_sent_count to track messages sent since last smart pause
    // This avoids the infinite loop where sentCount % pause_after_contacts stays 0
    const shouldPause = windowSentCount >= campaign.pause_after_contacts;
    
    campaignLog('🔍', `Smart pause check`, {
      windowSentCount,
      pauseAfterContacts: campaign.pause_after_contacts,
      shouldPause
    });
    
    if (shouldPause) {
      const pauseMinutes = campaign.pause_minutes || 5;
      const pauseMs = pauseMinutes * 60 * 1000;
      const resumeAt = new Date(Date.now() + pauseMs).toISOString();
      
      campaignLog('☕', `SMART PAUSE ACTIVATED`, {
        messagesSentSinceLastPause: windowSentCount,
        totalSent: sentCount,
        pauseAfter: campaign.pause_after_contacts,
        pauseMinutes: pauseMinutes,
        resumeAt
      });
      
      await supabase.from('whatsapp_campaigns').update({
        status: 'paused',
        pause_reason: 'smart_pause',
        resume_at: resumeAt,
        window_sent_count: 0, // Reset window counter for next cycle
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

  const phoneValidation = validateBrazilianCampaignPhone(phone);

  if (!phoneValidation.isValid) {
    campaignLog('⚠️', `Skipping lead with unsupported phone format`, {
      rawPhone: phone,
      normalized: phoneValidation.normalized,
      reason: phoneValidation.reason,
    });

    failedCount++;
    await supabase.from('whatsapp_campaigns').update({
      current_lead_index: currentIndex + 1,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);

    return { processed: true, completed: false, skipped: false };
  }

  const formattedPhone = phoneValidation.normalized;

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
    windowSentCount++;
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

      // Increment trial_messages_sent for free plan users (per actual sent message)
      if (isFreePlan) {
        await supabase.from('profiles').update({
          trial_messages_sent: userInfo.trialMessagesSent + 1
        }).eq('id', campaign.user_id);
        // Update local counter for next iteration
        userInfo.trialMessagesSent++;
      }
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
    window_sent_count: windowSentCount,
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

    // Check for postponed campaigns on the same number
    await startNextPostponedCampaign(supabase, campaign.whatsapp_number_id, campaign.user_id);

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
  // Default Evolution API credentials (used for connection checks on start action)
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

      if (!campaign.whatsapp_number_id) {
        await supabase.from('whatsapp_campaigns').update({
          status: 'failed',
          pause_reason: 'Nenhum número WhatsApp atribuído à campanha',
          updated_at: new Date().toISOString()
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ error: 'Campaign has no WhatsApp number assigned' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      // Resolve Evolution API credentials based on number's api_tier
      const evoCredentials = getEvolutionCredentials(numberData?.api_tier);
      const startEvoUrl = evoCredentials.url;
      const startEvoKey = evoCredentials.apiKey;

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
        startEvoUrl,
        startEvoKey,
        numberData.instance_name
      );

      if (!isConnected) {
        await supabase.from('whatsapp_campaigns').update({
          status: 'paused',
          pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
          updated_at: new Date().toISOString()
        }).eq('id', campaignId);

        // NEVER update is_connected = false from backend
        // Only pause campaign and ask user to reconnect the number manually
        console.log(`⚠️ Connection check failed for ${numberData.instance_name}. Campaign paused awaiting reconnection.`);

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'WhatsApp desconectado. Reconecte o número para iniciar a campanha.' 
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

        if (!scheduled.whatsapp_number_id) {
          await supabase.from('whatsapp_campaigns').update({
            status: 'failed',
            pause_reason: 'Nenhum número WhatsApp atribuído à campanha',
            updated_at: now.toISOString()
          }).eq('id', scheduled.id);
          console.log(`❌ Scheduled campaign failed (no number): ${scheduled.id}`);
          campaignsProcessed++;
          continue;
        }
        
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
        if (!campaign.whatsapp_number_id) {
          await supabase.from('whatsapp_campaigns').update({
            status: 'failed',
            pause_reason: 'Nenhum número WhatsApp atribuído à campanha',
            updated_at: now.toISOString()
          }).eq('id', campaign.id);
          console.log(`❌ Running campaign failed (no number): ${campaign.id}`);
          campaignsProcessed++;
          continue;
        }

        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('id', campaign.whatsapp_number_id)
          .single();

        if (!numberData?.instance_name) {
          await supabase.from('whatsapp_campaigns').update({
            status: 'failed',
            pause_reason: 'Número WhatsApp não encontrado ou sem instância',
            updated_at: now.toISOString()
          }).eq('id', campaign.id);
          campaignsProcessed++;
          continue;
        }

        // Resolve Evolution API credentials based on number's api_tier
        const campaignEvoCredentials = getEvolutionCredentials(numberData.api_tier);

        // Validate real connection state before processing to avoid consuming leads on disconnected sessions
        if (!numberData.is_connected) {
          console.log(`⏳ Number ${numberData.instance_name} is marked as disconnected in DB, pausing campaign ${campaign.id}`);
          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
            updated_at: now.toISOString()
          }).eq('id', campaign.id);
          continue;
        }

        const isConnectedNow = await checkInstanceConnection(
          campaignEvoCredentials.url,
          campaignEvoCredentials.apiKey,
          numberData.instance_name,
          2
        );

        if (!isConnectedNow) {
          console.log(`⚠️ Number ${numberData.instance_name} is not connected on provider. Pausing campaign ${campaign.id}`);
          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'WhatsApp desconectado na API. Reconecte o número para retomar os disparos.',
            updated_at: now.toISOString()
          }).eq('id', campaign.id);
          continue;
        }

        const result = await processSingleMessage(
          supabase,
          campaignEvoCredentials.url,
          campaignEvoCredentials.apiKey,
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
