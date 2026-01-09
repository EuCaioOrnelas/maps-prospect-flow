import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT_PER_NUMBER = 200;
const MAX_MESSAGES_PER_BATCH = 50; // Process up to 50 messages then re-invoke self

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

// Get available daily balance for a number on a specific date
async function getAvailableBalance(
  supabase: any,
  numberId: string,
  targetDate: Date
): Promise<number> {
  const dateStr = targetDate.toISOString().split('T')[0];
  const isToday = new Date().toISOString().split('T')[0] === dateStr;
  
  let usedToday = 0;
  
  if (isToday) {
    // For today, check actual daily_sent_count
    const { data: numberData } = await supabase
      .from('whatsapp_numbers')
      .select('daily_sent_count, last_sent_at')
      .eq('id', numberId)
      .single();
    
    if (numberData) {
      const today = new Date().toDateString();
      const lastSentDate = numberData.last_sent_at 
        ? new Date(numberData.last_sent_at).toDateString() 
        : null;
      usedToday = lastSentDate === today ? (numberData.daily_sent_count || 0) : 0;
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

    // Action: start - Start a new campaign or resume existing
    if (action === 'start' || action === 'resume') {
      if (!campaignId) {
        return new Response(JSON.stringify({ error: 'campaignId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get campaign data
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

      // Check if already completed/cancelled
      if (campaign.status === 'completed' || campaign.status === 'cancelled') {
        return new Response(JSON.stringify({ 
          success: false, 
          message: `Campaign already ${campaign.status}` 
        }), {
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
          error: 'WhatsApp disconnected',
          needsReconnect: true 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        await supabase.from('whatsapp_campaigns').update({
          status: 'failed',
          pause_reason: 'Dados da campanha inválidos'
        }).eq('id', campaignId);

        return new Response(JSON.stringify({ error: 'Invalid campaign data' }), {
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

      // Get current progress
      let currentIndex = campaign.current_lead_index || 0;
      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      
      // Get daily count
      const today = new Date().toDateString();
      const lastSentDate = numberData.last_sent_at 
        ? new Date(numberData.last_sent_at).toDateString() 
        : null;
      let dailySentCount = lastSentDate === today 
        ? (numberData.daily_sent_count || 0) 
        : 0;

      // Track messaged phones to prevent duplicates
      const messagedPhones = new Set<string>();
      
      // Pre-load already processed phones
      for (let i = 0; i < currentIndex; i++) {
        const lead = leads[i];
        const phone = lead?.phone || lead?.telefone;
        if (phone) messagedPhones.add(normalizePhone(phone));
      }

      const delayMin = campaign.delay_seconds || 40;
      const delayMax = campaign.delay_seconds_max || 60;
      
      let processedInBatch = 0;

      // Process leads
      for (let i = currentIndex; i < leads.length && processedInBatch < MAX_MESSAGES_PER_BATCH; i++) {
        // Check if campaign was cancelled/paused
        if (processedInBatch % 5 === 0 && processedInBatch > 0) {
          const { data: statusCheck } = await supabase
            .from('whatsapp_campaigns')
            .select('status')
            .eq('id', campaignId)
            .single();

          if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
            console.log(`Campaign ${campaignId} status changed to ${statusCheck?.status}`);
            return new Response(JSON.stringify({ 
              success: true, 
              message: `Campaign ${statusCheck?.status}`,
              processed: processedInBatch
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Check daily limit
        if (dailySentCount >= DAILY_LIMIT_PER_NUMBER) {
          console.log(`Daily limit reached for number ${numberData.id}`);
          
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(8, 0, 0, 0);

          await supabase.from('whatsapp_campaigns').update({
            status: 'paused',
            pause_reason: 'daily_limit',
            paused_at_limit: true,
            resume_at: tomorrow.toISOString(),
            current_lead_index: i,
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          }).eq('id', campaignId);

          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Daily limit reached',
            paused: true,
            resumeAt: tomorrow.toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const lead = leads[i];
        const phone = lead.phone || lead.telefone;
        
        if (!phone) {
          failedCount++;
          currentIndex = i + 1;
          processedInBatch++;
          continue;
        }

        const formattedPhone = normalizePhone(phone);

        // Skip duplicates
        if (messagedPhones.has(formattedPhone)) {
          console.log(`Skipping duplicate phone ${formattedPhone}`);
          failedCount++;
          currentIndex = i + 1;
          processedInBatch++;
          continue;
        }

        // Random delay before sending
        const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
        console.log(`Waiting ${delay}s before message ${i + 1}/${leads.length}`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

        // Select ONE random message
        const randomMessage = validMessages[Math.floor(Math.random() * validMessages.length)];
        const personalizedMessage = randomMessage
          .replace(/\{nome\}/gi, lead.name || 'Cliente')
          .replace(/\{empresa\}/gi, lead.name || 'Empresa');

        // Send message
        const result = await sendMessage(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          numberData.instance_name,
          formattedPhone,
          personalizedMessage
        );

        messagedPhones.add(formattedPhone);
        currentIndex = i + 1;
        processedInBatch++;

        if (result.success) {
          sentCount++;
          dailySentCount++;
          console.log(`✓ Sent to ${formattedPhone} (${sentCount}/${leads.length})`);

          // Sync to chat
          try {
            const remoteJid = `${formattedPhone}@s.whatsapp.net`;
            
            let conversationId: string | undefined;
            
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('whatsapp_number_id', numberData.id)
              .eq('remote_jid', remoteJid)
              .single();

            if (existingConv) {
              conversationId = existingConv.id;
            } else {
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
              
              if (newConv) conversationId = newConv.id;
            }

            if (conversationId) {
              await supabase.from('messages').insert({
                conversation_id: conversationId,
                user_id: campaign.user_id,
                message_id: result.messageId || `campaign_${campaignId}_${i}_${Date.now()}`,
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

        // Update progress periodically
        if (processedInBatch % 3 === 0) {
          await supabase.from('whatsapp_campaigns').update({
            current_lead_index: currentIndex,
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          }).eq('id', campaignId);

          await supabase.from('whatsapp_numbers').update({
            daily_sent_count: dailySentCount,
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', numberData.id);
        }
      }

      // Final update
      await supabase.from('whatsapp_campaigns').update({
        current_lead_index: currentIndex,
        sent_count: sentCount,
        failed_count: failedCount,
        updated_at: new Date().toISOString()
      }).eq('id', campaignId);

      await supabase.from('whatsapp_numbers').update({
        daily_sent_count: dailySentCount,
        last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', numberData.id);

      // Check if campaign is completed
      if (currentIndex >= leads.length) {
        await supabase.from('whatsapp_campaigns').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount
        }).eq('id', campaignId);

        // Remove any reservations for this campaign
        await supabase.from('campaign_daily_reservations')
          .delete()
          .eq('campaign_id', campaignId);

        console.log(`✓ Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

        return new Response(JSON.stringify({ 
          success: true, 
          completed: true,
          sent: sentCount,
          failed: failedCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If we hit the batch limit, need to continue processing
      if (processedInBatch >= MAX_MESSAGES_PER_BATCH && currentIndex < leads.length) {
        console.log(`Batch complete, scheduling continuation from index ${currentIndex}`);
        
        // Self-invoke to continue processing
        const continueUrl = `${SUPABASE_URL}/functions/v1/campaign-processor`;
        
        fetch(continueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ campaignId, action: 'resume' })
        }).catch(err => {
          console.error('Error scheduling continuation:', err);
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Batch complete, continuing...',
          processed: processedInBatch,
          currentIndex,
          remaining: leads.length - currentIndex
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        processed: processedInBatch,
        currentIndex,
        sent: sentCount,
        failed: failedCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check-balance - Check available balance for a number on a date
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

    // Action: process-scheduled - Process scheduled campaigns AND running campaigns that need continuation
    if (action === 'process-scheduled') {
      const now = new Date();
      const heartbeatId = crypto.randomUUID();
      
      // Log heartbeat start
      await supabase.from('campaign_processor_heartbeats').insert({
        id: heartbeatId,
        action: 'process-scheduled',
        status: 'running',
        started_at: now.toISOString()
      });
      
      // Find scheduled campaigns that should start
      const { data: scheduledCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, scheduled_at, whatsapp_number_id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString());

      // Also find running campaigns that need to continue processing
      // These are campaigns that were interrupted by function timeout or just created
      const { data: runningCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, current_lead_index, total_leads, whatsapp_number_id, updated_at')
        .eq('status', 'running');

      // Filter running campaigns that:
      // 1. Haven't been updated in the last 15 seconds (stale - interrupted by timeout)
      // 2. OR have current_lead_index = 0 and sent_count = 0 (newly created, not started yet)
      const staleRunningCampaigns = (runningCampaigns || []).filter(c => {
        const lastUpdate = new Date(c.updated_at).getTime();
        const nowTime = Date.now();
        const staleDuration = 15000; // 15 seconds
        const isStale = (nowTime - lastUpdate) > staleDuration;
        const isNotCompleted = c.current_lead_index < c.total_leads;
        return isStale && isNotCompleted;
      });

      const hasScheduled = scheduledCampaigns && scheduledCampaigns.length > 0;
      const hasStaleRunning = staleRunningCampaigns.length > 0;

      if (!hasScheduled && !hasStaleRunning) {
        // Update heartbeat as completed (no campaigns)
        await supabase.from('campaign_processor_heartbeats').update({
          status: 'completed',
          campaigns_processed: 0,
          completed_at: new Date().toISOString()
        }).eq('id', heartbeatId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'No campaigns to process' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = [];

      // Process scheduled campaigns
      for (const campaign of (scheduledCampaigns || [])) {
        // Remove reservation since campaign is starting
        await supabase.from('campaign_daily_reservations')
          .delete()
          .eq('campaign_id', campaign.id);

        // Start the campaign
        const startUrl = `${SUPABASE_URL}/functions/v1/campaign-processor`;
        
        try {
          await fetch(startUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ campaignId: campaign.id, action: 'start' })
          });
          
          results.push({ id: campaign.id, name: campaign.name, type: 'scheduled', status: 'started' });
        } catch (err) {
          console.error(`Error starting campaign ${campaign.id}:`, err);
          results.push({ id: campaign.id, name: campaign.name, type: 'scheduled', status: 'error' });
        }
      }

      // Resume stale running campaigns
      for (const campaign of staleRunningCampaigns) {
        console.log(`Resuming stale running campaign ${campaign.id} (${campaign.name}) - index ${campaign.current_lead_index}/${campaign.total_leads}`);
        
        const resumeUrl = `${SUPABASE_URL}/functions/v1/campaign-processor`;
        
        try {
          await fetch(resumeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ campaignId: campaign.id, action: 'resume' })
          });
          
          results.push({ id: campaign.id, name: campaign.name, type: 'running', status: 'resumed' });
        } catch (err) {
          console.error(`Error resuming campaign ${campaign.id}:`, err);
          results.push({ id: campaign.id, name: campaign.name, type: 'running', status: 'error' });
        }
      }

      // Update heartbeat as completed
      const totalProcessed = (scheduledCampaigns?.length || 0) + staleRunningCampaigns.length;
      await supabase.from('campaign_processor_heartbeats').update({
        status: 'completed',
        campaigns_processed: totalProcessed,
        completed_at: new Date().toISOString()
      }).eq('id', heartbeatId);

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: resume-paused - Resume campaigns paused due to daily limit
    if (action === 'resume-paused') {
      const heartbeatId = crypto.randomUUID();
      
      // Log heartbeat start
      await supabase.from('campaign_processor_heartbeats').insert({
        id: heartbeatId,
        action: 'resume-paused',
        status: 'running',
        started_at: new Date().toISOString()
      });
      
      const { data: pausedCampaigns } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, whatsapp_number_id, resume_at')
        .eq('status', 'paused')
        .eq('paused_at_limit', true)
        .lte('resume_at', new Date().toISOString());

      if (!pausedCampaigns || pausedCampaigns.length === 0) {
        await supabase.from('campaign_processor_heartbeats').update({
          status: 'completed',
          campaigns_processed: 0,
          completed_at: new Date().toISOString()
        }).eq('id', heartbeatId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'No paused campaigns to resume' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = [];

      for (const campaign of pausedCampaigns) {
        // Reset daily count for the number
        await supabase.from('whatsapp_numbers').update({
          daily_sent_count: 0,
          updated_at: new Date().toISOString()
        }).eq('id', campaign.whatsapp_number_id);

        // Start the campaign
        const startUrl = `${SUPABASE_URL}/functions/v1/campaign-processor`;
        
        try {
          await fetch(startUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ campaignId: campaign.id, action: 'resume' })
          });
          
          results.push({ id: campaign.id, name: campaign.name, status: 'resumed' });
        } catch (err) {
          console.error(`Error resuming campaign ${campaign.id}:`, err);
          results.push({ id: campaign.id, name: campaign.name, status: 'error' });
        }
      }

      // Update heartbeat
      await supabase.from('campaign_processor_heartbeats').update({
        status: 'completed',
        campaigns_processed: pausedCampaigns.length,
        completed_at: new Date().toISOString()
      }).eq('id', heartbeatId);

      return new Response(JSON.stringify({ success: true, results }), {
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
