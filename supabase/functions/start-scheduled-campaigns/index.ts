import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[start-scheduled-campaigns] Cron job started at:', new Date().toISOString());

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
        scheduled_at
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('[start-scheduled-campaigns] Error fetching campaigns:', fetchError);
      throw fetchError;
    }

    console.log(`[start-scheduled-campaigns] Found ${scheduledCampaigns?.length || 0} campaigns to start`);

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scheduled campaigns to start',
          startedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    for (const campaign of scheduledCampaigns) {
      console.log(`[start-scheduled-campaigns] Processing campaign: ${campaign.name} (${campaign.id})`);
      
      // Get the WhatsApp number details
      const { data: numberData, error: numberError } = await supabase
        .from('whatsapp_numbers')
        .select('id, instance_name, is_connected, daily_sent_count')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (numberError || !numberData) {
        console.error(`[start-scheduled-campaigns] Number not found for campaign ${campaign.id}:`, numberError);
        
        // Mark campaign as failed
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'failed', 
            pause_reason: 'Número WhatsApp não encontrado'
          })
          .eq('id', campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          status: 'failed',
          reason: 'Number not found'
        });
        continue;
      }

      // Check if number is connected
      if (!numberData.is_connected) {
        console.log(`[start-scheduled-campaigns] Number ${numberData.instance_name} is not connected`);
        
        // Keep as scheduled but add pause reason
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            pause_reason: 'WhatsApp desconectado - reconecte para iniciar'
          })
          .eq('id', campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          status: 'pending_connection',
          reason: 'WhatsApp disconnected'
        });
        continue;
      }

      // Check daily limit (200 per day)
      const DAILY_LIMIT = 200;
      if (numberData.daily_sent_count >= DAILY_LIMIT) {
        console.log(`[start-scheduled-campaigns] Number ${numberData.instance_name} at daily limit`);
        
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            pause_reason: 'Limite diário atingido - será iniciada amanhã'
          })
          .eq('id', campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          status: 'pending_limit',
          reason: 'Daily limit reached'
        });
        continue;
      }

      // Parse leads and messages
      let leads = campaign.leads;
      if (typeof leads === 'string') {
        try {
          leads = JSON.parse(leads);
        } catch {
          leads = [];
        }
      }
      
      let messages = campaign.messages;
      if (typeof messages === 'string') {
        try {
          messages = JSON.parse(messages);
        } catch {
          messages = [];
        }
      }

      const validMessages = Array.isArray(messages) ? messages.filter((m: string) => m?.trim()) : [];

      if (!Array.isArray(leads) || leads.length === 0 || validMessages.length === 0) {
        console.error(`[start-scheduled-campaigns] Invalid leads/messages for campaign ${campaign.id}`);
        
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'failed', 
            pause_reason: 'Dados de leads ou mensagens inválidos'
          })
          .eq('id', campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          status: 'failed',
          reason: 'Invalid leads or messages'
        });
        continue;
      }

      // Update campaign to running
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'running',
          started_at: now,
          pause_reason: null
        })
        .eq('id', campaign.id);

      // Start the campaign using evolution-run-campaign function
      try {
        const { error: runError } = await supabase.functions.invoke('evolution-run-campaign', {
          body: {
            campaignId: campaign.id,
            numberId: campaign.whatsapp_number_id,
            instanceName: numberData.instance_name,
            leads: leads,
            messages: validMessages,
            delaySecondsMin: campaign.delay_seconds || 40,
            delaySecondsMax: (campaign.delay_seconds || 40) + 20
          }
        });

        if (runError) {
          console.error(`[start-scheduled-campaigns] Error invoking run-campaign for ${campaign.id}:`, runError);
          
          await supabase
            .from('whatsapp_campaigns')
            .update({ 
              status: 'failed', 
              pause_reason: `Erro ao iniciar: ${runError.message}`
            })
            .eq('id', campaign.id);
          
          results.push({
            id: campaign.id,
            name: campaign.name,
            status: 'failed',
            reason: runError.message
          });
        } else {
          console.log(`[start-scheduled-campaigns] Successfully started campaign ${campaign.id}`);
          results.push({
            id: campaign.id,
            name: campaign.name,
            status: 'started',
            leadsCount: leads.length
          });
        }
      } catch (invokeError) {
        console.error(`[start-scheduled-campaigns] Exception starting campaign ${campaign.id}:`, invokeError);
        
        await supabase
          .from('whatsapp_campaigns')
          .update({ 
            status: 'failed', 
            pause_reason: 'Erro interno ao iniciar campanha'
          })
          .eq('id', campaign.id);
        
        results.push({
          id: campaign.id,
          name: campaign.name,
          status: 'failed',
          reason: 'Internal error'
        });
      }
    }

    console.log('[start-scheduled-campaigns] Results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${scheduledCampaigns.length} campaigns`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[start-scheduled-campaigns] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
