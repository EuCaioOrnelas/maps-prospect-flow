import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Email notification helper ─────────────────────────────────────────────
async function sendEmailNotification(
  userId: string,
  emailType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ user_id: userId, email_type: emailType, payload, idempotency_key: idempotencyKey }),
    });
    const data = await res.json();
    console.log(`[email] ${emailType} -> ${res.ok ? 'sent' : 'failed'}`, data);
  } catch (e) {
    console.error(`[email] Failed to send ${emailType}:`, e);
  }
}
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

async function getEvolutionCredentialsForNumber(
  supabase: any,
  numberData: any,
  userId: string
): Promise<EvolutionCredentials> {
  if (numberData?.api_tier) {
    return getEvolutionCredentials(numberData.api_tier);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();

  const credentials = getEvolutionCredentials(profile?.plan);

  // Self-heal: persist inferred tier for next runs
  if (numberData?.id) {
    await supabase
      .from('whatsapp_numbers')
      .update({ api_tier: credentials.tier, updated_at: new Date().toISOString() })
      .eq('id', numberData.id);
  }

  return credentials;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  for (const tier of ['free', 'paid'] as const) {
    try {
      const creds = getEvolutionCredentials(tier);
      await fetch(`${creds.url}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': creds.apiKey },
      }).catch(() => null);
      const deleteResponse = await fetch(`${creds.url}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': creds.apiKey },
      });
      console.log(`Deleted stale campaign instance ${instanceName} from ${tier} API: ${deleteResponse.status}`);
    } catch (e) {
      console.log(`Stale campaign instance ${instanceName} not found on ${tier} API:`, e);
    }
  }
}

const DAILY_LIMIT_PER_NUMBER = 200;
const FREE_DAILY_LIMIT = 20;
const FREE_TRIAL_MESSAGE_LIMIT = 400;
const IGNORED_CONTACT_COOLDOWN_MINUTES = 30;
const SEND_RETRY_ATTEMPTS = 2; // Retry sending on transient failures

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
      // Reset stuck-detector baseline so the new campaign isn't flagged as
      // "silent for hours" using the previous campaign's send timestamp.
      last_message_sent_at: new Date().toISOString(),
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

// Get 08:00 São Paulo time today as UTC (daily reset hour)
function getSaoPauloResetTimeUTC(): Date {
  const spNow = getSaoPauloTime();
  const spReset = new Date(spNow);
  spReset.setHours(8, 0, 0, 0);
  return new Date(spReset.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));
}

