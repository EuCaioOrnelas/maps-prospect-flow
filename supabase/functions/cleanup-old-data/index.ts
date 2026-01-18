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
    
    // 3. Clean old landing_page_events (keep only last 90 days)
    console.log('[cleanup-old-data] Cleaning landing_page_events...');
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: landingError } = await supabase
      .from('landing_page_events')
      .delete()
      .lt('created_at', ninetyDaysAgo);
    
    if (landingError) {
      console.error('[cleanup-old-data] Error cleaning landing_page_events:', landingError);
      results.landingPageEvents = { error: landingError.message };
    } else {
      console.log('[cleanup-old-data] Cleaned old landing page events');
      results.landingPageEvents = { success: true };
    }

    // 4. Clean old user_events (keep only last 30 days)
    console.log('[cleanup-old-data] Cleaning user_events...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: userEventsError } = await supabase
      .from('user_events')
      .delete()
      .lt('created_at', thirtyDaysAgo);
    
    if (userEventsError) {
      console.error('[cleanup-old-data] Error cleaning user_events:', userEventsError);
      results.userEvents = { error: userEventsError.message };
    } else {
      console.log('[cleanup-old-data] Cleaned old user events');
      results.userEvents = { success: true };
    }
    
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
