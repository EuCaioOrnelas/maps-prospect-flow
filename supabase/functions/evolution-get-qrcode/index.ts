import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

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

    const { instanceName, phoneNumber } = await req.json();

    console.log(`Getting QR Code for instance: ${instanceName}, phoneNumber: ${phoneNumber || 'not provided'}`);

    // Format phone number if provided
    const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    let formattedNumber = cleanNumber;
    if (cleanNumber && !cleanNumber.startsWith('55')) {
      formattedNumber = '55' + cleanNumber;
    }

    // Retry connect endpoint with delays - the Evolution API needs time to generate QR
    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [0, 3000, 3000, 4000, 5000]; // first call immediate, then wait
    
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

      // Extract pairing code
      if (qrData.pairingCode && qrData.pairingCode !== null) {
        pairingCode = String(qrData.pairingCode);
        console.log('Got pairing code:', pairingCode);
      }

      // Extract QR code base64 - try ALL known response formats
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

      // Check if we got count > 0 but no base64 (QR was generated but not returned)
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
