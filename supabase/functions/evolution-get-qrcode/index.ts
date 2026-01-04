import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Build URL with optional phone number for pairing code
    let connectUrl = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;
    if (phoneNumber) {
      // Format phone number: remove non-digits and ensure it starts with country code
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      connectUrl += `?number=${cleanNumber}`;
      console.log(`Requesting pairing code for number: ${cleanNumber}`);
    }

    // Get QR Code (and optionally pairing code) from Evolution API
    const qrResponse = await fetch(connectUrl, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error('Evolution API error:', errorText);
      throw new Error(`Failed to get QR code: ${errorText}`);
    }

    const qrData = await qrResponse.json();
    console.log('QR Code raw response:', JSON.stringify(qrData));

    // Extract pairing code - Evolution API returns it in different formats
    const pairingCode = qrData.pairingCode || 
                        qrData.code?.pairingCode || 
                        qrData.instance?.pairingCode ||
                        null;

    // Extract QR code base64
    const qrcode = qrData.base64 || 
                   qrData.qrcode?.base64 || 
                   qrData.code?.base64 ||
                   qrData.qrcode ||
                   null;

    console.log('Extracted - QR Code:', !!qrcode, 'Pairing Code:', pairingCode);

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
