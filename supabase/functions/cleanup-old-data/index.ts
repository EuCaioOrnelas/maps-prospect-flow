import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    
    // 3. Clean old search_history (keep only last 7 days AND limit to 10 per user)
    console.log('[cleanup-old-data] Cleaning search_history older than 7 days...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: searchHistoryError, count: deletedSearchCount } = await supabase
      .from('search_history')
      .delete()
      .lt('created_at', sevenDaysAgo);
    
    if (searchHistoryError) {
      console.error('[cleanup-old-data] Error cleaning search_history:', searchHistoryError);
      results.searchHistory = { error: searchHistoryError.message };
    } else {
      console.log('[cleanup-old-data] Cleaned old search history entries');
      results.searchHistory = { success: true, deleted: deletedSearchCount };
    }
    
    // 4. Enforce max 10 entries per user for search_history
    // Regra mantida: manter apenas as 10 entradas mais recentes por usuário.
    // Antes: 1 query de usuários + 2 queries por usuário (N+1).
    // Agora: 1 leitura única + deletes em lote.
    console.log('[cleanup-old-data] Enforcing max 10 search history entries per user...');
    const MAX_HISTORY_PER_USER = 10;

    const { data: allHistory, error: historyReadError } = await supabase
      .from('search_history')
      .select('id, user_id, created_at')
      .order('user_id', { ascending: true })
      .order('created_at', { ascending: false });

    if (historyReadError) {
      console.error('[cleanup-old-data] Error reading search_history:', historyReadError);
      results.searchHistoryTrimmed = { error: historyReadError.message };
    } else if (allHistory) {
      const seenPerUser = new Map<string, number>();
      const idsToDelete: string[] = [];

      // Rows já vêm ordenadas por usuário e por created_at desc:
      // as 10 primeiras de cada usuário ficam, o resto é removido.
      for (const row of allHistory as Array<{ id: string; user_id: string }>) {
        const seen = (seenPerUser.get(row.user_id) || 0) + 1;
        seenPerUser.set(row.user_id, seen);
        if (seen > MAX_HISTORY_PER_USER) idsToDelete.push(row.id);
      }

      let totalTrimmed = 0;
      const BATCH = 500;
      for (let i = 0; i < idsToDelete.length; i += BATCH) {
        const batch = idsToDelete.slice(i, i + BATCH);
        const { error: delError } = await supabase
          .from('search_history')
          .delete()
          .in('id', batch);
        if (delError) {
          console.error('[cleanup-old-data] Error deleting search_history batch:', delError);
          break;
        }
        totalTrimmed += batch.length;
      }

      results.searchHistoryTrimmed = { success: true, trimmed: totalTrimmed };
      console.log(`[cleanup-old-data] Trimmed ${totalTrimmed} excess search history entries`);
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
