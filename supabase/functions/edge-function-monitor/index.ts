import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { hours = 1 } = await req.json().catch(() => ({}));

    // Query the analytics endpoint for edge function logs
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    // Try the analytics API
    const analyticsUrl = `${supabaseUrl}/analytics/v1/query`;
    const sql = `
      select 
        m.function_id,
        count(*) as total_calls,
        avg(m.execution_time_ms) as avg_execution_ms,
        max(m.execution_time_ms) as max_execution_ms,
        count(case when response.status_code >= 400 then 1 end) as error_count,
        count(case when request.method = 'OPTIONS' then 1 end) as options_count,
        min(t.timestamp) as first_call,
        max(t.timestamp) as last_call
      from function_edge_logs as t
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      where t.timestamp > now() - interval '${Math.min(Number(hours), 24)} hours'
      group by m.function_id
      order by total_calls desc
    `;

    let functionStats: any[] = [];
    let analyticsAvailable = false;

    try {
      const analyticsRes = await fetch(analyticsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        functionStats = analyticsData.result || analyticsData || [];
        analyticsAvailable = true;
      } else {
        const errText = await analyticsRes.text();
        console.log('Analytics API not available:', analyticsRes.status, errText);
      }
    } catch (e) {
      console.log('Analytics API error:', e.message);
    }

    // Known function name mapping (hardcoded since we can't query it programmatically)
    const functionNameMap: Record<string, string> = {
      '97f9c507-e96a-4578-8264-b99a94eded9f': 'evolution-webhook',
      'd0607a05-0ec8-4aa7-80cb-ecce7bc5668d': 'check-subscription',
      '728a9a5b-b25b-4eff-94a0-9ee9e55e60fb': 'evolution-create-instance',
      'bf9b470c-7571-4551-94b2-e9bfd376405b': 'evolution-check-status',
    };

    // Enrich with names
    const enrichedStats = functionStats.map((stat: any) => ({
      ...stat,
      function_name: functionNameMap[stat.function_id] || `unknown-${stat.function_id?.slice(0, 8)}`,
    }));

    // Also get recent individual calls for timeline view
    let recentCalls: any[] = [];
    if (analyticsAvailable) {
      try {
        const recentSql = `
          select 
            t.timestamp,
            m.function_id,
            request.method,
            response.status_code,
            m.execution_time_ms
          from function_edge_logs as t
            cross join unnest(metadata) as m
            cross join unnest(m.response) as response
            cross join unnest(m.request) as request
          where t.timestamp > now() - interval '${Math.min(Number(hours), 24)} hours'
          order by t.timestamp desc
          limit 100
        `;

        const recentRes = await fetch(analyticsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sql: recentSql }),
        });

        if (recentRes.ok) {
          const recentData = await recentRes.json();
          recentCalls = (recentData.result || recentData || []).map((call: any) => ({
            ...call,
            function_name: functionNameMap[call.function_id] || `unknown-${call.function_id?.slice(0, 8)}`,
          }));
        } else {
          await recentRes.text();
        }
      } catch (e) {
        console.log('Recent calls query error:', e.message);
      }
    }

    return new Response(JSON.stringify({
      analytics_available: analyticsAvailable,
      hours_queried: Math.min(Number(hours), 24),
      function_stats: enrichedStats,
      recent_calls: recentCalls,
      known_functions: functionNameMap,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Monitor error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
