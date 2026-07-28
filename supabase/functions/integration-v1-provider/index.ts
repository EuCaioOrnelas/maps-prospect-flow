// Integration Layer — self-contained edge function.
// All logic (auth, cache, rate-limit, audit, providers) is inlined so it can be deployed via Supabase Web Editor.
// Deploy this single file — no shared folder, no CLI needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ================= _integration-core/response.ts =================
// Contrato de resposta padrão da Integration Layer.
// Toda resposta — sucesso ou erro — passa por aqui.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-integration-client-id, x-integration-client-secret, x-integration-signature, x-integration-timestamp, x-integration-nonce, x-integration-api-version, x-idempotency-key, x-correlation-id, x-request-id, x-provider-name, x-integration-cache-bypass",
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


// ================= _integration-core/errors/catalog.ts =================
// Catálogo oficial de erros da Integration Layer.
// Nunca expor stack trace, SQL ou detalhes internos. Sempre usar um código daqui.

export const ERROR_CATALOG = {
  AUTH_MISSING_CLIENT:      { status: 401, message: "Credenciais de cliente ausentes." },
  AUTH_INVALID_CLIENT:      { status: 401, message: "Credenciais de cliente inválidas." },
  AUTH_MISSING_USER_TOKEN:  { status: 401, message: "Token do usuário ausente no header Authorization." },
  AUTH_INVALID_USER_TOKEN:  { status: 401, message: "Token do usuário inválido ou expirado." },
  AUTH_INVALID_SIGNATURE:   { status: 401, message: "Assinatura HMAC inválida." },
  AUTH_STALE_TIMESTAMP:     { status: 401, message: "Timestamp fora da janela permitida." },
  AUTH_REPLAYED_NONCE:      { status: 401, message: "Nonce já utilizado (replay detectado)." },
  PERM_NO_COMPANY:          { status: 403, message: "Usuário autenticado não possui empresa associada." },
  PERM_MODULE_FORBIDDEN:    { status: 403, message: "Usuário não possui permissão para este módulo." },
  PERM_PLAN_REQUIRED:       { status: 403, message: "Plano atual não contempla este módulo." },
  PERM_SCOPE_MISSING:       { status: 403, message: "Client não possui escopo necessário para este recurso." },
  VALIDATION_BODY:          { status: 400, message: "Corpo da requisição inválido." },
  VALIDATION_MODULES:       { status: 400, message: "Lista de módulos inválida ou vazia." },
  VALIDATION_FILTERS:       { status: 400, message: "Filtros inválidos." },
  VALIDATION_VERSION:       { status: 400, message: "Versão não suportada." },
  PROVIDER_NOT_FOUND:       { status: 404, message: "Provider não registrado." },
  RATE_LIMIT_EXCEEDED:      { status: 429, message: "Limite de requisições excedido. Tente novamente em instantes." },
  IP_RATE_LIMIT:            { status: 429, message: "Muitas requisições deste IP. Aguarde alguns instantes." },
  PROVIDER_TIMEOUT:         { status: 504, message: "Timeout ao consultar dados do provider." },
  PROVIDER_ERROR:           { status: 502, message: "Falha ao consultar dados do provider." },
  INTERNAL_ERROR:           { status: 500, message: "Erro interno da Integration Layer." },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;


// ================= _integration-core/filters/filterSchema.ts =================
// Contrato oficial de filtros aceitos pela Integration Layer.
export interface Period { from?: string | null; to?: string | null; }
export interface Pagination { page: number; size: number; }

export interface IntegrationFilters {
  period?: Period;
  pagination?: Pagination;
  tags?: string[];
  stage_id?: string | null;
  campaign_id?: string | null;
  sort?: string;
}

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export function parseFilters(raw: unknown): { ok: true; filters: IntegrationFilters } | { ok: false; reason: string } {
  if (raw == null) return { ok: true, filters: { pagination: { page: 1, size: DEFAULT_PAGE_SIZE } } };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "filters must be an object" };
  const f = raw as Record<string, unknown>;
  const out: IntegrationFilters = {};

  if (f.period !== undefined) {
    if (typeof f.period !== "object" || f.period === null) return { ok: false, reason: "period must be object" };
    const p = f.period as Record<string, unknown>;
    out.period = { from: typeof p.from === "string" ? p.from : null, to: typeof p.to === "string" ? p.to : null };
    if (out.period.from && Number.isNaN(Date.parse(out.period.from))) return { ok: false, reason: "period.from invalid ISO date" };
    if (out.period.to && Number.isNaN(Date.parse(out.period.to))) return { ok: false, reason: "period.to invalid ISO date" };
  }

  if (f.pagination !== undefined) {
    if (typeof f.pagination !== "object" || f.pagination === null) return { ok: false, reason: "pagination must be object" };
    const pg = f.pagination as Record<string, unknown>;
    const page = Number(pg.page ?? 1);
    const size = Number(pg.size ?? DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(page) || page < 1) return { ok: false, reason: "pagination.page invalid" };
    if (!Number.isFinite(size) || size < 1) return { ok: false, reason: "pagination.size invalid" };
    out.pagination = { page: Math.floor(page), size: Math.min(Math.floor(size), MAX_PAGE_SIZE) };
  } else {
    out.pagination = { page: 1, size: DEFAULT_PAGE_SIZE };
  }

  if (f.tags !== undefined) {
    if (!Array.isArray(f.tags) || f.tags.some((t) => typeof t !== "string")) return { ok: false, reason: "tags must be string[]" };
    out.tags = f.tags as string[];
  }
  if (f.stage_id !== undefined) {
    if (f.stage_id !== null && typeof f.stage_id !== "string") return { ok: false, reason: "stage_id must be string or null" };
    out.stage_id = (f.stage_id as string | null) ?? null;
  }
  if (f.campaign_id !== undefined) {
    if (f.campaign_id !== null && typeof f.campaign_id !== "string") return { ok: false, reason: "campaign_id must be string or null" };
    out.campaign_id = (f.campaign_id as string | null) ?? null;
  }
  if (f.sort !== undefined) {
    if (typeof f.sort !== "string" || !/^[a-z_]+:(asc|desc)$/i.test(f.sort)) return { ok: false, reason: "sort must be 'field:asc|desc'" };
    out.sort = f.sort;
  }

  return { ok: true, filters: out };
}

export const FILTER_LIMITS = { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE };


// ================= _integration-core/cache.ts =================
// Cache in-memory por instância. Chave por provider + tenant + filtros.
// Limitação conhecida: cache é local à instância da Edge Function. Suficiente
// para janelas curtas (30-120s) e coerente com o modelo serverless.
// Futuro: migrar para Deno KV ou Redis mantendo o mesmo contrato.

export interface CacheEntry<T = unknown> { value: T; expiresAt: number; storedAt: number; ttlSeconds: number; }

const store = new Map<string, CacheEntry>();

async function hash(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export async function makeCacheKey(providerName: string, companyId: string, filters: unknown): Promise<string> {
  const h = await hash(JSON.stringify(filters ?? {}));
  return `provider:${providerName}:${companyId}:${h}`;
}

export function cacheGet<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): CacheEntry<T> {
  const now = Date.now();
  const entry: CacheEntry<T> = { value, ttlSeconds, storedAt: now, expiresAt: now + ttlSeconds * 1000 };
  store.set(key, entry);
  return entry;
}

export function cacheClear(): void { store.clear(); }
export function cacheSize(): number { return store.size; }


// ================= _integration-core/audit.ts =================
// Grava auditoria de toda requisição — sucesso ou falha. Falha silenciosa.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuditEntry {
  request_id: string;
  client_id: string | null;
  user_id: string | null;
  company_id: string | null;
  endpoint: string;
  version: string;
  modules: string[];
  filters: Record<string, unknown>;
  status_code: number;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  processing_time_ms: number;
  records_returned: number;
  ip: string | null;
  user_agent: string | null;
  // P1→P5 hardening columns
  correlation_id?: string | null;
  circuit_state?: string | null;
  cache_hit?: boolean | null;
  signature_verified?: boolean | null;
  scopes_matched?: boolean | null;
  blocked_reason?: string | null;
  rate_limited?: boolean | null;
  ban_applied?: boolean | null;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("integration_audit_log").insert(entry);
  } catch (e) {
    console.warn("[integration] audit write failed:", (e as Error).message);
  }
}

// ---- P1→P5 DB persistence helpers ----
export async function checkIntegrationBan(
  ip: string, clientId: string | null,
): Promise<{ banned: boolean; reason?: string; until?: string }> {
  if ((!ip || ip === "unknown") && !clientId) return { banned: false };
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("check_integration_ban", {
      p_ip: ip || null, p_client_id: clientId,
    });
    if (error || !data) return { banned: false };
    const d = data as any;
    return { banned: Boolean(d?.banned), reason: d?.reason, until: d?.until };
  } catch { return { banned: false }; }
}

export function recordAbuse(
  ip: string, clientId: string | null, eventType: string,
  severity = 1, details: Record<string, unknown> = {},
): void {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    admin.rpc("record_abuse_event", {
      p_ip: ip && ip !== "unknown" ? ip : null,
      p_client_id: clientId,
      p_event_type: eventType,
      p_severity: severity,
      p_details: details,
    }).then(() => {}, () => {});
  } catch { /* noop */ }
}

export async function consumeNonceDb(clientId: string, nonce: string): Promise<boolean> {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("consume_nonce", {
      p_client_id: clientId, p_nonce: nonce, p_ttl_seconds: 600,
    });
    if (error) return true; // fail-open if RPC missing
    return Boolean(data);
  } catch { return true; }
}

export async function checkIdempotencyDb(
  clientId: string, key: string, requestHash: string,
): Promise<{ replay: boolean; body?: string; status?: number }> {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("check_idempotency", {
      p_client_id: clientId, p_key: key, p_request_hash: requestHash,
    });
    if (error || !data) return { replay: false };
    const d = data as any;
    if (!d.replay) return { replay: false };
    const body = typeof d.response === "string" ? d.response : JSON.stringify(d.response ?? {});
    return { replay: true, body, status: Number(d.status ?? 200) };
  } catch { return { replay: false }; }
}

export async function storeIdempotencyDb(
  clientId: string, key: string, requestHash: string, body: string, status: number,
): Promise<void> {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let parsed: unknown = body;
    try { parsed = JSON.parse(body); } catch { /* keep raw */ }
    await admin.rpc("store_idempotency", {
      p_client_id: clientId, p_key: key, p_request_hash: requestHash,
      p_body: parsed, p_status: status, p_ttl_seconds: 600,
    });
  } catch { /* noop */ }
}


// ================= _integration-core/rateLimit.ts =================
// Reutiliza a RPC public.check_rate_limit já existente. Chave: <client>:<user>:<endpoint>.

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

export interface RateLimitResult { allowed: boolean; retryAfterSeconds: number; }

export async function checkRateLimit(params: {
  clientId: string;
  userId: string;
  endpoint: string;
  maxRequests?: number;
  windowSeconds?: number;
}): Promise<RateLimitResult> {
  const identifier = `int:${params.clientId}:${params.userId}`;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: params.endpoint,
      p_max_requests: params.maxRequests ?? 60,
      p_window_seconds: params.windowSeconds ?? 60,
    });
    if (error) {
      console.warn("[integration] rate-limit RPC error:", error.message);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (typeof data === "boolean") return { allowed: data, retryAfterSeconds: data ? 0 : 60 };
    const allowed = Boolean((data as any)?.allowed);
    const retry = Number((data as any)?.retry_after ?? 60);
    return { allowed, retryAfterSeconds: allowed ? 0 : retry };
  } catch (e) {
    console.warn("[integration] rate-limit exception:", (e as Error).message);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}


