import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      .select('id, name, user_id, sent_count, total_leads')
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

    // Resume all paused campaigns
    const { error: updateError } = await supabase
      .from('whatsapp_campaigns')
      .update({
        status: 'running',
        paused_at_limit: false,
        pause_reason: null,
        resume_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('status', 'paused')
      .eq('paused_at_limit', true);

    if (updateError) {
      console.error('Error resuming campaigns:', updateError);
      throw updateError;
    }

    console.log(`Successfully resumed ${pausedCampaigns.length} campaigns`);

    // Log the resumed campaigns for tracking
    const resumedDetails = pausedCampaigns.map(c => ({
      id: c.id,
      name: c.name,
      user_id: c.user_id,
      progress: `${c.sent_count}/${c.total_leads}`
    }));

    console.log('Resumed campaigns details:', JSON.stringify(resumedDetails));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Resumed ${pausedCampaigns.length} campaigns`,
        resumedCount: pausedCampaigns.length,
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
