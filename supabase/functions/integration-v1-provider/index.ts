// Integration Layer — endpoint privado dos Providers.
// URL pública: POST /functions/v1/integration-v1-provider
// Logicamente representa 20 endpoints /api/v1/providers/<name>.
// O nome do provider vem em:
//   1) body.provider    (preferencial)
//   2) header x-provider-name
// Autenticação e observabilidade idênticas ao /context.

import { CORS_HEADERS, ok, fail } from "../_integration-core/response.ts";
import { ERROR_CATALOG } from "../_integration-core/errors/catalog.ts";
import { verifyClient, verifyUser } from "../_integration-core/auth.ts";
import { checkRateLimit } from "../_integration-core/rateLimit.ts";
import { parseFilters } from "../_integration-core/filters/filterSchema.ts";
import { writeAudit } from "../_integration-core/audit.ts";
import { getRegistry } from "../_integration-core/registry/index.ts";
import { ProviderNotFoundError } from "../_integration-core/registry/ProviderRegistry.ts";

const VERSION = "v1";

function newRequestId(headers: Headers): string {
  const provided = headers.get("x-request-id");
  if (provided && /^[a-zA-Z0-9-]{8,64}$/.test(provided)) return provided;
  return crypto.randomUUID();
}
function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const started = Date.now();
  const requestId = newRequestId(req.headers);
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent");

  const audit = (name: string, data: {
    status: number; success: boolean;
    errorCode?: string | null; errorMessage?: string | null;
    clientId?: string | null; userId?: string | null; companyId?: string | null;
    filters?: Record<string, unknown>; records?: number;
  }) => writeAudit({
    request_id: requestId, client_id: data.clientId ?? null, user_id: data.userId ?? null,
    company_id: data.companyId ?? null,
    endpoint: `/api/v1/providers/${name || "unknown"}`, version: VERSION,
    modules: [name || "unknown"], filters: data.filters ?? {},
    status_code: data.status, success: data.success,
    error_code: data.errorCode ?? null, error_message: data.errorMessage ?? null,
    processing_time_ms: Date.now() - started, records_returned: data.records ?? 0,
    ip, user_agent: ua,
  });

  if (req.method !== "POST") {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit("", { status: 405, success: false, errorCode: "VALIDATION_BODY", errorMessage: "Method not allowed" });
    return fail({ status: 405, code: "VALIDATION_BODY", message: e.message, request_id: requestId });
  }

  const clientRes = verifyClient(req);
  if (!clientRes.ok) {
    const e = ERROR_CATALOG[clientRes.code];
    await audit("", { status: e.status, success: false, errorCode: clientRes.code, errorMessage: e.message });
    return fail({ status: e.status, code: clientRes.code, message: e.message, request_id: requestId });
  }
  const clientId = clientRes.clientId;

  const userRes = await verifyUser(req);
  if (!userRes.ok) {
    const e = ERROR_CATALOG[userRes.code];
    await audit("", { status: e.status, success: false, errorCode: userRes.code, errorMessage: e.message, clientId });
    return fail({ status: e.status, code: userRes.code, message: e.message, request_id: requestId });
  }
  const { userId, companyId, plan, permissions } = userRes.user;

  let body: any;
  try { body = await req.json(); } catch {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit("", { status: e.status, success: false, errorCode: "VALIDATION_BODY", errorMessage: "JSON inválido", clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_BODY", message: e.message, request_id: requestId, company_id: companyId });
  }

  const providerName = String(body?.provider ?? req.headers.get("x-provider-name") ?? "").trim().toLowerCase();
  if (!providerName || !/^[a-z_]+$/.test(providerName)) {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit("", { status: e.status, success: false, errorCode: "VALIDATION_BODY", errorMessage: "provider ausente", clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_BODY", message: "Campo 'provider' obrigatório.", request_id: requestId, company_id: companyId });
  }

  const rl = await checkRateLimit({ clientId, userId, endpoint: `/api/v1/providers/${providerName}`, maxRequests: 120, windowSeconds: 60 });
  if (!rl.allowed) {
    const e = ERROR_CATALOG.RATE_LIMIT_EXCEEDED;
    await audit(providerName, { status: e.status, success: false, errorCode: "RATE_LIMIT_EXCEEDED", errorMessage: e.message, clientId, userId, companyId });
    return fail({
      status: e.status, code: "RATE_LIMIT_EXCEEDED", message: e.message,
      request_id: requestId, company_id: companyId, retry_after_s: rl.retryAfterSeconds,
    });
  }

  const filtersRes = parseFilters(body?.filters);
  if (!filtersRes.ok) {
    const e = ERROR_CATALOG.VALIDATION_FILTERS;
    await audit(providerName, { status: e.status, success: false, errorCode: "VALIDATION_FILTERS", errorMessage: filtersRes.reason, clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_FILTERS", message: `${e.message} ${filtersRes.reason}`, request_id: requestId, company_id: companyId });
  }
  const filters = filtersRes.filters;
  const bypassCache = req.headers.get("x-integration-cache-bypass") === "true";

  const registry = getRegistry();
  const baseCtx = registry.buildContext({ companyId, userId, permissions, plan, filters });

  try {
    // executeMany resolve dependências automaticamente, mesmo pedindo 1 provider.
    const { results, errors } = await registry.executeMany([providerName], baseCtx, { bypassCache });
    const result = results[providerName];

    if (!result) {
      const first = errors[0];
      const code = first?.code ?? "PROVIDER_ERROR";
      const meta = (ERROR_CATALOG as any)[code] ?? ERROR_CATALOG.PROVIDER_ERROR;
      await audit(providerName, { status: meta.status, success: false, errorCode: code, errorMessage: first?.message ?? meta.message, clientId, userId, companyId, filters: filters as any });
      return fail({ status: meta.status, code, message: first?.message ?? meta.message, request_id: requestId, company_id: companyId });
    }

    await audit(providerName, {
      status: 200, success: errors.length === 0,
      errorCode: errors[0]?.code ?? null, errorMessage: errors[0]?.message ?? null,
      clientId, userId, companyId, filters: filters as any, records: result.metadata.records_count,
    });

    return ok({
      request_id: requestId, company_id: companyId, version: VERSION,
      processing_time_ms: Date.now() - started,
      cache: result.metadata.cache,
      filters_applied: result.metadata.filters_applied,
      context: { [providerName]: { data: result.data, metadata: result.metadata } },
      errors: errors.map((e) => ({ code: e.code, message: e.message, provider: e.provider })),
    });
  } catch (err) {
    if (err instanceof ProviderNotFoundError) {
      const e = ERROR_CATALOG.PROVIDER_NOT_FOUND;
      await audit(providerName, { status: e.status, success: false, errorCode: "PROVIDER_NOT_FOUND", errorMessage: e.message, clientId, userId, companyId });
      return fail({ status: e.status, code: "PROVIDER_NOT_FOUND", message: e.message, request_id: requestId, company_id: companyId });
    }
    const e = ERROR_CATALOG.PROVIDER_ERROR;
    await audit(providerName, { status: e.status, success: false, errorCode: "PROVIDER_ERROR", errorMessage: (err as Error).message, clientId, userId, companyId });
    return fail({ status: e.status, code: "PROVIDER_ERROR", message: e.message, request_id: requestId, company_id: companyId });
  }
});
