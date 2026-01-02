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

    // Create instance in Evolution API
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
      throw new Error(`Failed to create instance: ${errorText}`);
    }

    const instanceData = await createResponse.json();
    console.log('Instance created:', JSON.stringify(instanceData));

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
