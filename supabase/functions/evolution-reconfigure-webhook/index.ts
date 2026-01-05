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
    
    let webhookConfigured = false;
    let responseData = null;
    let successEndpoint = null;

    // Try multiple endpoint formats - matching exactly what evolution-create-instance uses
    const endpoints = [
      // Primary format used in evolution-create-instance
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
        method: 'POST',
        body: {
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
        }
      },
      // Alternative format with enabled flag
      {
        url: `${EVOLUTION_API_URL}/webhook/${instanceName}`,
        method: 'POST',
        body: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
        }
      },
      // Settings endpoint with instanceName in body
      {
        url: `${EVOLUTION_API_URL}/instance/settings`,
        method: 'POST',
        body: {
          instanceName: instanceName,
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        }
      },
      // PUT variant of settings
      {
        url: `${EVOLUTION_API_URL}/instance/settings`,
        method: 'PUT',
        body: {
          instanceName: instanceName,
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        }
      },
      // Settings with instanceName in URL
      {
        url: `${EVOLUTION_API_URL}/settings/${instanceName}`,
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
      // Global webhook config endpoint
      {
        url: `${EVOLUTION_API_URL}/webhook/instance/${instanceName}`,
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
