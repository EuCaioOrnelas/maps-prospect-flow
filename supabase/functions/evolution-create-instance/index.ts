import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function isPaidPlan(plan: string | null | undefined): boolean { return PAID_PLANS.includes((plan || 'free').toLowerCase()); }
// Normalize URL: remove trailing slashes and /manager suffix
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const rawUrl = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (rawUrl && apiKey) { const url = normalizeApiUrl(rawUrl); console.log(`[evo-config] Paid URL normalized: ${url}`); return { url, apiKey, tier: 'paid' }; }
  }
  const rawUrl = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!rawUrl || !apiKey) throw new Error('Evolution API credentials not configured');
  const url = normalizeApiUrl(rawUrl);
  return { url, apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByUser(supabase: any, userId: string): Promise<EvolutionCredentials> {
  const { data } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  return getEvolutionCredentials(data?.plan || 'free');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Get the correct Evolution API based on user's plan
    const evoCredentials = await getEvolutionCredentialsByUser(supabase, user.id);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;
    const apiTier = evoCredentials.tier;

    console.log(`Creating Evolution instance on ${apiTier} API for user: ${user.id}`);

    const { numberId, instanceName } = await req.json();

    // --- Proxy assignment: find least-used active proxy ---
    let proxyConfig: { host: string; port: string; protocol: string; username?: string; password?: string } | null = null;
    let assignedProxyId: string | null = null;

    try {
      const { data: availableProxy } = await supabase
        .from('whatsapp_proxies')
        .select('*')
        .eq('is_blocked', false)
        .eq('status', 'active')
        .order('assigned_numbers_count', { ascending: true })
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

      if (availableProxy) {
        proxyConfig = {
          host: availableProxy.host,
          port: availableProxy.port,
          protocol: availableProxy.protocol,
          username: availableProxy.username || undefined,
          password: availableProxy.password || undefined,
        };
        assignedProxyId = availableProxy.id;
        console.log(`Assigned proxy ${availableProxy.host}:${availableProxy.port} (id: ${availableProxy.id})`);

        // Increment assigned count and update last_used_at
        await supabase
          .from('whatsapp_proxies')
          .update({
            assigned_numbers_count: (availableProxy.assigned_numbers_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', availableProxy.id);
      } else {
        console.log('No active proxies available, creating instance without proxy');
      }
    } catch (proxyErr) {
      console.log('Error fetching proxy, continuing without:', proxyErr);
    }

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
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
    const webhookEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_EDIT", "CONNECTION_UPDATE", "QRCODE_UPDATED"];

    if (!instanceExists) {
      // Per Evolution v2 docs the nested webhook in /instance/create uses
      // `byEvents`/`base64`, while /webhook/set uses `webhookByEvents`/`webhookBase64`.
      // Send BOTH variants so the webhook is actually registered during creation
      // and we don't need to call /webhook/set afterwards (which restarts Baileys
      // and drops the freshly-paired session).
      const createPayload: any = {
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          webhookByEvents: false,
          webhookBase64: true,
          events: webhookEvents,
        },
      };

      // Add proxy configuration if available
      if (proxyConfig) {
        createPayload.proxy = {
          enabled: true,
          host: proxyConfig.host,
          port: proxyConfig.port,
          protocol: proxyConfig.protocol,
          ...(proxyConfig.username && { username: proxyConfig.username }),
          ...(proxyConfig.password && { password: proxyConfig.password }),
        };
        console.log(`Creating instance with proxy (enabled): ${proxyConfig.host}:${proxyConfig.port}`);
      }

      const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(createPayload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Evolution API error:', errorText);
        
        if (errorText.includes('already in use')) {
          console.log('Instance already exists (from error), fetching it...');
          instanceExists = true;
        } else {
          throw new Error(`Failed to create instance: ${errorText}`);
        }
      } else {
        instanceData = await createResponse.json();
        console.log('Instance created with webhook in payload:', JSON.stringify(instanceData));
      }
    }

    // After creation or if instance exists, explicitly set proxy via dedicated endpoint
    if (proxyConfig) {
      try {
        const proxyPayload = {
          enabled: true,
          host: proxyConfig.host,
          port: proxyConfig.port,
          protocol: proxyConfig.protocol,
          ...(proxyConfig.username && { username: proxyConfig.username }),
          ...(proxyConfig.password && { password: proxyConfig.password }),
        };
        
        console.log(`Setting proxy via dedicated endpoint for ${instanceName}:`, JSON.stringify(proxyPayload));
        
        const proxyResponse = await fetch(`${EVOLUTION_API_URL}/proxy/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify(proxyPayload),
        });

        const proxyResponseText = await proxyResponse.text();
        console.log(`Proxy set response (${proxyResponse.status}):`, proxyResponseText.substring(0, 300));

        if (!proxyResponse.ok) {
          // Try alternative endpoint format
          console.log('Trying alternative proxy endpoint...');
          const altProxyResponse = await fetch(`${EVOLUTION_API_URL}/proxy/set/${instanceName}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify(proxyPayload),
          });
          const altText = await altProxyResponse.text();
          console.log(`Alt proxy response (${altProxyResponse.status}):`, altText.substring(0, 300));
        }
      } catch (proxySetErr) {
        console.error('Error setting proxy via dedicated endpoint:', proxySetErr);
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

    // Store the instance_name, api_tier, and proxy_id (only if numberId exists)
    if (numberId) {
      const updatePayload: any = { 
        instance_name: instanceName,
        api_tier: apiTier,
        updated_at: new Date().toISOString()
      };
      if (assignedProxyId) {
        updatePayload.proxy_id = assignedProxyId;
      }
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update(updatePayload)
        .eq('id', numberId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating instance_name:', updateError);
      }
    } else {
      console.log('No numberId provided (new number flow), skipping DB update - will be saved after connection');
    }

    // Configure webhook for chat messages — IDEMPOTENT.
    // Each /webhook/set call restarts the Baileys socket on this Evolution build,
    // so we ONLY call it if the current webhook config differs from desired.
    console.log(`Verifying webhook for instance ${instanceName}: ${webhookUrl}`);

    let webhookConfigured = false;
    try {
      const findResp = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY },
      });

      if (findResp.ok) {
        const current = await findResp.json().catch(() => null);
        const w = current?.webhook ?? current;
        if (
          w?.enabled === true &&
          w?.url === webhookUrl &&
          w?.webhookByEvents === false &&
          w?.webhookBase64 === true
        ) {
          console.log(`✅ Webhook already configured for ${instanceName} — skipping /webhook/set (avoids socket restart)`);
          webhookConfigured = true;
        }
      }
    } catch (e) {
      console.log('webhook find check failed (non-blocking):', e);
    }

    if (!webhookConfigured) {
      const webhookEndpoints = [
        {
          url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
          method: 'POST',
          body: {
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              webhookBase64: true,
              events: webhookEvents,
            },
          },
        },
        {
          url: `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
          method: 'POST',
          body: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: webhookEvents,
          },
        },
      ];

      for (const endpoint of webhookEndpoints) {
        if (webhookConfigured) break;
        try {
          console.log(`Trying webhook: ${endpoint.method} ${endpoint.url}`);
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
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
    }

    // Extract QR code from various possible response formats
    const qrcode = instanceData?.qrcode?.base64 || 
                   instanceData?.base64 ||
                   instanceData?.qrcode?.pairingCode ||
                   (typeof instanceData?.qrcode === 'string' ? instanceData.qrcode : null) ||
                   null;

    console.log('Extracted QR code exists:', !!qrcode, 'from instance data keys:', instanceData ? Object.keys(instanceData) : 'null');

    return new Response(JSON.stringify({
      success: true,
      instance: instanceData,
      qrcode: qrcode,
      proxyId: assignedProxyId,
      apiTier: apiTier,
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
