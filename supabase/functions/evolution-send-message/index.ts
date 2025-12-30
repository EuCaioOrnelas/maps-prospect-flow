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

    const { instanceName, phoneNumber, message, numberId } = await req.json();

    // Format phone number (remove non-digits, add country code if needed)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`Sending message via ${instanceName} to ${formattedPhone}`);

    // Send message via Evolution API
    const sendResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('Evolution API error:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    const sendData = await sendResponse.json();
    console.log('Send response:', JSON.stringify(sendData));

    // Update daily sent count
    if (numberId) {
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('daily_sent_count, last_sent_at')
        .eq('id', numberId)
        .single();

      const today = new Date().toDateString();
      const lastSentDate = numberData?.last_sent_at ? new Date(numberData.last_sent_at).toDateString() : null;
      
      const newCount = lastSentDate === today ? (numberData?.daily_sent_count || 0) + 1 : 1;

      await supabase
        .from('whatsapp_numbers')
        .update({ 
          daily_sent_count: newCount,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: sendData.key?.id || sendData.messageId,
      status: sendData.status || 'sent',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-send-message:', error);
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
