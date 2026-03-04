import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const forceCleanup =
      body?.force === true ||
      body?.action === 'manual_cleanup' ||
      body?.confirm === 'DELETE_ALL_INSTANCES';

    // Safety guard: prevent destructive cleanup from scheduled jobs
    if (!forceCleanup) {
      console.warn('Cleanup skipped: destructive operation requires explicit confirmation payload');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        message: 'Cleanup blocked. Use {"force": true} to run destructive cleanup manually.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

    // 1. List all instances
    const listResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: { 'apikey': EVOLUTION_API_KEY },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list instances: ${listResponse.status}`);
    }

    const instances = await listResponse.json();
    console.log(`Found ${Array.isArray(instances) ? instances.length : 0} instances`);

    const results: any[] = [];

    if (Array.isArray(instances)) {
      for (const inst of instances) {
        const name = inst.instance?.instanceName || inst.instanceName || inst.name;
        if (!name) continue;

        // Logout first
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/logout/${name}`, {
            method: 'DELETE',
            headers: { 'apikey': EVOLUTION_API_KEY },
          });
        } catch (_e) { /* ignore */ }

        // Delete instance
        try {
          const delRes = await fetch(`${EVOLUTION_API_URL}/instance/delete/${name}`, {
            method: 'DELETE',
            headers: { 'apikey': EVOLUTION_API_KEY },
          });
          results.push({ name, deleted: delRes.ok, status: delRes.status });
          console.log(`Deleted instance ${name}: ${delRes.status}`);
        } catch (e) {
          results.push({ name, deleted: false, error: String(e) });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalFound: Array.isArray(instances) ? instances.length : 0,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
