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

    const { hours = 24 } = await req.json().catch(() => ({}));
    const safeHours = Math.min(Math.max(Number(hours), 1), 72);
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();

    // Query all tables that track edge function activity in parallel
    const [
      heartbeats,
      agentConversations,
      agentMessages,
      warmingSessions,
      warmingInteractions,
      campaignResponses,
      searchHistory,
      subscriptionEvents,
      securityAudit,
      campaignIncidents,
      apiKeyStatus,
    ] = await Promise.all([
      // campaign-processor heartbeats
      supabase.from('campaign_processor_heartbeats')
        .select('id, started_at, completed_at, status, action, campaigns_processed, messages_sent, error_message')
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(200),
      
      // agent-webhook / agent-buffer-processor activity
      supabase.from('agent_conversations')
        .select('id, created_at, updated_at, status, reply_sent')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(200),
      
      // agent message logs
      supabase.from('agent_message_logs')
        .select('id, created_at, direction, message_type')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // warming-processor sessions
      supabase.from('warming_sessions')
        .select('id, updated_at, status, messages_sent_today, error_message, warming_status')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(100),
      
      // warming interactions
      supabase.from('warming_interactions')
        .select('id, created_at, updated_at, status, messages_sent, messages_received')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(200),
      
      // campaign responses (evolution-webhook captures these)
      supabase.from('campaign_responses')
        .select('id, created_at, campaign_id')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // search-leads activity
      supabase.from('search_history')
        .select('id, created_at, keyword, location, results_count')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // stripe-webhook activity
      supabase.from('subscription_events')
        .select('id, created_at, event_type, event_source')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // security audit (various edge functions)
      supabase.from('security_audit_log')
        .select('id, created_at, action, resource_type')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // campaign incidents
      supabase.from('campaign_incidents')
        .select('id, created_at, incident_type')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // API key status checks (check-serp-keys)
      supabase.from('api_key_status')
        .select('id, last_checked_at, status, key_name')
        .gte('last_checked_at', since)
        .order('last_checked_at', { ascending: false })
        .limit(50),
    ]);

    // Build function activity map
    const functions: Record<string, {
      name: string;
      description: string;
      total_events: number;
      success_events: number;
      error_events: number;
      last_activity: string | null;
      recent_events: Array<{ time: string; detail: string; status: 'success' | 'error' | 'info' }>;
    }> = {};

    const addFunction = (name: string, description: string) => {
      if (!functions[name]) {
        functions[name] = { name, description, total_events: 0, success_events: 0, error_events: 0, last_activity: null, recent_events: [] };
      }
      return functions[name];
    };

    const addEvent = (fn: typeof functions[string], time: string, detail: string, status: 'success' | 'error' | 'info') => {
      fn.total_events++;
      if (status === 'success') fn.success_events++;
      if (status === 'error') fn.error_events++;
      if (!fn.last_activity || time > fn.last_activity) fn.last_activity = time;
      if (fn.recent_events.length < 20) {
        fn.recent_events.push({ time, detail, status });
      }
    };

    // campaign-processor
    const cpFn = addFunction('campaign-processor', 'Processador de campanhas WhatsApp');
    for (const h of heartbeats.data || []) {
      const status = h.status === 'completed' ? 'success' : h.status === 'error' ? 'error' : 'info';
      const detail = `${h.action} | ${h.campaigns_processed || 0} campanhas | ${h.messages_sent || 0} msgs${h.error_message ? ` | Erro: ${h.error_message}` : ''}`;
      addEvent(cpFn, h.started_at, detail, status);
    }

    // agent-webhook
    const agentFn = addFunction('agent-webhook', 'Webhook de agentes IA');
    for (const c of agentConversations.data || []) {
      const status = c.status === 'error' ? 'error' : 'success';
      addEvent(agentFn, c.updated_at, `Conversa ${c.status}${c.reply_sent ? ' (resposta enviada)' : ''}`, status);
    }

    // agent-buffer-processor
    const bufferFn = addFunction('agent-buffer-processor', 'Processador de buffer de mensagens');
    for (const m of agentMessages.data || []) {
      addEvent(bufferFn, m.created_at, `${m.direction} | ${m.message_type}`, 'success');
    }

    // warming-processor
    const warmFn = addFunction('warming-processor', 'Processador de aquecimento');
    for (const s of warmingSessions.data || []) {
      const status = s.error_message ? 'error' : 'success';
      addEvent(warmFn, s.updated_at, `Sessão ${s.warming_status} | ${s.messages_sent_today} msgs hoje${s.error_message ? ` | Erro: ${s.error_message}` : ''}`, status);
    }
    for (const w of warmingInteractions.data || []) {
      addEvent(warmFn, w.updated_at, `Interação ${w.status} | ${w.messages_sent} enviadas | ${w.messages_received} recebidas`, 'success');
    }

    // evolution-webhook (inferred from campaign responses)
    const evoFn = addFunction('evolution-webhook', 'Webhook Evolution API (mensagens recebidas)');
    for (const r of campaignResponses.data || []) {
      addEvent(evoFn, r.created_at, `Resposta campanha ${r.campaign_id?.slice(0, 8)}`, 'success');
    }

    // search-leads
    const searchFn = addFunction('search-leads', 'Busca de leads no Google Maps');
    for (const s of searchHistory.data || []) {
      addEvent(searchFn, s.created_at, `"${s.keyword}" em ${s.location} → ${s.results_count} resultados`, 'success');
    }

    // stripe-webhook
    const stripeFn = addFunction('stripe-webhook', 'Webhook do Stripe (pagamentos)');
    for (const e of subscriptionEvents.data || []) {
      addEvent(stripeFn, e.created_at, `${e.event_type} (${e.event_source})`, 'success');
    }

    // check-serp-keys
    const serpFn = addFunction('check-serp-keys', 'Verificação de chaves SERP API');
    for (const k of apiKeyStatus.data || []) {
      const status = k.status === 'active' ? 'success' : 'error';
      addEvent(serpFn, k.last_checked_at, `${k.key_name}: ${k.status}`, status);
    }

    // campaign incidents (evolution-run-campaign errors)
    const runFn = addFunction('evolution-run-campaign', 'Execução de campanhas');
    for (const i of campaignIncidents.data || []) {
      addEvent(runFn, i.created_at, `Incidente: ${i.incident_type}`, 'error');
    }

    // security / audit trail
    const auditCount = (securityAudit.data || []).length;
    if (auditCount > 0) {
      const auditFn = addFunction('security-audit', 'Logs de segurança e auditoria');
      for (const a of securityAudit.data || []) {
        addEvent(auditFn, a.created_at, `${a.action} → ${a.resource_type}`, 'info');
      }
    }

    // Sort recent_events by time desc
    for (const fn of Object.values(functions)) {
      fn.recent_events.sort((a, b) => b.time.localeCompare(a.time));
    }

    // Convert to array and sort by activity
    const functionStats = Object.values(functions)
      .filter(f => f.total_events > 0)
      .sort((a, b) => b.total_events - a.total_events);

    // Build recent timeline (all functions merged)
    const allRecentEvents = Object.values(functions)
      .flatMap(fn => fn.recent_events.map(e => ({ ...e, function_name: fn.name })))
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 100);

    // Compute totals
    const totals = {
      total_events: functionStats.reduce((sum, f) => sum + f.total_events, 0),
      total_errors: functionStats.reduce((sum, f) => sum + f.error_events, 0),
      total_success: functionStats.reduce((sum, f) => sum + f.success_events, 0),
      active_functions: functionStats.length,
    };

    return new Response(JSON.stringify({
      hours_queried: safeHours,
      totals,
      function_stats: functionStats,
      recent_events: allRecentEvents,
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
