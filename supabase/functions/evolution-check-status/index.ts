import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
// Normalize URL: remove trailing slashes and /manager suffix
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const rawUrl = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (rawUrl && apiKey) { const url = normalizeApiUrl(rawUrl); console.log(`[evo-config] Paid URL normalized: ${url}`); return { url, apiKey, tier: 'paid' }; }
    console.warn(`Plan is ${normalized} but PAID credentials not found, falling back to free`);
  }
  const rawUrl = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!rawUrl || !apiKey) throw new Error('Evolution API credentials not configured');
  const url = normalizeApiUrl(rawUrl);
  return { url, apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByNumber(supabase: any, numberId: string | null): Promise<EvolutionCredentials | null> {
  if (!numberId) return null;

  const { data, error } = await supabase
    .from('whatsapp_numbers')
    .select('api_tier')
    .eq('id', numberId)
    .single();

  console.log(`getEvolutionCredentialsByNumber(${numberId}): api_tier=${data?.api_tier}, error=${error?.message || 'none'}`);

  if (!data?.api_tier) return null;
  return getEvolutionCredentials(data.api_tier);
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
      console.log(`Deleted stale instance ${instanceName} from ${tier} API: ${deleteResponse.status}`);
    } catch (e) {
      console.log(`Stale instance ${instanceName} not found on ${tier} API:`, e);
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
    // Prefer number tier first (more accurate per instance), fallback to user plan
    let evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);

    if (!evoCredentials) {
      evoCredentials = await getEvolutionCredentialsByUser(supabase, user.id);
      console.log(`No api_tier for number ${numberId || 'n/a'}, using user plan tier: ${evoCredentials.tier}`);
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
      const paidRawUrl = Deno.env.get('EVOLUTION_API_URL_PAID');
      const paidKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
      const paidUrl = paidRawUrl ? normalizeApiUrl(paidRawUrl) : null;
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
      const freeRawUrl = Deno.env.get('EVOLUTION_API_URL');
      const freeKey = Deno.env.get('EVOLUTION_API_KEY');
      const freeUrl = freeRawUrl ? normalizeApiUrl(freeRawUrl) : null;
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

    // Validate JSON response
    const contentType = statusResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const rawText = await statusResponse.text();
      console.error('Expected JSON but got:', contentType, 'Preview:', rawText.substring(0, 200));
      return new Response(JSON.stringify({
        success: false, connected: null, state: 'unknown', phoneNumber: null,
        error: 'Evolution API returned non-JSON response'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

      const isDefinitelyDisconnected = state === 'close';

      // Check if instance is STUCK in 'connecting' for too long (>30 min)
      // If so, treat it as disconnected and attempt auto-reconnect
      let isStuckConnecting = false;
      if (state === 'connecting' && numberId) {
        const { data: numberRow } = await supabase
          .from('whatsapp_numbers')
          .select('updated_at, is_connected')
          .eq('id', numberId)
          .single();

        if (numberRow) {
          const lastUpdate = new Date(numberRow.updated_at).getTime();
          const now = Date.now();
          const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
          
          if (minutesSinceUpdate > 30) {
            console.log(`⚠️ Instance ${instanceName} STUCK in connecting for ${Math.round(minutesSinceUpdate)} minutes — forcing reconnect`);
            isStuckConnecting = true;

            // Get phone_number for email notification before updating
            const { data: fullNumberData } = await supabase
              .from('whatsapp_numbers')
              .select('phone_number, user_id')
              .eq('id', numberId)
              .single();

            // Mark as disconnected in DB
            await supabase
              .from('whatsapp_numbers')
              .update({ 
                is_connected: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', numberId)
              .eq('user_id', user.id);

            // Send disconnection email notification
            if (fullNumberData) {
              try {
                await supabase.functions.invoke('send-email', {
                  body: {
                    user_id: fullNumberData.user_id,
                    email_type: 'NUMBER_DISCONNECTED',
                    payload: {
                      phone_number: fullNumberData.phone_number || instanceName,
                      instance_name: instanceName,
                    },
                    idempotency_key: `stuck_disconnect_${numberId}_${new Date().toISOString().slice(0, 13)}`,
                  },
                });
                console.log(`📧 Stuck-connecting disconnection email sent for ${instanceName}`);
              } catch (emailErr) {
                console.error('Failed to send stuck-connecting email:', emailErr);
              }
            }

            // Check if this number has active campaigns before attempting restart
            const { data: activeCampaigns } = await supabase
              .from('whatsapp_campaigns')
              .select('id')
              .eq('whatsapp_number_id', numberId)
              .in('status', ['running', 'paused', 'scheduled', 'postponed', 'pending'])
              .limit(1);

            if (activeCampaigns && activeCampaigns.length > 0) {
              console.log(`⚠️ Instance ${instanceName} stuck but has active campaigns — NOT restarting to avoid disconnection`);
            } else {
              // Safe to restart — no active campaigns
              try {
                const restartResponse = await fetch(`${evoCredentials.url}/instance/restart/${instanceName}`, {
                  method: 'PUT',
                  headers: { 'apikey': evoCredentials.apiKey },
                });
                console.log(`Restart attempt for stuck instance ${instanceName}: ${restartResponse.status}`);
                
                if (!restartResponse.ok) {
                  // If restart fails, try logout + connect to force new QR
                  const logoutResponse = await fetch(`${evoCredentials.url}/instance/logout/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': evoCredentials.apiKey },
                  });
                  console.log(`Logout attempt for stuck instance ${instanceName}: ${logoutResponse.status}`);
                }
              } catch (e) {
                console.error(`Failed to restart stuck instance ${instanceName}:`, e);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        connected: isDefinitelyDisconnected || isStuckConnecting ? false : null,
        state: isStuckConnecting ? 'stuck_connecting' : (state || 'unknown'),
        phoneNumber: null,
        stuckMinutes: isStuckConnecting ? undefined : null,
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

        const instanceInfo = Array.isArray(infoData)
          ? infoData[0]
          : (Array.isArray(infoData?.data) ? infoData.data[0] : infoData?.data || infoData);

        const rawOwner =
          instanceInfo?.owner ||
          instanceInfo?.instance?.owner ||
          instanceInfo?.number ||
          instanceInfo?.instance?.number ||
          instanceInfo?.wuid ||
          instanceInfo?.instance?.wuid ||
          instanceInfo?.instance?.jid ||
          instanceInfo?.jid ||
          null;

        const ownerDigits = rawOwner ? String(rawOwner).replace(/\D/g, '') : '';
        phoneNumber = ownerDigits.length >= 10 ? (ownerDigits.startsWith('55') ? ownerDigits : `55${ownerDigits}`) : null;
      }
    } catch (e) {
      console.error('Error fetching instance info:', e);
    }

    // Update database with connected status (only if numberId exists)
    if (numberId) {
      const updatePayload: Record<string, any> = {
        is_connected: true,
        api_tier: evoCredentials.tier,
        updated_at: new Date().toISOString()
      };

      // Never overwrite phone_number with null/empty values
      if (phoneNumber) {
        updatePayload.phone_number = phoneNumber;
      }

      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update(updatePayload)
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