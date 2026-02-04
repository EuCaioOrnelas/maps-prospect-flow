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

// Track active campaigns to prevent duplicate runs (per instance)
const activeCampaignLocks = new Map<string, string>(); // numberId -> campaignId

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
): Promise<{ connected: boolean; error?: string }> {
  let lastError: string = 'Unknown error';
  
  console.log(`Verifying connection for instance: ${instanceName} (max ${maxRetries} attempts)`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        const errorText = await statusResponse.text();
        lastError = `API error: ${errorText}`;
        console.log(`[run-campaign] Connection check attempt ${attempt}/${maxRetries} failed: ${lastError}`);
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return { connected: false, error: lastError };
      }

      const statusData = await statusResponse.json();
      const state = statusData.state || statusData.instance?.state;
      console.log(`Connection status (attempt ${attempt}):`, state);
      
      const isConnected = state === 'open';
      
      if (isConnected) {
        return { connected: true };
      }
      
      // States that might be temporary - retry
      if (state === 'connecting' || state === 'close') {
        console.log(`[run-campaign] Instance state is "${state}", waiting... (attempt ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
      
      lastError = `Instance not connected. State: ${state || 'unknown'}`;
      return { connected: false, error: lastError };
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[run-campaign] Connection check attempt ${attempt}/${maxRetries} error: ${lastError}`);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }
  
  console.log(`[run-campaign] Connection check failed after ${maxRetries} attempts: ${lastError}`);
  return { connected: false, error: lastError };
}

