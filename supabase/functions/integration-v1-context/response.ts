// Contrato de resposta padrão da Integration Layer.
// Todas as respostas — sucesso ou erro — passam por aqui.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-integration-client-id, x-integration-client-secret, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface IntegrationEnvelope {
  status: number;
  success: boolean;
  timestamp: string;
  request_id: string;
  company_id: string | null;
  version: string;
  processing_time_ms: number;
  cache: { hit: boolean; ttl_s: number };
  filters_applied: Record<string, unknown>;
  context: Record<string, unknown>;
  errors: Array<{ code: string; message: string; provider?: string }>;
}

export function ok(payload: Omit<IntegrationEnvelope, "status" | "success" | "timestamp">) {
  const body: IntegrationEnvelope = {
    status: 200,
    success: true,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function fail(opts: {
  status: number;
  code: string;
  message: string;
  request_id: string;
  company_id?: string | null;
  version?: string;
  processing_time_ms?: number;
  filters_applied?: Record<string, unknown>;
  retry_after_s?: number;
}) {
  const body: IntegrationEnvelope = {
    status: opts.status,
    success: false,
    timestamp: new Date().toISOString(),
    request_id: opts.request_id,
    company_id: opts.company_id ?? null,
    version: opts.version ?? "v1",
    processing_time_ms: opts.processing_time_ms ?? 0,
    cache: { hit: false, ttl_s: 0 },
    filters_applied: opts.filters_applied ?? {},
    context: {},
    errors: [{ code: opts.code, message: opts.message }],
  };
  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
  };
  if (opts.retry_after_s) headers["Retry-After"] = String(opts.retry_after_s);
  return new Response(JSON.stringify(body), { status: opts.status, headers });
}
