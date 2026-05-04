import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const rawUrl = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (rawUrl && apiKey) return { url: normalizeApiUrl(rawUrl), apiKey, tier: 'paid' };
  }
  const rawUrl = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!rawUrl || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url: normalizeApiUrl(rawUrl), apiKey, tier: 'free' };
}

async function getEvolutionCredentialsForNumber(
  supabase: any,
  numberData: { api_tier?: string | null; id?: string },
  userId: string
): Promise<EvolutionCredentials> {
  if (numberData?.api_tier) {
    return getEvolutionCredentials(numberData.api_tier);
  }
  // Fall back to user's plan
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
  const credentials = getEvolutionCredentials(profile?.plan);
  // Self-heal: persist inferred tier
  if (numberData?.id) {
    await supabase.from('whatsapp_numbers').update({ api_tier: credentials.tier, updated_at: new Date().toISOString() }).eq('id', numberData.id);
  }
  return credentials;
}

// ─── Email notification helper ─────────────────────────────────────────────
async function sendEmailNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  emailType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<void> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ user_id: userId, email_type: emailType, payload, idempotency_key: idempotencyKey }),
    });
    const data = await res.json();
    console.log(`[email] ${emailType} -> ${res.ok ? 'sent' : 'failed'}`, data);
  } catch (e) {
    console.error(`[email] Failed to send ${emailType}:`, e);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Check if instance is connected (single attempt, fast)
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!statusResponse.ok) {
      return { connected: false, error: `API error: HTTP ${statusResponse.status}` };
    }

    // Validate JSON before parsing
    const contentType = statusResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const preview = await statusResponse.text();
      console.error(`[health-check] Expected JSON but got ${contentType}: ${preview.substring(0, 150)}`);
      return { connected: false, error: `Non-JSON response: ${contentType}` };
    }

    const statusData = await statusResponse.json();
    const state = statusData.state || statusData.instance?.state;
    
    if (state === 'open') {
      return { connected: true };
    }
    
    return { connected: false, error: `Instance state: ${state}` };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Connection check failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[start-scheduled-campaigns] Started at:', new Date().toISOString());

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ─── TRIGGER AGENT BUFFER PROCESSOR (fire-and-forget) ────────────────
  try {
    fetch(`${SUPABASE_URL}/functions/v1/agent-buffer-processor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'cron' }),
    }).catch(err => console.error('[start-scheduled-campaigns] agent-buffer-processor call failed:', err));
  } catch (e) {
    console.error('[start-scheduled-campaigns] agent-buffer-processor trigger error:', e);
  }

  // NOTE: Do NOT trigger campaign-processor from here.
  // It already runs on its own cron (`campaign-processor-cron`, every minute).
  // Calling it again from this function caused TWO concurrent processor runs per minute,
  // which made each lead receive the same message twice (race condition on current_lead_index).

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // NOTE: No periodic health check here — it was causing excessive API calls
    // to Evolution every minute, destabilizing connections. Connection state
    // is managed by evolution-webhook (CONNECTION_UPDATE events) and
    // campaign-processor's own live checks before sending.

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
        scheduled_at,
        total_leads
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('[start-scheduled-campaigns] Fetch error:', fetchError);
      throw fetchError;
    }

    // Also find postponed campaigns that may need to start
    const { data: postponedCampaigns } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        id, 
        name, 
        user_id, 
        whatsapp_number_id,
        leads,
        messages,
        scheduled_at,
        total_leads
      `)
      .eq('status', 'postponed')
      .order('created_at', { ascending: true });

    // Find running campaigns to know which numbers are busy
    const { data: runningCampaigns } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, whatsapp_number_id, updated_at')
      .eq('status', 'running');

    console.log(`[start-scheduled-campaigns] Found ${scheduledCampaigns?.length || 0} scheduled, ${postponedCampaigns?.length || 0} postponed, ${runningCampaigns?.length || 0} running`);

    // Track which numbers have active campaigns
    const numbersWithActiveCampaigns = new Set<string>();
    
    for (const campaign of (runningCampaigns || [])) {
      const lastUpdate = new Date(campaign.updated_at);
      const diffMinutes = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60);
      
      if (diffMinutes < 3) {
        numbersWithActiveCampaigns.add(campaign.whatsapp_number_id);
        console.log(`[start-scheduled-campaigns] Number ${campaign.whatsapp_number_id} has active campaign: ${campaign.name}`);
      } else {
        console.log(`[start-scheduled-campaigns] Campaign ${campaign.name} seems stale (last update ${diffMinutes.toFixed(1)} min ago)`);
      }
    }

    // Build processing queue
    const allToProcess = [...(scheduledCampaigns || [])];
    
    // Also add campaigns that were previously stuck as 'scheduled' with a pause_reason
    // (failed connection check on previous attempt)
    const { data: stuckScheduled } = await supabase
      .from('whatsapp_campaigns')
      .select('id, name, user_id, whatsapp_number_id, leads, messages, scheduled_at, total_leads, pause_reason')
      .eq('status', 'scheduled')
      .not('pause_reason', 'is', null)
      .gt('scheduled_at', '2000-01-01'); // Has a scheduled_at in the past (already checked by main query)
    
    for (const stuck of (stuckScheduled || [])) {
      // Only add if not already in the main scheduled list
      if (!allToProcess.find(c => c.id === stuck.id)) {
        allToProcess.push(stuck);
        console.log(`[start-scheduled-campaigns] Adding STUCK scheduled campaign ${stuck.name} (had pause_reason: ${stuck.pause_reason})`);
      }
    }
    
    for (const postponed of (postponedCampaigns || [])) {
      if (!numbersWithActiveCampaigns.has(postponed.whatsapp_number_id)) {
        allToProcess.push(postponed);
        console.log(`[start-scheduled-campaigns] Adding postponed campaign ${postponed.name} to process queue`);
      }
    }

    if (allToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns to process', processedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    for (const campaign of allToProcess) {
      // Skip if this number already has an active campaign
      if (numbersWithActiveCampaigns.has(campaign.whatsapp_number_id)) {
        console.log(`[start-scheduled-campaigns] Skipping ${campaign.name} - number ${campaign.whatsapp_number_id} already processing`);
        
        if (campaign.scheduled_at) {
          await supabase
            .from('whatsapp_campaigns')
            .update({ 
              status: 'postponed',
              pause_reason: 'Aguardando campanha anterior finalizar neste número'
            })
            .eq('id', campaign.id);
        }
        
        results.push({ id: campaign.id, status: 'postponed', reason: 'Number busy' });
        continue;
      }

      // Mark this number as busy for this run
      numbersWithActiveCampaigns.add(campaign.whatsapp_number_id);
      
      console.log(`[start-scheduled-campaigns] Processing: ${campaign.name} (${campaign.id})`);
      
      // Get the WhatsApp number
      const { data: numberData, error: numberError } = await supabase
        .from('whatsapp_numbers')
        .select('id, instance_name, is_connected, api_tier')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (numberError || !numberData) {
        console.error(`[start-scheduled-campaigns] Number not found for ${campaign.id}`);
        
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'failed', pause_reason: 'Número WhatsApp não encontrado' })
          .eq('id', campaign.id);
        
        numbersWithActiveCampaigns.delete(campaign.whatsapp_number_id);
        results.push({ id: campaign.id, status: 'failed', reason: 'Number not found' });
        
        sendEmailNotification(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, campaign.user_id, 'CAMPAIGN_FAILED_TO_START',
          { campaign_name: campaign.name, reason: 'Número WhatsApp não encontrado' },
          `campaign_failed_${campaign.id}`
        ).catch(() => {});
        
        continue;
      }

      // Resolve Evolution API credentials based on number's api_tier WITH user plan fallback
      const evoCredentials = await getEvolutionCredentialsForNumber(supabase, numberData, campaign.user_id);
      console.log(`[start-scheduled-campaigns] Using ${evoCredentials.tier} Evolution credentials for ${numberData.instance_name}`);

      // Check connection via Evolution API
      const connectionCheck = await checkInstanceConnection(
        evoCredentials.url, 
        evoCredentials.apiKey, 
        numberData.instance_name
      );

      if (!connectionCheck.connected) {
        // If DB says connected, allow start (soft-fail for transient API issues)
        if (numberData.is_connected) {
          console.log(`[start-scheduled-campaigns] ⚠️ Live check failed for ${numberData.instance_name} but DB says connected — allowing start`);
        } else {
          console.log(`[start-scheduled-campaigns] Instance ${numberData.instance_name} not connected: ${connectionCheck.error}`);
          
          // Try to restart the instance to recover stale overnight sessions
          try {
            console.log(`[start-scheduled-campaigns] 🔄 Attempting auto-restart for ${numberData.instance_name}...`);
            const restartResp = await fetch(`${evoCredentials.url}/instance/restart/${numberData.instance_name}`, {
              method: 'PUT',
              headers: { 'apikey': evoCredentials.apiKey },
            });
            console.log(`[start-scheduled-campaigns] Restart response: ${restartResp.status}`);
            
            // Wait a bit and re-check
            await new Promise(r => setTimeout(r, 5000));
            const recheck = await checkInstanceConnection(evoCredentials.url, evoCredentials.apiKey, numberData.instance_name);
            
            if (recheck.connected) {
              console.log(`[start-scheduled-campaigns] ✅ Auto-restart successful for ${numberData.instance_name}! Proceeding with campaign.`);
              // Update DB
              await supabase.from('whatsapp_numbers').update({ 
                is_connected: true, 
                updated_at: new Date().toISOString() 
              }).eq('id', numberData.id);
              // Fall through to start the campaign
            } else {
              // Set status to 'paused' (NOT staying as 'scheduled') so webhook auto-resume can pick it up
              await supabase
                .from('whatsapp_campaigns')
                .update({ 
                  status: 'paused',
                  pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
                  updated_at: new Date().toISOString()
                })
                .eq('id', campaign.id);
              
              numbersWithActiveCampaigns.delete(campaign.whatsapp_number_id);
              results.push({ id: campaign.id, status: 'paused_connection', reason: connectionCheck.error });
              
              sendEmailNotification(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, campaign.user_id, 'CAMPAIGN_FAILED_TO_START',
                { campaign_name: campaign.name, reason: `Número não conectado ao WhatsApp. Reconecte para que a campanha retome automaticamente.` },
                `campaign_conn_${campaign.id}_${Date.now()}`
              ).catch(() => {});
              
              continue;
            }
          } catch (restartErr) {
            console.error(`[start-scheduled-campaigns] Auto-restart failed:`, restartErr);
            
            // Set to paused so webhook auto-resume works
            await supabase
              .from('whatsapp_campaigns')
              .update({ 
                status: 'paused',
                pause_reason: 'WhatsApp desconectado. Reconecte o número para retomar os disparos.',
                updated_at: new Date().toISOString()
              })
              .eq('id', campaign.id);
            
            numbersWithActiveCampaigns.delete(campaign.whatsapp_number_id);
            results.push({ id: campaign.id, status: 'paused_connection', reason: connectionCheck.error });
            continue;
          }
        }
      }

      // Validate leads and messages
      let leads = campaign.leads;
      if (typeof leads === 'string') {
        try { leads = JSON.parse(leads); } catch { leads = []; }
      }
      
      let messages = campaign.messages;
      if (typeof messages === 'string') {
        try { messages = JSON.parse(messages); } catch { messages = []; }
      }

      const validMessages = Array.isArray(messages) ? messages.filter((m: string) => m?.trim()) : [];

      if (!Array.isArray(leads) || leads.length === 0 || validMessages.length === 0) {
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'failed', pause_reason: 'Dados inválidos (leads ou mensagens vazios)' })
          .eq('id', campaign.id);
        
        numbersWithActiveCampaigns.delete(campaign.whatsapp_number_id);
        results.push({ id: campaign.id, status: 'failed', reason: 'Invalid data' });
        
        sendEmailNotification(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, campaign.user_id, 'CAMPAIGN_FAILED_TO_START',
          { campaign_name: campaign.name, reason: 'Dados inválidos (leads ou mensagens vazios)' },
          `campaign_failed_data_${campaign.id}`
        ).catch(() => {});
        
        continue;
      }

      // Clear any stale ignored contacts for this campaign before starting
      // This ensures a clean slate, especially for campaigns that failed previously
      const { data: clearedIgnored } = await supabase
        .from('ignored_contacts')
        .delete()
        .eq('user_id', campaign.user_id)
        .eq('campaign_id', campaign.id)
        .select('id');
      
      if (clearedIgnored?.length) {
        console.log(`[start-scheduled-campaigns] 🧹 Cleared ${clearedIgnored.length} stale ignored contacts before starting campaign`);
      }

      // ✅ Just change status to 'running' — campaign-processor will handle the actual message sending
      const { error: updateError } = await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'running',
          started_at: now,
          pause_reason: null
        })
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`[start-scheduled-campaigns] Failed to update campaign ${campaign.id}:`, updateError);
        numbersWithActiveCampaigns.delete(campaign.whatsapp_number_id);
        results.push({ id: campaign.id, status: 'error', reason: updateError.message });
        continue;
      }

      console.log(`[start-scheduled-campaigns] ✅ Campaign ${campaign.name} set to RUNNING — campaign-processor will handle sending`);

      // Email: campaign started
      sendEmailNotification(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, campaign.user_id, 'CAMPAIGN_SCHEDULED_STARTED',
        { campaign_name: campaign.name, total_leads: leads.length, scheduled_time: campaign.scheduled_at },
        `campaign_started_${campaign.id}`
      ).catch(() => {});

      results.push({ id: campaign.id, status: 'started', leadsCount: leads.length });
    }

    console.log('[start-scheduled-campaigns] Results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[start-scheduled-campaigns] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});