// Start the next postponed campaign for a number
async function startNextPostponedCampaign(
  supabase: any,
  numberId: string,
  userId: string,
  evolutionUrl: string,
  evolutionApiKey: string
) {
  console.log(`[Queue] Checking for postponed campaigns on number ${numberId}`);
  
  // Find the next postponed campaign for this number
  const { data: postponedCampaign, error } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .eq('whatsapp_number_id', numberId)
    .eq('status', 'postponed')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !postponedCampaign) {
    console.log(`[Queue] No postponed campaigns found for number ${numberId}`);
    return;
  }

  console.log(`[Queue] Starting postponed campaign: ${postponedCampaign.name} (${postponedCampaign.id})`);

  // Get the WhatsApp number info
  const { data: numberData } = await supabase
    .from('whatsapp_numbers')
    .select('instance_name')
    .eq('id', numberId)
    .single();

  if (!numberData?.instance_name) {
    console.error(`[Queue] No instance name for number ${numberId}`);
    return;
  }

  // Update status to running
  await supabase
    .from('whatsapp_campaigns')
    .update({ 
      status: 'running',
      started_at: new Date().toISOString(),
      pause_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', postponedCampaign.id);

  // Parse leads and messages
  let leads = postponedCampaign.leads;
  if (typeof leads === 'string') {
    try { leads = JSON.parse(leads); } catch { leads = []; }
  }
  
  let messages = postponedCampaign.messages;
  if (typeof messages === 'string') {
    try { messages = JSON.parse(messages); } catch { messages = []; }
  }

  // Trigger the campaign via HTTP call to self (can't use EdgeRuntime here)
  // The campaign will be picked up by the cron job or we process it inline
  console.log(`[Queue] Postponed campaign ${postponedCampaign.id} is now ready to run`);
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

    console.log(`[Campaign ${campaignId}] Request received for number ${numberId}`);

    // Check if there's already a campaign running on this specific number
    const { data: runningOnNumber, error: runningError } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, status, updated_at')
      .eq('whatsapp_number_id', numberId)
      .eq('status', 'running')
      .neq('id', campaignId);

    if (runningOnNumber && runningOnNumber.length > 0) {
      // Check if the running campaign is actually active (updated in last 3 minutes)
      const activeCampaigns = runningOnNumber.filter(c => {
        const lastUpdate = new Date(c.updated_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        return diffMinutes < 3;
      });

      if (activeCampaigns.length > 0) {
        console.log(`[Campaign ${campaignId}] Number ${numberId} already has active campaign: ${activeCampaigns[0].name}`);
        
        // Mark this campaign as postponed (queued)
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'postponed',
            pause_reason: `Aguardando campanha "${activeCampaigns[0].name}" finalizar`,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        return new Response(JSON.stringify({
          success: true,
          postponed: true,
          message: 'Campanha adiada - já existe uma campanha em andamento neste número',
          waitingFor: activeCampaigns[0].name,
          campaignId
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Also check memory lock for same-instance double calls
    const currentLock = activeCampaignLocks.get(numberId);
    if (currentLock && currentLock !== campaignId) {
      console.log(`[Campaign ${campaignId}] Memory lock exists for number ${numberId} (campaign ${currentLock})`);
      
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'postponed',
          pause_reason: 'Aguardando campanha anterior finalizar',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return new Response(JSON.stringify({
        success: true,
        postponed: true,
        message: 'Campanha adiada - aguardando campanha anterior',
        campaignId
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add lock for this number
    activeCampaignLocks.set(numberId, campaignId);
    console.log(`[Campaign ${campaignId}] Lock acquired for number ${numberId}`);

    // Check connection before starting
    const connectionCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    
    if (!connectionCheck.connected) {
      activeCampaignLocks.delete(numberId);
      console.log(`Instance ${instanceName} connection check failed: ${connectionCheck.error}. Skipping campaign (status unchanged).`);
      
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'failed',
          pause_reason: `Falha ao verificar conexão: ${connectionCheck.error}. Verifique se o WhatsApp está conectado.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return new Response(JSON.stringify({
        success: false,
        error: 'Não foi possível verificar a conexão do WhatsApp. Tente novamente.',
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
        pause_reason: null,
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
          activeCampaignLocks.delete(numberId);
          // Try to start next postponed campaign
          await startNextPostponedCampaign(supabase, numberId, userId, EVOLUTION_API_URL!, EVOLUTION_API_KEY!);
          return;
        }

        let sentCount = campaignData.sent_count || 0;
        let failedCount = campaignData.failed_count || 0;
        
        // Calculate the correct starting index based on already processed leads
        const processedCount = sentCount + failedCount;
        const actualStartIndex = Math.max(startIndex, processedCount);
        
        console.log(`Campaign ${campaignId}: Already processed ${processedCount}, starting from index ${actualStartIndex}`);

        // CRITICAL: Track all phones that have been messaged to prevent duplicates
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
              activeCampaignLocks.delete(numberId);
              // Start next postponed if cancelled
              if (statusCheck?.status === 'cancelled') {
                await startNextPostponedCampaign(supabase, numberId, userId, EVOLUTION_API_URL!, EVOLUTION_API_KEY!);
              }
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

            activeCampaignLocks.delete(numberId);
            return;
          }

          const lead = leads[i];
          const phone = lead.phone || lead.telefone;
          
          if (!phone) {
            console.log(`Lead ${lead.name} has no phone, skipping`);
            failedCount++;
            
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
            failedCount++;
            
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

              // ===== CRM INTEGRATION: Create or update lead in "Prospectado" stage =====
              try {
                // Get "Prospectado" stage for this user
                const { data: prospectadoStage } = await supabase
                  .from('pipeline_stages')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('name', 'Prospectado')
                  .single();

                // Check if lead with this phone already exists (by normalized phone)
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, whatsapp_status, pipeline_stage_id')
                  .eq('user_id', userId)
                  .or(`phone.eq.${formattedPhone},phone.ilike.%${formattedPhone.slice(-8)}%`)
                  .limit(1)
                  .single();

                if (existingLead) {
                  // Update existing lead - mark message sent
                  const updateData: Record<string, unknown> = {
                    last_message_sent: personalizedMessage.substring(0, 200),
                    last_message_sent_at: new Date().toISOString(),
                    whatsapp_number_id: numberId,
                    updated_at: new Date().toISOString(),
                  };
                  
                  // Update whatsapp_status if still never_contacted
                  if (existingLead.whatsapp_status === 'never_contacted') {
                    updateData.whatsapp_status = 'message_sent';
                  }

                  await supabase
                    .from('leads')
                    .update(updateData)
                    .eq('id', existingLead.id);

                  console.log(`Updated existing lead ${existingLead.id} for campaign message`);
                } else {
                  // Create new lead in "Prospectado" stage
                  const { error: createLeadError } = await supabase
                    .from('leads')
                    .insert({
                      user_id: userId,
                      phone: formattedPhone,
                      company_name: lead.name || null,
                      contact_name: lead.name || null,
                      origin: 'campaign',
                      whatsapp_status: 'message_sent',
                      pipeline_stage_id: prospectadoStage?.id || null,
                      last_message_sent: personalizedMessage.substring(0, 200),
                      last_message_sent_at: new Date().toISOString(),
                      whatsapp_number_id: numberId,
                      tags: ['campanha'],
                    });

                  if (createLeadError) {
                    console.error('Error creating lead:', createLeadError);
                  } else {
                    console.log(`Created new lead for phone ${formattedPhone}`);
                  }
                }
              } catch (crmError) {
                console.error('Error syncing with CRM:', crmError);
              }

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

                  // Update lead with conversation_id
                  await supabase
                    .from('leads')
                    .update({ conversation_id: conversationId })
                    .eq('user_id', userId)
                    .or(`phone.eq.${formattedPhone},phone.ilike.%${formattedPhone.slice(-8)}%`);
                }
              } catch (syncError) {
                console.error('Error syncing message:', syncError);
              }
            } else {
              const errorText = await sendResponse.text();
              console.error(`✗ Failed to send to ${formattedPhone}:`, errorText);
              failedCount++;
              messagedPhones.add(formattedPhone);
            }
          } catch (sendError) {
            console.error(`✗ Error sending to ${formattedPhone}:`, sendError);
            failedCount++;
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
        
        // CRITICAL: Start the next postponed campaign for this number
        activeCampaignLocks.delete(numberId);
        await startNextPostponedCampaign(supabase, numberId, userId, EVOLUTION_API_URL!, EVOLUTION_API_KEY!);
        
      } catch (error) {
        console.error(`Campaign ${campaignId} error:`, error);
        activeCampaignLocks.delete(numberId);
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
