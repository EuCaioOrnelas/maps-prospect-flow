import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEvolutionCredentialsByNumber } from "../_shared/evolution-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      
      if (state === 'open') {
        return { connected: true };
      }
      
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    const { campaignId, numberId, instanceName } = await req.json();

    // Get the correct Evolution API based on the number's api_tier
    const evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`[Campaign ${campaignId}] Using ${evoCredentials.tier} API for number ${numberId}`);

    console.log(`[Campaign ${campaignId}] Start request received for number ${numberId}`);

    // Validate campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, status, whatsapp_number_id, leads, messages')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Parse and validate leads/messages
    let leads = campaign.leads;
    if (typeof leads === 'string') {
      try { leads = JSON.parse(leads); } catch { leads = []; }
    }
    let messages = campaign.messages;
    if (typeof messages === 'string') {
      try { messages = JSON.parse(messages); } catch { messages = []; }
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      throw new Error('Nenhum lead na campanha');
    }
    if (!Array.isArray(messages) || messages.filter((m: string) => m?.trim()).length === 0) {
      throw new Error('Nenhuma mensagem configurada');
    }

    // Check if there's already a campaign running on this number
    const { data: runningOnNumber } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, status, updated_at')
      .eq('whatsapp_number_id', numberId)
      .eq('status', 'running')
      .neq('id', campaignId);

    if (runningOnNumber && runningOnNumber.length > 0) {
      const activeCampaigns = runningOnNumber.filter((c: any) => {
        const lastUpdate = new Date(c.updated_at);
        const diffMinutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
        return diffMinutes < 3;
      });

      if (activeCampaigns.length > 0) {
        console.log(`[Campaign ${campaignId}] Number ${numberId} already has active campaign: ${activeCampaigns[0].name}`);
        
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

    // Check connection before starting
    const connectionCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    
    if (!connectionCheck.connected) {
      console.log(`Instance ${instanceName} connection check failed: ${connectionCheck.error}`);
      
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

    // Set campaign to running - the campaign-processor cron will handle all message sending
    await supabase
      .from('whatsapp_campaigns')
      .update({ 
        status: 'running',
        started_at: campaign.status === 'pending' ? new Date().toISOString() : undefined,
        pause_reason: null,
        paused_at_limit: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    console.log(`[Campaign ${campaignId}] Campaign set to running. campaign-processor cron will handle message sending.`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Campaign started - messages will be sent by the processor',
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
