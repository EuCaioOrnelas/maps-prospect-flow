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

    // Ensure number has country code (Brazil = 55)
    let formattedNumber = cleanNumber;
    if (cleanNumber && !cleanNumber.startsWith('55')) {
      formattedNumber = '55' + cleanNumber;
    }

    console.log(`Requesting QR/pairing for instance: ${instanceName}, number: ${formattedNumber || 'not provided'}`);

    // First, try to get QR code (and pairing code if number provided)
    // Evolution API v2 requires the number parameter in the query string
    let connectUrl = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;
    if (formattedNumber) {
      connectUrl += `?number=${formattedNumber}`;
    }

    const qrResponse = await fetch(connectUrl, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error('Evolution API connect error:', errorText);
      throw new Error(`Failed to get QR code: ${errorText}`);
    }

    const qrData = await qrResponse.json();
    console.log('Connect response keys:', Object.keys(qrData));
    console.log('Connect response full:', JSON.stringify(qrData).substring(0, 1000));
    console.log('pairingCode value:', qrData.pairingCode);

    // The Evolution API should return pairingCode when number is provided
    let pairingCode = null;
    if (qrData.pairingCode && qrData.pairingCode !== null) {
      pairingCode = String(qrData.pairingCode);
      console.log('Got pairing code:', pairingCode);
    } else if (formattedNumber) {
      console.warn('No pairing code returned despite number being provided. Number format:', formattedNumber);
    }

    // Extract QR code base64 - try all known response formats
    const qrcode = qrData.base64 || 
                   qrData.qrcode?.base64 || 
                   qrData.code?.base64 ||
                   qrData.code ||
                   (typeof qrData.qrcode === 'string' ? qrData.qrcode : null) ||
                   null;

    console.log('Final result - QR Code exists:', !!qrcode, 'QR Code length:', qrcode ? String(qrcode).length : 0, 'Pairing Code:', pairingCode);

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