// Check if we should reset daily count (resets at 08:00 São Paulo time)
function shouldResetDailyCount(lastSentAt: string | null): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt);
  const spResetUTC = getSaoPauloResetTimeUTC();
  return lastSent < spResetUTC;
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

  // If already starts with 55 and is 12-13 digits, it's likely already E.164 BR format
  if (normalized.startsWith('55') && normalized.length >= 12 && normalized.length <= 13) {
    return normalized;
  }

  // Local BR numbers (10-11 digits) receive +55 prefix
  // Handle DDD 55 ambiguity: a local number starting with "55" + 8-9 more digits = DDD 55
  // E.g. "5591234567" (10 digits, DDD 55) should become "555591234567" not stay as "5591234567"
  if (!normalized.startsWith('55') && normalized.length >= 10 && normalized.length <= 11) {
    normalized = `55${normalized}`;
  } else if (normalized.startsWith('55') && normalized.length >= 10 && normalized.length <= 11) {
    // This is a local number with DDD 55 (e.g. Cascavel-PR), add country code
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
      
      const state = data.state || data.instance?.state;
      console.log(`📱 Instance not connected (state: "${state}"), treating as disconnected`);
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
): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean; status?: string }> {
  // If simulation mode, log and return success without actually sending
  if (simulationMode) {
    const simulatedMessageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[SIMULATION] Would send to ${phone}: "${message.substring(0, 50)}..."`);
    console.log(`[SIMULATION] Instance: ${instanceName}, MessageId: ${simulatedMessageId}`);
    return { success: true, messageId: simulatedMessageId, simulated: true, status: 'simulated' };
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

    const responseText = await response.text();
    let result: any = null;
    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      result = null;
    }

    if (!response.ok) {
      return { success: false, error: responseText || `HTTP ${response.status}` };
    }

    const messageId = result?.key?.id || result?.messageId || result?.id;
    const status = String(result?.status || result?.message?.status || '').toLowerCase();
    const explicitError = result?.error || result?.message === 'error';
    const failedStatuses = ['error', 'failed', 'not_sent', 'rejected', 'invalid'];

    if (explicitError || failedStatuses.includes(status)) {
      return {
        success: false,
        error: result?.error || result?.message || `Evolution returned failure status: ${status || 'unknown'}`,
        status,
      };
    }

    // Critical guard: do not mark as sent/ignored without a provider message id
    if (!messageId) {
      return {
        success: false,
        error: 'Evolution returned success without messageId confirmation',
        status,
      };
    }

    return { success: true, messageId, status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if contact is in ignored list (temporary anti-spam cooldown)
// Now scoped per-campaign: a lead ignored in Campaign A can still be sent in Campaign B
async function isContactIgnored(
  supabase: any,
  userId: string,
  phone: string,
  campaignId: string
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const { data } = await supabase
    .from('ignored_contacts')
    .select('id, first_message_sent_at, campaign_id')
    .eq('user_id', userId)
    .eq('phone', normalizedPhone)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!data) return false;

  const firstSentAt = data.first_message_sent_at ? new Date(data.first_message_sent_at).getTime() : null;
  if (!firstSentAt || Number.isNaN(firstSentAt)) {
    return true;
  }

  const cooldownMs = IGNORED_CONTACT_COOLDOWN_MINUTES * 60 * 1000;
  const stillInCooldown = Date.now() - firstSentAt < cooldownMs;

  if (!stillInCooldown) {
    // Cleanup expired ignored contact
    await supabase
      .from('ignored_contacts')
      .delete()
      .eq('id', data.id);
  }

  return stillInCooldown;
}

// Clear all ignored contacts for a specific campaign (used when resuming after disconnection)
async function clearCampaignIgnoredContacts(
  supabase: any,
  userId: string,
  campaignId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ignored_contacts')
    .delete()
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .select('id');

  if (error) {
    console.log('Error clearing ignored contacts:', error.message);
    return 0;
  }
  return data?.length || 0;
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
    // Use insert with ON CONFLICT DO NOTHING since the unique index uses COALESCE
    // which can't be referenced in onConflict. Duplicates will simply be skipped.
    await supabase.from('ignored_contacts').insert({
      user_id: userId,
      phone: normalizedPhone,
      campaign_id: campaignId,
      whatsapp_number_id: whatsappNumberId,
      first_message_sent_at: new Date().toISOString(),
    });
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
  
  // Check delay - use delayMin for consistent behavior
  const delayMin = campaign.delay_seconds || 40;
  const delayMax = campaign.delay_seconds_max || 60;
  // Fix: use a deterministic delay based on delayMin to avoid random recalculation each cycle
  const requiredDelay = getRandomDelay(delayMin, delayMax);
  
  if (!canSendNextMessage(campaign.last_message_sent_at, requiredDelay)) {
    const lastSentTime = new Date(campaign.last_message_sent_at).getTime();
    const elapsedMs = Date.now() - lastSentTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    campaignLog('⏳', `Waiting for delay`, { elapsed: elapsedSeconds, required: requiredDelay });
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
  const isAiMode = (campaign as any).message_mode === 'ai_generated';
  if (!Array.isArray(leads) || leads.length === 0 || (!isAiMode && validMessages.length === 0)) {
    campaignLog('❌', `Invalid campaign data`, { leadsCount: leads?.length, messagesCount: validMessages.length, mode: isAiMode ? 'ai' : 'custom' });
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

    // Send email notification (fire-and-forget)
    sendEmailNotification(
      campaign.user_id,
      'CAMPAIGN_SCHEDULED_STARTED',
      { campaign_name: campaign.name, total_leads: leads.length, status: 'completed', sent: sentCount },
      `campaign_completed_${campaign.id}`
    ).catch(() => {});

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
    // dailySentCount is already tracked on the number; no extra query needed.
    if (dailySentCount >= FREE_DAILY_LIMIT) {
      const spNowFree = getSaoPauloTime();
      const spTomorrowFree = new Date(spNowFree);
      spTomorrowFree.setDate(spTomorrowFree.getDate() + 1);
      spTomorrowFree.setHours(8, 0, 0, 0);
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
    spTomorrow.setHours(8, 0, 0, 0);
    const tomorrowUTC = new Date(spTomorrow.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));

    campaignLog('🛑', `DAILY LIMIT REACHED - Pausing until tomorrow 08:00`, {
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

  // Check if contact is ignored (per-campaign scope)
  const isIgnored = await isContactIgnored(supabase, campaign.user_id, formattedPhone, campaign.id);
  if (isIgnored) {
    campaignLog('🚫', `Skipping IGNORED contact (already sent in this campaign)`, { phone: formattedPhone });
    // Don't count as failed - just skip to next lead
    await supabase.from('whatsapp_campaigns').update({
      current_lead_index: currentIndex + 1,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);
    
    return { processed: true, completed: false, skipped: false };
  }

  // Select message based on campaign mode
  const messageMode = (campaign as any).message_mode || 'custom';
  let personalizedMessage: string;

  if (messageMode === 'ai_generated' && lead.aiMessage) {
    // AI mode: use per-lead personalized message from opportunities
    personalizedMessage = lead.aiMessage;
    campaignLog('🤖', `Using AI-generated message for lead`, { phone: formattedPhone });
  } else {
    // Custom mode: random variation
    const messageIndex = Math.floor(Math.random() * validMessages.length);
    const randomMessage = validMessages[messageIndex];
    personalizedMessage = randomMessage
      .replace(/\{nome\}/gi, lead.name || 'Cliente')
      .replace(/\{empresa\}/gi, lead.name || 'Empresa');
  }

  campaignLog('📤', `SENDING MESSAGE`, {
    leadIndex: currentIndex + 1,
    totalLeads: leads.length,
    phone: formattedPhone,
    messageMode: messageMode,
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

  // Send the message (or simulate it) with retry on transient failures
  const isSimulation = campaign.simulation_mode === true;
  if (isSimulation) {
    campaignLog('🧪', `SIMULATION MODE ACTIVE - Message will be logged but not sent`);
  }
  
  let result = await sendMessage(
    evolutionUrl,
    evolutionApiKey,
    numberData.instance_name,
    formattedPhone,
    personalizedMessage,
    isSimulation
  );

  // Retry on transient failures (network timeout, temporary errors)
  if (!result.success && !isSimulation) {
    const isTransientError = result.error?.includes('abort') || 
                              result.error?.includes('timeout') || 
                              result.error?.includes('fetch') ||
                              result.error?.includes('network') ||
                              result.error?.includes('ECONNREFUSED');
    
    if (isTransientError) {
      for (let retry = 1; retry <= SEND_RETRY_ATTEMPTS; retry++) {
        campaignLog('🔄', `Retrying send (attempt ${retry}/${SEND_RETRY_ATTEMPTS})`, { error: result.error });
        await new Promise(r => setTimeout(r, 2000 * retry)); // Exponential backoff
        
        result = await sendMessage(
          evolutionUrl,
          evolutionApiKey,
          numberData.instance_name,
          formattedPhone,
          personalizedMessage,
          false
        );
        
        if (result.success) break;
      }
    }
  }

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
    // Check if failure indicates REAL disconnection (pause campaign, don't skip lead)
    // IMPORTANT: do NOT treat generic HTTP 404/401 as disconnection, these can be lead-specific/provider responses.
    const normalizedError = String(result.error || '').toLowerCase();
    const isDisconnectionError = normalizedError.includes('not connected') ||
                                 normalizedError.includes('disconnected') ||
                                 normalizedError.includes('instance not found') ||
                                 normalizedError.includes('connection closed') ||
                                 normalizedError.includes('session closed') ||
                                 (normalizedError.includes('unauthorized') && normalizedError.includes('instance'));
    
    if (isDisconnectionError) {
      campaignLog('🔌', `DISCONNECTION DETECTED from send failure - pausing campaign`, {
        phone: formattedPhone,
        error: result.error
      });

      // ─── IDEMPOTENT CLAIM ──────────────────────────────────────────────
      // Atomic CAS: only one worker actually performs delete + email per
      // disconnection event. If health-check (or another concurrent send)
      // already flipped is_connected=false, we skip side effects entirely.
      const { data: claimed } = await supabase
        .from('whatsapp_numbers')
        .update({
          is_connected: false,
          instance_name: null,
          last_health_check_at: new Date().toISOString(),
          updated_at: now,
        })
        .eq('id', numberData.id)
        .eq('is_connected', true)
        .select('id');

      const wonClaim = (claimed?.length || 0) > 0;

      if (wonClaim) {
        await deleteEvolutionInstance(numberData.instance_name);
      } else {
        campaignLog('ℹ️', `Number already marked disconnected by another worker — skipping delete/email`);
      }

      await supabase.from('whatsapp_campaigns').update({
        status: 'paused',
        pause_reason: 'WhatsApp desconectado durante envio. Reconecte o número para retomar.',
        updated_at: new Date().toISOString()
      }).eq('id', campaign.id);

      if (wonClaim) {
        // Same key shape as evolution-health-check so cross-path duplicates collapse.
        const dayKey = new Date().toISOString().slice(0, 10);
        sendEmailNotification(
          campaign.user_id,
          'NUMBER_DISCONNECTED',
          {
            phone_number: numberData.phone_number || numberData.instance_name,
            instance_name: numberData.instance_name,
            reason: 'send_failed_disconnected',
            campaign_name: campaign.name,
          },
          `disconnect_${numberData.id}_${dayKey}`
        ).catch(() => {});
      }

      // Don't increment index - this lead should be retried after reconnection
      return { processed: false, completed: false, skipped: false, error: 'Disconnected during send' };
    }
    
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

    // Send email notification (fire-and-forget)
    sendEmailNotification(
      campaign.user_id,
      'CAMPAIGN_SCHEDULED_STARTED',
      { campaign_name: campaign.name, total_leads: leads.length, status: 'completed', sent: sentCount },
      `campaign_completed2_${campaign.id}`
    ).catch(() => {});

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

      // Resolve Evolution API credentials based on number tier, with user-plan fallback
      const evoCredentials = await getEvolutionCredentialsForNumber(supabase, numberData, campaign.user_id);
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
        // If DB still says connected, do not block start (avoid false negatives on transient checks)
        if (numberData.is_connected) {
          console.log(`⚠️ Connection check transient failure for ${numberData.instance_name}, but DB is connected — allowing start.`);
        } else {
          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
            updated_at: new Date().toISOString()
          }).eq('id', campaignId);

          console.log(`⚠️ Connection check failed for ${numberData.instance_name}. Campaign paused awaiting reconnection.`);

          return new Response(JSON.stringify({ 
            success: false, 
            error: 'WhatsApp desconectado. Reconecte o número para iniciar a campanha.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      await supabase.from('whatsapp_campaigns').update({
        status: 'running',
        started_at: campaign.started_at || new Date().toISOString(),
        pause_reason: null,
        // Reset stuck baseline on manual start so we don't false-positive
        // a campaign that was created hours ago but only started now.
        last_message_sent_at: new Date().toISOString(),
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

      // Scheduled campaign transitions are handled ONLY by start-scheduled-campaigns.
      // Keeping it centralized avoids race conditions and false "desconectado" states overnight.
      if ((scheduledCampaigns || []).length > 0) {
        console.log(`ℹ️ Skipping scheduled transitions here (${scheduledCampaigns.length}) — delegated to start-scheduled-campaigns`);
      }

      // Resume paused campaigns
      for (const paused of (pausedCampaigns || [])) {
        const isDisconnectionPause = paused.pause_reason?.includes('desconectado') || 
                                      paused.pause_reason?.includes('conexão') ||
                                      paused.pause_reason?.includes('Reconecte');
        
        console.log(`▶️ Resuming PAUSED campaign: ${paused.name}`, {
          pauseReason: paused.pause_reason,
          resumeAt: paused.resume_at,
          isDisconnectionPause
        });

        // If campaign was paused due to disconnection, clear its ignored contacts
        // so leads can be retried (they weren't actually delivered)
        if (isDisconnectionPause) {
          const cleared = await clearCampaignIgnoredContacts(supabase, paused.user_id, paused.id);
          console.log(`🧹 Cleared ${cleared} ignored contacts for campaign ${paused.id} (was paused by disconnection)`);
        }
        
        // CRITICAL: reset last_message_sent_at when resuming so the
        // stuck-campaign detector doesn't immediately trigger a false
        // force_disconnect (the campaign was legitimately paused, not stuck).
        await supabase.from('whatsapp_campaigns').update({
          status: 'running',
          pause_reason: null,
          paused_at_limit: false,
          resume_at: null,
          last_message_sent_at: now.toISOString(),
          updated_at: now.toISOString()
        }).eq('id', paused.id);
        
        campaignsProcessed++;
      }

      // ─── STUCK-CAMPAIGN DETECTION ────────────────────────────────────────
      // If a running campaign hasn't sent anything for a long time relative to
      // its configured delay, the WhatsApp session likely died silently
      // (timeout / dropped Meta connection). Force a hard disconnect so the
      // user gets an email and can reconnect, instead of waiting hours.
      const STUCK_BUFFER_SECONDS = 180; // grace period on top of normal delay
      const STUCK_MULTIPLIER = 6;       // delay must be exceeded this many times
      const STUCK_FLOOR_MINUTES = 15;   // never flag before 15 min of silence
      const handledStuckNumbers = new Set<string>();

      for (const campaign of (runningCampaigns || [])) {
        // Fallback chain: last sent → started_at → updated_at. Ensures campaigns
        // that were marked running but NEVER sent (dead session from start) also
        // get caught by the stuck-detector instead of running forever silently.
        const lastSent = campaign.last_message_sent_at
          || campaign.started_at
          || campaign.updated_at;
        if (!lastSent || !campaign.whatsapp_number_id) continue;
        const lastSentMs = new Date(lastSent).getTime();
        const ageSec = (now.getTime() - lastSentMs) / 1000;
        const expectedDelay = (campaign.delay_seconds_max || campaign.delay_seconds || 60) + STUCK_BUFFER_SECONDS;
        const stuckThreshold = Math.max(expectedDelay * STUCK_MULTIPLIER, STUCK_FLOOR_MINUTES * 60);
        if (ageSec < stuckThreshold) continue;
        if (handledStuckNumbers.has(campaign.whatsapp_number_id)) continue;

        // Guard: only fire if the number is still marked connected. Otherwise
        // a previous health-check already handled it — avoid double email/delete.
        const { data: numCheck } = await supabase
          .from('whatsapp_numbers')
          .select('id, is_connected, instance_name')
          .eq('id', campaign.whatsapp_number_id)
          .maybeSingle();

        if (!numCheck || !numCheck.is_connected || !numCheck.instance_name) {
          // Number already disconnected — just pause this campaign cleanly.
          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar.',
            updated_at: now.toISOString(),
          }).eq('id', campaign.id);
          handledStuckNumbers.add(campaign.whatsapp_number_id);
          console.log(`⏸️ Campaign ${campaign.id} paused (number already disconnected, no force needed).`);
          continue;
        }

        console.log(`🚨 STUCK CAMPAIGN detected: ${campaign.id} ("${campaign.name}") — silent for ${Math.round(ageSec/60)}min (threshold ${Math.round(stuckThreshold/60)}min). Triggering force disconnect.`);
        handledStuckNumbers.add(campaign.whatsapp_number_id);

        try {
          await supabase.functions.invoke('evolution-health-check', {
            body: {
              number_id: campaign.whatsapp_number_id,
              force_disconnect: true,
              reason: 'campaign_stuck_timeout',
              campaign_name: campaign.name,
            },
          });
        } catch (e) {
          console.log('Failed to trigger force disconnect:', e);
        }
      }

      // Process running campaigns — skip ones whose number was just force-disconnected
      // by the stuck-detector above (avoid double email / wasted live checks on dead session).
      for (const campaign of (runningCampaigns || [])) {
        if (campaign.whatsapp_number_id && handledStuckNumbers.has(campaign.whatsapp_number_id)) {
          console.log(`⏭️ Skipping campaign ${campaign.id} — number was just disconnected by stuck-detector.`);
          continue;
        }
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

        // Resolve Evolution API credentials based on number tier, with user-plan fallback
        const campaignEvoCredentials = await getEvolutionCredentialsForNumber(supabase, numberData, campaign.user_id);

        // Validate connection state
        // If DB says disconnected, do a LIVE check before pausing to avoid false negatives.
        // The DB flag can become stale when Evolution auto-reconnects without sending a webhook event.
        if (!numberData.is_connected) {
          console.log(`⚠️ Number ${numberData.instance_name} is marked as disconnected in DB — performing LIVE verification before pausing...`);
          
          const liveConnected = await checkInstanceConnection(
            campaignEvoCredentials.url,
            campaignEvoCredentials.apiKey,
            numberData.instance_name,
            3 // 3 retries for this critical check
          );

          if (liveConnected) {
            // Self-heal: DB was wrong, instance IS connected. Fix the flag and continue.
            console.log(`✅ LIVE CHECK PASSED — ${numberData.instance_name} is actually connected! Self-healing DB flag...`);
            await supabase.from('whatsapp_numbers').update({
              is_connected: true,
              updated_at: new Date().toISOString()
            }).eq('id', numberData.id);
            // Continue processing — don't pause
          } else {
            // Truly disconnected — pause campaign
            console.log(`❌ LIVE CHECK CONFIRMED — ${numberData.instance_name} is truly disconnected. Pausing campaign ${campaign.id}`);
            await supabase.from('whatsapp_campaigns').update({
              status: 'paused',
              pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
              updated_at: now.toISOString()
            }).eq('id', campaign.id);
            continue;
          }
        }

        // Only do live connection check every 10 messages to reduce false positives
        const currentIndex = campaign.current_lead_index || 0;
        const shouldCheckLive = currentIndex === 0 || currentIndex % 10 === 0;
        
        if (shouldCheckLive) {
          const isConnectedNow = await checkInstanceConnection(
            campaignEvoCredentials.url,
            campaignEvoCredentials.apiKey,
            numberData.instance_name,
            2
          );

          if (!isConnectedNow) {
            // Soft-fail: avoid pausing on potentially transient provider checks.
            // The real source of truth is the send attempt below (already has retry logic).
            console.log(`⚠️ Live check reported disconnected for ${numberData.instance_name}, but processor will still attempt send before pausing.`);
          }
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
      // Delete across ALL campaigns for this user+phone (response means they're active)
      const { data: deletedRows, error: deleteError } = await supabase.from('ignored_contacts')
        .delete()
        .eq('user_id', userId)
        .eq('phone', normalizedPhone)
        .select('id');
      
      console.log(`🗑️ Removed from ignored list:`, { success: !deleteError, deletedCount: deletedRows?.length || 0, error: deleteError?.message });

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
    // BUG fix: mark any open heartbeat as failed so monitoring doesn't show
    // a permanently "running" processor when an unhandled error happens.
    try {
      await supabase
        .from('campaign_processor_heartbeats')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('status', 'running')
        .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
