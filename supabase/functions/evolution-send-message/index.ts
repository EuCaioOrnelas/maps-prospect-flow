import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
    console.error('[evo-config] PAID creds missing, fallback to free');
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}

async function getEvolutionCredentialsForNumber(supabase: any, numberId: string, userId: string): Promise<EvolutionCredentials> {
  // Try number's api_tier first
  const { data: numberRow } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).maybeSingle();
  if (numberRow?.api_tier) {
    return getEvolutionCredentials(numberRow.api_tier);
  }
  // Fall back to user's plan
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
  const credentials = getEvolutionCredentials(profile?.plan);
  // Self-heal: persist inferred tier
  if (numberId) {
    await supabase.from('whatsapp_numbers').update({ api_tier: credentials.tier, updated_at: new Date().toISOString() }).eq('id', numberId);
  }
  return credentials;
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
  maxRequests: number = 100,
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

// Helper: ALWAYS return HTTP 200 so the client can read the body.
// supabase-js wraps non-2xx responses in FunctionsHttpError and often discards the body,
// which is exactly what produced the "non-2xx status code" generic error the user saw.
function respond(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let stage = 'init';
  try {
    console.log('[evo-send] === REQUEST START ===');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[evo-send] Missing SUPABASE env');
      return respond({ success: false, error: 'Configuração do servidor incompleta (SUPABASE env).', stage: 'env' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    stage = 'rate_limit';
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIP, 'evolution-send-message', 100, 60);
    if (!rateLimitResult.allowed) {
      console.log('[evo-send] Rate limit exceeded for IP:', clientIP);
      return respond({
        success: false,
        error: 'Muitas requisições. Aguarde alguns segundos.',
        retryAfter: rateLimitResult.retryAfter,
        stage,
      });
    }

    stage = 'auth';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[evo-send] Missing Authorization header');
      return respond({ success: false, error: 'Sessão expirada — recarregue a página e faça login novamente.', stage });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.warn('[evo-send] Invalid user token:', userError?.message);
      return respond({ success: false, error: 'Sessão inválida — faça login novamente.', stage, detail: userError?.message });
    }
    const user = userData.user;

    stage = 'parse_body';
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[evo-send] Body parse error:', e);
      return respond({ success: false, error: 'Corpo da requisição inválido.', stage });
    }
    const instanceName = body.instanceName ?? body.instance_name;
    const phoneNumber = body.phoneNumber ?? body.phone;
    const message = body.message;
    const numberId = body.numberId ?? body.number_id;

    if (!instanceName || !phoneNumber || !message) {
      console.warn('[evo-send] Missing required fields', { hasInstance: !!instanceName, hasPhone: !!phoneNumber, hasMsg: !!message });
      return respond({
        success: false,
        error: 'Campos obrigatórios ausentes (instanceName, phoneNumber e message).',
        stage,
      });
    }

    stage = 'load_credentials';
    let evoCredentials: EvolutionCredentials;
    try {
      evoCredentials = await getEvolutionCredentialsForNumber(supabase, numberId, user.id);
    } catch (e: any) {
      console.error('[evo-send] Credentials error:', e?.message);
      return respond({ success: false, error: `Credenciais Evolution: ${e?.message || 'erro desconhecido'}`, stage });
    }
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    let formattedPhone = String(phoneNumber).replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    stage = 'evolution_request';
    const targetUrl = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
    console.log(`[evo-send] POST ${targetUrl} (tier=${evoCredentials.tier}, phone=${formattedPhone}, msgLen=${message.length})`);

    let sendResponse: Response;
    try {
      sendResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number: formattedPhone, text: message }),
      });
    } catch (e: any) {
      console.error('[evo-send] Network error calling Evolution:', e?.message);
      return respond({
        success: false,
        error: `Falha de rede ao contatar Evolution API: ${e?.message || 'erro desconhecido'}`,
        stage,
        target: targetUrl,
      });
    }

    const rawBody = await sendResponse.text();
    console.log(`[evo-send] Evolution responded HTTP ${sendResponse.status}: ${rawBody.slice(0, 500)}`);

    if (!sendResponse.ok) {
      let parsedErr: any = rawBody;
      try { parsedErr = JSON.parse(rawBody); } catch (_) {}
      const evoMsg = parsedErr?.message || parsedErr?.error || rawBody || `HTTP ${sendResponse.status}`;
      return respond({
        success: false,
        error: `Evolution API retornou erro: ${typeof evoMsg === 'string' ? evoMsg : JSON.stringify(evoMsg)}`,
        stage,
        evolutionStatus: sendResponse.status,
      });
    }

    let sendData: any = {};
    try { sendData = JSON.parse(rawBody); } catch (_) {}

    stage = 'update_counters';
    if (numberId) {
      try {
        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('daily_sent_count, last_sent_at')
          .eq('id', numberId)
          .maybeSingle();

        const today = new Date().toDateString();
        const lastSentDate = numberData?.last_sent_at ? new Date(numberData.last_sent_at).toDateString() : null;
        const newCount = lastSentDate === today ? (numberData?.daily_sent_count || 0) + 1 : 1;

        await supabase
          .from('whatsapp_numbers')
          .update({
            daily_sent_count: newCount,
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', numberId);
      } catch (e: any) {
        // Non-fatal — message already sent
        console.warn('[evo-send] Counter update failed (non-fatal):', e?.message);
      }
    }

    console.log('[evo-send] === SUCCESS ===');
    return respond({
      success: true,
      messageId: sendData?.key?.id || sendData?.messageId,
      status: sendData?.status || 'sent',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[evo-send] UNHANDLED error at stage="${stage}":`, errorMessage);
    return respond({
      success: false,
      error: errorMessage,
      stage,
    });
  }
});