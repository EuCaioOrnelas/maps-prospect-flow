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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
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

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { hours = 1 } = await req.json().catch(() => ({}));
    const safeHours = Math.min(Math.max(Number(hours), 1), 72);
    
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    // Query aggregated stats per function
    const statsQuery = `
      select 
        m.function_id,
        count(*) as total_calls,
        count(case when request.method != 'OPTIONS' then 1 end) as real_calls,
        count(case when request.method = 'OPTIONS' then 1 end) as options_calls,
        count(case when response.status_code >= 400 then 1 end) as error_count,
        count(case when response.status_code >= 200 and response.status_code < 300 then 1 end) as success_count,
        avg(case when request.method != 'OPTIONS' then m.execution_time_ms end) as avg_execution_ms,
        max(m.execution_time_ms) as max_execution_ms,
        min(m.execution_time_ms) as min_execution_ms,
        min(function_edge_logs.timestamp) as first_call,
        max(function_edge_logs.timestamp) as last_call
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      where function_edge_logs.timestamp > now() - interval '${safeHours} hours'
      group by m.function_id
      order by total_calls desc
    `;

    // Query recent individual calls
    const recentQuery = `
      select 
        function_edge_logs.timestamp,
        m.function_id,
        request.method,
        response.status_code,
        m.execution_time_ms,
        event_message
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      where function_edge_logs.timestamp > now() - interval '${safeHours} hours'
        and request.method != 'OPTIONS'
      order by function_edge_logs.timestamp desc
      limit 100
    `;

    // Query hourly distribution
    const hourlyQuery = `
      select 
        date_trunc('hour', function_edge_logs.timestamp) as hour,
        m.function_id,
        count(*) as calls,
        count(case when request.method != 'OPTIONS' then 1 end) as real_calls
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.request) as request
      where function_edge_logs.timestamp > now() - interval '${safeHours} hours'
      group by hour, m.function_id
      order by hour desc
    `;

    const analyticsUrl = `https://${projectRef}.supabase.co/analytics/v1/query`;
    const analyticsHeaders = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    };

    // Execute all 3 queries in parallel
    const [statsRes, recentRes, hourlyRes] = await Promise.all([
      fetch(analyticsUrl, { method: 'POST', headers: analyticsHeaders, body: JSON.stringify({ sql: statsQuery }) }),
      fetch(analyticsUrl, { method: 'POST', headers: analyticsHeaders, body: JSON.stringify({ sql: recentQuery }) }),
      fetch(analyticsUrl, { method: 'POST', headers: analyticsHeaders, body: JSON.stringify({ sql: hourlyQuery }) }),
    ]);

    let functionStats: any[] = [];
    let recentCalls: any[] = [];
    let hourlyData: any[] = [];
    let analyticsAvailable = false;

    if (statsRes.ok) {
      const data = await statsRes.json();
      functionStats = data.result || data || [];
      analyticsAvailable = true;
    } else {
      const errText = await statsRes.text();
      console.log('Stats query failed:', statsRes.status, errText);
    }

    if (recentRes.ok) {
      const data = await recentRes.json();
      recentCalls = data.result || data || [];
    } else {
      await recentRes.text();
    }

    if (hourlyRes.ok) {
      const data = await hourlyRes.json();
      hourlyData = data.result || data || [];
    } else {
      await hourlyRes.text();
    }

    // Known function name mapping
    const functionNameMap: Record<string, string> = {};
    
    // Extract function names from event_message URLs
    for (const call of recentCalls) {
      if (call.function_id && call.event_message) {
        const match = call.event_message.match(/\/functions\/v1\/([a-z0-9-]+)/);
        if (match) {
          functionNameMap[call.function_id] = match[1];
        }
      }
    }

    // Enrich stats with names
    const enrichedStats = functionStats.map((stat: any) => ({
      ...stat,
      function_name: functionNameMap[stat.function_id] || `unknown-${stat.function_id?.slice(0, 8)}`,
      avg_execution_ms: stat.avg_execution_ms ? Math.round(stat.avg_execution_ms) : null,
      error_rate: stat.total_calls > 0 ? ((stat.error_count / stat.total_calls) * 100).toFixed(1) : '0',
    }));

    // Enrich recent calls
    const enrichedRecent = recentCalls.map((call: any) => ({
      ...call,
      function_name: functionNameMap[call.function_id] || `unknown-${call.function_id?.slice(0, 8)}`,
    }));

    // Compute totals
    const totals = {
      total_invocations: functionStats.reduce((sum: number, s: any) => sum + (Number(s.total_calls) || 0), 0),
      real_invocations: functionStats.reduce((sum: number, s: any) => sum + (Number(s.real_calls) || 0), 0),
      total_errors: functionStats.reduce((sum: number, s: any) => sum + (Number(s.error_count) || 0), 0),
      unique_functions: functionStats.length,
    };

    return new Response(JSON.stringify({
      analytics_available: analyticsAvailable,
      hours_queried: safeHours,
      totals,
      function_stats: enrichedStats,
      recent_calls: enrichedRecent,
      hourly_data: hourlyData,
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
