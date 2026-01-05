import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get client IP from request
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// Rate limiting helper
async function checkRateLimit(
  supabase: any, 
  identifier: string, 
  endpoint: string,
  maxRequests: number = 5,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    });
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true };
    }
    
    return { 
      allowed: data?.allowed !== false,
      retryAfter: data?.retry_after
    };
  } catch (e) {
    console.error('Rate limit exception:', e);
    return { allowed: true };
  }
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Rate limiting check (5 requests per minute for instance creation)
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIP, 'evolution-create-instance', 5, 60);
    
    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Muitas requisições. Aguarde alguns segundos.',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { numberId, instanceName } = await req.json();

    console.log(`Creating Evolution instance: ${instanceName} for user: ${user.id}`);

    // First, check if instance already exists
    let instanceData = null;
    let instanceExists = false;

    try {
      const fetchResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        if (fetchData && (Array.isArray(fetchData) ? fetchData.length > 0 : fetchData.instance)) {
          console.log('Instance already exists:', instanceName);
          instanceExists = true;
          instanceData = Array.isArray(fetchData) ? fetchData[0] : fetchData;
        }
      }
    } catch (e) {
      console.log('Error checking existing instance, will try to create:', e);
    }

    // If instance doesn't exist, create it
    if (!instanceExists) {
      const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Evolution API error:', errorText);
        
        // Check if error is "already in use" - if so, treat as success and fetch the instance
        if (errorText.includes('already in use')) {
          console.log('Instance already exists (from error), fetching it...');
          instanceExists = true;
        } else {
          throw new Error(`Failed to create instance: ${errorText}`);
        }
      } else {
        instanceData = await createResponse.json();
        console.log('Instance created:', JSON.stringify(instanceData));
      }
    }

    // If we detected instance exists from error, fetch it now
    if (instanceExists && !instanceData) {
      const refetchResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });
      
      if (refetchResponse.ok) {
        const refetchData = await refetchResponse.json();
        instanceData = Array.isArray(refetchData) ? refetchData[0] : refetchData;
      }
    }

    console.log('Final instance data:', JSON.stringify(instanceData));

    // Store the instance_name separately (not overwriting the user-friendly 'name')
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ 
        instance_name: instanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', numberId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating instance_name:', updateError);
    }

    // Configure webhook for chat messages - try multiple endpoints
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
    console.log(`Configuring webhook for instance ${instanceName}: ${webhookUrl}`);
    
    let webhookConfigured = false;
    const webhookEndpoints = [
      // Format 1: webhook/set with nested webhook object (most common for Evolution API)
      {
        url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
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
      // Format 2: Direct properties
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
      // Format 3: instance/settings
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
      }
    ];

    for (const endpoint of webhookEndpoints) {
      if (webhookConfigured) break;
      
      try {
        console.log(`Trying webhook: ${endpoint.method} ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify(endpoint.body),
        });

        const responseText = await response.text();
        console.log(`Response: ${response.status} - ${responseText.substring(0, 200)}`);

        if (response.ok || response.status === 201) {
          console.log('Webhook configured successfully via:', endpoint.url);
          webhookConfigured = true;
        }
      } catch (e) {
        console.log(`Endpoint ${endpoint.url} failed:`, e);
      }
    }

    if (!webhookConfigured) {
      console.error('Failed to configure webhook on all endpoints');
    }

    return new Response(JSON.stringify({
      success: true,
      instance: instanceData,
      qrcode: instanceData.qrcode?.base64 || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-create-instance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
