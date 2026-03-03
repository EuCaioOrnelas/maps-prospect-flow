import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}

async function getEvolutionCredentialsForNumber(
  supabase: any,
  numberData: { id?: string; api_tier?: string | null },
  userId: string
): Promise<EvolutionCredentials> {
  if (numberData?.api_tier) {
    return getEvolutionCredentials(numberData.api_tier);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();

  const credentials = getEvolutionCredentials(profile?.plan);

  // Self-heal inferred tier to avoid future ambiguity
  if (numberData?.id) {
    await supabase
      .from('whatsapp_numbers')
      .update({ api_tier: credentials.tier, updated_at: new Date().toISOString() })
      .eq('id', numberData.id);
  }

  return credentials;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Resume campaigns cron job started at:', new Date().toISOString());

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all campaigns that were paused due to daily limit
    const { data: pausedCampaigns, error: fetchError } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, user_id, sent_count, total_leads, whatsapp_number_id')
      .eq('status', 'paused')
      .eq('paused_at_limit', true);

    if (fetchError) {
      console.error('Error fetching paused campaigns:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pausedCampaigns?.length || 0} campaigns paused by daily limit`);

    if (!pausedCampaigns || pausedCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No campaigns to resume',
          resumedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumedDetails = [];

    for (const campaign of pausedCampaigns) {
      // Verify the WhatsApp number is still connected before resuming
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('id, instance_name, is_connected, api_tier')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (!numberData) {
        console.log(`Skipping campaign ${campaign.name} - number not found`);
        await supabase.from('whatsapp_campaigns').update({
          status: 'failed',
          pause_reason: 'Número WhatsApp não encontrado',
          paused_at_limit: false,
          updated_at: new Date().toISOString()
        }).eq('id', campaign.id);
        continue;
      }

      // Check DB connection flag
      if (!numberData.is_connected) {
        console.log(`Skipping campaign ${campaign.name} - number ${numberData.instance_name} is disconnected`);
        // Don't resume, but update pause reason to reflect disconnection
        await supabase.from('whatsapp_campaigns').update({
          pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
          paused_at_limit: false,
          updated_at: new Date().toISOString()
        }).eq('id', campaign.id);
        continue;
      }

      // Quick live check (soft-fail): if provider check is flaky/non-open, still trust DB flag and resume.
      // campaign-processor will re-validate during real send and pause only on concrete send failures.
      const evoCredentials = await getEvolutionCredentialsForNumber(supabase, numberData, campaign.user_id);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const statusResponse = await fetch(`${evoCredentials.url}/instance/connectionState/${numberData.instance_name}`, {
          method: 'GET',
          headers: { 'apikey': evoCredentials.apiKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const state = statusData.state || statusData.instance?.state;
          if (state !== 'open') {
            console.log(`Live check returned state="${state}" for ${numberData.instance_name}, but DB is connected — resuming campaign (soft-fail)`);
          }
        } else {
          console.log(`Live check HTTP ${statusResponse.status} for ${numberData.instance_name}, but DB is connected — resuming campaign (soft-fail)`);
        }
      } catch (_e) {
        console.log(`Live check failed for ${numberData.instance_name}, but DB says connected — proceeding with resume`);
      }

      // Resume the campaign
      const { error: updateError } = await supabase.from('whatsapp_campaigns').update({
        status: 'running',
        paused_at_limit: false,
        pause_reason: null,
        resume_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', campaign.id);

      if (updateError) {
        console.error(`Error resuming campaign ${campaign.id}:`, updateError);
        continue;
      }

      resumedDetails.push({
        id: campaign.id,
        name: campaign.name,
        user_id: campaign.user_id,
        progress: `${campaign.sent_count}/${campaign.total_leads}`
      });
    }

    console.log(`Successfully resumed ${resumedDetails.length} campaigns`);
    console.log('Resumed campaigns details:', JSON.stringify(resumedDetails));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Resumed ${resumedDetails.length} campaigns`,
        resumedCount: resumedDetails.length,
        campaigns: resumedDetails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error in resume-campaigns:', error);
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