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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, whatsappNumberId } = await req.json();

    if (!phone || !whatsappNumberId) {
      return new Response(JSON.stringify({ error: 'Phone and whatsappNumberId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the WhatsApp number belongs to the user and get instance_name
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id, instance_name')
      .eq('id', whatsappNumberId)
      .eq('user_id', user.id)
      .single();

    if (numberError || !whatsappNumber?.instance_name) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not found or not connected' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log('Validating number:', cleanPhone, 'using instance:', whatsappNumber.instance_name);

    // Check if number exists on WhatsApp using Evolution API
    const response = await fetch(`${evolutionApiUrl}/chat/whatsappNumbers/${whatsappNumber.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        numbers: [cleanPhone],
      }),
    });

    const result = await response.json();
    console.log('Evolution API validation response:', JSON.stringify(result));

    if (!response.ok) {
      console.error('Evolution API error:', result);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Não foi possível validar o número',
        details: result 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if number exists - the response is an array with { exists, jid, number }
    const numberInfo = Array.isArray(result) ? result[0] : result;
    const exists = numberInfo?.exists === true;
    const validatedNumber = numberInfo?.number || cleanPhone;

    console.log('Number validation result:', { exists, validatedNumber });

    return new Response(JSON.stringify({ 
      valid: exists,
      number: validatedNumber,
      jid: numberInfo?.jid,
      message: exists ? 'Número válido no WhatsApp' : 'Este número não está registrado no WhatsApp'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Validation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ valid: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
