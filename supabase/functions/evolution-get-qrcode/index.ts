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
async function getEvolutionCredentialsByUser(supabase: any, userId: string): Promise<EvolutionCredentials> {
  const { data } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  return getEvolutionCredentials(data?.plan || 'free');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

    const { instanceName, phoneNumber, numberId } = await req.json();

    // Get the correct Evolution API based on the number's api_tier
    let EVOLUTION_API_URL: string;
    let EVOLUTION_API_KEY: string;
    
    if (numberId) {
      const evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);
      EVOLUTION_API_URL = evoCredentials.url;
      EVOLUTION_API_KEY = evoCredentials.apiKey;
      console.log(`Getting QR Code on ${evoCredentials.tier} API`);
    } else {
      // Fallback: use user's plan
      const evoCredentials = await getEvolutionCredentialsByUser(supabase, user.id);
      EVOLUTION_API_URL = evoCredentials.url;
      EVOLUTION_API_KEY = evoCredentials.apiKey;
    }

    console.log(`Getting QR Code for instance: ${instanceName}, phoneNumber: ${phoneNumber || 'not provided'}`);

    // Format phone number if provided
    const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    let formattedNumber = cleanNumber;
    if (cleanNumber && !cleanNumber.startsWith('55')) {
      formattedNumber = '55' + cleanNumber;
    }

    // Retry connect endpoint with delays
    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [0, 3000, 3000, 4000, 5000];
    
    let qrcode: string | null = null;
    let pairingCode: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (RETRY_DELAYS[attempt] > 0) {
        console.log(`Waiting ${RETRY_DELAYS[attempt]}ms before attempt ${attempt + 1}...`);
        await sleep(RETRY_DELAYS[attempt]);
      }

      let connectUrl = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;
      if (formattedNumber) {
        connectUrl += `?number=${formattedNumber}`;
      }

      console.log(`Connect attempt ${attempt + 1}/${MAX_RETRIES}: GET ${connectUrl}`);

      const qrResponse = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error(`Connect attempt ${attempt + 1} error (${qrResponse.status}):`, errorText);
        continue;
      }

      const qrData = await qrResponse.json();
      console.log(`Connect attempt ${attempt + 1} response:`, JSON.stringify(qrData).substring(0, 500));

      if (qrData.pairingCode && qrData.pairingCode !== null) {
        pairingCode = String(qrData.pairingCode);
        console.log('Got pairing code:', pairingCode);
      }

      const extractedQr = 
        qrData.base64 ||
        qrData.qrcode?.base64 ||
        qrData.code?.base64 ||
        qrData.code ||
        (typeof qrData.qrcode === 'string' && qrData.qrcode.length > 50 ? qrData.qrcode : null) ||
        null;

      if (extractedQr) {
        qrcode = extractedQr;
        console.log(`Got QR code on attempt ${attempt + 1}! Length: ${String(qrcode).length}`);
        break;
      }

      const count = qrData.count ?? qrData.qrcode?.count;
      console.log(`Attempt ${attempt + 1}: no QR found. count=${count}`);
    }

    console.log('Final result - QR Code exists:', !!qrcode, 'QR length:', qrcode ? String(qrcode).length : 0, 'Pairing Code:', pairingCode);

    return new Response(JSON.stringify({
      success: true,
      qrcode: qrcode,
      pairingCode: pairingCode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-get-qrcode:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
