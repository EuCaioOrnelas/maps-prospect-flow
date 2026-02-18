import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

function parseStackTrace(error: unknown): { stack_trace?: string; error_file?: string; error_line?: number; error_column?: number } {
  if (!(error instanceof Error) || !error.stack) return {};
  
  const stack = error.stack;
  const lines = stack.split('\n').filter(l => l.trim().startsWith('at '));
  
  // Try to find relevant line (skip node internals)
  for (const line of lines) {
    const match = line.match(/at\s+(.+?)\s*\(?((?:file|https?):\/\/[^)]+?):(\d+):(\d+)\)?/) ||
                  line.match(/at\s+((?:file|https?):\/\/[^:]+):(\d+):(\d+)/);
    if (match) {
      const hasName = match.length === 5;
      const file = hasName ? match[2] : match[1];
      const lineNum = parseInt(hasName ? match[3] : match[2]);
      const col = parseInt(hasName ? match[4] : match[3]);
      // Extract just filename from full path
      const fileName = file.split('/').pop() || file;
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
    return {
      category: 'config_error',
      error_message: msg,
      suggestion: `Verifique se as variáveis de ambiente necessárias estão configuradas (EVOLUTION_API_URL, EVOLUTION_API_KEY).`,
      ...stackInfo,
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnrefused') || lower.includes('dns')) {
    return {
      category: 'infra_error',
      error_message: msg,
      suggestion: 'Problema de infraestrutura: verifique se o servidor da API está acessível e se a URL está correta.',
      ...stackInfo,
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('403')) {
    return {
      category: 'external_error',
      error_message: msg,
      error_code: lower.includes('401') ? 401 : 403,
      suggestion: 'Falha de autenticação. Verifique se a API Key da Evolution está correta e válida.',
      ...stackInfo,
    };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return {
      category: 'external_error',
      error_message: msg,
      error_code: 429,
      suggestion: 'Rate limit atingido. Aguarde alguns minutos antes de tentar novamente.',
      ...stackInfo,
    };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504')) {
    return {
      category: 'external_error',
      error_message: msg,
      error_code: parseInt(lower.match(/5\d{2}/)?.[0] || '500'),
      suggestion: 'Erro no servidor da Evolution API. Tente novamente em alguns minutos.',
      ...stackInfo,
    };
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return {
      category: 'external_error',
      error_message: msg,
      error_code: 404,
      suggestion: 'Endpoint não encontrado. Verifique se a instância existe e se a URL da API está correta.',
      ...stackInfo,
    };
  }
  
  return {
    category: 'internal_error',
    error_message: msg,
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
        id,
        name,
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
      steps.push({
        id,
        name,
        status: 'error',
        duration_ms: Math.round(duration),
        ...classified,
      });
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
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use anon key + auth header for JWT validation (compatible with ES256 signing keys)
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[debug-dispatch-test] JWT validation failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid JWT', detail: userError?.message }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin
    const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
    // Note: use getUser token-based check for admin - for now allow any authenticated user
    // In production, uncomment below:
    // if (!isAdmin) {
    //   return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: corsHeaders });
    // }

    const body = await req.json();
    const { numberId, phone, message, deepDebug, dryRun } = body;

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    // ── Step 1: Validate config ──
    let configOk = true;
    const step1 = await runStep('config_check', '1. Verificação de Configuração', async () => {
      const missing: string[] = [];
      if (!EVOLUTION_API_URL) missing.push('EVOLUTION_API_URL');
      if (!EVOLUTION_API_KEY) missing.push('EVOLUTION_API_KEY');
      if (!SUPABASE_URL) missing.push('SUPABASE_URL');
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

      if (missing.length > 0) {
        throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);
      }

      return {
        details: {
          evolution_url: EVOLUTION_API_URL,
          evolution_key_preview: EVOLUTION_API_KEY ? `${EVOLUTION_API_KEY.slice(0, 6)}...` : 'N/A',
          supabase_url: SUPABASE_URL,
          ...(deepDebug ? { all_env_keys: Object.keys(Deno.env.toObject()).filter(k => !k.includes('KEY') && !k.includes('SECRET')).sort() } : {}),
        },
      };
    });
    if (!step1.success) configOk = false;

    // ── Step 2: Validate number ──
    let numberData: Record<string, unknown> | null = null;
    const step2 = await runStep('validate_number', '2. Validação do Número', async () => {
      if (!numberId) throw new Error('numberId não fornecido');

      const { data, error } = await supabase
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
          id: data.id,
          name: data.name,
          instance_name: data.instance_name,
          phone_number: data.phone_number,
          is_connected: data.is_connected,
          daily_sent_count: data.daily_sent_count,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
        ...(warnings.length > 0 ? { category: 'warning' as const, suggestion: warnings.join('. ') } : {}),
      };
    });

    // ── Step 3: Normalize phone ──
    let normalizedPhone = '';
    await runStep('normalize_phone', '3. Normalização do Telefone', async () => {
      if (!phone) throw new Error('Telefone não fornecido');

      const raw = phone.replace(/\D/g, '');
      if (raw.length < 10) throw new Error(`Telefone muito curto: "${raw}" (${raw.length} dígitos)`);
      if (raw.length > 15) throw new Error(`Telefone muito longo: "${raw}" (${raw.length} dígitos)`);

      normalizedPhone = raw.startsWith('55') ? raw : `55${raw}`;

      // Brazilian phone validation
      const ddd = normalizedPhone.slice(2, 4);
      const numberPart = normalizedPhone.slice(4);
      const warnings: string[] = [];

      if (parseInt(ddd) < 11 || parseInt(ddd) > 99) {
        warnings.push(`DDD ${ddd} pode ser inválido`);
      }
      if (numberPart.length === 8 && ['6', '7', '8', '9'].includes(numberPart[0])) {
        normalizedPhone = `55${ddd}9${numberPart}`;
        warnings.push('Adicionado 9º dígito automaticamente');
      }

      return {
        details: {
          input: phone,
          cleaned: raw,
          normalized: normalizedPhone,
          ddd,
          number_part: numberPart,
          total_digits: normalizedPhone.length,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    });

    // ── Step 4: Check connection via API ──
    let connectionOk = false;
    const instanceName = (numberData as any)?.instance_name;
    await runStep('check_connection', '4. Verificar Conexão na API', async () => {
      if (!instanceName) throw new Error('instance_name não disponível');

      const url = `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
      const fetchStart = performance.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY! },
      });
      const fetchDuration = performance.now() - fetchStart;

      const responseText = await response.text();
      let responseJson: unknown;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = responseText;
      }

      if (!response.ok) {
        throw new Error(`API retornou ${response.status}: ${responseText.slice(0, 200)}`);
      }

      const state = (responseJson as any)?.state || (responseJson as any)?.instance?.state;
      connectionOk = state === 'open';

      if (!connectionOk) {
        throw new Error(`Estado da instância: "${state}" (esperado: "open")`);
      }

      return {
        details: {
          state,
          api_response_time_ms: Math.round(fetchDuration),
          ...(deepDebug ? { raw_response: responseJson } : {}),
        },
        headers_sent: { apikey: '***' },
        headers_received: Object.fromEntries(response.headers.entries()),
        payload_received: responseJson,
      };
    });

    // ── Step 5: Build payload ──
    let sendPayload: Record<string, unknown> = {};
    await runStep('build_payload', '5. Geração do Payload', async () => {
      if (!message) throw new Error('Mensagem não fornecida');
      if (message.length > 4096) throw new Error(`Mensagem muito longa: ${message.length} caracteres (max: 4096)`);

      sendPayload = {
        number: normalizedPhone,
        text: message,
      };

      return {
        details: {
          message_length: message.length,
          phone: normalizedPhone,
          has_variables: message.includes('{'),
          ...(deepDebug ? { full_payload: sendPayload } : {}),
        },
        payload_sent: sendPayload,
      };
    });

    // ── Step 6: Send message (or dry-run) ──
    let sendResult: unknown = null;
    let sendResponseHeaders: Record<string, string> = {};
    await runStep('send_message', dryRun ? '6. Envio (DRY-RUN - não enviado)' : '6. Envio da Mensagem', async () => {
      if (dryRun) {
        return {
          details: {
            mode: 'dry-run',
            would_send_to: normalizedPhone,
            instance: instanceName,
            message_preview: message.slice(0, 100),
          },
          category: 'warning' as const,
          suggestion: 'Modo dry-run: mensagem NÃO foi enviada. Desative dry-run para envio real.',
        };
      }

      const url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
      const fetchStart = performance.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY!,
        },
        body: JSON.stringify(sendPayload),
      });
      const fetchDuration = performance.now() - fetchStart;

      const responseText = await response.text();
      try {
        sendResult = JSON.parse(responseText);
      } catch {
        sendResult = responseText;
      }

      sendResponseHeaders = Object.fromEntries(response.headers.entries());

      if (!response.ok) {
        throw new Error(`API retornou ${response.status}: ${responseText.slice(0, 300)}`);
      }

      const messageId = (sendResult as any)?.key?.id || (sendResult as any)?.messageId;

      return {
        details: {
          http_status: response.status,
          message_id: messageId,
          api_response_time_ms: Math.round(fetchDuration),
          ...(deepDebug ? { raw_response: sendResult } : {}),
        },
        payload_sent: sendPayload,
        payload_received: sendResult,
        headers_sent: { 'Content-Type': 'application/json', apikey: '***' },
        headers_received: sendResponseHeaders,
      };
    });

    // ── Step 7: Update DB counts ──
    await runStep('update_db', '7. Atualização no Banco de Dados', async () => {
      if (dryRun) {
        return {
          details: { mode: 'dry-run', skipped: true },
          category: 'warning' as const,
        };
      }

      const today = new Date().toDateString();
      const lastSentDate = (numberData as any)?.last_sent_at
        ? new Date((numberData as any).last_sent_at).toDateString()
        : null;

      const currentCount = (numberData as any)?.daily_sent_count || 0;
      const newCount = lastSentDate === today ? currentCount + 1 : 1;

      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({
          daily_sent_count: newCount,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', numberId);

      if (error) throw new Error(`Erro ao atualizar banco: ${error.message}`);

      return {
        details: {
          previous_count: currentCount,
          new_count: newCount,
          date: today,
        },
      };
    });

    // ── Step 8: Verify delivery ──
    await runStep('verify_delivery', '8. Verificação de Entrega', async () => {
      if (dryRun) {
        return {
          details: { mode: 'dry-run', skipped: true },
          category: 'warning' as const,
        };
      }

      const messageId = (sendResult as any)?.key?.id || (sendResult as any)?.messageId;

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
    let overallCategory = '🟢 Sistema OK';

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
