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
}

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Função para verificar se a instância está realmente conectada
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    console.log(`Verifying connection for instance: ${instanceName}`);
    
    const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Evolution API status check error:', errorText);
      return { connected: false, error: `API error: ${errorText}` };
    }

    const statusData = await statusResponse.json();
    console.log('Connection status response:', JSON.stringify(statusData));

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

    const { campaignId, numberId, instanceName, leads, messages, delaySecondsMin, delaySecondsMax }: CampaignRequest = await req.json();

    console.log(`Starting campaign ${campaignId} with ${leads.length} leads`);

    // VERIFICAR CONEXÃO ANTES DE INICIAR A CAMPANHA
    const connectionCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    
    if (!connectionCheck.connected) {
      console.log(`Instance ${instanceName} is not connected. Updating database and failing campaign.`);
      
      // Atualizar o status do número no banco para desconectado
      await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId)
        .eq('user_id', user.id);

      // Marcar campanha como falha
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
        error: 'WhatsApp não está conectado. Por favor, reconecte o número antes de iniciar a campanha.',
        needsReconnect: true,
        connectionError: connectionCheck.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update campaign status to running immediately
    await supabase
      .from('whatsapp_campaigns')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // Background task to run the campaign
    const runCampaign = async () => {
      // Helper function to get random delay between min and max
      const getRandomDelay = () => {
        return Math.floor(Math.random() * (delaySecondsMax - delaySecondsMin + 1)) + delaySecondsMin;
      };

      // Get current daily sent count
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('daily_sent_count, last_sent_at')
        .eq('id', numberId)
        .single();

      const today = new Date().toDateString();
      const lastSentDate = numberData?.last_sent_at ? new Date(numberData.last_sent_at).toDateString() : null;
      let dailySentCount = lastSentDate === today ? (numberData?.daily_sent_count || 0) : 0;
      const DAILY_LIMIT = 200;

      let sentCount = 0;
      let failedCount = 0;
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 5;

      try {
        // Process leads
        for (let i = 0; i < leads.length; i++) {
          // Verificar conexão periodicamente (a cada 10 mensagens)
          if (i > 0 && i % 10 === 0) {
            const recheck = await checkInstanceConnection(EVOLUTION_API_URL!, EVOLUTION_API_KEY!, instanceName);
            if (!recheck.connected) {
              console.log('Connection lost during campaign, pausing...');
              
              await supabase
                .from('whatsapp_numbers')
                .update({ 
                  is_connected: false,
                  updated_at: new Date().toISOString()
                })
                .eq('id', numberId);

              await supabase
                .from('whatsapp_campaigns')
                .update({ 
                  status: 'paused',
                  pause_reason: 'Conexão WhatsApp perdida durante a campanha',
                  sent_count: sentCount,
                  failed_count: failedCount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', campaignId);

              return;
            }
          }

          // Wait BEFORE sending (including first message) for anti-ban
          const randomDelay = getRandomDelay();
          console.log(`Waiting ${randomDelay}s before message ${i + 1}`);
          await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));

          const lead = leads[i];
          
          // Check daily limit
          if (dailySentCount >= DAILY_LIMIT) {
            console.log('Daily limit reached, pausing campaign');
            
            // Calculate resume time (next day at 8am)
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

          // Get phone number
          const phone = lead.phone || lead.telefone;
          if (!phone) {
            console.log(`Lead ${lead.name} has no phone number, skipping`);
            failedCount++;
            continue;
          }

          // Format phone number
          let formattedPhone = phone.replace(/\D/g, '');
          if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
          }

          // Select random message
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          
          // Personalize message with lead name
          const personalizedMessage = randomMessage
            .replace(/\{nome\}/gi, lead.name || 'Cliente')
            .replace(/\{empresa\}/gi, lead.name || 'Empresa');

          try {
            // Send message via Evolution API
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
            });

            if (sendResponse.ok) {
              sentCount++;
              dailySentCount++;
              consecutiveFailures = 0; // Reset on success
              console.log(`Message sent to ${formattedPhone} (${sentCount}/${leads.length})`);
            } else {
              const errorText = await sendResponse.text();
              console.error(`Failed to send to ${formattedPhone}:`, errorText);
              failedCount++;
              consecutiveFailures++;
              
              // Se muitas falhas consecutivas, pode ser problema de conexão
              if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.log('Too many consecutive failures, checking connection...');
                const recheck = await checkInstanceConnection(EVOLUTION_API_URL!, EVOLUTION_API_KEY!, instanceName);
                if (!recheck.connected) {
                  await supabase
                    .from('whatsapp_numbers')
                    .update({ 
                      is_connected: false,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', numberId);

                  await supabase
                    .from('whatsapp_campaigns')
                    .update({ 
                      status: 'failed',
                      pause_reason: 'Muitas falhas consecutivas - conexão perdida',
                      sent_count: sentCount,
                      failed_count: failedCount,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', campaignId);

                  return;
                }
                consecutiveFailures = 0;
              }
            }
          } catch (sendError) {
            console.error(`Error sending to ${formattedPhone}:`, sendError);
            failedCount++;
            consecutiveFailures++;
          }

          // Update campaign progress
          await supabase
            .from('whatsapp_campaigns')
            .update({ 
              sent_count: sentCount,
              failed_count: failedCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

          // Update number's daily count
          await supabase
            .from('whatsapp_numbers')
            .update({ 
              daily_sent_count: dailySentCount,
              last_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', numberId);
        }

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
      } catch (error) {
        console.error(`Campaign ${campaignId} error:`, error);
        
        // Mark campaign as failed
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'failed',
            pause_reason: error instanceof Error ? error.message : 'Unknown error',
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);
      }
    };

    // Start campaign in background - returns immediately to client
    EdgeRuntime.waitUntil(runCampaign());

    // Return immediately - campaign runs in background
    return new Response(JSON.stringify({
      success: true,
      message: 'Campaign started successfully',
      campaignId
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
