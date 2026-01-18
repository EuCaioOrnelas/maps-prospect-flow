import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[cleanup-old-data] Starting cleanup job...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results: Record<string, any> = {};
    
    // 1. Clean old heartbeats (keep only last 3 days)
    // These are just system logs for monitoring the campaign processor
    console.log('[cleanup-old-data] Cleaning campaign_processor_heartbeats...');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error: heartbeatError } = await supabase
      .from('campaign_processor_heartbeats')
      .delete()
      .lt('created_at', threeDaysAgo);
    
    if (heartbeatError) {
      console.error('[cleanup-old-data] Error cleaning heartbeats:', heartbeatError);
      results.heartbeats = { error: heartbeatError.message };
    } else {
      console.log('[cleanup-old-data] Cleaned old heartbeats');
      results.heartbeats = { success: true };
    }
    
    // 2. Clean old rate_limits (keep only last 1 hour)
    // These are temporary rate limiting records, not analytics
    console.log('[cleanup-old-data] Cleaning rate_limits...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { error: rateLimitError } = await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', oneHourAgo);
    
    if (rateLimitError) {
      console.error('[cleanup-old-data] Error cleaning rate_limits:', rateLimitError);
      results.rateLimits = { error: rateLimitError.message };
    } else {
      console.log('[cleanup-old-data] Cleaned old rate limits');
      results.rateLimits = { success: true };
    }
    
    // NOTE: We keep landing_page_events and user_events for analytics purposes
    // These contain valuable business data that should not be automatically deleted
    
    console.log('[cleanup-old-data] Cleanup complete:', results);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed',
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (err) {
    const error = err as Error;
    console.error('[cleanup-old-data] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
