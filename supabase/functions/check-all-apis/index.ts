import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ApiResult {
  service: string;
  category: string;
  status: 'ok' | 'error' | 'not_configured' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

async function checkStripe(): Promise<ApiResult> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return { service: 'Stripe', category: 'payments', status: 'not_configured', message: 'Chave não configurada' };
  try {
    const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return { service: 'Stripe', category: 'payments', status: 'error', message: `HTTP ${r.status}` };
    const d = await r.json();
    const available = (d.available?.[0]?.amount ?? 0) / 100;
    return { service: 'Stripe', category: 'payments', status: 'ok', message: `Saldo: R$ ${available.toFixed(2)}`, details: { available } };
  } catch (e) {
    return { service: 'Stripe', category: 'payments', status: 'error', message: e instanceof Error ? e.message : 'Erro' };
  }
}

async function checkAsaas(): Promise<ApiResult> {
  const key = Deno.env.get('ASAAS_API_KEY');
  if (!key) return { service: 'Asaas', category: 'payments', status: 'not_configured', message: 'Chave não configurada' };
  try {
    const r = await fetch('https://api.asaas.com/v3/finance/balance', { headers: { 'access_token': key } });
    if (!r.ok) return { service: 'Asaas', category: 'payments', status: 'error', message: `HTTP ${r.status}` };
    const d = await r.json();
    return { service: 'Asaas', category: 'payments', status: 'ok', message: `Saldo: R$ ${(d.balance ?? 0).toFixed(2)}`, details: { balance: d.balance } };
  } catch (e) {
    return { service: 'Asaas', category: 'payments', status: 'error', message: e instanceof Error ? e.message : 'Erro' };
  }
}

async function checkOpenAI(): Promise<ApiResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return { service: 'OpenAI', category: 'ai', status: 'not_configured', message: 'Chave não configurada' };
  try {
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return { service: 'OpenAI', category: 'ai', status: 'error', message: `HTTP ${r.status}` };
    const d = await r.json();
    return { service: 'OpenAI', category: 'ai', status: 'ok', message: `${(d.data || []).length} modelos disponíveis` };
  } catch (e) {
    return { service: 'OpenAI', category: 'ai', status: 'error', message: e instanceof Error ? e.message : 'Erro' };
  }
}

async function checkResend(): Promise<ApiResult> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { service: 'Resend', category: 'email', status: 'not_configured', message: 'Chave não configurada' };
  try {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return { service: 'Resend', category: 'email', status: 'error', message: `HTTP ${r.status}` };
    const d = await r.json();
    return { service: 'Resend', category: 'email', status: 'ok', message: `${(d.data || []).length} domínio(s) configurado(s)` };
  } catch (e) {
    return { service: 'Resend', category: 'email', status: 'error', message: e instanceof Error ? e.message : 'Erro' };
  }
}

async function checkEvolution(): Promise<ApiResult> {
  const url = Deno.env.get('EVOLUTION_API_URL');
  const key = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !key) return { service: 'Evolution API', category: 'whatsapp', status: 'not_configured', message: 'Não configurada' };
  try {
    const r = await fetch(`${url}/instance/fetchInstances`, { headers: { apikey: key } });
    if (!r.ok) return { service: 'Evolution API', category: 'whatsapp', status: 'error', message: `HTTP ${r.status}` };
    const d = await r.json();
    const count = Array.isArray(d) ? d.length : 0;
    return { service: 'Evolution API', category: 'whatsapp', status: 'ok', message: `${count} instâncias ativas` };
  } catch (e) {
    return { service: 'Evolution API', category: 'whatsapp', status: 'error', message: e instanceof Error ? e.message : 'Erro' };
  }
}

async function checkMeta(): Promise<ApiResult> {
  const secret = Deno.env.get('META_APP_SECRET');
  if (!secret) return { service: 'Meta WhatsApp API', category: 'whatsapp', status: 'not_configured', message: 'Não configurada' };
  return { service: 'Meta WhatsApp API', category: 'whatsapp', status: 'ok', message: 'Webhook configurado' };
}

async function checkSerpKeys(): Promise<ApiResult[]> {
  const KEYS = [
    { name: 'SERP_API_KEY', label: 'SerpAPI #1 (Principal)' },
    { name: 'SERP_API_KEY_2', label: 'SerpAPI #2' },
    { name: 'SERP_API_KEY_3', label: 'SerpAPI #3' },
    { name: 'SERP_API_KEY_4', label: 'SerpAPI #4' },
    { name: 'SERP_API_KEY_5', label: 'SerpAPI #5' },
    { name: 'SERP_API_KEY_6', label: 'SerpAPI #6' },
  ];
  const results: ApiResult[] = [];
  for (const k of KEYS) {
    const apiKey = Deno.env.get(k.name);
    if (!apiKey) {
      results.push({ service: k.label, category: 'leads', status: 'not_configured', message: 'Não configurada' });
      continue;
    }
    try {
      const r = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`);
      const d = await r.json();
      if (!r.ok) {
        results.push({ service: k.label, category: 'leads', status: 'error', message: d?.error || `HTTP ${r.status}` });
        continue;
      }
      const left = d.total_searches_left ?? d.plan_searches_left ?? 0;
      const limit = d.plan_monthly_limit ?? d.searches_per_month ?? 100;
      const status: ApiResult['status'] = left === 0 ? 'error' : left < 20 ? 'warning' : 'ok';
      results.push({
        service: k.label,
        category: 'leads',
        status,
        message: `${left}/${limit} créditos restantes`,
        details: { left, limit, used: limit - left, percent: Math.round(((limit - left) / limit) * 100) },
      });
    } catch (e) {
      results.push({ service: k.label, category: 'leads', status: 'error', message: e instanceof Error ? e.message : 'Erro' });
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [stripe, asaas, openai, resend, evolution, meta, serpKeys] = await Promise.all([
      checkStripe(), checkAsaas(), checkOpenAI(), checkResend(), checkEvolution(), checkMeta(), checkSerpKeys(),
    ]);

    const all: ApiResult[] = [stripe, asaas, openai, resend, evolution, meta, ...serpKeys];

    // Update SerpAPI keys in api_key_status table
    for (let i = 0; i < serpKeys.length; i++) {
      const k = serpKeys[i];
      const keyName = ['SERP_API_KEY', 'SERP_API_KEY_2', 'SERP_API_KEY_3', 'SERP_API_KEY_4', 'SERP_API_KEY_5', 'SERP_API_KEY_6'][i];
      await supabase.from('api_key_status').upsert({
        key_name: keyName,
        key_index: i + 1,
        status: k.status === 'ok' ? 'active' : k.status === 'warning' ? 'active' : 'error',
        message: k.message,
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'key_name,key_index' });
    }

    const summary = {
      total: all.length,
      ok: all.filter(r => r.status === 'ok').length,
      warning: all.filter(r => r.status === 'warning').length,
      error: all.filter(r => r.status === 'error').length,
      not_configured: all.filter(r => r.status === 'not_configured').length,
    };

    return new Response(JSON.stringify({ success: true, summary, results: all, checkedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
