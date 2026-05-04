import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function normalizeApiUrl(url: string): string {
  let clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/manager')) clean = clean.slice(0, -8);
  return clean;
}
function getCreds(tier: 'free' | 'paid'): EvolutionCredentials | null {
  const url = tier === 'paid' ? Deno.env.get('EVOLUTION_API_URL_PAID') : Deno.env.get('EVOLUTION_API_URL');
  const apiKey = tier === 'paid' ? Deno.env.get('EVOLUTION_API_KEY_PAID') : Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) return null;
  return { url: normalizeApiUrl(url), apiKey, tier };
}

async function deleteInstanceEverywhere(instanceName: string) {
  for (const tier of ['free', 'paid'] as const) {
    const c = getCreds(tier);
    if (!c) continue;
    try {
      await fetch(`${c.url}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { apikey: c.apiKey } }).catch(() => null);
      const r = await fetch(`${c.url}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { apikey: c.apiKey } });
      console.log(`[health-check] deleted ${instanceName} on ${tier}: ${r.status}`);
    } catch (e) {
      console.log(`[health-check] delete failed ${instanceName} on ${tier}:`, e);
    }
  }
}

/**
 * "Disparo falso": uses /chat/whatsappNumbers/{instance} with the number's own phone.
 * This exercises the SAME authenticated session pipeline as a real message
 * (Evolution validates the WhatsApp socket) without sending anything visible.
 * Returns true if the session is healthy, false if broken.
 */
async function probeInstance(creds: EvolutionCredentials, instanceName: string, phoneNumber: string): Promise<boolean> {
  try {
    const r = await fetch(`${creds.url}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: { apikey: creds.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers: [phoneNumber] }),
    });
    if (!r.ok) {
      console.log(`[health-check] probe ${instanceName} HTTP ${r.status}`);
      return false;
    }
    const data = await r.json().catch(() => null);
    // Evolution returns array; if anything came back the socket is alive
    return Array.isArray(data) ? data.length > 0 : !!data;
  } catch (e) {
    console.log(`[health-check] probe ${instanceName} threw:`, e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const startedAt = Date.now();
  const summary = { checked: 0, healthy: 0, disconnected: 0, skipped: 0, errors: 0 };

  try {
    const { data: numbers, error } = await supabase
      .from('whatsapp_numbers')
      .select('id, user_id, instance_name, phone_number, api_tier, is_connected, updated_at')
      .eq('is_connected', true)
      .not('instance_name', 'is', null)
      .not('phone_number', 'is', null);

    if (error) throw error;

    console.log(`[health-check] starting probe of ${numbers?.length ?? 0} connected numbers`);

    for (const n of numbers ?? []) {
      summary.checked++;

      // Skip if no active campaigns AND number was just touched (<10min) — avoid noise
      const tier = (n.api_tier === 'paid' ? 'paid' : 'free') as 'free' | 'paid';
      const creds = getCreds(tier) || getCreds('free');
      if (!creds) { summary.skipped++; continue; }

      // 1) connectionState must be 'open'
      let state: string | null = null;
      try {
        const sr = await fetch(`${creds.url}/instance/connectionState/${n.instance_name}`, {
          headers: { apikey: creds.apiKey },
        });
        if (sr.ok) {
          const sd = await sr.json().catch(() => ({}));
          state = sd?.state || sd?.instance?.state || null;
        }
      } catch (e) {
        console.log(`[health-check] connectionState err for ${n.instance_name}:`, e);
      }

      if (state !== 'open') {
        // Not 'open' — let the reconnection flow handle it; skip here unless explicitly closed
        if (state === 'close') {
          summary.disconnected++;
          await handleDisconnection(supabase, n, creds, 'connection_state_close');
        } else {
          summary.skipped++;
        }
        continue;
      }

      // 2) "Fake send" probe (no real message) — require TWO consecutive failures
      // to avoid killing healthy numbers on a transient network blip.
      let ok = await probeInstance(creds, n.instance_name!, n.phone_number!);
      if (!ok) {
        await new Promise(r => setTimeout(r, 2500));
        ok = await probeInstance(creds, n.instance_name!, n.phone_number!);
      }
      if (ok) {
        summary.healthy++;
        await supabase.from('whatsapp_numbers')
          .update({ last_health_check_at: new Date().toISOString() })
          .eq('id', n.id);
      } else {
        summary.disconnected++;
        await handleDisconnection(supabase, n, creds, 'probe_failed');
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(`[health-check] done in ${elapsed}ms`, summary);

    return new Response(JSON.stringify({ success: true, elapsed_ms: elapsed, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[health-check] fatal:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message, ...summary }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleDisconnection(
  supabase: any,
  n: { id: string; user_id: string; instance_name: string | null; phone_number: string | null },
  _creds: EvolutionCredentials,
  reason: string,
) {
  console.log(`[health-check] disconnecting ${n.instance_name} (reason=${reason})`);

  // Pause active campaigns on this number to avoid "infinite running"
  try {
    await supabase
      .from('whatsapp_campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('whatsapp_number_id', n.id)
      .in('status', ['running', 'pending']);
  } catch (e) {
    console.log('[health-check] pause campaigns failed:', e);
  }

  // Delete instance from BOTH APIs to prevent orphans (any tier)
  if (n.instance_name) {
    await deleteInstanceEverywhere(n.instance_name);
  }

  // Mark disconnected and clear instance_name → next connect creates a fresh one
  await supabase
    .from('whatsapp_numbers')
    .update({
      is_connected: false,
      instance_name: null,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', n.id);

  // Notify user via email (idempotent per day)
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        user_id: n.user_id,
        email_type: 'NUMBER_DISCONNECTED',
        payload: {
          phone_number: n.phone_number || n.instance_name,
          instance_name: n.instance_name,
          reason,
        },
        idempotency_key: `health_disconnect_${n.id}_${new Date().toISOString().slice(0, 10)}`,
      },
    });
  } catch (e) {
    console.log('[health-check] email failed:', e);
  }
}