// ================= _integration-core/auth.ts =================
// Camadas de segurança:
//   1) IP rate-limit (anti-flood, antes de autenticar).
//   2) client_id + client_secret com dual-secret rotation (P1).
//   3) HMAC opcional (P2) via INTEGRATION_REQUIRE_HMAC=true.
//   4) Idempotency (P4) via header x-idempotency-key.
//   5) JWT do usuário Wiize -> user_id + company_id (multi-tenant).
//   6) Scopes por client + provider (P5).
// company_id NUNCA vem do body — sempre derivado do JWT.


// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

const EXPECTED_CLIENT_ID = Deno.env.get("INTEGRATION_WIAN_CLIENT_ID") ?? "";
const EXPECTED_CLIENT_SECRET = Deno.env.get("INTEGRATION_WIAN_CLIENT_SECRET") ?? "";
const EXPECTED_CLIENT_SECRET_PREVIOUS = Deno.env.get("INTEGRATION_WIAN_CLIENT_SECRET_PREVIOUS") ?? "";
const HMAC_SIGNING_KEY = Deno.env.get("INTEGRATION_WIAN_HMAC_KEY") ?? "";
const HMAC_SIGNING_KEY_PREVIOUS = Deno.env.get("INTEGRATION_WIAN_HMAC_KEY_PREVIOUS") ?? "";
const REQUIRE_HMAC = (Deno.env.get("INTEGRATION_REQUIRE_HMAC") ?? "false").toLowerCase() === "true";
const HMAC_MAX_SKEW_S = 300;

// Registry de clients + escopos permitidos (P5). Hoje só existe o Wian.
// Escopo "*" = acesso total. Escopos futuros: "crm.read", "cockpit.read", etc.
const CLIENT_REGISTRY: Record<string, { name: string; scopes: string[] }> = EXPECTED_CLIENT_ID
  ? { [EXPECTED_CLIENT_ID]: { name: "wian", scopes: ["*"] } }
  : {};

async function getVerifiedJwtIdentity(token: string): Promise<{ userId: string; email: string | null } | null> {
  const sb = createClient(SUPABASE_URL, ANON_KEY);
  const auth = sb.auth as unknown as {
    getClaims?: (jwt: string) => Promise<{ data?: { claims?: { sub?: string; email?: string } }; error?: unknown }>;
    getUser: (jwt: string) => Promise<{ data?: { user?: { id?: string; email?: string | null } }; error?: unknown }>;
  };
  if (typeof auth.getClaims === "function") {
    const { data, error } = await auth.getClaims(token);
    if (!error && data?.claims?.sub) return { userId: data.claims.sub, email: data.claims.email ?? null };
  }
  const { data, error } = await auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// ---- P1: dual-secret rotation ----
export function verifyClient(
  req: Request,
): { ok: true; clientId: string; scopes: string[] } | { ok: false; code: "AUTH_MISSING_CLIENT" | "AUTH_INVALID_CLIENT" } {
  const cid = req.headers.get("x-integration-client-id") ?? "";
  const cse = req.headers.get("x-integration-client-secret") ?? "";
  if (!cid || !cse) return { ok: false, code: "AUTH_MISSING_CLIENT" };
  if (!EXPECTED_CLIENT_ID || !EXPECTED_CLIENT_SECRET) return { ok: false, code: "AUTH_INVALID_CLIENT" };
  if (!safeEqual(cid, EXPECTED_CLIENT_ID)) return { ok: false, code: "AUTH_INVALID_CLIENT" };
  const matchesCurrent = safeEqual(cse, EXPECTED_CLIENT_SECRET);
  const matchesPrevious = EXPECTED_CLIENT_SECRET_PREVIOUS.length > 0 && safeEqual(cse, EXPECTED_CLIENT_SECRET_PREVIOUS);
  if (!matchesCurrent && !matchesPrevious) return { ok: false, code: "AUTH_INVALID_CLIENT" };
  const reg = CLIENT_REGISTRY[cid] ?? { name: "unknown", scopes: [] };
  return { ok: true, clientId: cid, scopes: reg.scopes };
}

// ---- P5: scope check ----
export function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes("*")) return true;
  if (scopes.includes(required)) return true;
  // suporte a wildcard por domínio: "crm.*" cobre "crm.read"
  const [domain] = required.split(".");
  return scopes.includes(`${domain}.*`);
}

// ---- P2: HMAC signature (opcional) ----
// Assinatura = HMAC-SHA256(hex, key = HMAC_SIGNING_KEY, payload = `${timestamp}.${nonce}.${sha256hex(body)}`)
// Headers: x-integration-timestamp (unix seconds), x-integration-nonce (>=16 chars), x-integration-signature (hex)
const NONCE_CACHE = new Map<string, number>();
function pruneNonces() {
  const cutoff = Date.now() - (HMAC_MAX_SKEW_S + 60) * 1000;
  for (const [k, v] of NONCE_CACHE) if (v < cutoff) NONCE_CACHE.delete(k);
}
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function verifyHmac(
  req: Request, rawBody: string,
): Promise<{ ok: true } | { ok: false; code: "AUTH_INVALID_SIGNATURE" | "AUTH_STALE_TIMESTAMP" | "AUTH_REPLAYED_NONCE" }> {
  if (!REQUIRE_HMAC) return { ok: true };
  if (!HMAC_SIGNING_KEY) return { ok: false, code: "AUTH_INVALID_SIGNATURE" };
  const ts = req.headers.get("x-integration-timestamp") ?? "";
  const nonce = req.headers.get("x-integration-nonce") ?? "";
  const sig = (req.headers.get("x-integration-signature") ?? "").toLowerCase();
  if (!ts || !nonce || !sig || nonce.length < 16) return { ok: false, code: "AUTH_INVALID_SIGNATURE" };
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, code: "AUTH_STALE_TIMESTAMP" };
  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - tsNum) > HMAC_MAX_SKEW_S) return { ok: false, code: "AUTH_STALE_TIMESTAMP" };
  pruneNonces();
  if (NONCE_CACHE.has(nonce)) return { ok: false, code: "AUTH_REPLAYED_NONCE" };
  const bodyHash = await sha256Hex(rawBody);
  const payload = `${ts}.${nonce}.${bodyHash}`;
  const expected = await hmacHex(HMAC_SIGNING_KEY, payload);
  let matches = safeEqual(sig, expected);
  if (!matches && HMAC_SIGNING_KEY_PREVIOUS) {
    const expectedPrev = await hmacHex(HMAC_SIGNING_KEY_PREVIOUS, payload);
    matches = safeEqual(sig, expectedPrev);
  }
  if (!matches) return { ok: false, code: "AUTH_INVALID_SIGNATURE" };
  NONCE_CACHE.set(nonce, Date.now());
  // Cross-instance replay protection via DB (fail-open if RPC missing)
  const cid = req.headers.get("x-integration-client-id") ?? "unknown";
  const persisted = await consumeNonceDb(cid, nonce);
  if (!persisted) return { ok: false, code: "AUTH_REPLAYED_NONCE" };
  return { ok: true };
}

// ---- P3: IP-level rate limit (pré-auth) ----
export async function checkIpRateLimit(ip: string, endpoint: string): Promise<RateLimitResult> {
  if (!ip || ip === "unknown") return { allowed: true, retryAfterSeconds: 0 };
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_identifier: `int-ip:${ip}`, p_endpoint: endpoint,
      p_max_requests: 300, p_window_seconds: 60,
    });
    if (error) return { allowed: true, retryAfterSeconds: 0 };
    if (typeof data === "boolean") return { allowed: data, retryAfterSeconds: data ? 0 : 60 };
    const allowed = Boolean((data as any)?.allowed);
    return { allowed, retryAfterSeconds: allowed ? 0 : Number((data as any)?.retry_after ?? 60) };
  } catch { return { allowed: true, retryAfterSeconds: 0 }; }
}

