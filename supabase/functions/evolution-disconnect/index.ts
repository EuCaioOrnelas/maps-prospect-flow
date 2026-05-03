import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url: normalizeApiUrl(url), apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url: normalizeApiUrl(url), apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByNumber(supabase: any, numberId: string | null): Promise<EvolutionCredentials> {
  if (!numberId) return getEvolutionCredentials('free');
  const { data } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).single();
  return getEvolutionCredentials(data?.api_tier || 'free');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  for (const tier of ['free', 'paid'] as const) {
    try {
      const creds = getEvolutionCredentials(tier);
      await fetch(`${creds.url}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': creds.apiKey },
      }).catch(() => null);
      const deleteResponse = await fetch(`${creds.url}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': creds.apiKey },
      });
      console.log(`Delete ${instanceName} from ${tier} API response status:`, deleteResponse.status);
    } catch (e) {
      console.log(`Instance ${instanceName} not found on ${tier} API (expected):`, e);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body = await req.json();
    const { instanceName, numberId: rawNumberId, deleteInstance = false, preserveNumberRecord = false } = body;
    const numberId = rawNumberId && rawNumberId !== 'null' ? rawNumberId : null;

    // Get the correct Evolution API based on the number's api_tier
    const evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`Disconnecting instance: ${instanceName} on ${evoCredentials.tier} API, deleteInstance: ${deleteInstance}, preserveNumberRecord: ${preserveNumberRecord}`);

    // Always logout from WhatsApp session
    try {
      const logoutResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });
      console.log('Logout response status:', logoutResponse.status);
    } catch (e) {
      console.error('Error during logout:', e);
    }

    // Only delete the Evolution instance if explicitly requested
    if (deleteInstance) {
      // Try logout + delete from BOTH APIs (free + paid) to avoid orphan internal instances
      await deleteEvolutionInstance(instanceName);

      // Unlink proxy before deleting
      let savedPhoneNumber: string | null = null;
      try {
        const { data: numberData } = numberId
          ? await supabase
              .from('whatsapp_numbers')
              .select('proxy_id, phone_number')
              .eq('id', numberId)
              .single()
          : { data: null };
        
        savedPhoneNumber = numberData?.phone_number || null;

        if (numberData?.proxy_id) {
          // Decrement proxy assigned count
          const { data: proxyData } = await supabase
            .from('whatsapp_proxies')
            .select('assigned_numbers_count')
            .eq('id', numberData.proxy_id)
            .single();
          
          if (proxyData) {
            await supabase
              .from('whatsapp_proxies')
              .update({ assigned_numbers_count: Math.max(0, (proxyData.assigned_numbers_count || 1) - 1) })
              .eq('id', numberData.proxy_id);
          }
        }
      } catch (e) {
        console.error('Error unlinking proxy:', e);
      }

      // PRESERVE warming sessions: unlink but keep original status (phone_key enables re-linking on reconnection)
      try {
        const phoneDigits = (savedPhoneNumber || '').replace(/\D/g, '');
        const phoneKey = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : null;
        
        const { data: warmingSessions } = numberId
          ? await supabase
              .from('warming_sessions')
              .select('id, status')
              .eq('whatsapp_number_id', numberId)
          : { data: [] };
        
        if (warmingSessions && warmingSessions.length > 0) {
          // For completed sessions, preserve status as-is; only pause active ones
          const activeSessions = warmingSessions.filter((s: any) => s.status === 'active');
          const otherSessions = warmingSessions.filter((s: any) => s.status !== 'active');
          
          // Pause active sessions
          if (activeSessions.length > 0) {
            await supabase
              .from('warming_sessions')
              .update({
                status: 'paused',
                paused_at: new Date().toISOString(),
                error_message: 'Número removido - reconecte o mesmo chip para retomar',
                whatsapp_number_id: null,
                ...(phoneKey ? { phone_key: phoneKey } : {})
              })
              .in('id', activeSessions.map((s: any) => s.id));
          }
          
          // For completed/other sessions, just unlink without changing status
          if (otherSessions.length > 0) {
            await supabase
              .from('warming_sessions')
              .update({
                whatsapp_number_id: null,
                ...(phoneKey ? { phone_key: phoneKey } : {})
              })
              .in('id', otherSessions.map((s: any) => s.id));
          }
          
          // Also unlink search assignments
          await supabase
            .from('warming_search_assignments')
            .update({ whatsapp_number_id: null })
            .eq('whatsapp_number_id', numberId);
          
          console.log(`Preserved ${warmingSessions.length} warming session(s) with phone_key: ${phoneKey} (${activeSessions.length} paused, ${otherSessions.length} kept original status)`);
        }
      } catch (e) {
        console.error('Error preserving warming sessions:', e);
      }

      const { error: updateError } = numberId && !preserveNumberRecord
        ? await supabase
            .from('whatsapp_numbers')
            .update({ 
              is_connected: false,
              phone_number: null,
              instance_name: null,
              proxy_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', numberId)
        : { error: null };

      if (updateError) {
        console.error('Error updating number status:', updateError);
      }
    } else {
      const { error: updateError } = numberId
        ? await supabase
            .from('whatsapp_numbers')
            .update({ 
              is_connected: false,
              phone_number: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', numberId)
        : { error: null };

      if (updateError) {
        console.error('Error updating number status:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: deleteInstance ? 'Instance deleted successfully' : 'Instance disconnected (preserved for reconnection)',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-disconnect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
