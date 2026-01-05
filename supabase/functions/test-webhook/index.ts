import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { instanceName, action } = await req.json();

    if (!instanceName) {
      throw new Error('Instance name required');
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
    const results: Record<string, unknown> = {
      instanceName,
      webhookUrl,
      action,
    };

    console.log('Testing webhook for instance:', instanceName);
    console.log('Webhook URL:', webhookUrl);

    // Get current webhook config
    const findEndpoints = [
      `${EVOLUTION_API_URL}/webhook/find/${instanceName}`,
      `${EVOLUTION_API_URL}/webhook/${instanceName}`,
    ];

    for (const url of findEndpoints) {
      try {
        console.log('Checking:', url);
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'apikey': EVOLUTION_API_KEY },
        });
        if (res.ok) {
          results.currentConfig = await res.json();
          console.log('Current config:', JSON.stringify(results.currentConfig));
          break;
        }
      } catch (e) {
        console.log('Failed:', url, e);
      }
    }

    // Get instance info
    try {
      const infoRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: { 'apikey': EVOLUTION_API_KEY },
      });
      if (infoRes.ok) {
        results.instanceInfo = await infoRes.json();
        console.log('Instance info:', JSON.stringify(results.instanceInfo));
      }
    } catch (e) {
      console.log('Failed to get instance info:', e);
    }

    // If action is reconfigure, set the webhook
    if (action === 'reconfigure') {
      console.log('Reconfiguring webhook...');

      // Evolution API v2 uses different endpoint patterns depending on server version
      // Try multiple formats with the REQUIRED fields for each
      const setEndpoints = [
        // Format 1: Evolution API v2.x with 'enabled' at root
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
        },
        // Format 2: Evolution API v2.x alternate naming
        {
          url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
          method: 'POST',
          body: {
            enabled: true,
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        },
        // Format 3: Evolution API v1 style
        {
          url: `${EVOLUTION_API_URL}/instance/webhook/${instanceName}`,
          method: 'PUT',
          body: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        },
        // Format 4: Direct webhook endpoint with PUT
        {
          url: `${EVOLUTION_API_URL}/webhook/${instanceName}`,
          method: 'PUT',
          body: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
          }
        },
        // Format 5: Settings update with webhook nested
        {
          url: `${EVOLUTION_API_URL}/settings/${instanceName}`,
          method: 'PUT',
          body: {
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              webhookBase64: true,
              events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "SEND_MESSAGE"]
            }
          }
        }
      ];

      for (const ep of setEndpoints) {
        try {
          console.log(`Trying: ${ep.method} ${ep.url}`);
          console.log('Body:', JSON.stringify(ep.body));
          
          const res = await fetch(ep.url, {
            method: ep.method,
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify(ep.body),
          });

          const text = await res.text();
          console.log('Response:', res.status, text);

          if (res.ok || res.status === 201) {
            results.reconfigureSuccess = true;
            results.reconfigureResponse = text;
            results.successfulEndpoint = ep.url;
            console.log('Webhook configured successfully via:', ep.url);
            break;
          }
        } catch (e) {
          console.log('Failed:', ep.url, e);
        }
      }

      // Verify new config
      for (const url of findEndpoints) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY },
          });
          if (res.ok) {
            results.newConfig = await res.json();
            break;
          }
        } catch {}
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});