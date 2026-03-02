import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
    console.warn(`Plan is ${normalized} but PAID credentials not found, falling back to free`);
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByNumber(supabase: any, numberId: string | null): Promise<EvolutionCredentials> {
  if (numberId) {
    const { data, error } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).single();
    console.log(`getEvolutionCredentialsByNumber(${numberId}): api_tier=${data?.api_tier}, error=${error?.message || 'none'}`);
    if (data?.api_tier) return getEvolutionCredentials(data.api_tier);
  }
  return getEvolutionCredentials(null);
}
async function getEvolutionCredentialsByUser(supabase: any, userId: string): Promise<EvolutionCredentials> {
  const { data, error } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  const plan = data?.plan || 'free';
  console.log(`getEvolutionCredentialsByUser(${userId}): plan=${plan}, error=${error?.message || 'none'}`);
  return getEvolutionCredentials(plan);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'No authorization header',
        connected: false,
        requiresReauth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Invalid or expired user token:', userError?.message);
      return new Response(JSON.stringify({ 
        error: 'Session expired. Please refresh the page.',
        connected: false,
        requiresReauth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { instanceName } = body;
    // Treat "null" string as actual null
    const numberId = body.numberId && body.numberId !== 'null' ? body.numberId : null;

    // Get the correct Evolution API
    // ALWAYS check user plan first (most reliable), then fall back to number's api_tier
    let evoCredentials: EvolutionCredentials;
    
    // Primary: use user's plan from profiles (always up-to-date)
    evoCredentials = await getEvolutionCredentialsByUser(supabase, user.id);
    
    // If user plan says free but number has paid tier, use number's tier
    if (evoCredentials.tier === 'free' && numberId) {
      const numberCreds = await getEvolutionCredentialsByNumber(supabase, numberId);
      if (numberCreds.tier === 'paid') {
        console.log('User plan is free but number has paid tier, using paid credentials');
        evoCredentials = numberCreds;
      }
    }

    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`Checking status for instance: ${instanceName} on ${evoCredentials.tier} API (user: ${user.id})`);

    // Check connection status with retry logic
    let statusResponse: Response | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (statusResponse.ok) break;
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Retry ${retryCount}/${maxRetries} for status check...`);
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e) {
        console.error(`Fetch error attempt ${retryCount}:`, e);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    // If primary API failed and we haven't tried the other one, try it
    if ((!statusResponse || !statusResponse.ok) && evoCredentials.tier === 'free') {
      // Maybe the instance is on paid API - try paid credentials
      const paidUrl = Deno.env.get('EVOLUTION_API_URL_PAID');
      const paidKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
      if (paidUrl && paidKey) {
        console.log('Instance not found on free API, trying paid API as fallback...');
        try {
          const fallbackResponse = await fetch(`${paidUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': paidKey },
          });
          if (fallbackResponse.ok) {
            statusResponse = fallbackResponse;
            // Update credentials for phone number fetch later
            evoCredentials = { url: paidUrl, apiKey: paidKey, tier: 'paid' };
            console.log('Found instance on paid API!');
          }
        } catch (e) {
          console.log('Paid API fallback also failed:', e);
        }
      }
    } else if ((!statusResponse || !statusResponse.ok) && evoCredentials.tier === 'paid') {
      // Maybe the instance is on free API - try free credentials
      const freeUrl = Deno.env.get('EVOLUTION_API_URL');
      const freeKey = Deno.env.get('EVOLUTION_API_KEY');
      if (freeUrl && freeKey) {
        console.log('Instance not found on paid API, trying free API as fallback...');
        try {
          const fallbackResponse = await fetch(`${freeUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': freeKey },
          });
          if (fallbackResponse.ok) {
            statusResponse = fallbackResponse;
            evoCredentials = { url: freeUrl, apiKey: freeKey, tier: 'free' };
            console.log('Found instance on free API!');
          }
        } catch (e) {
          console.log('Free API fallback also failed:', e);
        }
      }
    }

    if (!statusResponse || !statusResponse.ok) {
      const errorText = statusResponse ? await statusResponse.text() : 'No response';
      console.error('Evolution API error after retries:', errorText);
      
      console.log(`⚠️ Instance ${instanceName} might not exist, but NOT updating database`);

      return new Response(JSON.stringify({
        success: false,
        connected: null,
        state: 'unknown',
        phoneNumber: null,
        error: 'Could not verify instance - will retry later'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusData = await statusResponse.json();
    console.log('Status response:', JSON.stringify(statusData));

    const state = statusData.state || statusData.instance?.state;
    const isConnected = state === 'open';
    
    if (!isConnected) {
      console.log(`Instance ${instanceName} is not connected (state: ${state}).`);

      // Only mark as disconnected for definitive 'close' state
      // 'connecting' is transient — WhatsApp often recovers automatically
      if (numberId && state === 'close') {
        console.log(`⚠️ Marking ${instanceName} as disconnected (state: ${state})`);
        const { error: updateErr } = await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        if (updateErr) {
          console.error('Error marking number as disconnected:', updateErr);
        }
      }

      // For 'connecting' state, return null (uncertain) so frontend keeps previous state
      const isDefinitelyDisconnected = state === 'close';

      return new Response(JSON.stringify({
        success: true,
        connected: isDefinitelyDisconnected ? false : null,
        state: state || 'unknown',
        phoneNumber: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se conectado, obter o número de telefone
    let phoneNumber = null;
    try {
      const infoResponse = await fetch(`${evoCredentials.url}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evoCredentials.apiKey,
        },
      });
      
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        console.log('Instance info:', JSON.stringify(infoData));
        
        if (infoData && infoData.length > 0) {
          phoneNumber = infoData[0].owner || infoData[0].instance?.owner;
        }
      }
    } catch (e) {
      console.error('Error fetching instance info:', e);
    }

    // Update database with connected status (only if numberId exists)
    if (numberId) {
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: true,
          phone_number: phoneNumber,
          api_tier: evoCredentials.tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating number status:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      connected: true,
      state: state,
      phoneNumber: phoneNumber,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-check-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      connected: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});