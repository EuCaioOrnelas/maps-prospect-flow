// Integration Layer — endpoint público POST /api/v1/context
// Fluxo: CORS → parse body → verifyClient → verifyUser → rate-limit → parseFilters
//        → buildContext (providers em paralelo) → audit → response padronizado.
//
// Nada aqui expõe SQL, IDs internos sensíveis, tokens ou stack traces.

import { CORS_HEADERS, ok, fail } from "./response.ts";
import { ERROR_CATALOG } from "./errors/catalog.ts";
import { verifyClient, verifyUser } from "./auth.ts";
import { checkRateLimit } from "./rateLimit.ts";
import { parseFilters } from "./filters/filterSchema.ts";
import { buildContext, SUPPORTED_MODULES, type ModuleKey } from "./contextBuilder.ts";
import { writeAudit } from "./audit.ts";

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

  const audit = async (data: {
    status: number;
    success: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    clientId?: string | null;
    userId?: string | null;
    companyId?: string | null;
    modules?: string[];
    filters?: Record<string, unknown>;
    records?: number;
  }) => {
    await writeAudit({
      request_id: requestId,
      client_id: data.clientId ?? null,
      user_id: data.userId ?? null,
      company_id: data.companyId ?? null,
      endpoint: ENDPOINT,
      version: VERSION,
      modules: data.modules ?? [],
      filters: data.filters ?? {},
      status_code: data.status,
      success: data.success,
      error_code: data.errorCode ?? null,
      error_message: data.errorMessage ?? null,
      processing_time_ms: Date.now() - started,
      records_returned: data.records ?? 0,
      ip,
      user_agent: ua,
    });
  };

  if (req.method !== "POST") {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit({ status: 405, success: false, errorCode: "VALIDATION_BODY", errorMessage: "Method not allowed" });
    return fail({ status: 405, code: "VALIDATION_BODY", message: e.message, request_id: requestId });
  }

  // 1) client credentials
  const clientRes = verifyClient(req);
  if (!clientRes.ok) {
    const e = ERROR_CATALOG[clientRes.code];
    await audit({ status: e.status, success: false, errorCode: clientRes.code, errorMessage: e.message });
    return fail({ status: e.status, code: clientRes.code, message: e.message, request_id: requestId });
  }
  const clientId = clientRes.clientId;

  // 2) user JWT
  const userRes = await verifyUser(req);
  if (!userRes.ok) {
    const e = ERROR_CATALOG[userRes.code];
    await audit({ status: e.status, success: false, errorCode: userRes.code, errorMessage: e.message, clientId });
    return fail({ status: e.status, code: userRes.code, message: e.message, request_id: requestId });
  }
  const { userId, companyId } = userRes.user;

  // 3) rate limit
  const rl = await checkRateLimit({ clientId, userId, endpoint: ENDPOINT, maxRequests: 60, windowSeconds: 60 });
  if (!rl.allowed) {
    const e = ERROR_CATALOG.RATE_LIMIT_EXCEEDED;
    await audit({
      status: e.status, success: false, errorCode: "RATE_LIMIT_EXCEEDED",
      errorMessage: e.message, clientId, userId, companyId,
    });
    return fail({
      status: e.status, code: "RATE_LIMIT_EXCEEDED", message: e.message,
      request_id: requestId, company_id: companyId, retry_after_s: rl.retryAfterSeconds,
    });
  }

  // 4) parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
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

  const rawModules = Array.isArray(body?.modules) ? body.modules : [];
  const modules = rawModules.filter((m: unknown): m is ModuleKey => typeof m === "string" && (SUPPORTED_MODULES as readonly string[]).includes(m));
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

  // 5) build context
  const build = await buildContext({ companyId, modules, filters });

  const elapsed = Date.now() - started;
  await audit({
    status: 200, success: build.errors.length === 0,
    errorCode: build.errors[0]?.code ?? null,
    errorMessage: build.errors[0]?.message ?? null,
    clientId, userId, companyId,
    modules, filters: filters as unknown as Record<string, unknown>,
    records: build.recordsReturned,
  });

  return ok({
    request_id: requestId,
    company_id: companyId,
    version: VERSION,
    processing_time_ms: elapsed,
    cache: { hit: false, ttl_s: 0 },
    filters_applied: filters as unknown as Record<string, unknown>,
    context: build.context,
    errors: build.errors,
  });
});
