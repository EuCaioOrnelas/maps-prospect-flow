import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  name: string;
  phone?: string;
  telefone?: string;
}

interface CampaignRequest {
  campaignId: string;
  numberId: string;
  instanceName: string;
  leads: Lead[];
  messages: string[];
  delaySecondsMin: number;
  delaySecondsMax: number;
  startIndex?: number; // For resuming from specific index
}

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Check if instance is connected
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    console.log(`Verifying connection for instance: ${instanceName}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Evolution API status check error:', errorText);
      return { connected: false, error: `API error: ${errorText}` };
    }

    const statusData = await statusResponse.json();
    console.log('Connection status:', JSON.stringify(statusData));

    const isConnected = statusData.state === 'open' || statusData.instance?.state === 'open';
    
    if (!isConnected) {
      return { 
        connected: false, 
        error: `Instance not connected. State: ${statusData.state || statusData.instance?.state || 'unknown'}` 
      };
    }

    return { connected: true };
  } catch (error) {
    console.error('Error checking connection:', error);
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { 
      campaignId, 
      numberId, 
      instanceName, 
      leads, 
      messages, 
      delaySecondsMin, 
      delaySecondsMax,
      startIndex = 0 
    }: CampaignRequest = await req.json();

    console.log(`Starting campaign ${campaignId} from index ${startIndex} with ${leads.length} total leads`);

    // Check connection before starting
    const connectionCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    
    if (!connectionCheck.connected) {
      console.log(`Instance ${instanceName} not connected. Failing campaign.`);
      
      await supabase
        .from('whatsapp_numbers')
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq('id', numberId)
        .eq('user_id', user.id);

      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'failed',
          pause_reason: `Número WhatsApp desconectado: ${connectionCheck.error}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp não está conectado. Reconecte antes de iniciar.',
        needsReconnect: true,
        connectionError: connectionCheck.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update campaign status to running
    await supabase
      .from('whatsapp_campaigns')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // BATCH SIZE - Process this many before re-invoking to avoid timeout
    const BATCH_SIZE = 5;
    const userId = user.id;

    // Background task to run the campaign batch
    const runCampaignBatch = async () => {
      const getRandomDelay = () => {
        return Math.floor(Math.random() * (delaySecondsMax - delaySecondsMin + 1)) + delaySecondsMin;
      };

      // Get current campaign data
      const { data: campaignData } = await supabase
        .from('whatsapp_campaigns')
        .select('status, sent_count, failed_count')
        .eq('id', campaignId)
        .single();

      if (!campaignData || campaignData.status === 'cancelled' || campaignData.status === 'completed') {
        console.log(`Campaign ${campaignId} is ${campaignData?.status || 'not found'}, stopping.`);
        return;
      }

      let sentCount = campaignData.sent_count || 0;
      let failedCount = campaignData.failed_count || 0;

      // Get daily count
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('daily_sent_count, last_sent_at')
        .eq('id', numberId)
        .single();

      const today = new Date().toDateString();
      const lastSentDate = numberData?.last_sent_at ? new Date(numberData.last_sent_at).toDateString() : null;
      let dailySentCount = lastSentDate === today ? (numberData?.daily_sent_count || 0) : 0;
      const DAILY_LIMIT = 200;

      const endIndex = Math.min(startIndex + BATCH_SIZE, leads.length);
      console.log(`Processing batch from ${startIndex} to ${endIndex - 1}`);

      for (let i = startIndex; i < endIndex; i++) {
        // Check if campaign was cancelled/paused
        const { data: statusCheck } = await supabase
          .from('whatsapp_campaigns')
          .select('status')
          .eq('id', campaignId)
          .single();

        if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
          console.log(`Campaign ${campaignId} status changed to ${statusCheck?.status}, stopping batch.`);
          return;
        }

        // Check daily limit
        if (dailySentCount >= DAILY_LIMIT) {
          console.log('Daily limit reached, pausing campaign');
          
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
              failed_count: failedCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

          return;
        }

        // Wait BEFORE sending (anti-ban)
        const randomDelay = getRandomDelay();
        console.log(`Waiting ${randomDelay}s before message ${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));

        const lead = leads[i];
        const phone = lead.phone || lead.telefone;
        
        if (!phone) {
          console.log(`Lead ${lead.name} has no phone, skipping`);
          failedCount++;
          continue;
        }

        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
          formattedPhone = '55' + formattedPhone;
        }

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const personalizedMessage = randomMessage
          .replace(/\{nome\}/gi, lead.name || 'Cliente')
          .replace(/\{empresa\}/gi, lead.name || 'Empresa');

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const sendResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY!,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: personalizedMessage,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (sendResponse.ok) {
            const sendResult = await sendResponse.json();
            sentCount++;
            dailySentCount++;
            console.log(`Message sent to ${formattedPhone} (${sentCount}/${leads.length})`);

            // Sync to chat
            try {
              const remoteJid = `${formattedPhone}@s.whatsapp.net`;
              
              const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('whatsapp_number_id', numberId)
                .eq('remote_jid', remoteJid)
                .single();

              let conversationId: string | undefined;

              if (existingConv) {
                conversationId = existingConv.id;
              } else {
                const { data: existingContact } = await supabase
                  .from('contacts')
                  .select('id, name')
                  .eq('user_id', userId)
                  .eq('phone', formattedPhone)
                  .single();

                const { data: newConv } = await supabase
                  .from('conversations')
                  .insert({
                    user_id: userId,
                    whatsapp_number_id: numberId,
                    contact_id: existingContact?.id || null,
                    remote_jid: remoteJid,
                    phone: formattedPhone,
                    contact_name: existingContact?.name || lead.name || null,
                  })
                  .select('id')
                  .single();

                if (newConv) {
                  conversationId = newConv.id;
                }
              }

              if (conversationId) {
                const messageId = sendResult?.key?.id || `campaign_${campaignId}_${Date.now()}`;
                
                await supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    message_id: messageId,
                    remote_jid: remoteJid,
                    from_me: true,
                    message_type: 'text',
                    content: personalizedMessage,
                    status: 'sent',
                  });

                await supabase
                  .from('conversations')
                  .update({
                    last_message: personalizedMessage.substring(0, 100),
                    last_message_at: new Date().toISOString(),
                  })
                  .eq('id', conversationId);
              }
            } catch (syncError) {
              console.error('Error syncing message:', syncError);
            }
          } else {
            const errorText = await sendResponse.text();
            console.error(`Failed to send to ${formattedPhone}:`, errorText);
            failedCount++;
          }
        } catch (sendError) {
          console.error(`Error sending to ${formattedPhone}:`, sendError);
          failedCount++;
        }

        // Update progress after each message
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        await supabase
          .from('whatsapp_numbers')
          .update({ 
            daily_sent_count: dailySentCount,
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId);
      }

      // Check if there are more leads to process
      if (endIndex < leads.length) {
        // More leads to process - update and let start-scheduled-campaigns pick it up
        // Or re-invoke this function (but that's complex with auth)
        // For now, mark as running and rely on resume mechanism
        console.log(`Batch complete. ${leads.length - endIndex} leads remaining.`);
        
        // Self-invoke next batch
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          // Create a new service role client to invoke the next batch
          const serviceClient = createClient(supabaseUrl!, serviceKey!);
          
          // Get user's token to invoke function
          // Since we're in background, we'll use service role directly
          const response = await fetch(`${supabaseUrl}/functions/v1/evolution-run-campaign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              campaignId,
              numberId,
              instanceName,
              leads,
              messages,
              delaySecondsMin,
              delaySecondsMax,
              startIndex: endIndex
            })
          });

          if (!response.ok) {
            console.error('Failed to invoke next batch:', await response.text());
          } else {
            console.log('Next batch invoked successfully');
          }
        } catch (invokeError) {
          console.error('Error invoking next batch:', invokeError);
          // Mark campaign as needing resume
          await supabase
            .from('whatsapp_campaigns')
            .update({ 
              pause_reason: `Continuar do lead ${endIndex + 1}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);
        }
      } else {
        // Campaign completed
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
      }
    };

    // Start batch in background
    EdgeRuntime.waitUntil(runCampaignBatch());

    return new Response(JSON.stringify({
      success: true,
      message: 'Campaign batch started',
      campaignId,
      startIndex
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-run-campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
