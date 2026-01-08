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
  startIndex?: number;
}

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Track active campaigns to prevent duplicate runs
const activeCampaignLocks = new Set<string>();

// Normalize phone number to prevent duplicates
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

    // CRITICAL: Check if this campaign is already running to prevent duplicate execution
    if (activeCampaignLocks.has(campaignId)) {
      console.log(`Campaign ${campaignId} is already running, rejecting duplicate invocation`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Campaign is already running',
        alreadyRunning: true
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also check database status to prevent re-runs
    const { data: existingCampaign } = await supabase
      .from('whatsapp_campaigns')
      .select('status, sent_count, failed_count')
      .eq('id', campaignId)
      .single();

    if (existingCampaign?.status === 'running') {
      // Check if it was recently updated (within last 2 minutes) - means it's actively running
      const { data: recentUpdate } = await supabase
        .from('whatsapp_campaigns')
        .select('updated_at')
        .eq('id', campaignId)
        .single();

      if (recentUpdate) {
        const lastUpdate = new Date(recentUpdate.updated_at);
        const now = new Date();
        const diffMs = now.getTime() - lastUpdate.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes < 2) {
          console.log(`Campaign ${campaignId} was updated ${diffMinutes.toFixed(1)} minutes ago, still active`);
          return new Response(JSON.stringify({
            success: false,
            error: 'Campaign is actively running',
            alreadyRunning: true
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Add lock
    activeCampaignLocks.add(campaignId);
    console.log(`Starting campaign ${campaignId} from index ${startIndex} with ${leads.length} total leads`);

    // Check connection before starting
    const connectionCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    
    if (!connectionCheck.connected) {
      activeCampaignLocks.delete(campaignId);
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

    const userId = user.id;

    // Background task to run the campaign
    const runCampaignBatch = async () => {
      try {
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
          activeCampaignLocks.delete(campaignId);
          return;
        }

        let sentCount = campaignData.sent_count || 0;
        let failedCount = campaignData.failed_count || 0;
        
        // Calculate the correct starting index based on already processed leads
        const processedCount = sentCount + failedCount;
        const actualStartIndex = Math.max(startIndex, processedCount);
        
        console.log(`Campaign ${campaignId}: Already processed ${processedCount}, starting from index ${actualStartIndex}`);

        // CRITICAL: Track all phones that have been messaged to prevent duplicates
        // Include phones from already processed leads
        const messagedPhones = new Set<string>();
        
        // Mark all previously processed phones as already messaged
        for (let i = 0; i < actualStartIndex; i++) {
          const lead = leads[i];
          const phone = lead?.phone || lead?.telefone;
          if (phone) {
            messagedPhones.add(normalizePhone(phone));
          }
        }

        console.log(`Pre-loaded ${messagedPhones.size} already messaged phones`);

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

        // Process remaining leads - ONE message per phone number
        for (let i = actualStartIndex; i < leads.length; i++) {
          // Check if campaign was cancelled/paused every 5 messages
          if (i % 5 === 0) {
            const { data: statusCheck } = await supabase
              .from('whatsapp_campaigns')
              .select('status')
              .eq('id', campaignId)
              .single();

            if (!statusCheck || statusCheck.status === 'cancelled' || statusCheck.status === 'paused') {
              console.log(`Campaign ${campaignId} status changed to ${statusCheck?.status}, stopping.`);
              activeCampaignLocks.delete(campaignId);
              return;
            }
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

            activeCampaignLocks.delete(campaignId);
            return;
          }

          const lead = leads[i];
          const phone = lead.phone || lead.telefone;
          
          if (!phone) {
            console.log(`Lead ${lead.name} has no phone, skipping`);
            failedCount++;
            
            // Update progress
            await supabase
              .from('whatsapp_campaigns')
              .update({ 
                sent_count: sentCount,
                failed_count: failedCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', campaignId);
            
            continue;
          }

          const formattedPhone = normalizePhone(phone);

          // CRITICAL: Skip if we already sent a message to this phone
          if (messagedPhones.has(formattedPhone)) {
            console.log(`Phone ${formattedPhone} already messaged in this campaign, skipping duplicate`);
            failedCount++; // Count as processed to maintain index
            
            // Update progress
            await supabase
              .from('whatsapp_campaigns')
              .update({ 
                sent_count: sentCount,
                failed_count: failedCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', campaignId);
            
            continue;
          }

          // Wait BEFORE sending (anti-ban)
          const randomDelay = getRandomDelay();
          console.log(`Waiting ${randomDelay}s before message ${i + 1}/${leads.length}`);
          await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));

          // CRITICAL: Select ONE random message variation
          const randomMessageIndex = Math.floor(Math.random() * messages.length);
          const randomMessage = messages[randomMessageIndex];
          
          const personalizedMessage = randomMessage
            .replace(/\{nome\}/gi, lead.name || 'Cliente')
            .replace(/\{empresa\}/gi, lead.name || 'Empresa');

          console.log(`Sending variation #${randomMessageIndex + 1} to ${formattedPhone}`);

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
              
              // Mark phone as messaged
              messagedPhones.add(formattedPhone);
              
              console.log(`✓ Message sent to ${formattedPhone} (${sentCount}/${leads.length})`);

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
                  const messageId = sendResult?.key?.id || `campaign_${campaignId}_${i}_${Date.now()}`;
                  
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
              console.error(`✗ Failed to send to ${formattedPhone}:`, errorText);
              failedCount++;
              
              // Mark phone as attempted to avoid retry in same run
              messagedPhones.add(formattedPhone);
            }
          } catch (sendError) {
            console.error(`✗ Error sending to ${formattedPhone}:`, sendError);
            failedCount++;
            
            // Mark phone as attempted to avoid retry in same run
            messagedPhones.add(formattedPhone);
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

        // Campaign completed after all leads
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

        console.log(`✓ Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
      } finally {
        // Always release lock when done
        activeCampaignLocks.delete(campaignId);
      }
    };

    // Start batch in background
    EdgeRuntime.waitUntil(runCampaignBatch());

    return new Response(JSON.stringify({
      success: true,
      message: 'Campaign started',
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
