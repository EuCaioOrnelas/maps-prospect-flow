// Wiize API V1 — Gateway público da Prospecting Intelligence API
// Autenticação por API Key, rate limit, idempotência, reserva/cobrança de tokens
// e reuso da inteligência já existente da Wiize (search-leads, score-opportunity, approach-lead).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-wiize-api-key, content-type, idempotency-key, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Json = Record<string, unknown>;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ---------- helpers ----------
function json(body: Json, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function apiError(
  code: string,
  message: string,
  status: number,
  requestId: string,
  extra: Record<string, string> = {},
  details?: Json,
) {
  return json({ error: { code, message, request_id: requestId, ...(details ? { details } : {}) } }, status, extra);
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

// Permite IP exato (IPv4/IPv6) ou faixa CIDR IPv4.
function ipAllowed(ip: string, allowed: string[]): boolean {
  if (!ip || ip === "unknown") return false;
  for (const entry of allowed) {
    const rule = entry.trim();
    if (!rule) continue;
    if (rule === ip) return true;
    if (rule.includes("/")) {
      const [base, bitsRaw] = rule.split("/");
      const bits = Number(bitsRaw);
      const a = ipv4ToInt(base);
      const b = ipv4ToInt(ip);
      if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) continue;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      if ((a & mask) === (b & mask)) return true;
    }
  }
  return false;
}

async function getLimits() {
  const { data } = await admin.from("wiize_api_limits").select("key, value");
  const map: Record<string, number> = {};
  for (const row of data || []) map[(row as any).key] = Number((row as any).value);
  return {
    burstPer10sKey: map.burst_per_10s_key ?? 20,
    ratePerMinuteKey: map.rate_per_minute_key ?? 60,
    ratePerHourKey: map.rate_per_hour_key ?? 3000,
    ratePerMinuteAccount: map.rate_per_minute_account ?? 300,
    ratePer10minAccount: map.rate_per_10min_account ?? 600,
    ratePerDayAccount: map.rate_per_day_account ?? 10000,
    maxBodyBytes: map.max_body_bytes ?? 32768,
    tokenPriceBrl: map.token_price_brl ?? 0.01,
  };
}

async function getPrice(operation: string): Promise<number | null> {
  const { data } = await admin
    .from("wiize_api_pricing")
    .select("tokens, active")
    .eq("operation", operation)
    .maybeSingle();
  if (!data || (data as any).active === false) return null;
  return Number((data as any).tokens);
}

type RateResult = { allowed: boolean; retryAfter: number; remaining: number; limit: number; resetAt: number };

// Janela deslizante dedicada da API (não compartilha tabela com o app interno).
async function rateCheck(bucket: string, limit: number, windowSeconds: number): Promise<RateResult> {
  const { data, error } = await admin.rpc("wiize_api_rate_check", {
    _bucket: bucket,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[wiize-api-v1] rate_check falhou", error.message);
    return { allowed: true, retryAfter: 0, remaining: limit, limit, resetAt: 0 };
  }
  const d = (typeof data === "string" ? JSON.parse(data || "{}") : (data || {})) as any;
  if (d.remaining === undefined) console.warn("[wiize-api-v1] rate_check payload inesperado", JSON.stringify(data));

  return {
    allowed: d.allowed !== false,
    retryAfter: Number(d.retry_after || windowSeconds),
    remaining: Number(d.remaining ?? 0),
    limit: Number(d.limit ?? limit),
    resetAt: Number(d.reset_at || 0),
  };
}

async function checkBans(userId: string | null, apiKeyId: string | null, ip: string) {
  const { data } = await admin.rpc("wiize_api_check_bans", {
    _user_id: userId,
    _api_key_id: apiKeyId,
    _ip: ip,
  });
  return (data || { banned: false }) as any;
}

async function registerAbuse(
  userId: string | null,
  apiKeyId: string | null,
  ip: string,
  kind: string,
  details: Json = {},
) {
  try {
    const { data } = await admin.rpc("wiize_api_register_abuse", {
      _user_id: userId,
      _api_key_id: apiKeyId,
      _ip: ip,
      _kind: kind,
      _details: details,
    });
    return (data || {}) as any;
  } catch (e) {
    console.error("[wiize-api-v1] abuse falhou", String(e));
    return {};
  }
}

async function logRequest(entry: Record<string, unknown>) {
  try {
    await admin.from("wiize_api_requests").insert(entry as any);
  } catch (e) {
    console.error("[wiize-api-v1] log falhou", String(e));
  }
}


// Remove qualquer campo interno/sensível antes de devolver ao cliente
const FORBIDDEN_KEYS = /(prompt|system|api_key|apikey|token|secret|service_role|authorization|internal|user_id|owner_id)/i;
function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => sanitize(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.test(k)) continue;
      out[k] = sanitize(v);
    }
    return out as unknown as T;
  }
  return value;
}

