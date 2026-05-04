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

async function getEvolutionCredentialsForNumber(supabase: any, numberId: string, userId: string): Promise<EvolutionCredentials> {
  // Try number's api_tier first
  const { data: numberRow } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).maybeSingle();
  if (numberRow?.api_tier) {
    return getEvolutionCredentials(numberRow.api_tier);
  }
  // Fall back to user's plan
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
  const credentials = getEvolutionCredentials(profile?.plan);
  // Self-heal: persist inferred tier
  if (numberId) {
    await supabase.from('whatsapp_numbers').update({ api_tier: credentials.tier, updated_at: new Date().toISOString() }).eq('id', numberId);
  }
  return credentials;
}
// Re-link orphaned warming sessions when a number reconnects (match by phone_key)
async function relinkWarmingSessions(supabase: any, numberId: string, userId: string) {
  try {
    // Get the phone_number of the reconnected number
    const { data: numberData } = await supabase
      .from('whatsapp_numbers')
      .select('phone_number')
      .eq('id', numberId)
      .single();

    const phoneNumber = numberData?.phone_number || '';
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const phoneKey = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : null;
    if (!phoneKey) return;

    // Find orphaned sessions with matching phone_key
    const { data: orphanedSessions } = await supabase
      .from('warming_sessions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('phone_key', phoneKey)
      .is('whatsapp_number_id', null);

    if (orphanedSessions && orphanedSessions.length > 0) {
      // Separate paused sessions (need reactivation) from completed/other (just re-link)
      const pausedSessions = orphanedSessions.filter((s: any) => s.status === 'paused');
      const otherSessions = orphanedSessions.filter((s: any) => s.status !== 'paused');

      // Re-activate paused sessions
      if (pausedSessions.length > 0) {
        await supabase
          .from('warming_sessions')
          .update({
            whatsapp_number_id: numberId,
            status: 'active',
            paused_at: null,
            error_message: null,
          })
          .in('id', pausedSessions.map((s: any) => s.id));
      }

      // Re-link completed/other sessions without changing their status
      if (otherSessions.length > 0) {
        await supabase
          .from('warming_sessions')
          .update({
            whatsapp_number_id: numberId,
            error_message: null,
          })
          .in('id', otherSessions.map((s: any) => s.id));
      }

      // Re-link search assignments too
      await supabase
        .from('warming_search_assignments')
        .update({ whatsapp_number_id: numberId })
        .eq('user_id', userId)
        .is('whatsapp_number_id', null);

      console.log(`Re-linked ${orphanedSessions.length} warming session(s) to number ${numberId} via phone_key ${phoneKey}`);
    }
  } catch (e) {
    console.error('Error re-linking warming sessions:', e);
  }
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
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { instanceName, numberId, forceReset } = await req.json();

    // Get the correct Evolution API based on the number's api_tier WITH user plan fallback
    const evoCredentials = await getEvolutionCredentialsForNumber(supabase, numberId, user.id);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`Reconnecting instance: ${instanceName} on ${evoCredentials.tier} API`);

    // Step 1: Check if instance exists — try primary API first, then fallback
    let instanceExists = false;
    let effectiveUrl = EVOLUTION_API_URL;
    let effectiveKey = EVOLUTION_API_KEY;
    let effectiveTier: 'free' | 'paid' = evoCredentials.tier;

    const instanceResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': EVOLUTION_API_KEY },
    });

    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      instanceExists = instances && instances.length > 0;
    }

    // If not found on primary API, try the other one
    if (!instanceExists) {
      const altRawUrl = evoCredentials.tier === 'paid' ? Deno.env.get('EVOLUTION_API_URL') : Deno.env.get('EVOLUTION_API_URL_PAID');
      const altKey = evoCredentials.tier === 'paid' ? Deno.env.get('EVOLUTION_API_KEY') : Deno.env.get('EVOLUTION_API_KEY_PAID');
      const altUrl = altRawUrl ? normalizeApiUrl(altRawUrl) : null;
      if (altUrl && altKey) {
        try {
          const altResponse = await fetch(`${altUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': altKey },
          });
          if (altResponse.ok) {
            const altInstances = await altResponse.json();
            if (altInstances && altInstances.length > 0) {
              instanceExists = true;
              effectiveUrl = altUrl;
              effectiveKey = altKey;
              effectiveTier = evoCredentials.tier === 'paid' ? 'free' : 'paid';
              console.log(`Instance found on ${effectiveTier} API fallback`);
            }
          }
        } catch (e) {
          console.log('Fallback API check failed:', e);
        }
      }
    }

    if (numberId && effectiveTier !== evoCredentials.tier) {
      await supabase
        .from('whatsapp_numbers')
        .update({ api_tier: effectiveTier, updated_at: new Date().toISOString() })
        .eq('id', numberId)
        .eq('user_id', user.id);
    }

    console.log(`Instance ${instanceName} exists: ${instanceExists}`);

    // Step 1.5: If instance exists but is stuck in "connecting" (or forceReset),
    // do a full reset (logout + delete) so a fresh QR can be generated.
    // Stuck-in-connecting is the #1 cause of "I scan but it disconnects right after".
    if (instanceExists) {
      let stuckConnecting = !!forceReset;
      try {
        const stateResp = await fetch(`${effectiveUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': effectiveKey },
        });
        if (stateResp.ok) {
          const stateData = await stateResp.json();
          const currentState = stateData?.state || stateData?.instance?.state;
          console.log(`Current Evolution state for ${instanceName}: ${currentState}`);
          // If never reached 'open' OR is currently connecting (and DB says not connected),
          // recycle the instance to break the Baileys re-pair loop.
          if (currentState === 'connecting' || currentState === 'close') {
            // Cross-check DB: only reset if the number isn't actually connected from our POV
            const { data: numRow } = await supabase
              .from('whatsapp_numbers')
              .select('is_connected')
              .eq('id', numberId)
              .maybeSingle();
            if (!numRow?.is_connected || forceReset) {
              stuckConnecting = true;
            }
          }
        }
      } catch (e) {
        console.log('connectionState check failed:', e);
      }

      if (stuckConnecting) {
        console.log(`♻️ Resetting stuck instance ${instanceName} (logout + delete + recreate)`);
        try {
          await fetch(`${effectiveUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': effectiveKey },
          });
        } catch (e) { console.log('logout failed (ok if not logged in):', e); }
        try {
          await fetch(`${effectiveUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': effectiveKey },
          });
        } catch (e) { console.log('delete failed:', e); }
        // Small wait so Evolution releases the slot
        await new Promise((r) => setTimeout(r, 1500));
        instanceExists = false; // force re-create below
      }
    }

    // Step 2: If instance doesn't exist, recreate it
    if (!instanceExists) {
      console.log('Creating new instance...');
      
      const createResponse = await fetch(`${effectiveUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': effectiveKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('Failed to create instance:', error);
        throw new Error('Failed to create instance');
      }

      const createData = await createResponse.json();
      console.log('Instance created:', JSON.stringify(createData));
    }

    // Step 3: Configure webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
    const webhookEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_EDIT", "CONNECTION_UPDATE", "QRCODE_UPDATED"];
    
    const webhookEndpoints = [
      {
        url: `${effectiveUrl}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: webhookEvents
          }
        }
      },
      {
        url: `${effectiveUrl}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: webhookEvents
        }
      }
    ];

    for (const endpoint of webhookEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': effectiveKey,
          },
          body: JSON.stringify(endpoint.body),
        });
        if (response.ok) {
          console.log('Webhook configured successfully');
          break;
        }
      } catch (e) {
        console.error('Webhook config attempt failed:', e);
      }
    }

    // Step 4: Try to connect/restart the instance
    const connectResponse = await fetch(`${effectiveUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': effectiveKey },
    });

    let qrCode = null;
    let needsQR = false;

    if (connectResponse.ok) {
      const connectData = await connectResponse.json();
      console.log('Connect response:', JSON.stringify(connectData));

      if (connectData.base64 || connectData.qrcode?.base64) {
        qrCode = connectData.base64 || connectData.qrcode?.base64;
        needsQR = true;
      } else if (connectData.instance?.state === 'open') {
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: true,
            api_tier: effectiveTier,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        // Re-link orphaned warming sessions via phone_key
        await relinkWarmingSessions(supabase, numberId, user.id);

        return new Response(JSON.stringify({
          success: true,
          connected: true,
          needsQR: false,
          apiTier: effectiveTier,
          message: 'Already connected'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 5: Check current state
    const statusResponse = await fetch(`${effectiveUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': effectiveKey },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const state = statusData.state || statusData.instance?.state;
      
      if (state === 'open') {
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: true,
            api_tier: effectiveTier,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        // Re-link orphaned warming sessions via phone_key
        await relinkWarmingSessions(supabase, numberId, user.id);

        return new Response(JSON.stringify({
          success: true,
          connected: true,
          needsQR: false,
          apiTier: effectiveTier,
          message: 'Reconnected successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 6: If not connected, get QR code
    if (!qrCode) {
      const qrResponse = await fetch(`${effectiveUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': effectiveKey },
      });

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        qrCode = qrData.base64 || qrData.qrcode?.base64;
        needsQR = !!qrCode;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      connected: false,
      needsQR: needsQR,
      apiTier: effectiveTier,
      qrCode: qrCode,
      message: needsQR ? 'QR code required for reconnection' : 'Attempting to reconnect...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-reconnect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});