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

    if (!instanceName) {
      throw new Error('Instance name is required');
    }

    console.log(`Reconfiguring webhook for instance: ${instanceName}`);

    const webhookUrl = `${SUPABASE_URL}/functions/v1/chat-webhook`;
    
    // Try the main webhook set endpoint
    let webhookConfigured = false;
    
    try {
      const webhookResponse = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
            "SEND_MESSAGE"
          ]
        }),
      });

      if (webhookResponse.ok) {
        const result = await webhookResponse.json();
        console.log('Webhook configured via /webhook/set:', JSON.stringify(result));
        webhookConfigured = true;
      } else {
        console.log('First method failed, trying alternative...');
      }
    } catch (e) {
      console.log('First webhook method error:', e);
    }

    // Try alternative endpoint if first failed
    if (!webhookConfigured) {
      try {
        const altResponse = await fetch(`${EVOLUTION_API_URL}/webhook/instance/${instanceName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED",
              "SEND_MESSAGE"
            ]
          }),
        });

        if (altResponse.ok) {
          const result = await altResponse.json();
          console.log('Webhook configured via alternative endpoint:', JSON.stringify(result));
          webhookConfigured = true;
        } else {
          const errorText = await altResponse.text();
          console.error('Alternative endpoint also failed:', errorText);
        }
      } catch (e) {
        console.error('Alternative webhook method error:', e);
      }
    }

    // Get current webhook config to verify
    let currentConfig = null;
    try {
      const findResponse = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });
      
      if (findResponse.ok) {
        currentConfig = await findResponse.json();
        console.log('Current webhook config:', JSON.stringify(currentConfig));
      }
    } catch (e) {
      console.log('Could not fetch webhook config:', e);
    }

    return new Response(JSON.stringify({
      success: webhookConfigured,
      webhookUrl: webhookUrl,
      currentConfig: currentConfig,
      message: webhookConfigured ? 'Webhook reconfigured successfully' : 'Failed to reconfigure webhook'
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
