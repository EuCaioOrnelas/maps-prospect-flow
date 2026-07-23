// Self-test / contract test endpoint for the Integration Layer.
// Roda os mesmos asserts do contract_test.ts, mas como edge function HTTP.
// Deploy standalone via Supabase Web Editor (sem CLI, sem _shared).
//
// Uso:
//   GET  /functions/v1/integration-v1-selftest            -> roda testes públicos (CORS + 401)
//   POST /functions/v1/integration-v1-selftest            -> roda todos, incluindo os autenticados
//        body: { client_id?, client_secret?, user_jwt? }
//        (se ausentes, cai para env: INTEGRATION_TEST_CLIENT_ID/SECRET/JWT)
//
// Retorna: { success, summary:{total,passed,failed}, tests:[{name,passed,detail}] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CTX = `${SUPABASE_URL}/functions/v1/integration-v1-context`;
const PROV = `${SUPABASE_URL}/functions/v1/integration-v1-provider`;

const ENVELOPE_KEYS = [
  "status", "success", "timestamp", "request_id", "company_id",
  "version", "processing_time_ms", "cache", "filters_applied", "context", "errors",
];

type TestResult = { name: string; passed: boolean; detail?: string };

function checkEnvelope(body: any): string | null {
  if (!body || typeof body !== "object") return "body não é objeto";
  for (const k of ENVELOPE_KEYS) {
    if (!(k in body)) return `envelope faltando "${k}"`;
  }
  if (body.version !== "v1") return `version != v1 (got ${body.version})`;
  if (!Array.isArray(body.errors)) return "errors não é array";
  if (typeof body.cache !== "object" || !("hit" in body.cache) || !("ttl_s" in body.cache)) {
    return "cache inválido";
  }
  return null;
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function run(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { name, passed: true };
  } catch (e) {
    return { name, passed: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let creds: { client_id?: string; client_secret?: string; user_jwt?: string } = {};
  if (req.method === "POST") {
    creds = await req.json().catch(() => ({}));
  }
  const CLIENT_ID = creds.client_id
    ?? Deno.env.get("INTEGRATION_TEST_CLIENT_ID")
    ?? Deno.env.get("INTEGRATION_WIAN_CLIENT_ID")
    ?? "";
  const CLIENT_SECRET = creds.client_secret
    ?? Deno.env.get("INTEGRATION_TEST_CLIENT_SECRET")
    ?? Deno.env.get("INTEGRATION_WIAN_CLIENT_SECRET")
    ?? "";
  const USER_JWT = creds.user_jwt ?? Deno.env.get("INTEGRATION_TEST_JWT") ?? "";
  const hasAuth = !!(CLIENT_ID && CLIENT_SECRET && USER_JWT);

  const tests: TestResult[] = [];

  // 1. CORS / OPTIONS
  tests.push(await run("OPTIONS /context retorna CORS", async () => {
    const r = await fetch(CTX, { method: "OPTIONS" });
    await r.text();
    if (!(r.status === 200 || r.status === 204)) throw new Error(`status ${r.status}`);
    if (r.headers.get("Access-Control-Allow-Origin") !== "*") throw new Error("CORS ausente");
  }));

  tests.push(await run("OPTIONS /provider retorna CORS", async () => {
    const r = await fetch(PROV, { method: "OPTIONS" });
    await r.text();
    if (!(r.status === 200 || r.status === 204)) throw new Error(`status ${r.status}`);
  }));

  // 2. Contrato de erro
  tests.push(await run("POST /context sem creds → 401 com envelope estável", async () => {
    const { res, json } = await post(CTX, {}, { version: "v1", modules: ["cockpit"] });
    if (res.status !== 401) throw new Error(`status ${res.status}`);
    const err = checkEnvelope(json);
    if (err) throw new Error(err);
    if (json.success !== false) throw new Error("success != false");
    if (!json.errors.length || typeof json.errors[0]?.code !== "string") {
      throw new Error("errors[].code ausente");
    }
  }));

  tests.push(await run("POST /context com creds inválidas → 401 estável", async () => {
    const { res, json } = await post(CTX, {
      "x-integration-client-id": "wrong",
      "x-integration-client-secret": "wrong",
    }, { version: "v1", modules: ["cockpit"] });
    if (res.status !== 401) throw new Error(`status ${res.status}`);
    const err = checkEnvelope(json);
    if (err) throw new Error(err);
    if (json.success !== false) throw new Error("success != false");
  }));

  // 3. Contrato de sucesso + dados reais (só se creds fornecidas)
  let realDataSample: any = null;
  if (hasAuth) {
    tests.push(await run("POST /context autenticado → envelope de sucesso", async () => {
      const { res, json } = await post(CTX, {
        "x-integration-client-id": CLIENT_ID,
        "x-integration-client-secret": CLIENT_SECRET,
        "Authorization": `Bearer ${USER_JWT}`,
        "apikey": ANON,
      }, { version: "v1", modules: ["cockpit", "crm"] });
      if (res.status !== 200) throw new Error(`status ${res.status} body=${JSON.stringify(json).slice(0, 200)}`);
      const err = checkEnvelope(json);
      if (err) throw new Error(err);
      if (json.success !== true) throw new Error("success != true");
      if (json.errors.length !== 0) throw new Error("errors não vazio");
      if (typeof json.request_id !== "string") throw new Error("request_id inválido");
      if (typeof json.processing_time_ms !== "number") throw new Error("processing_time_ms inválido");
      realDataSample = {
        company_id: json.company_id,
        request_id: json.request_id,
        processing_time_ms: json.processing_time_ms,
        modules_returned: json.context ? Object.keys(json.context) : [],
        cache_hit: json.cache?.hit,
      };
    }));

    tests.push(await run("Dados reais foram retornados (context populado)", async () => {
      if (!realDataSample) throw new Error("teste anterior falhou");
      if (!realDataSample.company_id) throw new Error("company_id ausente — JWT não vinculou conta");
      if (!realDataSample.modules_returned?.length) throw new Error("nenhum módulo retornado");
    }));

    tests.push(await run("POST /provider desconhecido → erro estruturado", async () => {
      const { res, json } = await post(PROV, {
        "x-integration-client-id": CLIENT_ID,
        "x-integration-client-secret": CLIENT_SECRET,
        "Authorization": `Bearer ${USER_JWT}`,
        "apikey": ANON,
      }, { provider: "____does_not_exist____" });
      if (!(res.status >= 400 && res.status < 500)) throw new Error(`status ${res.status}`);
      const err = checkEnvelope(json);
      if (err) throw new Error(err);
      if (json.success !== false) throw new Error("success != false");
      if (!json.errors[0]?.code) throw new Error("code ausente");
    }));
  } else {
    tests.push({
      name: "Testes autenticados (pulados)",
      passed: true,
      detail: "Envie client_id, client_secret e user_jwt no body POST para rodar",
    });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.length - passed;

  return new Response(JSON.stringify({
    success: failed === 0,
    summary: { total: tests.length, passed, failed, auth_provided: hasAuth },
    real_data: realDataSample,
    tests,
    checked_at: new Date().toISOString(),
  }, null, 2), {
    status: failed === 0 ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