async function callInternal(fn: string, userId: string, body: Json, timeoutMs = 90_000, clientIp?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
        "x-wiize-api-user": userId,
        ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    return { ok: res.ok, status: res.status, data: parsed };
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return { ok: false, status: aborted ? 504 : 502, data: { error: aborted ? "timeout" : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- endpoints ----------
const ROUTES: Record<string, { operation: string; permission: string }> = {
  "/v1/prospecting/search": { operation: "prospecting.search", permission: "prospecting:search" },
  "/v1/prospecting/analyze": { operation: "prospecting.analyze", permission: "prospecting:analyze" },
  "/v1/prospecting/approach": { operation: "prospecting.approach", permission: "prospecting:approach" },
};

function validate(path: string, body: any): { ok: true; payload: Json } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Corpo da requisição inválido." };

  if (path === "/v1/prospecting/search") {
    const query = String(body.query ?? body.keyword ?? "").trim();
    const location = String(body.location ?? "").trim();
    const limit = Number(body.limit ?? 20);
    if (query.length < 2 || query.length > 120) return { ok: false, message: "query deve ter entre 2 e 120 caracteres." };
    if (location.length < 2 || location.length > 120) return { ok: false, message: "location deve ter entre 2 e 120 caracteres." };
    if (!Number.isFinite(limit) || limit < 1 || limit > 60) return { ok: false, message: "limit deve estar entre 1 e 60." };
    return { ok: true, payload: { keyword: query, location, limit: Math.floor(limit) } };
  }

  if (path === "/v1/prospecting/analyze") {
    const company = body.company ?? body;
    const nome = String(company.name ?? company.nome_empresa ?? "").trim();
    if (nome.length < 2) return { ok: false, message: "company.name é obrigatório." };
    return {
      ok: true,
      payload: {
        nome_empresa: nome,
        endereco: String(company.address ?? company.endereco ?? ""),
        categoria: String(company.category ?? company.categoria ?? ""),
        cidade: String(company.city ?? company.cidade ?? ""),
        google_maps_link: String(company.google_maps_link ?? company.maps_link ?? ""),
        avaliacao_media: Number(company.rating ?? company.avaliacao_media ?? 0) || 0,
        quantidade_avaliacoes: Number(company.review_count ?? company.quantidade_avaliacoes ?? 0) || 0,
        site_url: String(company.website ?? company.site_url ?? ""),
        possui_site: Boolean(company.website ?? company.site_url ?? false),
        possui_telefone: Boolean(company.phone ?? company.possui_telefone ?? false),
        redes_sociais: company.social_media ?? company.redes_sociais ?? [],
      },
    };
  }

  // approach
  const company = body.company ?? body.lead ?? {};
  const nome = String(company.name ?? company.company_name ?? "").trim();
  if (nome.length < 2) return { ok: false, message: "company.name é obrigatório." };
  if (parseApproachTypes(body).length === 0) {
    return { ok: false, message: 'type deve ser "manual", "followup" ou "both".' };
  }
  return {
    ok: true,
    payload: {
      lead: {
        company_name: nome,
        category: company.category ?? null,
        city: company.city ?? null,
        address: company.address ?? null,
        website: company.website ?? null,
        phone: company.phone ?? null,
        rating: company.rating ?? null,
        review_count: company.review_count ?? null,
        social_media: company.social_media ?? [],
        ai_score: company.score ?? body.score ?? null,
        ai_diagnosis: company.diagnosis ?? body.diagnosis ?? null,
        enrichment_data: body.analysis ?? {},
      },
    },
  };
}

// Tipos de abordagem pedidos. "manual" = primeiro contato manual (WhatsApp),
// "followup" = mensagem no padrão Meta. Cada um custa o preço da operação.
type ApproachType = "manual" | "followup";
function parseApproachTypes(body: any): ApproachType[] {
  const rawList: unknown[] = Array.isArray(body?.types)
    ? body.types
    : body?.type !== undefined
    ? [body.type]
    : ["followup"]; // compatibilidade: comportamento anterior da API

  const out: ApproachType[] = [];
  for (const item of rawList) {
    const v = String(item ?? "").trim().toLowerCase();
    if (v === "both" || v === "all" || v === "ambos") {
      if (!out.includes("manual")) out.push("manual");
      if (!out.includes("followup")) out.push("followup");
    } else if (v === "manual") {
      if (!out.includes("manual")) out.push("manual");
    } else if (v === "followup" || v === "follow_up" || v === "follow-up" || v === "meta") {
      if (!out.includes("followup")) out.push("followup");
    } else {
      return [];
    }
  }
  return out;
}

function shapeApproach(data: any) {
  return sanitize({
    message: data?.mensagem ?? "",
    strategy: data?.estrategia ?? "",
    suggested_offer: data?.produto_sugerido ?? "",
    niche_insight: data?.analise_nicho ?? "",
    city_insight: data?.analise_cidade ?? "",
    hook: data?.gancho ?? "",
    insight: data?.insight ?? "",
    weaknesses: data?.pontos_fracos ?? [],
  });
}

function shapeResponse(path: string, data: any) {
  if (path === "/v1/prospecting/search") {
    const leads = Array.isArray(data?.leads) ? data.leads : [];
    return {
      results_count: leads.length,
      locations_searched: data?.locationsSearched ?? [],
      companies: leads.map((l: any) => ({
        name: l.name ?? null,
        phone: l.phone ?? null,
        category: l.category ?? null,
        city: l.city ?? null,
        address: l.address ?? null,
        website: l.website ?? null,
        google_maps_link: l.mapsLink ?? null,
        rating: l.rating ?? null,
        review_count: l.reviewCount ?? null,
      })),
    };
  }
  if (path === "/v1/prospecting/analyze") {
    return sanitize({
      company_name: data?.nome_empresa ?? null,
      opportunity_score: data?.score ?? null,
      opportunity_level: data?.nivel_oportunidade ?? null,
      close_probability: data?.probabilidade_fechamento ?? null,
      diagnosis: data?.diagnostico ?? null,
      recommended_action: data?.acao_recomendada ?? null,
      score_breakdown: data?.score_breakdown ?? null,
      strengths: data?.pontos_fortes ?? [],
      weaknesses: data?.pontos_fracos ?? [],
      analysis: {
        website: data?.analise_site ?? null,
        social: data?.analise_redes_sociais ?? null,
        reputation: data?.analise_reputacao_detalhada ?? null,
        competition: data?.analise_concorrencia_regional ?? null,
        demand: data?.analise_demanda_regional ?? null,
      },
      estimated_revenue_potential: data?.potencial_receita_estimado ?? null,
    });
  }
  return shapeApproach(data);
}

// ---------- handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let activeReservationId: string | null = null;
  const url = new URL(req.url);
  // Suporta tanto /functions/v1/wiize-api-v1/v1/... quanto /wiize-api-v1/v1/...
  const path = "/v1" + (url.pathname.split("/v1").pop() || "");
  const ip = clientIp(req);

  try {
    if (url.searchParams.has("api_key")) {
      return apiError("INVALID_REQUEST", "API Key não pode ser enviada por query string.", 400, requestId);
    }

    if (path === "/v1/health") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return apiError("METHOD_NOT_ALLOWED", "Utilize GET neste endpoint.", 405, requestId);
      }
      return json({
        service: "Wiize API",
        status: "ok",
        version: "v1",
        endpoints: [
          "/v1/prospecting/search",
          "/v1/prospecting/analyze",
          "/v1/prospecting/approach",
        ],
        request_id: requestId,
      }, 200, { "Cache-Control": "no-store" });
    }

    const route = ROUTES[path];
    if (!route) {
      return apiError("NOT_FOUND", `Endpoint ${path} não existe nesta versão da API.`, 404, requestId);
    }
    if (req.method !== "POST") {
      return apiError("METHOD_NOT_ALLOWED", "Utilize POST neste endpoint.", 405, requestId);
    }

    const limits = await getLimits();

    // ---- antifraude: bloqueio por IP antes de qualquer trabalho ----
    const ipBan = await checkBans(null, null, ip);
    if (ipBan.banned) {
      return apiError(
        "ACCOUNT_BANNED",
        `Acesso temporariamente bloqueado por atividade suspeita. ${ipBan.reason || ""}`.trim(),
        403,
        requestId,
        ipBan.retry_after ? { "Retry-After": String(ipBan.retry_after) } : {},
      );
    }

    // ---- autenticação por API Key ----
    const headerKey = req.headers.get("x-wiize-api-key") || req.headers.get("x-api-key");
    const authorization = req.headers.get("authorization")?.trim() || "";
    const authorizationKey = authorization.replace(/^Bearer\s+/i, "").trim();
    const rawKey = (headerKey || authorizationKey || "").trim();

    if (!rawKey || !/^wk_(live|test)_[a-zA-Z0-9]{24,}$/.test(rawKey)) {
      await registerAbuse(null, null, ip, "auth_failure", { reason: "malformed_key" });
      return apiError("UNAUTHORIZED", "API Key ausente ou em formato inválido.", 401, requestId);
    }

    const prefix = rawKey.slice(0, 20);
    const hash = await sha256Hex(rawKey);
    const { data: keyRow } = await admin
      .from("wiize_api_keys")
      .select("id, user_id, status, permissions, environment, rate_limit_per_minute, allowed_ips")
      .eq("prefix", prefix)
      .eq("secret_hash", hash)
      .maybeSingle();

    if (!keyRow) {
      const abuse = await registerAbuse(null, null, ip, "auth_failure", { reason: "invalid_key", prefix });
      if (abuse.banned) {
        return apiError("ACCOUNT_BANNED", "Muitas tentativas inválidas. Acesso bloqueado temporariamente.", 403, requestId, {
          "Retry-After": String(abuse.retry_after || 900),
        });
      }
      return apiError("UNAUTHORIZED", "API Key inválida.", 401, requestId);
    }

    const key = keyRow as any;
    if (key.status !== "active") {
      return apiError("KEY_REVOKED", "Esta API Key foi revogada.", 403, requestId);
    }
    const allowedIps: string[] = Array.isArray(key.allowed_ips) ? key.allowed_ips : [];
    if (allowedIps.length > 0 && !ipAllowed(ip, allowedIps)) {
      await registerAbuse(key.user_id, key.id, ip, "auth_failure", { reason: "ip_not_allowed" });
      return apiError("IP_NOT_ALLOWED", "Este IP não está autorizado para esta API Key.", 403, requestId);
    }
    if (!(key.permissions || []).includes(route.permission)) {
      return apiError("FORBIDDEN", `A chave não possui a permissão ${route.permission}.`, 403, requestId);
    }

    const userId: string = key.user_id;

    // ---- antifraude: bloqueio por conta ou chave ----
    const ban = await checkBans(userId, key.id, ip);
    if (ban.banned) {
      await logRequest({
        user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
        environment: key.environment, status_code: 403, error_code: "ACCOUNT_BANNED",
        duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
        metadata: { scope: ban.scope },
      });
      return apiError(
        "ACCOUNT_BANNED",
        ban.permanent
          ? "Acesso bloqueado permanentemente por violação da política de uso. Fale com o suporte."
          : `Acesso bloqueado temporariamente por atividade suspeita. ${ban.reason || ""}`.trim(),
        403,
        requestId,
        ban.retry_after ? { "Retry-After": String(ban.retry_after) } : {},
      );
    }

    // ---- rate limit multi-camada (rajada / minuto / hora / conta / dia) ----
    const perMinute = Number(key.rate_limit_per_minute || limits.ratePerMinuteKey);
    const burstLimit = Math.max(1, Math.min(limits.burstPer10sKey, Math.ceil(perMinute / 2)));

    const tiers = [
      { name: "burst", res: await rateCheck(`k:${key.id}:10s`, burstLimit, 10) },
      { name: "key_minute", res: await rateCheck(`k:${key.id}:60s`, perMinute, 60) },
      { name: "key_hour", res: await rateCheck(`k:${key.id}:1h`, limits.ratePerHourKey, 3600) },
      { name: "account_minute", res: await rateCheck(`a:${userId}:60s`, limits.ratePerMinuteAccount, 60) },
      { name: "account_10min", res: await rateCheck(`a:${userId}:10m`, limits.ratePer10minAccount, 600) },
      { name: "account_day", res: await rateCheck(`a:${userId}:1d`, limits.ratePerDayAccount, 86400) },
    ];
    const minuteTier = tiers[1].res;

    const rateHeaders: Record<string, string> = {
      "X-RateLimit-Limit": String(perMinute),
      "X-RateLimit-Remaining": String(Math.max(minuteTier.remaining, 0)),
      "X-RateLimit-Reset": String(minuteTier.resetAt || Math.floor(Date.now() / 1000) + 60),
      "X-RateLimit-Burst-Limit": String(burstLimit),
      "X-RateLimit-Daily-Limit": String(limits.ratePerDayAccount),
      "X-RateLimit-Daily-Remaining": String(Math.max(tiers[5].res.remaining, 0)),
    };

    const blocked = tiers.find((t) => !t.res.allowed);
    if (blocked) {
      const abuse = await registerAbuse(userId, key.id, ip, "rate_limit", { tier: blocked.name });
      await logRequest({
        user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
        environment: key.environment, status_code: 429, error_code: "RATE_LIMIT_EXCEEDED",
        duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
        metadata: { tier: blocked.name },
      });
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        `Limite de requisições excedido (${blocked.name}). Aguarde e tente novamente.`,
        429,
        requestId,
        { ...rateHeaders, "Retry-After": String(blocked.res.retryAfter), "X-RateLimit-Scope": blocked.name },
        { scope: blocked.name, limit: blocked.res.limit, retry_after: blocked.res.retryAfter, banned: !!abuse.banned },
      );
    }


    // ---- corpo ----
    const raw = await req.text();
    if (raw.length > limits.maxBodyBytes) {
      return apiError("PAYLOAD_TOO_LARGE", "Corpo da requisição excede o tamanho máximo permitido.", 413, requestId, rateHeaders);
    }
    let body: any;
    try { body = raw ? JSON.parse(raw) : {}; } catch {
      return apiError("INVALID_REQUEST", "JSON inválido.", 400, requestId, rateHeaders);
    }

    const validated = validate(path, body);
    if (!validated.ok) {
      await registerAbuse(userId, key.id, ip, "validation_error", { endpoint: path });
      await logRequest({
        user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
        environment: key.environment, status_code: 422, error_code: "VALIDATION_ERROR",
        duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
      });
      return apiError("VALIDATION_ERROR", validated.message, 422, requestId, rateHeaders);
    }


    // ---- idempotência ----
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const { data: prev } = await admin
        .from("wiize_api_requests")
        .select("request_id, status_code, metadata")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (prev && (prev as any).metadata?.response) {
        return json(
          { data: (prev as any).metadata.response, request_id: (prev as any).request_id, idempotent_replay: true },
          200,
          rateHeaders,
        );
      }
    }

    // ---- pricing + reserva ----
    // Busca: o preço é por lead entregue. Reservamos o máximo pedido e,
    // no commit, cobramos apenas a quantidade realmente retornada.
    const unitPrice = await getPrice(route.operation);
    if (unitPrice === null) {
      return apiError("OPERATION_UNAVAILABLE", "Operação temporariamente indisponível.", 503, requestId, rateHeaders);
    }
    const isApproach = path === "/v1/prospecting/approach";
    const approachTypes = isApproach ? parseApproachTypes(body) : [];
    const requestedUnits = path === "/v1/prospecting/search"
      ? Math.max(1, Number((validated.payload as any)?.limit ?? 20))
      : isApproach
      ? approachTypes.length
      : 1;
    const tokens = unitPrice * requestedUnits;

    const { data: reserveRes } = await admin.rpc("wiize_api_reserve_tokens", {
      _user_id: userId,
      _operation: route.operation,
      _tokens: tokens,
      _api_key_id: key.id,
      _request_id: requestId,
    });
    const reserve = (reserveRes || {}) as any;
    if (reserve.ok) activeReservationId = reserve.reservation_id ?? null;


    if (!reserve.ok) {
      const code = reserve.code === "ACCOUNT_SUSPENDED" ? "ACCOUNT_SUSPENDED" : "INSUFFICIENT_BALANCE";
      const status = code === "ACCOUNT_SUSPENDED" ? 403 : 402;
      if (code === "INSUFFICIENT_BALANCE") {
        await registerAbuse(userId, key.id, ip, "insufficient_balance", { endpoint: path });
      }

      await logRequest({
        user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
        environment: key.environment, status_code: status, error_code: code,
        duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
      });
      return apiError(
        code,
        code === "ACCOUNT_SUSPENDED"
          ? "Conta suspensa. Fale com o suporte."
          : "Saldo insuficiente. Adicione créditos para continuar usando a API.",
        status,
        requestId,
        rateHeaders,
        { required_tokens: tokens, available_tokens: reserve.available_tokens ?? 0 },
      );
    }

    // ---- execução ----
    const failUpstream = async (status: number) => {
      await admin.rpc("wiize_api_release_reservation", { _reservation_id: reserve.reservation_id });
      const code = status === 504 ? "TIMEOUT" : "UPSTREAM_ERROR";
      await logRequest({
        user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
        environment: key.environment, status_code: status === 504 ? 504 : 502, error_code: code,
        duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
        metadata: { upstream_status: status },
      });
      return apiError(
        code,
        code === "TIMEOUT" ? "A operação excedeu o tempo limite. Nenhum token foi cobrado." : "Falha ao processar a operação. Nenhum token foi cobrado.",
        status === 504 ? 504 : 502,
        requestId,
        rateHeaders,
      );
    };

    let payload: any;
    let deliveredUnits = 0;

    if (isApproach) {
      // Cada tipo pedido é uma mensagem gerada e cobrada separadamente.
      const generated: Record<string, any> = {};
      let lastFailStatus = 0;
      for (const t of approachTypes) {
        const fnName = t === "manual" ? "approach-lead-manual" : "approach-lead";
        const r = await callInternal(fnName, userId, validated.payload, 90_000, ip);
        if (r.ok) {
          generated[t] = shapeApproach(r.data);
          deliveredUnits += 1;
        } else {
          lastFailStatus = r.status;
        }
      }
      if (deliveredUnits === 0) return await failUpstream(lastFailStatus || 502);

      payload = approachTypes.length === 1
        ? { type: approachTypes[0], ...generated[approachTypes[0]] }
        : {
            manual: generated.manual ?? null,
            followup: generated.followup ?? null,
            generated_types: Object.keys(generated),
          };
    } else {
      const fn = path === "/v1/prospecting/search" ? "search-leads" : "score-opportunity";
      const result = await callInternal(fn, userId, validated.payload, 90_000, ip);
      if (!result.ok) return await failUpstream(result.status);
      payload = shapeResponse(path, result.data);
      // Unidades realmente entregues (leads na busca; 1 na análise)
      deliveredUnits = path === "/v1/prospecting/search"
        ? Number((payload as any)?.results_count ?? 0)
        : 1;
    }
    const chargedTokens = Math.min(unitPrice * deliveredUnits, tokens);

    const { data: commitRes } = await admin.rpc("wiize_api_commit_reservation", {
      _reservation_id: reserve.reservation_id,
      _reference_id: requestId,
      _actual_tokens: chargedTokens,
    });
    activeReservationId = null;
    const commit = (commitRes || {}) as any;

    await admin.from("wiize_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

    await logRequest({
      user_id: userId, api_key_id: key.id, request_id: requestId, endpoint: path,
      environment: key.environment, status_code: 200, tokens_charged: chargedTokens,
      duration_ms: Date.now() - startedAt, ip_address: ip, user_agent: req.headers.get("user-agent"),
      idempotency_key: idempotencyKey, metadata: { response: payload, units: deliveredUnits, unit_tokens: unitPrice },
    });

    return json(
      {
        data: payload,
        usage: {
          operation: route.operation,
          units: deliveredUnits,
          tokens_per_unit: unitPrice,
          tokens_charged: chargedTokens,
          cost_brl: Number((chargedTokens * limits.tokenPriceBrl).toFixed(2)),
          balance_tokens: commit.balance_tokens ?? null,
        },
        request_id: requestId,
      },
      200,
      rateHeaders,
    );

  } catch (e) {
    console.error("[wiize-api-v1] erro", String(e));
    // Falha inesperada nunca pode reter tokens do cliente.
    if (activeReservationId) {
      try {
        await admin.rpc("wiize_api_release_reservation", { _reservation_id: activeReservationId });
      } catch (_) { /* ignora */ }
    }

    return apiError("INTERNAL_ERROR", "Erro interno. Tente novamente.", 500, requestId);
  }
});
