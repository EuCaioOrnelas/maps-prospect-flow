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

    const { phone, whatsappNumberId, contactName } = await req.json();

    if (!phone || !whatsappNumberId) {
      return new Response(JSON.stringify({ error: 'Phone and whatsappNumberId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the WhatsApp number belongs to the user
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id')
      .eq('id', whatsappNumberId)
      .eq('user_id', user.id)
      .single();

    if (numberError || !whatsappNumber) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('remote_jid', remoteJid)
      .single();

    if (existingConv) {
      return new Response(JSON.stringify({ conversation: existingConv }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if contact exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('phone', cleanPhone)
      .single();

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        whatsapp_number_id: whatsappNumberId,
        contact_id: existingContact?.id || null,
        remote_jid: remoteJid,
        phone: cleanPhone,
        contact_name: existingContact?.name || contactName || null,
      })
      .select('*')
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw convError;
    }

    return new Response(JSON.stringify({ conversation: newConv }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Start conversation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
