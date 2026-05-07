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
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByUser(supabase: any, userId: string): Promise<EvolutionCredentials> {
  const { data } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  return getEvolutionCredentials(data?.plan || 'free');
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { instanceName } = await req.json();

    // Get the correct Evolution API based on user's plan
    const evoCredentials = await getEvolutionCredentialsByUser(supabase, user.id);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    if (!instanceName) {
      throw new Error('Instance name is required');
    }

    console.log(`Reconfiguring webhook for instance: ${instanceName}`);

    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

    // IMPORTANT: must match EXACTLY the payload used by evolution-webhook auto-config
    // and evolution-reconnect. Mismatched values cause Evolution to re-set the
    // webhook (which restarts the Baileys socket → disconnect loop).
    const webhookEvents = [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_EDIT",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED",
    ];

    const webhookConfig = {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: true,
      events: webhookEvents,
    };

    // ─── IDEMPOTENCY GUARD ──────────────────────────────────────────────────
    // If the webhook is ALREADY pointing at our URL with the same flags, skip
    // the /webhook/set call entirely. Each call to /webhook/set restarts the
    // underlying Baileys socket on this Evolution version, so re-running it
    // unnecessarily (e.g. on every agent save) is the #1 cause of a connected
    // number disconnecting a few minutes later.
    try {
      const findUrls = [
        `${EVOLUTION_API_URL}/webhook/find/${instanceName}`,
        `${EVOLUTION_API_URL}/instance/fetchWebhook/${instanceName}`,
      ];
      for (const fu of findUrls) {
        const r = await fetch(fu, { method: 'GET', headers: { apikey: EVOLUTION_API_KEY } });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const w = j?.webhook ?? j;
        const currentUrl = w?.url;
        const currentEnabled = w?.enabled;
        const currentByEvents = w?.webhookByEvents;
        const currentBase64 = w?.webhookBase64;
        if (
          currentEnabled === true &&
          currentUrl === webhookUrl &&
          currentByEvents === false &&
          currentBase64 === true
        ) {
          console.log(`✅ Webhook already correctly configured for ${instanceName} — skipping set to avoid socket restart`);
          return new Response(JSON.stringify({
            success: true,
            skipped: true,
            webhookUrl,
            message: 'Webhook já está corretamente configurado.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        break;
      }
    } catch (e) {
      console.log('webhook find check failed (non-blocking):', e);
    }

    let webhookConfigured = false;
    let responseData = null;
    let successEndpoint = null;
    
    const endpoints = [
      // Format 1: webhook/set with nested webhook object (most common for Evolution API)
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          webhook: webhookConfig,
        }
      },
      // Format 2: Direct properties (some versions)
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
        method: 'POST',
        body: webhookConfig
      },
      // Format 3: webhook/instance endpoint
      {
        url: `${EVOLUTION_API_URL}/webhook/instance/${instanceName}`,
        method: 'POST',
        body: {
          webhook: webhookConfig,
        }
      },
      // Format 4: PUT to webhook
      {
        url: `${EVOLUTION_API_URL}/webhook/${instanceName}`,
        method: 'PUT',
        body: {
          webhook: webhookConfig,
        }
      },
      // Format 5: settings endpoint  
      {
        url: `${EVOLUTION_API_URL}/settings/${instanceName}`,
        method: 'PUT',
        body: {
          webhook: webhookConfig,
        }
      }
    ];

    for (const endpoint of endpoints) {
      if (webhookConfigured) break;
      
      try {
        console.log(`Trying webhook endpoint: ${endpoint.method} ${endpoint.url}`);
        console.log(`Payload: ${JSON.stringify(endpoint.body)}`);
        
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify(endpoint.body),
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}, body: ${responseText.substring(0, 300)}`);

        if (response.ok || response.status === 201) {
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }
          console.log('Webhook configured successfully via:', endpoint.url);
          webhookConfigured = true;
          successEndpoint = endpoint.url;
        }
      } catch (e) {
        console.log(`Endpoint ${endpoint.url} failed:`, e);
      }
    }

    // Get current webhook config to verify
    let currentConfig = null;
    const findEndpoints = [
      `${EVOLUTION_API_URL}/webhook/find/${instanceName}`,
      `${EVOLUTION_API_URL}/instance/fetchWebhook/${instanceName}`,
      `${EVOLUTION_API_URL}/webhook/${instanceName}`,
      `${EVOLUTION_API_URL}/settings/${instanceName}`,
      `${EVOLUTION_API_URL}/instance/settings/${instanceName}`
    ];

    for (const findUrl of findEndpoints) {
      try {
        const findResponse = await fetch(findUrl, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });
        
        if (findResponse.ok) {
          currentConfig = await findResponse.json();
          console.log('Current webhook config from', findUrl, ':', JSON.stringify(currentConfig));
          break;
        }
      } catch (e) {
        console.log(`Could not fetch webhook config from ${findUrl}:`, e);
      }
    }

    return new Response(JSON.stringify({
      success: webhookConfigured,
      webhookUrl: webhookUrl,
      successEndpoint: successEndpoint,
      currentConfig: currentConfig,
      responseData: responseData,
      message: webhookConfigured 
        ? 'Webhook sincronizado com sucesso!' 
        : 'Webhook não pôde ser reconfigurado. Tente desconectar e reconectar o número.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-reconfigure-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
