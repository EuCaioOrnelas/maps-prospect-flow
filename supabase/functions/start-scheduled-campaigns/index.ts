import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if instance is connected
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!statusResponse.ok) {
      return { connected: false, error: 'API error' };
    }

    const statusData = await statusResponse.json();
    const isConnected = statusData.state === 'open' || statusData.instance?.state === 'open';
    
    return { connected: isConnected, error: isConnected ? undefined : 'Not connected' };
  } catch (error) {
    return { connected: false, error: 'Connection check failed' };
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
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[start-scheduled-campaigns] Started at:', new Date().toISOString());

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // Find scheduled campaigns that should start now
    const { data: scheduledCampaigns, error: fetchError } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        id, 
        name, 
        user_id, 
        whatsapp_number_id,
        leads,
        messages,
        delay_seconds,
        scheduled_at,
        sent_count,
        failed_count,
        total_leads
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('[start-scheduled-campaigns] Fetch error:', fetchError);
      throw fetchError;
    }

    // Also find running campaigns that may need to continue (from batches)
    const { data: runningCampaigns } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        id, 
        name, 
        user_id, 
        whatsapp_number_id,
        leads,
        messages,
        delay_seconds,
        scheduled_at,
        sent_count,
        failed_count,
        total_leads
      `)
      .eq('status', 'running');

    console.log(`[start-scheduled-campaigns] Found ${scheduledCampaigns?.length || 0} scheduled, ${runningCampaigns?.length || 0} running`);

    const allCampaigns = [...(scheduledCampaigns || []), ...(runningCampaigns || [])];

    if (allCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns to process', processedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    for (const campaign of allCampaigns) {
      const isScheduled = campaign.scheduled_at !== undefined;
      console.log(`[start-scheduled-campaigns] Processing: ${campaign.name} (${campaign.id})`);
      
      // Get the WhatsApp number
      const { data: numberData, error: numberError } = await supabase
        .from('whatsapp_numbers')
        .select('id, instance_name, is_connected, daily_sent_count, last_sent_at')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (numberError || !numberData) {
        console.error(`[start-scheduled-campaigns] Number not found for ${campaign.id}`);
        
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'failed', pause_reason: 'Número WhatsApp não encontrado' })
          .eq('id', campaign.id);
        
        results.push({ id: campaign.id, status: 'failed', reason: 'Number not found' });
        continue;
      }

      // Check connection via Evolution API
      const connectionCheck = await checkInstanceConnection(
        EVOLUTION_API_URL, 
        EVOLUTION_API_KEY, 
        numberData.instance_name
      );

      if (!connectionCheck.connected) {
        console.log(`[start-scheduled-campaigns] Instance ${numberData.instance_name} not connected`);
        
        await supabase
          .from('whatsapp_numbers')
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .eq('id', numberData.id);

        if (isScheduled) {
          await supabase
            .from('whatsapp_campaigns')
            .update({ pause_reason: 'WhatsApp desconectado - reconecte para iniciar' })
            .eq('id', campaign.id);
        } else {
          await supabase
            .from('whatsapp_campaigns')
            .update({ status: 'paused', pause_reason: 'Conexão perdida - reconecte o WhatsApp' })
            .eq('id', campaign.id);
        }
        
        results.push({ id: campaign.id, status: 'pending_connection' });
        continue;
      }

      // Check daily limit
      const DAILY_LIMIT = 200;
      const today = new Date().toDateString();
      const lastSentDate = numberData.last_sent_at ? new Date(numberData.last_sent_at).toDateString() : null;
      let dailySentCount = lastSentDate === today ? (numberData.daily_sent_count || 0) : 0;

      if (dailySentCount >= DAILY_LIMIT) {
        console.log(`[start-scheduled-campaigns] Daily limit reached for ${numberData.instance_name}`);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'paused',
            pause_reason: 'daily_limit',
            paused_at_limit: true,
            resume_at: tomorrow.toISOString()
          })
          .eq('id', campaign.id);
        
        results.push({ id: campaign.id, status: 'paused', reason: 'Daily limit' });
        continue;
      }

      // Parse leads and messages
      let leads = campaign.leads;
      if (typeof leads === 'string') {
        try { leads = JSON.parse(leads); } catch { leads = []; }
      }
      
      let messages = campaign.messages;
      if (typeof messages === 'string') {
        try { messages = JSON.parse(messages); } catch { messages = []; }
      }

      const validMessages = Array.isArray(messages) ? messages.filter((m: string) => m?.trim()) : [];

      if (!Array.isArray(leads) || leads.length === 0 || validMessages.length === 0) {
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'failed', pause_reason: 'Dados inválidos' })
          .eq('id', campaign.id);
        
        results.push({ id: campaign.id, status: 'failed', reason: 'Invalid data' });
        continue;
      }

      // Start the campaign if scheduled
      if (isScheduled) {
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'running',
            started_at: now,
            pause_reason: null
          })
          .eq('id', campaign.id);
      }

      // Process up to 3 messages per cron run (to stay under time limits)
      const MESSAGES_PER_RUN = 3;
      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      const startIndex = sentCount + failedCount;

      for (let i = startIndex; i < Math.min(startIndex + MESSAGES_PER_RUN, leads.length); i++) {
        // Recheck if campaign was cancelled
        const { data: statusCheck } = await supabase
          .from('whatsapp_campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single();

        if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
          console.log(`[start-scheduled-campaigns] Campaign ${campaign.id} was ${statusCheck?.status}`);
          break;
        }

        if (dailySentCount >= DAILY_LIMIT) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(8, 0, 0, 0);

          await supabase
            .from('whatsapp_campaigns')
            .update({ 
              status: 'paused',
              pause_reason: 'daily_limit',
              paused_at_limit: true,
              resume_at: tomorrow.toISOString(),
              sent_count: sentCount,
              failed_count: failedCount
            })
            .eq('id', campaign.id);
          break;
        }

        const lead = leads[i];
        const phone = lead.phone || lead.telefone;
        
        if (!phone) {
          failedCount++;
          continue;
        }

        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
          formattedPhone = '55' + formattedPhone;
        }

        const randomMessage = validMessages[Math.floor(Math.random() * validMessages.length)];
        const personalizedMessage = randomMessage
          .replace(/\{nome\}/gi, lead.name || 'Cliente')
          .replace(/\{empresa\}/gi, lead.name || 'Empresa');

        // Random delay 40-60s
        const delay = Math.floor(Math.random() * 21) + (campaign.delay_seconds || 40);
        console.log(`[start-scheduled-campaigns] Waiting ${delay}s before sending to ${formattedPhone}`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

        const sendResult = await sendMessage(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          numberData.instance_name,
          formattedPhone,
          personalizedMessage
        );

        if (sendResult.success) {
          sentCount++;
          dailySentCount++;
          console.log(`[start-scheduled-campaigns] Sent to ${formattedPhone} (${sentCount}/${leads.length})`);

          // Sync to chat
          try {
            const remoteJid = `${formattedPhone}@s.whatsapp.net`;
            
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('whatsapp_number_id', numberData.id)
              .eq('remote_jid', remoteJid)
              .single();

            let conversationId: string | undefined;

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
                message_id: sendResult.messageId || `cron_${campaign.id}_${Date.now()}`,
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
            console.error('[start-scheduled-campaigns] Sync error:', syncError);
          }
        } else {
          console.error(`[start-scheduled-campaigns] Failed to send to ${formattedPhone}:`, sendResult.error);
          failedCount++;
        }

        // Update progress
        await supabase
          .from('whatsapp_campaigns')
          .update({ sent_count: sentCount, failed_count: failedCount, updated_at: new Date().toISOString() })
          .eq('id', campaign.id);

        await supabase
          .from('whatsapp_numbers')
          .update({ daily_sent_count: dailySentCount, last_sent_at: new Date().toISOString() })
          .eq('id', numberData.id);
      }

      // Check if completed
      if (sentCount + failedCount >= leads.length) {
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            sent_count: sentCount,
            failed_count: failedCount
          })
          .eq('id', campaign.id);
        
        results.push({ id: campaign.id, status: 'completed', sent: sentCount, failed: failedCount });
      } else {
        results.push({ id: campaign.id, status: 'in_progress', sent: sentCount, remaining: leads.length - sentCount - failedCount });
      }
    }

    console.log('[start-scheduled-campaigns] Results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[start-scheduled-campaigns] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