// ---- P4: Idempotency DB-backed + in-memory fallback + Correlation ID ----
interface IdempotencyEntry { body: string; status: number; headers: Record<string, string>; expiresAt: number; }
const IDEMPOTENCY_STORE = new Map<string, IdempotencyEntry>();
const IDEMPOTENCY_TTL_MS = 60_000;
export async function idempotencyLookup(clientId: string, userId: string, key: string): Promise<Response | null> {
  if (!key) return null;
  const full = `${clientId}:${userId}:${key}`;
  // 1) in-memory cache (fastest)
  const e = IDEMPOTENCY_STORE.get(full);
  if (e && Date.now() <= e.expiresAt) {
    return new Response(e.body, { status: e.status, headers: { ...e.headers, "x-idempotent-replay": "true" } });
  }
  if (e) IDEMPOTENCY_STORE.delete(full);
  // 2) DB (cross-instance)
  const db = await checkIdempotencyDb(clientId, `${userId}:${key}`, key);
  if (db.replay && db.body !== undefined) {
    return new Response(db.body, {
      status: db.status ?? 200,
      headers: { "Content-Type": "application/json", "x-idempotent-replay": "true" },
    });
  }
  return null;
}
export async function idempotencyStore(clientId: string, userId: string, key: string, res: Response): Promise<Response> {
  if (!key) return res;
  const clone = res.clone();
  const body = await clone.text();
  const headers: Record<string, string> = {};
  clone.headers.forEach((v, k) => { headers[k] = v; });
  const full = `${clientId}:${userId}:${key}`;
  IDEMPOTENCY_STORE.set(full, { body, status: clone.status, headers, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
  await storeIdempotencyDb(clientId, `${userId}:${key}`, key, body, clone.status);
  if (IDEMPOTENCY_STORE.size > 5000) {
    const now = Date.now();
    for (const [k, v] of IDEMPOTENCY_STORE) if (now > v.expiresAt) IDEMPOTENCY_STORE.delete(k);
  }
  return new Response(body, { status: clone.status, headers });
}

// ---- P3: circuit breaker + timeout wrapper por provider ----
interface BreakerState { failures: number; openedAt: number; }
const BREAKERS = new Map<string, BreakerState>();
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;
export function breakerIsOpen(name: string): boolean {
  const b = BREAKERS.get(name); if (!b) return false;
  if (b.failures < BREAKER_THRESHOLD) return false;
  if (Date.now() - b.openedAt > BREAKER_COOLDOWN_MS) { BREAKERS.delete(name); return false; }
  return true;
}
export function breakerRecord(name: string, ok: boolean) {
  if (ok) { BREAKERS.delete(name); return; }
  const cur = BREAKERS.get(name) ?? { failures: 0, openedAt: 0 };
  cur.failures += 1;
  if (cur.failures >= BREAKER_THRESHOLD && cur.openedAt === 0) cur.openedAt = Date.now();
  BREAKERS.set(name, cur);
}
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT_${ms}MS`)), ms)),
  ]);
}

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  email: string | null;
  plan: string;
  permissions: string[];
}

export async function verifyUser(req: Request): Promise<
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; code: "AUTH_MISSING_USER_TOKEN" | "AUTH_INVALID_USER_TOKEN" | "PERM_NO_COMPANY" }
> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { ok: false, code: "AUTH_MISSING_USER_TOKEN" };
  const token = authHeader.slice(7);

  const identity = await getVerifiedJwtIdentity(token);
  if (!identity) return { ok: false, code: "AUTH_INVALID_USER_TOKEN" };

  const { userId, email } = identity;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: member } = await admin
    .from("account_members")
    .select("account_owner_id, status")
    .eq("member_user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const companyId = (member?.account_owner_id as string | undefined) ?? userId;
  if (!companyId) return { ok: false, code: "PERM_NO_COMPANY" };

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", companyId)
    .maybeSingle();

  const plan = (profile?.subscription_tier as string | undefined) ?? "start";

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const permissions = (roles ?? []).map((r: any) => `role:${r.role}`);

  return { ok: true, user: { userId, companyId, email, plan, permissions } };
}


// ================= _integration-core/registry/ProviderInterface.ts =================
// Contrato único que TODO Provider da Integration Layer deve seguir.
// O Context Builder jamais conhece Providers diretamente — apenas o Registry.


export type PlanTier = "start" | "growth" | "scale";

export interface ProviderMetadata {
  name: string;
  description: string;
  version: string;
  requiredPermissions: string[];
  minimumPlan: PlanTier;
  supportedFilters: string[];
  defaultCacheTTL: number;   // segundos
  priority: number;          // menor = mais crítico
  dependencies: string[];
  inputSchema: Record<string, string>;   // documentação (name -> type)
  outputSchema: Record<string, string>;
  status: "stable" | "beta" | "not_implemented";
}

export interface ProviderContext {
  companyId: string;
  userId: string;
  permissions: string[];
  plan: PlanTier | string;
  filters: IntegrationFilters;
  // Providers NUNCA acessam outros providers diretamente;
  // se precisarem, o Registry injeta resultados de dependências aqui.
  dependencies: Record<string, unknown>;
}

export interface ProviderResultMeta {
  version: string;
  processing_time_ms: number;
  cache: { hit: boolean; ttl_s: number };
  filters_applied: Record<string, unknown>;
  records_count: number;
}

export interface ProviderResult<T = unknown> {
  data: T;
  metadata: ProviderResultMeta;
}

export interface Provider<T = unknown> {
  metadata: ProviderMetadata;
  execute(ctx: ProviderContext): Promise<{ data: T; recordsCount: number }>;
}


// ================= _integration-core/registry/ProviderRegistry.ts =================
// Provider Registry — núcleo de descoberta, resolução de dependências,
// paralelismo controlado e cache por provider.
//
// O Context Builder NUNCA conhece Providers diretamente. Toda comunicação
// passa por aqui, garantindo Open/Closed: novos módulos = registrar + pronto.


export class ProviderNotFoundError extends Error {
  constructor(public providerName: string) {
    super(`Provider not registered: ${providerName}`);
  }
}

export class ProviderRegistry {
  private providers = new Map<string, Provider>();
  private lastExecution = new Map<string, { at: string; ms: number; success: boolean }>();

  register(provider: Provider): void {
    if (this.providers.has(provider.metadata.name)) {
      console.warn(`[registry] Provider "${provider.metadata.name}" already registered — replacing.`);
    }
    this.providers.set(provider.metadata.name, provider);
  }

  has(name: string): boolean { return this.providers.has(name); }
  resolve(name: string): Provider {
    const p = this.providers.get(name);
    if (!p) throw new ProviderNotFoundError(name);
    return p;
  }
  list(): Provider[] { return Array.from(this.providers.values()); }

  /** Snapshot serializável — usado pelo Developer Center. */
  getCatalog() {
    return this.list().map((p) => ({
      ...p.metadata,
      last_execution: this.lastExecution.get(p.metadata.name) ?? null,
    }));
  }

  /**
   * Executa um único Provider com cache-aside.
   * @param bypassCache força re-execução ignorando o cache.
   */
  async execute<T = unknown>(
    name: string,
    ctx: ProviderContext,
    bypassCache = false,
  ): Promise<ProviderResult<T>> {
    const provider = this.resolve(name);
    const cacheKey = await makeCacheKey(name, ctx.companyId, {
      f: ctx.filters, u: ctx.userId, deps: Object.keys(ctx.dependencies).sort(),
    });

    if (!bypassCache && provider.metadata.defaultCacheTTL > 0) {
      const hit = cacheGet<ProviderResult<T>>(cacheKey);
      if (hit) {
        return {
          data: hit.value.data,
          metadata: {
            ...hit.value.metadata,
            cache: { hit: true, ttl_s: Math.max(0, Math.round((hit.expiresAt - Date.now()) / 1000)) },
          },
        };
      }
    }

    const started = Date.now();
    try {
      const { data, recordsCount } = await provider.execute(ctx);
      const elapsed = Date.now() - started;
      const result: ProviderResult<T> = {
        data: data as T,
        metadata: {
          version: provider.metadata.version,
          processing_time_ms: elapsed,
          cache: { hit: false, ttl_s: provider.metadata.defaultCacheTTL },
          filters_applied: (ctx.filters as unknown as Record<string, unknown>) ?? {},
          records_count: recordsCount,
        },
      };
      if (provider.metadata.defaultCacheTTL > 0) {
        cacheSet(cacheKey, result, provider.metadata.defaultCacheTTL);
      }
      this.lastExecution.set(name, { at: new Date().toISOString(), ms: elapsed, success: true });
      return result;
    } catch (e) {
      const elapsed = Date.now() - started;
      this.lastExecution.set(name, { at: new Date().toISOString(), ms: elapsed, success: false });
      throw e;
    }
  }

  /**
   * Executa vários providers resolvendo dependências e maximizando paralelismo.
   * Kahn topological sort → executa cada "camada" em paralelo.
   */
  async executeMany(
    names: string[],
    baseCtx: Omit<ProviderContext, "dependencies">,
    opts: { bypassCache?: boolean } = {},
  ): Promise<{
    results: Record<string, ProviderResult>;
    errors: Array<{ provider: string; code: string; message: string }>;
  }> {
    const results: Record<string, ProviderResult> = {};
    const errors: Array<{ provider: string; code: string; message: string }> = [];

    // Expande dependências transitivas dentro do conjunto pedido.
    const required = new Set<string>();
    const stack = [...names];
    while (stack.length) {
      const n = stack.pop()!;
      if (required.has(n)) continue;
      if (!this.has(n)) {
        errors.push({ provider: n, code: "PROVIDER_NOT_FOUND", message: `Provider não registrado: ${n}` });
        continue;
      }
      required.add(n);
      for (const dep of this.resolve(n).metadata.dependencies) stack.push(dep);
    }

    // Grafo de dependências restrito ao conjunto required.
    const remaining = new Map<string, Set<string>>();
    for (const n of required) {
      const deps = new Set(this.resolve(n).metadata.dependencies.filter((d) => required.has(d)));
      remaining.set(n, deps);
    }

    // Executa em camadas: cada camada = providers cujas deps já foram resolvidas.
    while (remaining.size > 0) {
      const layer = Array.from(remaining.entries())
        .filter(([, deps]) => deps.size === 0)
        .map(([n]) => n);

      if (layer.length === 0) {
        // ciclo — falha explícita para todos os pendentes.
        for (const [n] of remaining) {
          errors.push({ provider: n, code: "PROVIDER_ERROR", message: "Dependência circular detectada." });
        }
        break;
      }

      const settled = await Promise.allSettled(
        layer.map(async (n) => {
          const p = this.resolve(n);
          // Só passa dependências que estão em required E já foram executadas com sucesso.
          const depsData: Record<string, unknown> = {};
          for (const d of p.metadata.dependencies) {
            if (results[d]) depsData[d] = results[d].data;
          }
          const ctx: ProviderContext = { ...baseCtx, dependencies: depsData };
          const r = await this.execute(n, ctx, opts.bypassCache);
          return [n, r] as const;
        }),
      );

      for (let i = 0; i < settled.length; i++) {
        const n = layer[i];
        const s = settled[i];
        if (s.status === "fulfilled") {
          results[s.value[0]] = s.value[1];
        } else {
          errors.push({ provider: n, code: "PROVIDER_ERROR", message: (s.reason as Error)?.message ?? "erro desconhecido" });
        }
      }

      // Remove a camada e desconta das deps dos pendentes.
      for (const n of layer) remaining.delete(n);
      for (const [, deps] of remaining) for (const n of layer) deps.delete(n);
    }

    return { results, errors };
  }

  /** Aplica filtros = defaults quando ausentes. Facilita chamadas one-shot ao Registry. */
  buildContext(base: {
    companyId: string;
    userId: string;
    permissions: string[];
    plan: string;
    filters: IntegrationFilters;
  }): Omit<ProviderContext, "dependencies"> {
    return { ...base };
  }
}


// ================= _integration-core/providers/cockpitProvider.ts =================
// Provider Cockpit — snapshot completo do Growth Cockpit / dashboard executivo.
// Consolida TODOS os cards visíveis no dashboard principal em um único payload
// para que consumidores (ex.: Wian) não precisem orquestrar múltiplas fontes.
//
// Filtros:
//   filters.period.from / filters.period.to  -> ISO 8601. Se ausente, considera
//   histórico total da conta (fallback documentado).

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

// Buckets espelham exatamente src/hooks/useCockpitForecast.ts
const SCORE_BUCKETS = [
  { label: "Pronto p/ venda", min: 801, max: 1000, low: 0.40, high: 0.65 },
  { label: "Alto valor",       min: 601, max: 800,  low: 0.20, high: 0.35 },
  { label: "Engajado",         min: 401, max: 600,  low: 0.10, high: 0.18 },
  { label: "Baixo engajamento",min: 201, max: 400,  low: 0.04, high: 0.08 },
  { label: "Frio",             min: 0,   max: 200,  low: 0.01, high: 0.03 },
];

function daysBetween(from: string | null, to: string | null): number {
  if (!from || !to) return 30;
  const d = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  return Math.max(1, Math.round(d));
}

async function execute_cockpit(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;
  const periodDays = daysBetween(from, to);

  const inPeriod = <T extends { gte: any; lte: any }>(q: T): T => {
    if (from) q = q.gte("created_at", from) as any;
    if (to)   q = q.lte("created_at", to) as any;
    return q;
  };

  // --------- Fontes paralelas ---------
  const [
    leadsPeriod,       // funil + oportunidades no período
    leadsAllTime,      // receita potencial acumulada
    dealsPeriod,       // sales no período
    dealsAllTime,      // sales all-time (MRR / receita)
    scoreLogs24h,      // leads quentes hoje
    scoreLogs7d,       // decaimento + radar
    revenueLeads,      // health + score médio
    searchPeriod,      // leads prospectados
    searchAllTime,     // total prospectado (health threshold)
    aiMsgsPeriod,      // IA economizou (chars)
    flowExecsPeriod,   // IA economizou (nodes)
    campaignsPeriod,   // dashboard cross-check
    services,          // ticket médio fallback
    stages,            // pipeline_stage por lead
  ] = await Promise.all([
    inPeriod(admin.from("leads")
      .select("id, estimated_value, opportunity_level, ai_score, first_message_sent, has_responded, category, city, closing_probability, pipeline_stage_id, created_at")
      .eq("owner_user_id", owner)),
    admin.from("leads").select("id, estimated_value, pipeline_stage_id").eq("owner_user_id", owner),
    inPeriod(admin.from("lead_deals")
      .select("value, sale_type, contract_months, status, expiration_date, created_at")
      .eq("owner_user_id", owner)),
    admin.from("lead_deals")
      .select("value, sale_type, contract_months, status, expiration_date, closed_at")
      .eq("owner_user_id", owner),
    admin.from("revenue_score_logs").select("lead_id, points_applied, created_at")
      .eq("owner_user_id", owner)
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()),
    admin.from("revenue_score_logs").select("lead_id, points_applied, created_at")
      .eq("owner_user_id", owner)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    admin.from("revenue_leads").select("id, phone_e164, score_total, status_bucket, created_at").eq("owner_user_id", owner),
    inPeriod(admin.from("search_history").select("results_count, leads, created_at").eq("owner_user_id", owner)),
    admin.from("search_history").select("results_count").eq("owner_user_id", owner),
    inPeriod(admin.from("agent_message_logs").select("content").eq("owner_user_id", owner).eq("direction", "outbound")),
    inPeriod(admin.from("wa_flow_executions" as any).select("node_history").eq("owner_user_id", owner)),
    inPeriod(admin.from("meta_campaigns").select("success_count, failed_count, total_recipients, status").eq("owner_user_id", owner)),
    admin.from("company_services").select("average_ticket").eq("owner_user_id", owner),
    admin.from("pipeline_stages").select("id, name, position").eq("user_id", owner),
  ]) as any;


  const leadsP = leadsPeriod.data ?? [];
  const leadsAll = leadsAllTime.data ?? [];
  const dealsP = dealsPeriod.data ?? [];
  const dealsAll = dealsAllTime.data ?? [];
  const revLeads = revenueLeads.data ?? [];
  const camps = campaignsPeriod.data ?? [];

  // --------- Ticket médio ---------
  const svc = services.data ?? [];
  const averageTicket = svc.length
    ? svc.reduce((a: number, s: any) => a + Number(s.average_ticket || 0), 0) / svc.length
    : 0;

  // --------- Receita potencial (pipeline value) ---------
  const receitaPotencialTotal = leadsAll.reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
  const receitaPotencialPeriodo = leadsP.reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);

  // --------- Funil operacional ---------
  const funnelCaptados = leadsP.length;
  const funnelAnalisados = leadsP.filter((l: any) => l.opportunity_level).length;
  const funnelEnviados = leadsP.filter((l: any) => l.first_message_sent).length;
  const funnelRespondeu = leadsP.filter((l: any) => l.has_responded).length;
  const funnelOportunidades = leadsP.filter((l: any) =>
    ["alto", "alta", "high", "muito_alto"].includes(String(l.opportunity_level || "").toLowerCase())
  ).length;
  const pct = (n: number) => funnelCaptados > 0 ? Number((n / funnelCaptados).toFixed(4)) : 0;

  // --------- Leads quentes hoje ---------
  const growth24h = new Map<string, number>();
  for (const l of scoreLogs24h.data ?? []) {
    growth24h.set(l.lead_id, (growth24h.get(l.lead_id) ?? 0) + Number(l.points_applied || 0));
  }
  const leadsQuentesHoje = Array.from(growth24h.values()).filter(v => v >= 150).length;

  // --------- IA Economizou (min) ---------
  const chars = (aiMsgsPeriod.data ?? []).reduce((s: number, m: any) => s + String(m.content || "").length, 0);
  let flowNodes = 0;
  for (const e of flowExecsPeriod.data ?? []) {
    if (Array.isArray(e.node_history)) flowNodes += e.node_history.length;
  }
  const aiMinutesSaved = Math.round(chars / 200 + flowNodes * 2);

  // --------- Health / Gargalo ---------
  const totalProspected = (searchAllTime.data ?? []).reduce((s: number, r: any) => s + (r.results_count || 0), 0);
  const totalCrmLeads = leadsAll.length;
  const scores = revLeads.map((r: any) => Number(r.score_total || 0));
  const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  const hotCount = scores.filter((s: number) => s >= 601).length;
  const coldCount = scores.filter((s: number) => s <= 200).length;
  const readyForSale = scores.filter((s: number) => s >= 801).length;

  const hasEnoughData = totalProspected >= 300 && totalCrmLeads >= 50;
  let healthStatus = "Dados Insuficientes";
  let healthDetail = "";
  let healthScore = 0;
  if (!hasEnoughData) {
    const missing: string[] = [];
    if (totalProspected < 300) missing.push(`${totalProspected}/300 leads prospectados`);
    if (totalCrmLeads < 50) missing.push(`${totalCrmLeads}/50 leads no CRM`);
    healthDetail = `Necessário: ${missing.join(" e ")}`;
  } else {
    let max = 0, pts = 0;
    if (scores.length) { max += 40; pts += Math.min(40, (avgScore / 1000) * 40); }
    if (scores.length) { max += 25; pts += hotCount ? Math.min(25, (hotCount / scores.length) * 100) : 0; }
    if (scores.length && coldCount) { max += 15; pts -= Math.min(15, (coldCount / scores.length) * 30); }
    healthScore = max > 0 ? Math.max(0, Math.round((pts / max) * 100)) : 0;
    if (healthScore >= 70) { healthStatus = "Excelente"; healthDetail = `Score médio ${Math.round(avgScore)}, ${hotCount} leads quentes.`; }
    else if (healthScore >= 50) { healthStatus = "Operação Saudável"; healthDetail = `Score médio ${Math.round(avgScore)}.`; }
    else if (healthScore >= 30) { healthStatus = "Atenção Necessária"; healthDetail = `Score médio ${Math.round(avgScore)}. Aumente engajamento.`; }
    else if (healthScore >= 15) { healthStatus = "Score Baixo"; healthDetail = `Score médio ${Math.round(avgScore)}. Engajamento fraco.`; }
    else { healthStatus = "Crítico"; healthDetail = "Pipeline parado. Inicie campanhas e prospecção urgentemente."; }
  }

  // --------- Forecast (conservador / realista / agressivo) ---------
  const buckets = SCORE_BUCKETS.map(b => {
    const inB = scores.filter((s: number) => s >= b.min && s <= b.max).length;
    const low = Math.round(inB * b.low);
    const high = Math.round(inB * b.high);
    const mid = Math.round(inB * (b.low + b.high) / 2);
    return { label: b.label, count: inB, sales_low: low, sales_mid: mid, sales_high: high,
             revenue_low: low * averageTicket, revenue_mid: mid * averageTicket, revenue_high: high * averageTicket };
  });
  const forecastRealista = buckets.reduce((s, b) => s + b.revenue_mid, 0);
  const forecast = {
    conservador: Math.round(forecastRealista * 0.5),
    realista: Math.round(forecastRealista),
    agressivo: Math.round(forecastRealista * 1.5),
    buckets,
    average_ticket: averageTicket,
  };

  // --------- Radar (top leads por crescimento 7d) ---------
  const growth7d = new Map<string, number>();
  for (const l of scoreLogs7d.data ?? []) {
    growth7d.set(l.lead_id, (growth7d.get(l.lead_id) ?? 0) + Number(l.points_applied || 0));
  }
  const radarRaw = Array.from(growth7d.entries())
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lead_id, growth]) => ({ lead_id, score_growth_7d: growth }));

  // --------- Alertas executivos ---------
  const alerts: Array<{ type: string; text: string; route?: string }> = [];
  const decayLeads = new Set((scoreLogs7d.data ?? []).filter((l: any) => (l.points_applied ?? 0) < 0).map((l: any) => l.lead_id));
  if (decayLeads.size > 0) alerts.push({ type: "warning", text: `${decayLeads.size} leads perderam pontos de score nos últimos 7 dias — risco de esfriamento`, route: "/crm-score" });
  if (readyForSale > 0) alerts.push({ type: "success", text: `${readyForSale} leads com score acima de 800 — prontos para abordagem de venda`, route: "/crm" });
  if (coldCount > 5) alerts.push({ type: "danger", text: `${coldCount} leads frios (score ≤200) — considere reativação ou limpeza`, route: "/crm-score" });
  // Pico de atividade
  const hourCounts = new Map<number, number>();
  for (const l of scoreLogs24h.data ?? []) {
    if (!l.created_at) continue;
    const h = new Date(l.created_at).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  if (hourCounts.size) {
    const peak = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    alerts.push({ type: "info", text: `Pico de atividade dos leads: ${String(peak[0]).padStart(2, "0")}:00 — melhor horário para envios`, route: "/meta-campaigns" });
  }
  if (!alerts.length) alerts.push({ type: "info", text: "Sem alertas no momento. Continue prospectando para gerar diagnósticos." });

  // --------- Sales / MRR (all-time + no período) ---------
  const today = new Date().toISOString().slice(0, 10);
  const isActive = (d: any) => d.status === "active" && (!d.expiration_date || d.expiration_date >= today);
  // TCV histórico (todos os contratos, valor cheio)
  const tcvHistorico = dealsAll.reduce((s: number, d: any) => {
    const val = Number(d.value || 0);
    return s + (d.sale_type === "one_time" ? val : val * Number(d.contract_months || 1));
  }, 0);
  const mrrActive = dealsAll.filter((d: any) => d.sale_type === "recurring" && isActive(d))
    .reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const activeSalesCount = dealsAll.filter(isActive).length;
  const projected12mo = dealsAll.filter((d: any) => d.sale_type === "recurring" && isActive(d))
    .reduce((s: number, d: any) => {
      if (!d.expiration_date) return s + Number(d.value || 0) * 12;
      const months = Math.max(0, Math.min(12, Math.ceil((new Date(d.expiration_date).getTime() - Date.now()) / (30 * 86_400_000))));
      return s + Number(d.value || 0) * months;
    }, 0);

  // --------- Receita realizada NO PERÍODO (não TCV) ---------
  // one_time: valor cheio se closed_at (ou created_at) no período.
  // recurring: value × meses do contrato contidos em [from,to]. Sem período = MRR × meses passados.
  const periodFromMs = from ? new Date(from).getTime() : null;
  const periodToMs = to ? new Date(to).getTime() : Date.now();
  const monthMs = 30 * 86_400_000;
  const receitaRealizadaPeriodo = dealsAll.reduce((s: number, d: any) => {
    const val = Number(d.value || 0);
    if (d.sale_type === "one_time") {
      const closedTs = d.closed_at ? new Date(d.closed_at).getTime() : null;
      if (closedTs && (!periodFromMs || closedTs >= periodFromMs) && closedTs <= periodToMs) return s + val;
      return s;
    }
    // recurring: interseção do contrato com o período
    const startTs = d.closed_at ? new Date(d.closed_at).getTime() : null;
    if (!startTs) return s;
    const endTs = d.expiration_date ? new Date(d.expiration_date).getTime() : Date.now();
    const winStart = Math.max(startTs, periodFromMs ?? startTs);
    const winEnd = Math.min(endTs, periodToMs);
    if (winEnd <= winStart) return s;
    const months = (winEnd - winStart) / monthMs;
    return s + val * months;
  }, 0);

  // --------- Dashboard mirror: "Seu comercial gerou R$ X em oportunidades" ---------
  // Espelha src/hooks/useCockpitForecast.ts para o card de hero do dashboard.
  const searchP = searchPeriod.data ?? [];
  const totalProspectedPeriodo = searchP.reduce((s: number, r: any) => s + (r.results_count || 0), 0);
  const prospectedPhonesPeriodo = new Set<string>();
  for (const search of searchP) {
    const arr = Array.isArray(search.leads) ? search.leads : [];
    for (const lead of arr) {
      const phone = String(lead?.phone || lead?.telefone || "").replace(/\D/g, "").slice(-8);
      if (phone.length >= 8) prospectedPhonesPeriodo.add(phone);
    }
  }
  const scoredLeadsPeriodo = (revLeads as any[]).filter((r: any) => {
    if (!from) return true;
    const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
    return ts >= new Date(from).getTime() && ts <= periodToMs;
  }).map((r: any) => ({
    phoneKey: String(r.phone_e164 || "").replace(/\D/g, "").slice(-8),
    score: Number(r.score_total || 0),
  }));
  const scoredPhoneKeys = new Set(scoredLeadsPeriodo.map(l => l.phoneKey));
  const overlap = Array.from(prospectedPhonesPeriodo).filter(p => scoredPhoneKeys.has(p)).length;
  const pureOppCount = Math.max(0, totalProspectedPeriodo - overlap);
  const oppSales = Math.round(pureOppCount * 0.01);
  let scoreSales = 0;
  for (const b of SCORE_BUCKETS) {
    const inB = scoredLeadsPeriodo.filter(l => l.score >= b.min && l.score <= b.max).length;
    scoreSales += Math.round(inB * (b.low + b.high) / 2);
  }
  const dashboardEstimatedSales = oppSales + scoreSales;
  const dashboardGeradoOportunidades = Math.round(dashboardEstimatedSales * averageTicket);


  // --------- Campanhas (dashboard cross-check) ---------
  const campaignsSent = camps.reduce((s: number, c: any) => s + (c.success_count || 0), 0);
  const campaignsFailed = camps.reduce((s: number, c: any) => s + (c.failed_count || 0), 0);
  const campaignsRecipients = camps.reduce((s: number, c: any) => s + (c.total_recipients || 0), 0);

  // --------- Payload consolidado ---------
  const data = {
    period: { from, to, days: periodDays, fallback_all_time: !from && !to },
    // Card: Receita Potencial Atual (soma valor em negociação)
    receita_potencial: {
      total: receitaPotencialTotal,
      no_periodo: receitaPotencialPeriodo,
      currency: "BRL",
    },
    // Card: Leads Quentes Hoje
    leads_quentes_hoje: leadsQuentesHoje,
    // Card: Gargalo Atual / Health
    gargalo: {
      status: healthStatus,
      detail: healthDetail,
      health_score: healthScore,
      total_prospected: totalProspected,
      total_crm_leads: totalCrmLeads,
      avg_score: Math.round(avgScore),
      hot_leads: hotCount,
      cold_leads: coldCount,
      ready_for_sale: readyForSale,
    },
    // Card: IA Economizou
    ia_economizou_min: aiMinutesSaved,
    // Card: Forecast
    forecast,
    // Card: Funil Operacional
    funil_operacional: [
      { stage: "Captados",      value: funnelCaptados,      pct: pct(funnelCaptados) },
      { stage: "Analisados",    value: funnelAnalisados,    pct: pct(funnelAnalisados) },
      { stage: "Enviados",      value: funnelEnviados,      pct: pct(funnelEnviados) },
      { stage: "Respondeu",     value: funnelRespondeu,     pct: pct(funnelRespondeu) },
      { stage: "Oportunidades", value: funnelOportunidades, pct: pct(funnelOportunidades) },
    ],
    // Card: Radar de Oportunidades
    radar: radarRaw,
    // Card: Alertas Executivos
    alertas: alerts,
    // Card: Comercial (Sales / MRR)
    // IMPORTANTE (para consumidores de IA):
    //  - "gerado_em_oportunidades" é o VALOR OFICIAL que aparece no card de hero
    //    do dashboard ("Seu comercial gerou R$ X em oportunidades"). Use este
    //    campo quando o usuário perguntar "quanto meu comercial gerou".
    //  - "receita_realizada_no_periodo" = receita real (deals fechados)
    //    proporcional ao período consultado (não confundir com TCV).
    //  - "tcv_historico" = soma value×contract_months de TODOS os contratos
    //    (histórico total), NUNCA use como "quanto gerou no mês".
    comercial: {
      gerado_em_oportunidades: dashboardGeradoOportunidades,
      gerado_em_oportunidades_descricao: "Mirror exato do card 'Seu comercial gerou' do dashboard: (leads prospectados sem score × 1% + leads com score × conversão por faixa) × ticket médio. Este é o número que o usuário vê na home.",
      receita_realizada_no_periodo: Math.round(receitaRealizadaPeriodo),
      receita_realizada_no_periodo_descricao: "Receita real de contratos fechados, proporcional ao período filtrado. one_time = valor cheio se fechado no período; recurring = valor × meses do contrato dentro do período.",
      tcv_historico: Math.round(tcvHistorico),
      tcv_historico_descricao: "TCV acumulado de todos os contratos (value × contract_months). É histórico total, não representa receita 'no período'.",
      mrr_ativo: Math.round(mrrActive),
      vendas_ativas: activeSalesCount,
      projecao_12_meses: Math.round(projected12mo),
      currency: "BRL",
    },
    // Card: Campanhas Meta no período
    campanhas: {
      total: camps.length,
      recipients: campaignsRecipients,
      sent: campaignsSent,
      failed: campaignsFailed,
      delivery_rate: (campaignsSent + campaignsFailed) > 0
        ? Number((campaignsSent / (campaignsSent + campaignsFailed)).toFixed(4)) : 0,
    },
  };

  return { data, recordsCount: 1 };
}

export const cockpitProvider: Provider = {
  metadata: {
    name: "cockpit",
    description: "Snapshot completo do Growth Cockpit (dashboard executivo). CAMPO CANÔNICO para 'quanto meu comercial gerou': cockpit.comercial.gerado_em_oportunidades — espelha exatamente o card de hero do dashboard. NÃO use finance.receita_total (TCV) para responder essa pergunta.",
    version: "2.1.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 1,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}? — se ausente, retorna histórico total" },
    outputSchema: {
      receita_potencial: "{ total, no_periodo, currency } — valor SOMADO das oportunidades em negociação no CRM (pipeline), não receita realizada",
      leads_quentes_hoje: "number",
      gargalo: "{ status, detail, health_score, ... }",
      ia_economizou_min: "number",
      forecast: "{ conservador, realista, agressivo, buckets[], average_ticket }",
      funil_operacional: "{ stage, value, pct }[]",
      radar: "{ lead_id, score_growth_7d }[]",
      alertas: "{ type, text, route? }[]",
      comercial: "{ gerado_em_oportunidades (canônico do dashboard), receita_realizada_no_periodo, tcv_historico, mrr_ativo, vendas_ativas, projecao_12_meses, currency } — leia as descrições *_descricao antes de responder ao usuário",
      campanhas: "{ total, recipients, sent, failed, delivery_rate }",
    },
    status: "stable",
  },
  execute: execute_cockpit,
};



// ================= _integration-core/providers/crmProvider.ts =================
// Provider CRM — leads completos com valor em negociação e sumário agregado.
// Sempre expõe:
//   - items[]  -> lista paginada
//   - meta     -> total / page / size
//   - summary  -> total_contacts, taxa_conversao, valor_total_negociacao,
//                 by_stage, avg_score
//
// Filtros suportados:
//   period.from / period.to  (created_at)
//   pagination.page / .size
//   stage_id  (uuid)
//   sort=field:asc|desc

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

export interface LeadDTO {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  rating: number | null;
  review_count: number | null;
  opportunity_level: string | null;
  closing_probability: number | null;
  ai_score: number | null;
  estimated_value: number | null;
  stage_id: string | null;
  first_message_sent: boolean;
  responded: boolean;
  responded_at: string | null;
  created_at: string;
}

async function execute_crm(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const page = ctx.filters.pagination?.page ?? 1;
  const size = Math.min(200, ctx.filters.pagination?.size ?? 50);
  const fromIdx = (page - 1) * size;
  const toIdx = fromIdx + size - 1;

  const sortMap: Record<string, string> = {
    created_at: "created_at",
    ai_score: "ai_score",
    estimated_value: "estimated_value",
    closing_probability: "closing_probability",
    opportunity_level: "opportunity_level",
    contact_name: "contact_name",
    company_name: "company_name",
    stage_id: "pipeline_stage_id",
    rating: "rating",
  };

  const cols = "id, contact_name, company_name, phone, email, category, city, region, rating, review_count, opportunity_level, closing_probability, ai_score, estimated_value, pipeline_stage_id, first_message_sent, has_responded, responded_at, created_at";

  // Query paginada (list)
  let q = admin.from("leads").select(cols, { count: "exact" }).eq("owner_user_id", owner);
  if (ctx.filters.stage_id) q = q.eq("pipeline_stage_id", ctx.filters.stage_id);
  if (ctx.filters.period?.from) q = q.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to)   q = q.lte("created_at", ctx.filters.period.to);
  const [sortField, sortDir] = (ctx.filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortMap[sortField] ?? "created_at", { ascending: sortDir === "asc" });
  q = q.range(fromIdx, toIdx);

  // Query summary (agregada sobre TODOS os leads filtrados, sem paginação)
  let sq = admin.from("leads")
    .select("estimated_value, has_responded, ai_score, pipeline_stage_id, opportunity_level")
    .eq("owner_user_id", owner);
  if (ctx.filters.stage_id) sq = sq.eq("pipeline_stage_id", ctx.filters.stage_id);
  if (ctx.filters.period?.from) sq = sq.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to)   sq = sq.lte("created_at", ctx.filters.period.to);

  const [{ data, error, count }, sumRes] = await Promise.all([q, sq]);
  if (error) throw new Error(error.message);
  if (sumRes.error) throw new Error(sumRes.error.message);

  const summaryRows = sumRes.data ?? [];
  const totalContacts = summaryRows.length;
  const totalNegotiationValue = summaryRows.reduce((s, l: any) => s + Number(l.estimated_value || 0), 0);
  const respondedCount = summaryRows.filter((l: any) => l.has_responded).length;
  const conversionRate = totalContacts > 0 ? Number((respondedCount / totalContacts).toFixed(4)) : 0;
  const scoredSummary = summaryRows.filter((l: any) => (l.ai_score ?? 0) > 0);
  const avgScore = scoredSummary.length
    ? Math.round(scoredSummary.reduce((s, l: any) => s + Number(l.ai_score || 0), 0) / scoredSummary.length)
    : 0;

  const byStage: Record<string, { count: number; value: number }> = {};
  for (const l of summaryRows as any[]) {
    const key = l.pipeline_stage_id ?? "sem_estagio";
    byStage[key] ??= { count: 0, value: 0 };
    byStage[key].count += 1;
    byStage[key].value += Number(l.estimated_value || 0);
  }

  const items: LeadDTO[] = (data ?? []).map((l: any) => ({
    id: l.id,
    contact_name: l.contact_name,
    company_name: l.company_name,
    phone: l.phone,
    email: l.email,
    category: l.category,
    city: l.city,
    region: l.region,
    rating: l.rating,
    review_count: l.review_count,
    opportunity_level: l.opportunity_level,
    closing_probability: l.closing_probability,
    ai_score: l.ai_score,
    estimated_value: l.estimated_value,
    stage_id: l.pipeline_stage_id,
    first_message_sent: Boolean(l.first_message_sent),
    responded: Boolean(l.has_responded),
    responded_at: l.responded_at,
    created_at: l.created_at,
  }));

  return {
    data: {
      items,
      meta: { total: count ?? totalContacts, page, size },
      summary: {
        total_contacts: totalContacts,
        responded: respondedCount,
        taxa_conversao: conversionRate,
        valor_total_negociacao: totalNegotiationValue,
        avg_ai_score: avgScore,
        by_stage: byStage,
        currency: "BRL",
      },
    },
    recordsCount: items.length,
  };
}

export const crmProvider: Provider = {
  metadata: {
    name: "crm",
    description: "Leads do CRM com paginação, filtros e sumário agregado (total, conversão, valor em negociação).",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period", "pagination", "stage_id", "sort"],
    defaultCacheTTL: 30,
    priority: 2,
    dependencies: [],
    inputSchema: {
      "filters.pagination": "{page,size}",
      "filters.stage_id": "uuid?",
      "filters.period": "{from,to}?",
      "filters.sort": "field:asc|desc?",
    },
    outputSchema: {
      items: "LeadDTO[]",
      "meta.total": "number",
      "summary.total_contacts": "number",
      "summary.taxa_conversao": "number 0..1",
      "summary.valor_total_negociacao": "number BRL",
      "summary.avg_ai_score": "number",
      "summary.by_stage": "{ [stage_id]: { count, value } }",
    },
    status: "stable",
  },
  execute: execute_crm,
};


// ================= _integration-core/providers/pipelineProvider.ts =================
// Provider Pipeline — estágios do kanban com contagem e valor por coluna.

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

async function execute_pipeline(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;

  const { data: stages, error } = await admin
    .from("pipeline_stages")
    .select("id, name, position, color, is_default")
    .eq("user_id", owner)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  let lq = admin.from("leads").select("pipeline_stage_id, estimated_value, has_responded").eq("owner_user_id", owner);
  if (from) lq = lq.gte("created_at", from);
  if (to)   lq = lq.lte("created_at", to);
  const { data: leads, error: le } = await lq;
  if (le) throw new Error(le.message);

  const agg = new Map<string, { count: number; value: number; responded: number }>();
  for (const l of leads ?? []) {
    const k = l.pipeline_stage_id ?? "sem_estagio";
    const cur = agg.get(k) ?? { count: 0, value: 0, responded: 0 };
    cur.count += 1;
    cur.value += Number(l.estimated_value || 0);
    if (l.has_responded) cur.responded += 1;
    agg.set(k, cur);
  }

  const items = (stages ?? []).map((s: any) => {
    const a = agg.get(s.id) ?? { count: 0, value: 0, responded: 0 };
    return {
      id: s.id,
      name: s.name,
      sort_order: s.position,
      color: s.color,
      is_default: s.is_default,
      leads_count: a.count,
      responded_count: a.responded,
      total_value: a.value,
      conversion_rate: a.count > 0 ? Number((a.responded / a.count).toFixed(4)) : 0,
    };
  });

  const totalContacts = (leads ?? []).length;
  const totalRespondidos = (leads ?? []).filter((l: any) => l.has_responded).length;
  const totalValue = (leads ?? []).reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);

  return {
    data: {
      items,
      meta: { total: items.length },
      summary: {
        total_contacts: totalContacts,
        responded: totalRespondidos,
        taxa_conversao: totalContacts > 0 ? Number((totalRespondidos / totalContacts).toFixed(4)) : 0,
        valor_total_negociacao: totalValue,
        currency: "BRL",
        period: { from, to, fallback_all_time: !from && !to },
      },
    },
    recordsCount: items.length,
  };
}

export const pipelineProvider: Provider = {
  metadata: {
    name: "pipeline",
    description: "Estágios do pipeline com contagem, valor e taxa de conversão por coluna, e sumário agregado do funil.",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 3,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: {
      items: "StageDTO[]",
      "summary.total_contacts": "number",
      "summary.taxa_conversao": "number 0..1",
      "summary.valor_total_negociacao": "number BRL",
    },
    status: "stable",
  },
  execute: execute_pipeline,
};


// ================= _integration-core/providers/campaignsProvider.ts =================
// Provider Meta Campaigns — campanhas WhatsApp via Meta Cloud API. Sem tokens.

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

async function execute_campaigns(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const page = ctx.filters.pagination?.page ?? 1;
  const size = ctx.filters.pagination?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;
  const sortMap: Record<string, string> = {
    created_at: "created_at",
    status: "status",
    name: "campaign_name",
    campaign_name: "campaign_name",
    total_recipients: "total_recipients",
    sent_count: "success_count",
    success_count: "success_count",
  };

  let q = admin
    .from("meta_campaigns")
    .select(
      "id, campaign_name, status, total_recipients, success_count, failed_count, created_at",
      { count: "exact" },
    )
    .eq("user_id", ctx.companyId);

  if (ctx.filters.period?.from) q = q.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to) q = q.lte("created_at", ctx.filters.period.to);
  if (ctx.filters.campaign_id) q = q.eq("id", ctx.filters.campaign_id);

  const [sortField, sortDir] = (ctx.filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortMap[sortField] ?? "created_at", { ascending: sortDir === "asc" });
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const items = (data ?? []).map((c: any) => {
    const sent = c.success_count ?? 0;
    const replied = 0;
    return {
      id: c.id, name: c.campaign_name, status: c.status,
      total_recipients: c.total_recipients ?? 0,
      sent, delivered: sent, read: 0,
      replied, failed: c.failed_count ?? 0,
      reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
      started_at: c.created_at, completed_at: null, scheduled_at: null,
    };
  });

  return { data: { items, meta: { total: count ?? items.length, page, size } }, recordsCount: items.length };
}

export const campaignsProvider: Provider = {
  metadata: {
    name: "campaigns",
    description: "Campanhas WhatsApp Meta com métricas agregadas por campanha.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period", "pagination", "campaign_id", "sort"],
    defaultCacheTTL: 30,
    priority: 3,
    dependencies: [],
    inputSchema: { "filters.pagination": "{page,size}", "filters.campaign_id": "uuid?", "filters.period": "{from,to}?", "filters.sort": "field:asc|desc?" },
    outputSchema: { items: "CampaignDTO[]", "meta.total": "number" },
    status: "stable",
  },
  execute: execute_campaigns,
};

// "meta" provider = alias focado em métricas agregadas (sem paginação detalhada).
export const metaProvider: Provider = {
  metadata: {
    name: "meta",
    description: "Métricas agregadas de todas as campanhas Meta no período.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 4,
    dependencies: ["campaigns"],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: { campaigns_total: "number", sent: "number", delivered: "number", read: "number", replied: "number", failed: "number", reply_rate: "number" },
    status: "stable",
  },
  async execute(ctx: ProviderContext) {
    const dep = ctx.dependencies["campaigns"] as { items: any[] } | undefined;
    const items = dep?.items ?? [];
    let sent = 0, delivered = 0, read = 0, replied = 0, failed = 0;
    for (const c of items) {
      sent += c.sent ?? 0; delivered += c.delivered ?? 0; read += c.read ?? 0;
      replied += c.replied ?? 0; failed += c.failed ?? 0;
    }
    return {
      data: {
        campaigns_total: items.length,
        sent, delivered, read, replied, failed,
        reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
      },
      recordsCount: items.length,
    };
  },
};


// ================= _integration-core/providers/opportunitiesProvider.ts =================
// Provider Opportunities — panorama completo de oportunidades comerciais.
// Consolida totais, qualificados, alta oportunidade, score médio E breakdowns
// por categoria, cidade, avaliação (rating), índice de fechamento (closing_probability),
// intenção, resposta e status.
//
// Filtros:
//   period.from / period.to  -> ISO 8601. Ausente = histórico total.
//   pagination.page / .size  -> aplica-se somente ao array items[].

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

function bucketize<T>(arr: T[], keyFn: (v: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) {
    const k = keyFn(v) ?? "desconhecido";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function avg(arr: number[]): number {
  return arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
}

async function execute_opportunities(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;
  const page = ctx.filters.pagination?.page ?? 1;
  const size = Math.min(200, ctx.filters.pagination?.size ?? 50);

  const cols = "id, contact_name, company_name, phone, category, city, region, rating, review_count, opportunity_level, closing_probability, ai_score, estimated_value, has_responded, first_message_sent, pipeline_stage_id, created_at";
  let q = admin.from("leads").select(cols).eq("owner_user_id", owner);
  if (from) q = q.gte("created_at", from);
  if (to)   q = q.lte("created_at", to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows: any[] = data ?? [];
  const total = rows.length;
  // "Qualificados" = leads com opportunity_level definido
  const qualified = rows.filter(r => !!r.opportunity_level);
  // "Alta Oportunidade" = opportunity_level em ["alto","alta","high","muito_alto"]
  const highOpp = rows.filter(r =>
    ["alto", "alta", "high", "muito_alto"].includes(String(r.opportunity_level || "").toLowerCase())
  );
  const scored = rows.filter(r => (r.ai_score ?? 0) > 0);
  const responded = rows.filter(r => r.has_responded);
  const sent = rows.filter(r => r.first_message_sent);

  // Breakdowns
  const byCategory = bucketize(rows, r => r.category);
  const byCity = bucketize(rows, r => r.city);
  const byOpportunityLevel = bucketize(rows, r => r.opportunity_level);
  const byRating = bucketize(rows, r => {
    const v = Number(r.rating || 0);
    if (!v) return "sem_avaliacao";
    if (v >= 4.5) return "4.5+";
    if (v >= 4.0) return "4.0-4.4";
    if (v >= 3.0) return "3.0-3.9";
    return "<3.0";
  });
  const byClosingProbability = bucketize(rows, r => {
    const v = Number(r.closing_probability || 0);
    if (!v) return "sem_probabilidade";
    if (v >= 80) return "80-100";
    if (v >= 60) return "60-79";
    if (v >= 40) return "40-59";
    if (v >= 20) return "20-39";
    return "0-19";
  });
  const byScore = bucketize(rows, r => {
    const s = Number(r.ai_score || 0);
    if (!s) return "sem_score";
    if (s >= 801) return "pronto_venda";
    if (s >= 601) return "alto_valor";
    if (s >= 401) return "engajado";
    if (s >= 201) return "baixo_engajamento";
    return "frio";
  });

  // Paginated items (ordenados por score/valor)
  const sorted = [...rows].sort((a, b) => {
    const sa = Number(a.ai_score || 0), sb = Number(b.ai_score || 0);
    if (sb !== sa) return sb - sa;
    return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
  });
  const items = sorted.slice((page - 1) * size, page * size).map(r => ({
    id: r.id,
    contact_name: r.contact_name,
    company_name: r.company_name,
    phone: r.phone,
    category: r.category,
    city: r.city,
    region: r.region,
    rating: r.rating,
    review_count: r.review_count,
    opportunity_level: r.opportunity_level,
    closing_probability: r.closing_probability,
    ai_score: r.ai_score,
    estimated_value: r.estimated_value,
    responded: Boolean(r.has_responded),
    sent: Boolean(r.first_message_sent),
    stage_id: r.pipeline_stage_id,
    created_at: r.created_at,
  }));

  const data_out = {
    period: { from, to, fallback_all_time: !from && !to },
    summary: {
      total,
      qualified: qualified.length,
      high_opportunity: highOpp.length,
      avg_score: scored.length ? Math.round(scored.reduce((s, r) => s + Number(r.ai_score || 0), 0) / scored.length) : 0,
      responded: responded.length,
      sent: sent.length,
      response_rate: sent.length > 0 ? Number((responded.length / sent.length).toFixed(4)) : 0,
      qualification_rate: total > 0 ? Number((qualified.length / total).toFixed(4)) : 0,
      total_estimated_value: rows.reduce((s, r) => s + Number(r.estimated_value || 0), 0),
      avg_rating: avg(rows.filter(r => r.rating).map(r => Number(r.rating))),
      avg_closing_probability: avg(rows.filter(r => r.closing_probability).map(r => Number(r.closing_probability))),
      currency: "BRL",
    },
    breakdowns: {
      by_category: byCategory,
      by_city: byCity,
      by_opportunity_level: byOpportunityLevel,
      by_rating: byRating,
      by_closing_probability: byClosingProbability,
      by_score_bucket: byScore,
    },
    items,
    meta: { total, page, size, returned: items.length },
  };

  return { data: data_out, recordsCount: total };
}

export const opportunitiesProvider: Provider = {
  metadata: {
    name: "opportunities",
    description: "Panorama completo de oportunidades: totais, qualificados, alta oportunidade, score médio e breakdowns por categoria, cidade, rating, probabilidade, score e status.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period", "pagination"],
    defaultCacheTTL: 60,
    priority: 2,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?", "filters.pagination": "{page,size}?" },
    outputSchema: {
      "summary.total": "number",
      "summary.qualified": "number",
      "summary.high_opportunity": "number",
      "summary.avg_score": "number",
      "summary.total_estimated_value": "number BRL",
      "breakdowns.by_category": "{ [category]: count }",
      "breakdowns.by_city": "{ [city]: count }",
      "breakdowns.by_rating": "{ '4.5+'|'4.0-4.4'|...: count }",
      "breakdowns.by_closing_probability": "{ '80-100'|...: count }",
      "breakdowns.by_score_bucket": "{ pronto_venda|alto_valor|...: count }",
      items: "OpportunityDTO[]",
    },
    status: "stable",
  },
  execute: execute_opportunities,
};


// ================= _integration-core/providers/financeProvider.ts =================
// Provider Finance / Sales — vendas fechadas, MRR, projeção 12m.
// Fonte: lead_deals. Regra de MRR e projeção espelha src/hooks/useSales.ts.
//
// Filtros:
//   period.from / period.to -> aplica sobre created_at das vendas.
//   Ausente = histórico total (fallback).

// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;  // deduped
// const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // deduped

async function execute_finance(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;

  // Buscamos SEMPRE todos os deals; a filtragem "no período" acontece por closed_at,
  // não por created_at (contrato recorrente antigo ainda gera receita hoje).
  const { data, error } = await admin.from("lead_deals")
    .select("id, lead_id, title, value, sale_type, contract_months, status, payment_method, start_date, expiration_date, closed_at, created_at")
    .eq("owner_user_id", owner)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const allSales: any[] = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const isActive = (s: any) => s.status === "active" && (!s.expiration_date || s.expiration_date >= today);

  const periodFromMs = from ? new Date(from).getTime() : null;
  const periodToMs = to ? new Date(to).getTime() : Date.now();
  const monthMs = 30 * 86_400_000;

  // Vendas assinadas dentro do período (por closed_at)
  const signedInPeriod = allSales.filter(s => {
    const ts = s.closed_at ? new Date(s.closed_at).getTime() : (s.created_at ? new Date(s.created_at).getTime() : null);
    if (!ts) return false;
    if (periodFromMs && ts < periodFromMs) return false;
    if (ts > periodToMs) return false;
    return true;
  });

  // TCV assinado no período (valor cheio dos contratos fechados neste intervalo)
  const tcvSignedInPeriod = signedInPeriod.reduce((acc, s) => {
    const val = Number(s.value || 0);
    return acc + (s.sale_type === "one_time" ? val : val * Number(s.contract_months || 1));
  }, 0);

  // Receita REALIZADA no período (proporcional; interseção do contrato com o período)
  const receitaRealizadaPeriodo = allSales.reduce((acc, s) => {
    const val = Number(s.value || 0);
    if (s.sale_type === "one_time") {
      const ts = s.closed_at ? new Date(s.closed_at).getTime() : null;
      if (ts && (!periodFromMs || ts >= periodFromMs) && ts <= periodToMs) return acc + val;
      return acc;
    }
    const startTs = s.closed_at ? new Date(s.closed_at).getTime() : (s.start_date ? new Date(s.start_date).getTime() : null);
    if (!startTs) return acc;
    const endTs = s.expiration_date ? new Date(s.expiration_date).getTime() : Date.now();
    const winStart = Math.max(startTs, periodFromMs ?? startTs);
    const winEnd = Math.min(endTs, periodToMs);
    if (winEnd <= winStart) return acc;
    const months = (winEnd - winStart) / monthMs;
    return acc + val * months;
  }, 0);

  const mrrAtivo = allSales.filter(s => s.sale_type === "recurring" && isActive(s))
    .reduce((acc, s) => acc + Number(s.value || 0), 0);

  const vendasAtivas = allSales.filter(isActive).length;
  const vendasFechadasNoPeriodo = signedInPeriod.length;

  const projected12mo = allSales.filter(s => s.sale_type === "recurring" && isActive(s))
    .reduce((acc, s) => {
      if (!s.expiration_date) return acc + Number(s.value || 0) * 12;
      const months = Math.max(0, Math.min(12, Math.ceil(
        (new Date(s.expiration_date).getTime() - Date.now()) / (30 * 86_400_000)
      )));
      return acc + Number(s.value || 0) * months;
    }, 0);

  const expiringSoon = allSales.filter(s => {
    if (!isActive(s) || !s.expiration_date) return false;
    const days = (new Date(s.expiration_date).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  }).length;

  const byPayment: Record<string, number> = {};
  for (const s of allSales) {
    const k = s.payment_method || "desconhecido";
    byPayment[k] = (byPayment[k] ?? 0) + 1;
  }

  const itemsForResponse = from || to ? signedInPeriod : allSales;

  return {
    data: {
      period: { from, to, fallback_all_time: !from && !to },
      // IMPORTANTE (IA consumidora): use SEMPRE o campo mais específico à pergunta.
      // Para "quanto meu comercial gerou em X dias" no dashboard,
      // o campo canônico é cockpit.comercial.gerado_em_oportunidades — não este.
      summary: {
        receita_realizada_no_periodo: Math.round(receitaRealizadaPeriodo),
        receita_realizada_no_periodo_descricao: "Receita REAL entregue no período: contratos one_time fechados no período + fatia dos recurring proporcional aos meses dentro de [from,to].",
        tcv_assinado_no_periodo: Math.round(tcvSignedInPeriod),
        tcv_assinado_no_periodo_descricao: "Valor total dos contratos que foram ASSINADOS dentro do período (value × contract_months). É valor de contrato, não caixa entrando no período.",
        vendas_fechadas_no_periodo: vendasFechadasNoPeriodo,
        mrr_ativo: Math.round(mrrAtivo),
        vendas_ativas: vendasAtivas,
        projecao_12_meses: Math.round(projected12mo),
        vendas_expirando_30d: expiringSoon,
        total_registros: itemsForResponse.length,
        currency: "BRL",
      },
      breakdowns: {
        by_payment_method: byPayment,
        by_type: {
          one_time: itemsForResponse.filter(s => s.sale_type === "one_time").length,
          recurring: itemsForResponse.filter(s => s.sale_type === "recurring").length,
        },
      },
      items: itemsForResponse.map(s => ({
        id: s.id,
        lead_id: s.lead_id,
        title: s.title,
        value: Number(s.value || 0),
        sale_type: s.sale_type,
        contract_months: s.contract_months,
        status: s.status,
        payment_method: s.payment_method,
        start_date: s.start_date,
        expiration_date: s.expiration_date,
        closed_at: s.closed_at,
        created_at: s.created_at,
        is_active: isActive(s),
      })),
    },
    recordsCount: itemsForResponse.length,
  };
}

export const financeProvider: Provider = {
  metadata: {
    name: "finance",
    description: "Vendas fechadas (lead_deals) e métricas financeiras REAIS. Para responder 'quanto meu comercial gerou' use cockpit.comercial.gerado_em_oportunidades (campo canônico do dashboard); use este provider quando o usuário perguntar sobre receita realizada, MRR, contratos assinados ou vendas fechadas.",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 4,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}? — filtra por closed_at (não por created_at)" },
    outputSchema: {
      "summary.receita_realizada_no_periodo": "number BRL — receita real ENTREGUE no período (proporcional para recurring). ESTE é o campo correto para 'quanto entrou no mês'.",
      "summary.tcv_assinado_no_periodo": "number BRL — valor de contratos ASSINADOS no período (value × meses). NÃO é receita 'do mês'; é valor de contrato futuro.",
      "summary.mrr_ativo": "number BRL/mês — MRR atual dos contratos ativos",
      "summary.vendas_ativas": "number — contratos ativos hoje",
      "summary.vendas_fechadas_no_periodo": "number — deals fechados dentro do período",
      "summary.projecao_12_meses": "number BRL",
      items: "SaleDTO[] (deals fechados no período quando há filtro, senão todos)",
    },
    status: "stable",
  },
  execute: execute_finance,
};



// ================= _integration-core/providers/stubs.ts =================
// Stubs de Providers ainda não implementados.
// Todos seguem o contrato Provider e retornam data: { status: "not_implemented" }
// mantendo o Registry funcional end-to-end e permitindo consumidores
// integrarem contra o schema antes da implementação real.
//
// Cada stub declara sua metadata final — o dia da implementação real
// bastará trocar o corpo de execute().


function stub(meta: Omit<ProviderMetadata, "status">): Provider {
  return {
    metadata: { ...meta, status: "not_implemented" },
    async execute(_ctx: ProviderContext) {
      return {
        data: {
          status: "not_implemented",
          message: `Provider "${meta.name}" registrado, execução real pendente.`,
        },
        recordsCount: 0,
      };
    },
  };
}

// opportunitiesProvider real: providers/opportunitiesProvider.ts

export const forecastProvider = stub({
  name: "forecast",
  description: "Previsão de receita e conversões futuras a partir do pipeline atual.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 120, priority: 4,
  dependencies: ["pipeline", "cockpit"], inputSchema: {}, outputSchema: {},
});

export const contactsProvider = stub({
  name: "contacts",
  description: "Contatos únicos da empresa (deduplicação por telefone/e-mail).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["pagination"], defaultCacheTTL: 60, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const analyticsProvider = stub({
  name: "analytics",
  description: "Eventos analíticos agregados (tracking, funis, cohorts).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 120, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const dashboardProvider = stub({
  name: "dashboard",
  description: "Snapshot completo do dashboard principal (widgets consolidados).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["period"], defaultCacheTTL: 30, priority: 2,
  dependencies: ["cockpit", "pipeline"], inputSchema: {}, outputSchema: {},
});

// financeProvider real: providers/financeProvider.ts

export const automationProvider = stub({
  name: "automation",
  description: "Fluxos de automação WhatsApp, gatilhos e execução.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["pagination"], defaultCacheTTL: 60, priority: 4,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const conversationsProvider = stub({
  name: "conversations",
  description: "Conversas ativas do Chat com atendente humano ou agente.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period", "pagination"], defaultCacheTTL: 15, priority: 3,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const leadsProvider = stub({
  name: "leads",
  description: "Alias público de CRM com foco em detalhamento de lead único.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["pagination"], defaultCacheTTL: 30, priority: 3,
  dependencies: ["crm"], inputSchema: {}, outputSchema: {},
});

export const scoresProvider = stub({
  name: "scores",
  description: "Score de leads e evolução histórica.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period", "pagination"], defaultCacheTTL: 60, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const usersProvider = stub({
  name: "users",
  description: "Membros da conta e status de acesso.",
  version: "0.1.0", requiredPermissions: ["role:admin"], minimumPlan: "growth",
  supportedFilters: [], defaultCacheTTL: 120, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const companyProvider = stub({
  name: "company",
  description: "Perfil da empresa, serviços cadastrados e configurações.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 300, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const settingsProvider = stub({
  name: "settings",
  description: "Configurações da conta que impactam automações e chat.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 300, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const permissionsProvider = stub({
  name: "permissions",
  description: "Permissões efetivas do usuário autenticado.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 60, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const insightsProvider = stub({
  name: "insights",
  description: "Insights de IA sobre oportunidades e performance de campanhas.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 300, priority: 5,
  dependencies: ["cockpit", "campaigns"], inputSchema: {}, outputSchema: {},
});


// ================= _integration-core/registry/index.ts =================
// Bootstrap único do Provider Registry.
// Novo provider = criar o arquivo, importar aqui, chamar register(). Nada mais.
// O Context Builder e endpoints jamais alteram — Open/Closed 100%.


let _registry: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (_registry) return _registry;
  const r = new ProviderRegistry();
  // Ordem não importa — grafo de dependências é resolvido em runtime.
  r.register(cockpitProvider);
  r.register(crmProvider);
  r.register(pipelineProvider);
  r.register(campaignsProvider);
  r.register(metaProvider);
  r.register(opportunitiesProvider);
  r.register(forecastProvider);
  r.register(contactsProvider);
  r.register(analyticsProvider);
  r.register(dashboardProvider);
  r.register(financeProvider);
  r.register(automationProvider);
  r.register(conversationsProvider);
  r.register(leadsProvider);
  r.register(scoresProvider);
  r.register(usersProvider);
  r.register(companyProvider);
  r.register(settingsProvider);
  r.register(permissionsProvider);
  r.register(insightsProvider);
  _registry = r;
  return r;
}

// export { ProviderRegistry };


// ================= integration-v1-provider/index.ts =================
// Integration Layer — endpoint privado dos Providers.
// URL pública: POST /functions/v1/integration-v1-provider
// Logicamente representa 20 endpoints /api/v1/providers/<name>.
// O nome do provider vem em:
//   1) body.provider    (preferencial)
//   2) header x-provider-name
// Autenticação e observabilidade idênticas ao /context.


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
  const ip = clientIp(req) ?? "unknown";
  const ua = req.headers.get("user-agent");

  const correlationId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? null;

  const audit = (name: string, data: {
    status: number; success: boolean;
    errorCode?: string | null; errorMessage?: string | null;
    clientId?: string | null; userId?: string | null; companyId?: string | null;
    filters?: Record<string, unknown>; records?: number;
    cacheHit?: boolean | null; signatureVerified?: boolean | null; scopesMatched?: boolean | null;
    blockedReason?: string | null; rateLimited?: boolean | null; banApplied?: boolean | null;
    circuitState?: string | null;
  }) => writeAudit({
    request_id: requestId, client_id: data.clientId ?? null, user_id: data.userId ?? null,
    company_id: data.companyId ?? null,
    endpoint: `/api/v1/providers/${name || "unknown"}`, version: VERSION,
    modules: [name || "unknown"], filters: data.filters ?? {},
    status_code: data.status, success: data.success,
    error_code: data.errorCode ?? null, error_message: data.errorMessage ?? null,
    processing_time_ms: Date.now() - started, records_returned: data.records ?? 0,
    ip, user_agent: ua,
    correlation_id: correlationId,
    cache_hit: data.cacheHit ?? null,
    signature_verified: data.signatureVerified ?? null,
    scopes_matched: data.scopesMatched ?? null,
    blocked_reason: data.blockedReason ?? null,
    rate_limited: data.rateLimited ?? null,
    ban_applied: data.banApplied ?? null,
    circuit_state: data.circuitState ?? null,
  });

  if (req.method !== "POST") {
    const e = ERROR_CATALOG.VALIDATION_BODY;
    await audit("", { status: 405, success: false, errorCode: "VALIDATION_BODY", errorMessage: "Method not allowed" });
    return fail({ status: 405, code: "VALIDATION_BODY", message: e.message, request_id: requestId });
  }

  // P5: versioning (aceita apenas v1)
  const apiVersion = (req.headers.get("x-integration-api-version") ?? "v1").toLowerCase();
  if (apiVersion !== "v1") {
    const e = ERROR_CATALOG.VALIDATION_VERSION;
    await audit("", { status: e.status, success: false, errorCode: "VALIDATION_VERSION", errorMessage: `versão ${apiVersion} não suportada` });
    return fail({ status: e.status, code: "VALIDATION_VERSION", message: e.message, request_id: requestId });
  }

  // P3: IP rate-limit (pré-auth, anti-flood)
  const ipRl = await checkIpRateLimit(ip, "/api/v1/providers");
  if (!ipRl.allowed) {
    const e = ERROR_CATALOG.IP_RATE_LIMIT;
    await audit("", { status: e.status, success: false, errorCode: "IP_RATE_LIMIT", errorMessage: e.message });
    return fail({ status: e.status, code: "IP_RATE_LIMIT", message: e.message, request_id: requestId, retry_after_s: ipRl.retryAfterSeconds });
  }

  const clientRes = verifyClient(req);
  if (!clientRes.ok) {
    const e = ERROR_CATALOG[clientRes.code];
    await audit("", { status: e.status, success: false, errorCode: clientRes.code, errorMessage: e.message });
    return fail({ status: e.status, code: clientRes.code, message: e.message, request_id: requestId });
  }
  const clientId = clientRes.clientId;
  const clientScopes = clientRes.scopes;

  // P2: HMAC opcional (precisa ler raw body antes do JSON.parse)
  const rawBody = await req.text();
  const hmacRes = await verifyHmac(req, rawBody);
  if (!hmacRes.ok) {
    const e = ERROR_CATALOG[hmacRes.code];
    await audit("", { status: e.status, success: false, errorCode: hmacRes.code, errorMessage: e.message, clientId });
    return fail({ status: e.status, code: hmacRes.code, message: e.message, request_id: requestId });
  }

  const userRes = await verifyUser(req);
  if (!userRes.ok) {
    const e = ERROR_CATALOG[userRes.code];
    await audit("", { status: e.status, success: false, errorCode: userRes.code, errorMessage: e.message, clientId });
    return fail({ status: e.status, code: userRes.code, message: e.message, request_id: requestId });
  }
  const { userId, companyId, plan, permissions } = userRes.user;

  // P4: Idempotency — replay cached response if same key seen in TTL window
  const idempotencyKey = req.headers.get("x-idempotency-key") ?? "";
  if (idempotencyKey) {
    const cached = idempotencyLookup(clientId, userId, idempotencyKey);
    if (cached) return cached;
  }

  let body: any;
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch {
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

  // P5: scope check por provider (client precisa de `${provider}.read` ou "*")
  if (!hasScope(clientScopes, `${providerName}.read`)) {
    const e = ERROR_CATALOG.PERM_SCOPE_MISSING;
    await audit(providerName, { status: e.status, success: false, errorCode: "PERM_SCOPE_MISSING", errorMessage: e.message, clientId, userId, companyId });
    return fail({ status: e.status, code: "PERM_SCOPE_MISSING", message: e.message, request_id: requestId, company_id: companyId });
  }

  // P3: rate-limit multi-camada (client+user já cobre client e user; adiciona também por company)
  const rl = await checkRateLimit({ clientId, userId, endpoint: `/api/v1/providers/${providerName}`, maxRequests: 120, windowSeconds: 60 });
  if (!rl.allowed) {
    const e = ERROR_CATALOG.RATE_LIMIT_EXCEEDED;
    await audit(providerName, { status: e.status, success: false, errorCode: "RATE_LIMIT_EXCEEDED", errorMessage: e.message, clientId, userId, companyId });
    return fail({
      status: e.status, code: "RATE_LIMIT_EXCEEDED", message: e.message,
      request_id: requestId, company_id: companyId, retry_after_s: rl.retryAfterSeconds,
    });
  }
  const companyRl = await checkRateLimit({ clientId: "company", userId: companyId, endpoint: `/api/v1/providers/${providerName}`, maxRequests: 600, windowSeconds: 60 });
  if (!companyRl.allowed) {
    const e = ERROR_CATALOG.RATE_LIMIT_EXCEEDED;
    await audit(providerName, { status: e.status, success: false, errorCode: "RATE_LIMIT_EXCEEDED", errorMessage: "company quota", clientId, userId, companyId });
    return fail({ status: e.status, code: "RATE_LIMIT_EXCEEDED", message: e.message, request_id: requestId, company_id: companyId, retry_after_s: companyRl.retryAfterSeconds });
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
    // P3: timeout global de 15s por chamada de provider
    const { results, errors } = await withTimeout(
      registry.executeMany([providerName], baseCtx, { bypassCache }),
      15_000,
    );
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

    const response = ok({
      request_id: requestId, company_id: companyId, version: VERSION,
      processing_time_ms: Date.now() - started,
      cache: result.metadata.cache,
      filters_applied: result.metadata.filters_applied,
      context: { [providerName]: { data: result.data, metadata: result.metadata } },
      errors: errors.map((e) => ({ code: e.code, message: e.message, provider: e.provider })),
    });
    return idempotencyKey ? await idempotencyStore(clientId, userId, idempotencyKey, response) : response;
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.startsWith("TIMEOUT_")) {
      const e = ERROR_CATALOG.PROVIDER_TIMEOUT;
      await audit(providerName, { status: e.status, success: false, errorCode: "PROVIDER_TIMEOUT", errorMessage: msg, clientId, userId, companyId });
      return fail({ status: e.status, code: "PROVIDER_TIMEOUT", message: e.message, request_id: requestId, company_id: companyId });
    }
    if (err instanceof ProviderNotFoundError) {
      const e = ERROR_CATALOG.PROVIDER_NOT_FOUND;
      await audit(providerName, { status: e.status, success: false, errorCode: "PROVIDER_NOT_FOUND", errorMessage: e.message, clientId, userId, companyId });
      return fail({ status: e.status, code: "PROVIDER_NOT_FOUND", message: e.message, request_id: requestId, company_id: companyId });
    }
    const e = ERROR_CATALOG.PROVIDER_ERROR;
    await audit(providerName, { status: e.status, success: false, errorCode: "PROVIDER_ERROR", errorMessage: msg, clientId, userId, companyId });
    return fail({ status: e.status, code: "PROVIDER_ERROR", message: e.message, request_id: requestId, company_id: companyId });
  }
});
