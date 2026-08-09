// Contract tests for the Integration Layer edge functions.
// Garante que o envelope de resposta e códigos de erro permanecem estáveis
// após refactors (ex.: flatten do _integration-core). Roda contra o deploy real.
//
// Uso:
//   deno test --allow-net --allow-env supabase/tests/integration-v1-contract_test.ts
//
// Vars opcionais no .env:
//   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
//   INTEGRATION_TEST_CLIENT_ID, INTEGRATION_TEST_CLIENT_SECRET, INTEGRATION_TEST_JWT

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CTX = `${SUPABASE_URL}/functions/v1/integration-v1-context`;
const PROV = `${SUPABASE_URL}/functions/v1/integration-v1-provider`;

const CLIENT_ID = Deno.env.get("INTEGRATION_TEST_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("INTEGRATION_TEST_CLIENT_SECRET") ?? "";
const USER_JWT = Deno.env.get("INTEGRATION_TEST_JWT") ?? "";

// ---------- helpers ----------
const ENVELOPE_KEYS = [
  "status", "success", "timestamp", "request_id", "company_id",
  "version", "processing_time_ms", "cache", "filters_applied", "context", "errors",
];

function assertEnvelope(body: any) {
  for (const k of ENVELOPE_KEYS) {
    assert(k in body, `envelope missing key "${k}"`);
  }
  assertEquals(body.version, "v1");
  assert(Array.isArray(body.errors));
  assert(typeof body.cache === "object" && "hit" in body.cache && "ttl_s" in body.cache);
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

// ---------- 1. CORS / OPTIONS ----------
Deno.test("OPTIONS preflight retorna CORS headers em /context", async () => {
  const r = await fetch(CTX, { method: "OPTIONS" });
  await r.text();
  assert(r.status === 200 || r.status === 204);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("OPTIONS preflight retorna CORS headers em /provider", async () => {
  const r = await fetch(PROV, { method: "OPTIONS" });
  await r.text();
  assert(r.status === 200 || r.status === 204);
});

// ---------- 2. Contrato de erro ----------
Deno.test("POST sem credenciais retorna 401 com envelope { success:false, errors[].code }", async () => {
  const { res, json } = await post(CTX, {}, { version: "v1", modules: ["cockpit"] });
  assertEquals(res.status, 401);
  assertEnvelope(json);
  assertEquals(json.success, false);
  assert(json.errors.length > 0);
  assert(typeof json.errors[0].code === "string" && json.errors[0].code.length > 0);
});

Deno.test("POST com client-id/secret invalidos retorna 401 estavel", async () => {
  const { res, json } = await post(CTX, {
    "x-integration-client-id": "wrong",
    "x-integration-client-secret": "wrong",
  }, { version: "v1", modules: ["cockpit"] });
  assertEquals(res.status, 401);
  assertEnvelope(json);
  assertEquals(json.success, false);
});

Deno.test("Provider desconhecido retorna erro estruturado", { ignore: !CLIENT_ID || !CLIENT_SECRET || !USER_JWT }, async () => {
  const { res, json } = await post(PROV, {
    "x-integration-client-id": CLIENT_ID,
    "x-integration-client-secret": CLIENT_SECRET,
    "Authorization": `Bearer ${USER_JWT}`,
    "apikey": ANON,
  }, { provider: "____does_not_exist____" });
  assert(res.status >= 400 && res.status < 500);
  assertEnvelope(json);
  assertEquals(json.success, false);
  assert(json.errors[0].code.length > 0);
});

// ---------- 3. Contrato de sucesso (requer credenciais reais) ----------
Deno.test("POST /context com auth valida retorna envelope de sucesso", { ignore: !CLIENT_ID || !CLIENT_SECRET || !USER_JWT }, async () => {
  const { res, json } = await post(CTX, {
    "x-integration-client-id": CLIENT_ID,
    "x-integration-client-secret": CLIENT_SECRET,
    "Authorization": `Bearer ${USER_JWT}`,
    "apikey": ANON,
  }, { version: "v1", modules: ["cockpit"] });
  assertEquals(res.status, 200);
  assertEnvelope(json);
  assertEquals(json.success, true);
  assertEquals(json.errors.length, 0);
  assert(typeof json.request_id === "string");
  assert(typeof json.processing_time_ms === "number");
});
