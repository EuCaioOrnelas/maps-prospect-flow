import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DebugStep {
  id: string;
  name: string;
  status: 'success' | 'error' | 'warning' | 'skipped' | 'running';
  duration_ms: number;
  category?: 'ok' | 'warning' | 'internal_error' | 'edge_error' | 'external_error' | 'infra_error' | 'config_error';
  error_code?: string | number;
  error_message?: string;
  suggestion?: string;
  stack_trace?: string;
  error_file?: string;
  error_line?: number;
  error_column?: number;
  details?: Record<string, unknown>;
  payload_sent?: unknown;
  payload_received?: unknown;
  headers_sent?: Record<string, string>;
  headers_received?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════
// FUNÇÕES IDÊNTICAS AO campaign-processor/index.ts
// Qualquer alteração aqui DEVE ser replicada no campaign-processor
// ══════════════════════════════════════════════════════════════

// Normalize phone number - supports international numbers
// FONTE: campaign-processor/index.ts → normalizePhone()
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  
  // If number has 10-11 digits without country code, assume Brazil (55)
  // International numbers should already have country code (12+ digits)
  if (normalized.length >= 10 && normalized.length <= 11 && !normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  
  return normalized;
}

// Check if instance is connected with retry logic
// FONTE: campaign-processor/index.ts → checkInstanceConnection()
async function checkInstanceConnection(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string,
  maxRetries: number = 3
): Promise<{ connected: boolean; state?: string; attempts: number; errors: string[]; responseTimes: number[] }> {
  const errors: string[] = [];
  const responseTimes: number[] = [];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const fetchStart = performance.now();
      const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      responseTimes.push(Math.round(performance.now() - fetchStart));

      if (!response.ok) {
        const errText = await response.text();
        errors.push(`Tentativa ${attempt}: HTTP ${response.status} - ${errText.slice(0, 100)}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return { connected: false, attempts: attempt, errors, responseTimes };
      }

      const data = await response.json();
      const state = data.state || data.instance?.state;
      const isConnected = state === 'open';
      
      if (isConnected) {
        return { connected: true, state, attempts: attempt, errors, responseTimes };
      }
      
      // States that might be temporary - retry
      if (state === 'connecting' || state === 'close') {
        errors.push(`Tentativa ${attempt}: Estado "${state}" (temporário)`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
      
      return { connected: false, state, attempts: attempt, errors, responseTimes };
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Tentativa ${attempt}: ${msg}`);
      responseTimes.push(-1);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }
  
  return { connected: false, attempts: maxRetries, errors, responseTimes };
}

// Send a single message (or simulate it)
// FONTE: campaign-processor/index.ts → sendMessage()
async function sendMessage(
  evolutionUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string,
  simulationMode: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean; responseTime?: number; httpStatus?: number; rawResponse?: unknown }> {
  if (simulationMode) {
    const simulatedMessageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { success: true, messageId: simulatedMessageId, simulated: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const fetchStart = performance.now();
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ number: phone, text: message }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - fetchStart);

    if (response.ok) {
      const result = await response.json();
      return { success: true, messageId: result?.key?.id, responseTime, httpStatus: response.status, rawResponse: result };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText, responseTime, httpStatus: response.status };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if contact is in ignored list
// FONTE: campaign-processor/index.ts → isContactIgnored()
async function isContactIgnored(supabase: any, userId: string, phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const { data } = await supabase
    .from('ignored_contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('phone', normalizedPhone)
    .single();
  return !!data;
}

// ══════════════════════════════════════════════════════════════
// FIM DAS FUNÇÕES DO campaign-processor
// ══════════════════════════════════════════════════════════════

function parseStackTrace(error: unknown): { stack_trace?: string; error_file?: string; error_line?: number; error_column?: number } {
  if (!(error instanceof Error) || !error.stack) return {};
  const lines = error.stack.split('\n').filter(l => l.trim().startsWith('at '));
  for (const line of lines) {
    const match = line.match(/at\s+(.+?)\s*\(?((?:file|https?):\/\/[^)]+?):(\d+):(\d+)\)?/) ||
                  line.match(/at\s+((?:file|https?):\/\/[^:]+):(\d+):(\d+)/);
    if (match) {
      const hasName = match.length === 5;
      const file = hasName ? match[2] : match[1];
      const lineNum = parseInt(hasName ? match[3] : match[2]);
      const col = parseInt(hasName ? match[4] : match[3]);
      // Extract function-name/index.ts instead of just index.ts
      const parts = file.split('/');
      const fileName = parts.length >= 2 
        ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` 
        : parts[parts.length - 1] || file;
      return {
        stack_trace: lines.slice(0, 5).map(l => l.trim()).join('\n'),
        error_file: fileName,
        error_line: lineNum,
        error_column: col,
      };
    }
  }
  return { stack_trace: lines.slice(0, 5).map(l => l.trim()).join('\n') };
}

function classifyError(error: unknown, step: string): Pick<DebugStep, 'category' | 'suggestion' | 'error_message' | 'error_code'> & { stack_trace?: string; error_file?: string; error_line?: number; error_column?: number } {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  const stackInfo = parseStackTrace(error);
  
  if (lower.includes('not configured') || lower.includes('not set') || lower.includes('undefined') || lower.includes('missing')) {
    return { category: 'config_error', error_message: msg, suggestion: `Verifique se as variáveis de ambiente necessárias estão configuradas (EVOLUTION_API_URL, EVOLUTION_API_KEY).`, ...stackInfo };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('abort') || lower.includes('econnrefused') || lower.includes('dns')) {
    return { category: 'infra_error', error_message: msg, suggestion: 'Problema de infraestrutura: verifique se o servidor da API está acessível e se a URL está correta.', ...stackInfo };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('403')) {
    return { category: 'external_error', error_message: msg, error_code: lower.includes('401') ? 401 : 403, suggestion: 'Falha de autenticação. Verifique se a API Key da Evolution está correta e válida.', ...stackInfo };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return { category: 'external_error', error_message: msg, error_code: 429, suggestion: 'Rate limit atingido. Aguarde alguns minutos antes de tentar novamente.', ...stackInfo };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504')) {
    return { category: 'external_error', error_message: msg, error_code: parseInt(lower.match(/5\d{2}/)?.[0] || '500'), suggestion: 'Erro no servidor da Evolution API. Tente novamente em alguns minutos.', ...stackInfo };
  }
  if (lower.includes('400') || lower.includes('bad request')) {
    return { category: 'external_error', error_message: msg, error_code: 400, suggestion: 'A Evolution API rejeitou a requisição (HTTP 400). Verifique se o número de telefone está no formato correto e se a instância está configurada corretamente.', ...stackInfo };
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return { category: 'external_error', error_message: msg, error_code: 404, suggestion: 'Endpoint não encontrado. Verifique se a instância existe e se a URL da API está correta.', ...stackInfo };
  }
  
  return {
    category: 'internal_error', error_message: msg,
    suggestion: stackInfo.error_file 
      ? `Erro interno no arquivo "${stackInfo.error_file}" na linha ${stackInfo.error_line}. Verifique os logs da edge function.`
      : `Erro interno na etapa "${step}". Verifique os logs da edge function para mais detalhes.`,
    ...stackInfo,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = crypto.randomUUID().slice(0, 8);
  const startTime = performance.now();
  const steps: DebugStep[] = [];

  async function runStep(
    id: string,
    name: string,
    fn: () => Promise<Record<string, unknown> | void>
  ): Promise<{ success: boolean; result?: Record<string, unknown> }> {
    const stepStart = performance.now();
    try {
      const result = (await fn()) || {};
      const duration = performance.now() - stepStart;
      const isWarning = duration > 5000;
      steps.push({
        id, name,
        status: isWarning ? 'warning' : 'success',
        duration_ms: Math.round(duration),
        category: isWarning ? 'warning' : 'ok',
        ...(isWarning ? { suggestion: `Etapa demorou ${(duration / 1000).toFixed(1)}s. Pode indicar lentidão na API.` } : {}),
        ...result,
      });
      return { success: true, result };
    } catch (error) {
      const duration = performance.now() - stepStart;
      const classified = classifyError(error, name);
      steps.push({ id, name, status: 'error', duration_ms: Math.round(duration), ...classified });
      return { success: false };
    }
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';

    // Service role client for DB operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // User client with anon key for auth validation (works with both HS256 and ES256)
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');

    let userId: string;
    
    // Try getClaims first (works on Lovable Cloud / ES256)
    try {
      const { data: claimsData, error: claimsError } = await (supabaseAuth.auth as any).getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
        console.log('[debug-dispatch-test] Auth via getClaims:', userId);
      } else {
        throw new Error('getClaims not available or failed');
      }
    } catch {
      // Fallback to getUser (works on standard Supabase / HS256)
      console.log('[debug-dispatch-test] getClaims unavailable, trying getUser...');
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !userData.user) {
        console.error('[debug-dispatch-test] Auth failed:', userError?.message);
        return new Response(JSON.stringify({ error: 'Invalid JWT', detail: userError?.message }), { status: 401, headers: corsHeaders });
      }
      userId = userData.user.id;
      console.log('[debug-dispatch-test] Auth via getUser:', userId);
    }

    const body = await req.json();
    const { numberId, phone, message, deepDebug, dryRun } = body;

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    // ── Step 1: Validate config (igual ao campaign-processor) ──
    await runStep('config_check', '1. Verificação de Configuração', async () => {
      const missing: string[] = [];
      if (!EVOLUTION_API_URL) missing.push('EVOLUTION_API_URL');
      if (!EVOLUTION_API_KEY) missing.push('EVOLUTION_API_KEY');
      if (!SUPABASE_URL) missing.push('SUPABASE_URL');
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (missing.length > 0) throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);

      return {
        details: {
          evolution_url: EVOLUTION_API_URL,
          evolution_key_preview: EVOLUTION_API_KEY ? `${EVOLUTION_API_KEY.slice(0, 6)}...` : 'N/A',
          supabase_url: SUPABASE_URL,
          ...(deepDebug ? { all_env_keys: Object.keys(Deno.env.toObject()).filter(k => !k.includes('KEY') && !k.includes('SECRET')).sort() } : {}),
        },
      };
    });

    // ── Step 2: Validate number ──
    let numberData: Record<string, unknown> | null = null;
    await runStep('validate_number', '2. Validação do Número', async () => {
      if (!numberId) throw new Error('numberId não fornecido');

      const { data, error } = await supabaseAdmin
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', numberId)
        .single();

      if (error) throw new Error(`Erro ao buscar número: ${error.message}`);
      if (!data) throw new Error('Número não encontrado no banco de dados');

      numberData = data;

      const warnings: string[] = [];
      if (!data.is_connected) warnings.push('Número marcado como DESCONECTADO no banco');
      if (!data.instance_name) warnings.push('instance_name está vazio');
      if (!data.phone_number) warnings.push('phone_number não registrado');

      if (warnings.length > 0 && !data.is_connected) {
        throw new Error(warnings.join('; '));
      }

      return {
        details: {
          id: data.id, name: data.name, instance_name: data.instance_name,
          phone_number: data.phone_number, is_connected: data.is_connected,
          daily_sent_count: data.daily_sent_count,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
        ...(warnings.length > 0 ? { category: 'warning' as const, suggestion: warnings.join('. ') } : {}),
      };
    });

    // ── Step 3: Normalize phone (MESMA FUNÇÃO do campaign-processor) ──
    let normalizedPhone = '';
    await runStep('normalize_phone', '3. Normalização do Telefone (campaign-processor)', async () => {
      if (!phone) throw new Error('Telefone não fornecido');

      normalizedPhone = normalizePhone(phone);

      if (normalizedPhone.length < 10) throw new Error(`Telefone muito curto: "${normalizedPhone}" (${normalizedPhone.length} dígitos)`);
      if (normalizedPhone.length > 15) throw new Error(`Telefone muito longo: "${normalizedPhone}" (${normalizedPhone.length} dígitos)`);

      const warnings: string[] = [];
      // Check if Brazilian number
      if (normalizedPhone.startsWith('55')) {
        const ddd = normalizedPhone.slice(2, 4);
        const numberPart = normalizedPhone.slice(4);
        if (parseInt(ddd) < 11 || parseInt(ddd) > 99) {
          warnings.push(`DDD ${ddd} pode ser inválido`);
        }
        return {
          details: {
            input: phone, normalized: normalizedPhone,
            format: 'brasileiro', ddd, number_part: numberPart,
            total_digits: normalizedPhone.length,
            warnings: warnings.length > 0 ? warnings : undefined,
            nota: 'Usando mesma lógica do campaign-processor (normalizePhone)',
          },
        };
      }

      return {
        details: {
          input: phone, normalized: normalizedPhone,
          format: 'internacional',
          total_digits: normalizedPhone.length,
          nota: 'Número internacional detectado (mesmo tratamento do campaign-processor)',
        },
      };
    });

    // ── Step 4: Check ignored contacts (MESMA FUNÇÃO do campaign-processor) ──
    await runStep('check_ignored', '4. Verificar Contato Ignorado (campaign-processor)', async () => {
      const ignored = await isContactIgnored(supabaseAdmin, userId, normalizedPhone);
      if (ignored) {
        return {
          details: { phone: normalizedPhone, is_ignored: true },
          category: 'warning' as const,
          suggestion: 'Este contato está na lista de ignorados. No disparo real, seria PULADO pelo campaign-processor. A mensagem ainda será enviada neste teste.',
        };
      }
      return { details: { phone: normalizedPhone, is_ignored: false } };
    });

    // ── Step 5: Check connection (MESMA FUNÇÃO do campaign-processor com 3 retries) ──
    const instanceName = (numberData as any)?.instance_name;
    let connectionOk = false;
    await runStep('check_connection', '5. Verificar Conexão (campaign-processor, 3 retries)', async () => {
      if (!instanceName) throw new Error('instance_name não disponível');

      const result = await checkInstanceConnection(
        EVOLUTION_API_URL!, EVOLUTION_API_KEY!, instanceName, 3
      );
      
      connectionOk = result.connected;

      if (!connectionOk) {
        throw new Error(`Instância não conectada após ${result.attempts} tentativas. Estado: "${result.state || 'unknown'}". Erros: ${result.errors.join(' | ')}`);
      }

      return {
        details: {
          state: result.state,
          attempts_needed: result.attempts,
          response_times_ms: result.responseTimes,
          max_retries: 3,
          retry_errors: result.errors.length > 0 ? result.errors : undefined,
          nota: 'Usando mesma lógica do campaign-processor (checkInstanceConnection com retry exponencial)',
        },
      };
    });

    // ── Step 6: Build payload ──
    await runStep('build_payload', '6. Geração do Payload', async () => {
      if (!message) throw new Error('Mensagem não fornecida');
      if (message.length > 4096) throw new Error(`Mensagem muito longa: ${message.length} caracteres (max: 4096)`);

      return {
        details: {
          message_length: message.length,
          phone: normalizedPhone,
          has_variables: message.includes('{'),
          ...(deepDebug ? { full_payload: { number: normalizedPhone, text: message } } : {}),
        },
        payload_sent: { number: normalizedPhone, text: message },
      };
    });

    // ── Step 7: Send message (MESMA FUNÇÃO do campaign-processor com timeout 15s) ──
    let sendResultData: any = null;
    await runStep('send_message', dryRun ? '7. Envio (DRY-RUN - não enviado)' : '7. Envio da Mensagem (campaign-processor, timeout 15s)', async () => {
      if (dryRun) {
        const simResult = await sendMessage(EVOLUTION_API_URL!, EVOLUTION_API_KEY!, instanceName, normalizedPhone, message, true);
        return {
          details: {
            mode: 'dry-run (simulation_mode do campaign-processor)',
            simulated_message_id: simResult.messageId,
            would_send_to: normalizedPhone,
            instance: instanceName,
            message_preview: message.slice(0, 100),
          },
          category: 'warning' as const,
          suggestion: 'Modo dry-run: usou sendMessage() com simulationMode=true (mesmo do campaign-processor). Desative dry-run para envio real.',
        };
      }

      const result = await sendMessage(
        EVOLUTION_API_URL!, EVOLUTION_API_KEY!, instanceName, normalizedPhone, message, false
      );
      sendResultData = result;

      if (!result.success) {
        throw new Error(`Envio falhou (HTTP ${result.httpStatus || '?'}): ${result.error?.slice(0, 300)}`);
      }

      return {
        details: {
          message_id: result.messageId || 'N/A',
          http_status: result.httpStatus,
          api_response_time_ms: result.responseTime,
          nota: 'Usando mesma função sendMessage() do campaign-processor (com AbortController timeout 15s)',
          ...(deepDebug ? { raw_response: result.rawResponse } : {}),
        },
        payload_sent: { number: normalizedPhone, text: message },
        payload_received: result.rawResponse,
      };
    });

    // ── Step 8: Update DB counts ──
    await runStep('update_db', '8. Atualização no Banco de Dados', async () => {
      if (dryRun) {
        return { details: { mode: 'dry-run', skipped: true }, category: 'warning' as const };
      }

      const today = new Date().toDateString();
      const lastSentDate = (numberData as any)?.last_sent_at
        ? new Date((numberData as any).last_sent_at).toDateString()
        : null;

      const currentCount = (numberData as any)?.daily_sent_count || 0;
      const newCount = lastSentDate === today ? currentCount + 1 : 1;

      const { error } = await supabaseAdmin
        .from('whatsapp_numbers')
        .update({
          daily_sent_count: newCount,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', numberId);

      if (error) throw new Error(`Erro ao atualizar banco: ${error.message}`);

      return {
        details: { previous_count: currentCount, new_count: newCount, date: today },
      };
    });

    // ── Step 9: Verify delivery ──
    await runStep('verify_delivery', '9. Verificação de Entrega', async () => {
      if (dryRun) {
        return { details: { mode: 'dry-run', skipped: true }, category: 'warning' as const };
      }

      const messageId = sendResultData?.messageId;

      return {
        details: {
          message_id: messageId || 'N/A',
          status: messageId ? 'sent' : 'unknown',
          note: 'Verificação de entrega baseada na resposta da API. Confirmação real via webhook.',
        },
      };
    });

    // ── Summary ──
    const totalDuration = performance.now() - startTime;
    const errorSteps = steps.filter(s => s.status === 'error');
    const warningSteps = steps.filter(s => s.status === 'warning');

    let overallStatus: 'success' | 'partial' | 'error' = 'success';
    let overallCategory = '🟢 Sistema OK (mesmas funções do campaign-processor)';

    if (errorSteps.length > 0) {
      overallStatus = 'error';
      const firstError = errorSteps[0];
      switch (firstError.category) {
        case 'config_error': overallCategory = '⚫ Falha de Configuração'; break;
        case 'infra_error': overallCategory = '🟣 Problema de Infraestrutura'; break;
        case 'external_error': overallCategory = '🔵 Erro Externo (API)'; break;
        case 'internal_error': overallCategory = '🔴 Erro Interno'; break;
        default: overallCategory = '🔴 Erro'; break;
      }
    } else if (warningSteps.length > 0) {
      overallStatus = 'partial';
      overallCategory = '🟡 Warning não crítico';
    }

    return new Response(JSON.stringify({
      trace_id: traceId,
      overall_status: overallStatus,
      overall_category: overallCategory,
      total_duration_ms: Math.round(totalDuration),
      dry_run: !!dryRun,
      deep_debug: !!deepDebug,
      timestamp: new Date().toISOString(),
      engine_note: 'Este debug usa EXATAMENTE as mesmas funções do campaign-processor: normalizePhone(), checkInstanceConnection(3 retries), sendMessage(timeout 15s), isContactIgnored()',
      steps,
      summary: {
        total_steps: steps.length,
        success: steps.filter(s => s.status === 'success').length,
        warnings: warningSteps.length,
        errors: errorSteps.length,
        skipped: steps.filter(s => s.status === 'skipped').length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalDuration = performance.now() - startTime;
    const classified = classifyError(error, 'global');
    
    return new Response(JSON.stringify({
      trace_id: traceId,
      overall_status: 'error',
      overall_category: '🔴 Erro Fatal',
      total_duration_ms: Math.round(totalDuration),
      timestamp: new Date().toISOString(),
      steps,
      global_error: classified,
      summary: {
        total_steps: steps.length,
        success: steps.filter(s => s.status === 'success').length,
        warnings: steps.filter(s => s.status === 'warning').length,
        errors: steps.filter(s => s.status === 'error').length + 1,
        skipped: 0,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
