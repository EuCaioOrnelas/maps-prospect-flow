// Integration Layer — endpoint público POST /api/v1/context
// Puro ORQUESTRADOR: autentica, valida, delega tudo ao Provider Registry
// e consolida os resultados. Nenhuma regra de domínio vive aqui.

import { CORS_HEADERS, ok, fail } from "../_integration-core/response.ts";
import { ERROR_CATALOG } from "../_integration-core/errors/catalog.ts";
import { verifyClient, verifyUser } from "../_integration-core/auth.ts";
import { checkRateLimit } from "../_integration-core/rateLimit.ts";
import { parseFilters } from "../_integration-core/filters/filterSchema.ts";
import { writeAudit } from "../_integration-core/audit.ts";
import { getRegistry } from "../_integration-core/registry/index.ts";

const ENDPOINT = "/api/v1/context";
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

  const audit = (data: {
    status: number; success: boolean;
    errorCode?: string | null; errorMessage?: string | null;
    clientId?: string | null; userId?: string | null; companyId?: string | null;
    modules?: string[]; filters?: Record<string, unknown>; records?: number;
  }) => writeAudit({
    request_id: requestId, client_id: data.clientId ?? null, user_id: data.userId ?? null,
    company_id: data.companyId ?? null, endpoint: ENDPOINT, version: VERSION,
    modules: data.modules ?? [], filters: data.filters ?? {},
    status_code: data.status, success: data.success,
    error_code: data.errorCode ?? null, error_message: data.errorMessage ?? null,
    processing_time_ms: Date.now() - started, records_returned: data.records ?? 0,
    ip, user_agent: ua,
  });

  if (req.method !== "POST") {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit({ status: 405, success: false, errorCode: "VALIDATION_BODY", errorMessage: "Method not allowed" });
    return fail({ status: 405, code: "VALIDATION_BODY", message: e.message, request_id: requestId });
  }

  const clientRes = verifyClient(req);
  if (!clientRes.ok) {
    const e = ERROR_CATALOG[clientRes.code];
    await audit({ status: e.status, success: false, errorCode: clientRes.code, errorMessage: e.message });
    return fail({ status: e.status, code: clientRes.code, message: e.message, request_id: requestId });
  }
  const clientId = clientRes.clientId;

  const userRes = await verifyUser(req);
  if (!userRes.ok) {
    const e = ERROR_CATALOG[userRes.code];
    await audit({ status: e.status, success: false, errorCode: userRes.code, errorMessage: e.message, clientId });
    return fail({ status: e.status, code: userRes.code, message: e.message, request_id: requestId });
  }
  const { userId, companyId, plan, permissions } = userRes.user;

  const rl = await checkRateLimit({ clientId, userId, endpoint: ENDPOINT, maxRequests: 60, windowSeconds: 60 });
  if (!rl.allowed) {
    const e = ERROR_CATALOG.RATE_LIMIT_EXCEEDED;
    await audit({ status: e.status, success: false, errorCode: "RATE_LIMIT_EXCEEDED", errorMessage: e.message, clientId, userId, companyId });
    return fail({
      status: e.status, code: "RATE_LIMIT_EXCEEDED", message: e.message,
      request_id: requestId, company_id: companyId, retry_after_s: rl.retryAfterSeconds,
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit({ status: e.status, success: false, errorCode: "VALIDATION_BODY", errorMessage: "JSON inválido", clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_BODY", message: e.message, request_id: requestId, company_id: companyId });
  }

  const version = String(body?.version ?? "v1");
  if (version !== "v1") {
    const e = ERROR_CATALOG.VALIDATION_VERSION;
    await audit({ status: e.status, success: false, errorCode: "VALIDATION_VERSION", errorMessage: e.message, clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_VERSION", message: e.message, request_id: requestId, company_id: companyId });
  }

  const registry = getRegistry();
  const rawModules = Array.isArray(body?.modules) ? body.modules : [];
  const modules: string[] = rawModules.filter((m: unknown): m is string => typeof m === "string");
  if (modules.length === 0) {
    const e = ERROR_CATALOG.VALIDATION_MODULES;
    await audit({ status: e.status, success: false, errorCode: "VALIDATION_MODULES", errorMessage: e.message, clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_MODULES", message: e.message, request_id: requestId, company_id: companyId });
  }

  const filtersRes = parseFilters(body?.filters);
  if (!filtersRes.ok) {
    const e = ERROR_CATALOG.VALIDATION_FILTERS;
    await audit({ status: e.status, success: false, errorCode: "VALIDATION_FILTERS", errorMessage: filtersRes.reason, clientId, userId, companyId });
    return fail({ status: e.status, code: "VALIDATION_FILTERS", message: `${e.message} ${filtersRes.reason}`, request_id: requestId, company_id: companyId });
  }
  const filters = filtersRes.filters;
  const bypassCache = req.headers.get("x-integration-cache-bypass") === "true";

  // Delega TUDO ao Registry. Aqui não há CRM, Cockpit, Meta, nada.
  const baseCtx = registry.buildContext({ companyId, userId, permissions, plan, filters });
  const { results, errors } = await registry.executeMany(modules, baseCtx, { bypassCache });

  // Consolida: nome do provider vira chave, mantém metadata individual de cada um.
  const context: Record<string, unknown> = {};
  let totalRecords = 0;
  let anyCacheHit = false;
  for (const [name, r] of Object.entries(results)) {
    context[name] = { data: r.data, metadata: r.metadata };
    totalRecords += r.metadata.records_count;
    if (r.metadata.cache.hit) anyCacheHit = true;
  }

  const elapsed = Date.now() - started;
  await audit({
    status: 200, success: errors.length === 0,
    errorCode: errors[0]?.code ?? null, errorMessage: errors[0]?.message ?? null,
    clientId, userId, companyId, modules, filters: filters as unknown as Record<string, unknown>,
    records: totalRecords,
  });

  return ok({
    request_id: requestId, company_id: companyId, version: VERSION,
    processing_time_ms: elapsed,
    cache: { hit: anyCacheHit, ttl_s: 0 },
    filters_applied: filters as unknown as Record<string, unknown>,
    context,
    errors: errors.map((e) => ({ code: e.code, message: e.message, provider: e.provider })),
  });
});
