import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid user token');

    // Check admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) throw new Error('Admin only');

    const results: Record<string, unknown> = {
      evolution_url_configured: !!EVOLUTION_API_URL,
      evolution_key_configured: !!EVOLUTION_API_KEY,
      evolution_url_value: EVOLUTION_API_URL ? EVOLUTION_API_URL.substring(0, 30) + '...' : 'NOT SET',
    };

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test 1: Fetch all instances
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY },
      });
      const text = await response.text();
      results.fetch_instances_status = response.status;
      results.fetch_instances_response = text.substring(0, 2000);
    } catch (e) {
      results.fetch_instances_error = e instanceof Error ? e.message : String(e);
    }

    // Test 2: Try to connect to a specific instance (if body has instanceName)
    try {
      const body = await req.json().catch(() => ({}));
      if (body.instanceName) {
        const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${body.instanceName}`, {
          method: 'GET',
          headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        });
        const connectText = await connectResponse.text();
        results.connect_status = connectResponse.status;
        results.connect_response = connectText.substring(0, 2000);
      }
    } catch (e) {
      results.connect_error = e instanceof Error ? e.message : String(e);
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
