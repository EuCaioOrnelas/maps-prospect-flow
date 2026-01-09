import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT_PER_NUMBER = 200;

interface Lead {
  name: string;
  phone?: string;
  telefone?: string;
}

// Normalize phone number
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  return normalized;
}

// Check if we should reset daily count (reset at midnight)
function shouldResetDailyCount(lastSentAt: string | null): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt);
  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  return lastSent < todayMidnight;
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
  const isToday = new Date().toISOString().split('T')[0] === dateStr;
  
  let usedToday = 0;
  
  if (isToday) {
    const { data: numberData } = await supabase
      .from('whatsapp_numbers')
      .select('daily_sent_count, last_sent_at')
      .eq('id', numberId)
      .single();
    
    if (numberData) {
      // Reset if last sent was before midnight
      if (shouldResetDailyCount(numberData.last_sent_at)) {
        usedToday = 0;
        // Reset in database too
        await supabase.from('whatsapp_numbers').update({ 
          daily_sent_count: 0 
        }).eq('id', numberId);
      } else {
        usedToday = numberData.daily_sent_count || 0;
      }
    }
  }
  
  // Get reserved count for this date from scheduled campaigns
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
): Promise<{ processed: boolean; completed: boolean; error?: string }> {
  
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
    return { processed: false, completed: false, error: 'Invalid campaign data' };
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

    // Remove any reservations
    await supabase.from('campaign_daily_reservations')
      .delete()
      .eq('campaign_id', campaign.id);

    console.log(`✓ Campaign ${campaign.id} completed: ${sentCount} sent, ${failedCount} failed`);
    return { processed: false, completed: true };
  }

  // Get and check daily count
  let dailySentCount = numberData.daily_sent_count || 0;
  
  // Reset if last sent was before midnight
  if (shouldResetDailyCount(numberData.last_sent_at)) {
    dailySentCount = 0;
    await supabase.from('whatsapp_numbers').update({ 
      daily_sent_count: 0 
    }).eq('id', numberData.id);
  }

  // Check daily limit
  if (dailySentCount >= DAILY_LIMIT_PER_NUMBER) {
    console.log(`Daily limit reached for number ${numberData.id}`);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await supabase.from('whatsapp_campaigns').update({
      status: 'paused',
      pause_reason: 'daily_limit',
      paused_at_limit: true,
      resume_at: tomorrow.toISOString(),
      current_lead_index: currentIndex,
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);

    return { processed: false, completed: false, error: 'Daily limit reached' };
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
      return { processed: false, completed: false };
    }
  }

  // Get the lead to process
  const lead = leads[currentIndex];
  const phone = lead?.phone || lead?.telefone;
  
  if (!phone) {
    // Skip invalid lead
    failedCount++;
    await supabase.from('whatsapp_campaigns').update({
      current_lead_index: currentIndex + 1,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);
    
    return { processed: true, completed: false };
  }

  const formattedPhone = normalizePhone(phone);

  // Select ONE random message (never send multiple to same lead)
  const randomMessage = validMessages[Math.floor(Math.random() * validMessages.length)];
  const personalizedMessage = randomMessage
    .replace(/\{nome\}/gi, lead.name || 'Cliente')
    .replace(/\{empresa\}/gi, lead.name || 'Empresa');

  // Apply smart delay before sending
  const delayMin = campaign.delay_seconds || 40;
  const delayMax = campaign.delay_seconds_max || 60;
  const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
  
  console.log(`Waiting ${delay}s before message ${currentIndex + 1}/${leads.length}`);
  await new Promise(resolve => setTimeout(resolve, delay * 1000));

  // Re-check campaign status (might have been cancelled during delay)
  const { data: statusCheck } = await supabase
    .from('whatsapp_campaigns')
    .select('status')
    .eq('id', campaign.id)
    .single();

  if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
    console.log(`Campaign ${campaign.id} status changed to ${statusCheck?.status}`);
    return { processed: false, completed: false };
  }

  // Send the message
  const result = await sendMessage(
    evolutionUrl,
    evolutionApiKey,
    numberData.instance_name,
    formattedPhone,
    personalizedMessage
  );

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
          last_message_at: new Date().toISOString(),
        }).eq('id', conversationId);
      }
    } catch (syncError) {
      console.error('Sync error:', syncError);
    }
  } else {
    console.error(`✗ Failed to send to ${formattedPhone}:`, result.error);
    failedCount++;
  }

  // Update campaign progress
  await supabase.from('whatsapp_campaigns').update({
    current_lead_index: currentIndex + 1,
    sent_count: sentCount,
    failed_count: failedCount,
    updated_at: new Date().toISOString()
  }).eq('id', campaign.id);

  // Update number daily count
  await supabase.from('whatsapp_numbers').update({
    daily_sent_count: dailySentCount,
    last_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', numberData.id);

  // Check if now completed
  if (currentIndex + 1 >= leads.length) {
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
    return { processed: true, completed: true };
  }

  return { processed: true, completed: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { campaignId, action } = body;

    // Action: start - Create/update campaign to running status
    if (action === 'start') {
      if (!campaignId) {
        return new Response(JSON.stringify({ error: 'campaignId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get campaign
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

      // Get WhatsApp number
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (!numberData?.instance_name) {
        await supabase.from('whatsapp_campaigns').update({
          status: 'failed',
          pause_reason: 'Número WhatsApp não encontrado ou sem instância configurada'
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ error: 'WhatsApp number not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check connection
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
          pause_reason: 'WhatsApp desconectado - reconecte para continuar'
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'WhatsApp disconnected' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update status to running
      await supabase.from('whatsapp_campaigns').update({
        status: 'running',
        started_at: campaign.started_at || new Date().toISOString(),
        pause_reason: null,
        updated_at: new Date().toISOString()
      }).eq('id', campaignId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Campaign started - cron will process messages'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: process - Called by cron to process running campaigns (ONE message at a time)
    if (action === 'process') {
      const now = new Date();
      const heartbeatId = crypto.randomUUID();
      
      // Log heartbeat start
      await supabase.from('campaign_processor_heartbeats').insert({
        id: heartbeatId,
        action: 'process',
        status: 'running',
        started_at: now.toISOString()
      });
      
      // Find campaigns that need processing
      const { data: runningCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'running')
        .order('updated_at', { ascending: true })
        .limit(5);

      // Find scheduled campaigns that should start
      const { data: scheduledCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, scheduled_at, whatsapp_number_id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString());

      // Find paused campaigns that should resume (smart pause or daily limit)
      const { data: pausedCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'paused')
        .not('resume_at', 'is', null)
        .lte('resume_at', now.toISOString());

      let messagesProcessed = 0;
      let campaignsProcessed = 0;

      // Start scheduled campaigns
      for (const scheduled of (scheduledCampaigns || [])) {
        console.log(`Starting scheduled campaign: ${scheduled.name}`);
        
        // Remove reservation
        await supabase.from('campaign_daily_reservations')
          .delete()
          .eq('campaign_id', scheduled.id);

        // Update to running
        await supabase.from('whatsapp_campaigns').update({
          status: 'running',
          started_at: new Date().toISOString(),
          scheduled_at: null,
          updated_at: new Date().toISOString()
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
          updated_at: new Date().toISOString()
        }).eq('id', paused.id);
        
        campaignsProcessed++;
      }

      // Process running campaigns (send one message each)
      for (const campaign of (runningCampaigns || [])) {
        // Get number data
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

        // Check if connected
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
          }).eq('id', campaign.id);
          continue;
        }

        // Process ONE message for this campaign
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
        campaignsProcessed++;
      }

      // Update heartbeat
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
        scheduledStarted: scheduledCampaigns?.length || 0,
        pausedResumed: pausedCampaigns?.length || 0
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

      const date = targetDate ? new Date(targetDate) : new Date();
      const available = await getAvailableBalance(supabase, numberId, date);

      return new Response(JSON.stringify({ 
        success: true,
        availableBalance: available,
        dailyLimit: DAILY_LIMIT_PER_NUMBER,
        date: date.toISOString().split('T')[0]
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
