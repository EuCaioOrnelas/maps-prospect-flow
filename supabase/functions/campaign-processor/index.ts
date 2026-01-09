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
  // Convert back to UTC
  return new Date(spMidnight.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));
}

// Check if we should reset daily count (reset at midnight São Paulo time)
function shouldResetDailyCount(lastSentAt: string | null): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt);
  const spMidnightUTC = getSaoPauloMidnightUTC();
  return lastSent < spMidnightUTC;
}

// Check if enough time has passed since last message (respects configured delay)
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

// Normalize phone number
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  return normalized;
}

// Check if instance is connected
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    return data.state === 'open' || data.instance?.state === 'open';
  } catch {
    return false;
  }
}

// Send a single message
async function sendMessage(
  evolutionUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

// Process a single campaign - send ONE message and return
async function processSingleMessage(
  supabase: any,
  evolutionUrl: string,
  evolutionApiKey: string,
  campaign: any,
  numberData: any
): Promise<{ processed: boolean; completed: boolean; skipped: boolean; error?: string }> {
  
  // Check if enough time has passed since last message (respect delay settings)
  const delayMin = campaign.delay_seconds || 40;
  const delayMax = campaign.delay_seconds_max || 60;
  const requiredDelay = getRandomDelay(delayMin, delayMax);
  
  if (!canSendNextMessage(campaign.last_message_sent_at, requiredDelay)) {
    const elapsed = campaign.last_message_sent_at 
      ? Math.floor((Date.now() - new Date(campaign.last_message_sent_at).getTime()) / 1000)
      : 0;
    console.log(`Campaign ${campaign.id}: waiting for delay (${elapsed}s/${requiredDelay}s)`);
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
    return { processed: false, completed: false, skipped: false, error: 'Invalid campaign data' };
  }

  const currentIndex = campaign.current_lead_index || 0;
  let sentCount = campaign.sent_count || 0;
  let failedCount = campaign.failed_count || 0;
  
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

    console.log(`✓ Campaign ${campaign.id} completed: ${sentCount} sent, ${failedCount} failed`);
    return { processed: false, completed: true, skipped: false };
  }

  // Get and check daily count
  let dailySentCount = numberData.daily_sent_count || 0;
  
  if (shouldResetDailyCount(numberData.last_sent_at)) {
    dailySentCount = 0;
    await supabase.from('whatsapp_numbers').update({ 
      daily_sent_count: 0 
    }).eq('id', numberData.id);
  }

  // Check daily limit
  if (dailySentCount >= DAILY_LIMIT_PER_NUMBER) {
    console.log(`Daily limit reached for number ${numberData.id}`);
    
    // Get tomorrow midnight in São Paulo
    const spNow = getSaoPauloTime();
    const spTomorrow = new Date(spNow);
    spTomorrow.setDate(spTomorrow.getDate() + 1);
    spTomorrow.setHours(0, 0, 0, 0);
    // Convert to UTC
    const tomorrowUTC = new Date(spTomorrow.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));

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
      
      await supabase.from('whatsapp_campaigns').update({
        status: 'paused',
        pause_reason: 'smart_pause',
        resume_at: resumeAt,
        updated_at: new Date().toISOString()
      }).eq('id', campaign.id);
      
      console.log(`Smart pause activated for campaign ${campaign.id}, resume at ${resumeAt}`);
      return { processed: false, completed: false, skipped: false };
    }
  }

  // Get the lead to process
  const lead = leads[currentIndex];
  const phone = lead?.phone || lead?.telefone;
  
  if (!phone) {
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

  // Select ONE random message
  const randomMessage = validMessages[Math.floor(Math.random() * validMessages.length)];
  const personalizedMessage = randomMessage
    .replace(/\{nome\}/gi, lead.name || 'Cliente')
    .replace(/\{empresa\}/gi, lead.name || 'Empresa');

  console.log(`Processing message ${currentIndex + 1}/${leads.length} to ${formattedPhone}`);

  // Re-check campaign status
  const { data: statusCheck } = await supabase
    .from('whatsapp_campaigns')
    .select('status')
    .eq('id', campaign.id)
    .single();

  if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
    console.log(`Campaign ${campaign.id} status changed to ${statusCheck?.status}`);
    return { processed: false, completed: false, skipped: false };
  }

  // Send the message
  const result = await sendMessage(
    evolutionUrl,
    evolutionApiKey,
    numberData.instance_name,
    formattedPhone,
    personalizedMessage
  );

  const now = new Date().toISOString();

  if (result.success) {
    sentCount++;
    dailySentCount++;
    console.log(`✓ Sent to ${formattedPhone} (${sentCount}/${leads.length})`);

    // Sync to chat
    try {
      const remoteJid = `${formattedPhone}@s.whatsapp.net`;
      
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('whatsapp_number_id', numberData.id)
        .eq('remote_jid', remoteJid)
        .single();

      let conversationId = existingConv?.id;
      
      if (!conversationId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            user_id: campaign.user_id,
            whatsapp_number_id: numberData.id,
            remote_jid: remoteJid,
            phone: formattedPhone,
            contact_name: lead.name || null,
          })
          .select('id')
          .single();
        
        conversationId = newConv?.id;
      }

      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: campaign.user_id,
          message_id: result.messageId || `campaign_${campaign.id}_${currentIndex}_${Date.now()}`,
          remote_jid: remoteJid,
          from_me: true,
          message_type: 'text',
          content: personalizedMessage,
          status: 'sent',
        });

        await supabase.from('conversations').update({
          last_message: personalizedMessage.substring(0, 100),
          last_message_at: now,
        }).eq('id', conversationId);
      }
    } catch (syncError) {
      console.error('Sync error:', syncError);
    }
  } else {
    console.error(`✗ Failed to send to ${formattedPhone}:`, result.error);
    failedCount++;
  }

  // Update campaign progress with last_message_sent_at
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

    console.log(`✓ Campaign ${campaign.id} completed: ${sentCount} sent, ${failedCount} failed`);
    return { processed: true, completed: true, skipped: false };
  }

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

    // Action: process - Called by cron every 30 seconds
    if (action === 'process') {
      const now = new Date();
      const spNow = getSaoPauloTime();
      const heartbeatId = crypto.randomUUID();
      
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

      // Find scheduled campaigns that should start (using São Paulo time)
      const { data: scheduledCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, scheduled_at, whatsapp_number_id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString());

      // Find paused campaigns that should resume
      const { data: pausedCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'paused')
        .not('resume_at', 'is', null)
        .lte('resume_at', now.toISOString());

      let messagesProcessed = 0;
      let campaignsProcessed = 0;
      let skippedDueToDelay = 0;

      // Start scheduled campaigns
      for (const scheduled of (scheduledCampaigns || [])) {
        console.log(`Starting scheduled campaign: ${scheduled.name} (SP time: ${spNow.toISOString()})`);
        
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
        console.log(`Resuming paused campaign: ${paused.name}`);
        
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

        const isConnected = await checkInstanceConnection(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          numberData.instance_name
        );

        if (!isConnected) {
          await supabase.from('whatsapp_numbers').update({
            is_connected: false,
            updated_at: now.toISOString()
          }).eq('id', numberData.id);

          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'WhatsApp desconectado'
          }).eq('id', campaign.id);
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
