import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Reset daily counts cron job started at:', new Date().toISOString());

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all numbers that have sent messages (daily_sent_count > 0)
    const { data: numbersToReset, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('id, name, daily_sent_count, user_id')
      .gt('daily_sent_count', 0);

    if (fetchError) {
      console.error('Error fetching numbers:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${numbersToReset?.length || 0} numbers to reset`);

    if (!numbersToReset || numbersToReset.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No numbers to reset',
          resetCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset all daily counts to 0
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({
        daily_sent_count: 0,
        updated_at: new Date().toISOString()
      })
      .gt('daily_sent_count', 0);

    if (updateError) {
      console.error('Error resetting counts:', updateError);
      throw updateError;
    }

    console.log(`Successfully reset ${numbersToReset.length} numbers`);

    // Log the reset details
    const resetDetails = numbersToReset.map(n => ({
      id: n.id,
      name: n.name,
      previousCount: n.daily_sent_count
    }));

    console.log('Reset details:', JSON.stringify(resetDetails));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset ${numbersToReset.length} numbers`,
        resetCount: numbersToReset.length,
        numbers: resetDetails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error in reset-daily-counts:', error);
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