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
async function getEvolutionCredentialsByNumber(supabase: any, numberId: string): Promise<EvolutionCredentials> {
  const { data } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).single();
  return getEvolutionCredentials(data?.api_tier || 'free');
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

    const { instanceName, numberId } = await req.json();

    // Get the correct Evolution API based on the number's api_tier
    const evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`Reconnecting instance: ${instanceName} on ${evoCredentials.tier} API`);

    console.log(`Attempting to reconnect instance: ${instanceName} on ${evoCredentials.tier} API`);

    // Step 1: Check if instance exists
    const instanceResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    let instanceExists = false;
    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      instanceExists = instances && instances.length > 0;
    }

    console.log(`Instance ${instanceName} exists: ${instanceExists}`);

    // Step 2: If instance doesn't exist, recreate it
    if (!instanceExists) {
      console.log('Creating new instance...');
      
      const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
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
    
    const webhookEndpoints = [
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        }
      },
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
        }
      }
    ];

    for (const endpoint of webhookEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
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
    const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    let qrCode = null;
    let needsQR = false;

    if (connectResponse.ok) {
      const connectData = await connectResponse.json();
      console.log('Connect response:', JSON.stringify(connectData));

      // Check if we got a QR code or if already connected
      if (connectData.base64 || connectData.qrcode?.base64) {
        qrCode = connectData.base64 || connectData.qrcode?.base64;
        needsQR = true;
      } else if (connectData.instance?.state === 'open') {
        // Already connected!
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        return new Response(JSON.stringify({
          success: true,
          connected: true,
          needsQR: false,
          message: 'Already connected'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 5: Check current state
    const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const state = statusData.state || statusData.instance?.state;
      
      if (state === 'open') {
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        return new Response(JSON.stringify({
          success: true,
          connected: true,
          needsQR: false,
          message: 'Reconnected successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 6: If not connected, get QR code
    if (!qrCode) {
      const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
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
