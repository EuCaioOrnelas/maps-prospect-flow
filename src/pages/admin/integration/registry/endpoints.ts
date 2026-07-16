// Endpoints públicos da Integration Layer.
// /context = orquestrador. /providers/<name> = provider individual.

export interface EndpointDoc {
  method: string;
  path: string;
  version: string;
  description: string;
  rate_limit: string;
  required_headers: string[];
  request_example: string;
  response_example: string;
}

const HEADERS = [
  "Authorization: Bearer <JWT do usuário Wiize>",
  "x-integration-client-id: <INTEGRATION_WIAN_CLIENT_ID>",
  "x-integration-client-secret: <INTEGRATION_WIAN_CLIENT_SECRET>",
  "Content-Type: application/json",
];

export const ENDPOINT_DOCS: EndpointDoc[] = [
  {
    method: "POST",
    path: "/api/v1/context",
    version: "v1",
    description:
      "Orquestrador. Recebe módulos, delega ao Provider Registry, resolve dependências, executa em paralelo, aplica cache por provider e consolida em um JSON.",
    rate_limit: "60 req/min por client_id + user_id.",
    required_headers: HEADERS,
    request_example: JSON.stringify({
      version: "v1",
      modules: ["cockpit", "crm", "pipeline"],
      filters: { period: { from: "2026-01-01", to: "2026-01-31" }, pagination: { page: 1, size: 20 } },
    }, null, 2),
    response_example: JSON.stringify({
      status: 200, success: true, request_id: "…", company_id: "…", version: "v1",
      processing_time_ms: 320, cache: { hit: false, ttl_s: 0 },
      context: {
        cockpit: { data: { leads_total: 120 }, metadata: { version: "1.0.0", cache: { hit: false, ttl_s: 60 } } },
        crm: { data: { items: [], meta: { total: 0 } }, metadata: { version: "1.0.0" } },
      },
      errors: [],
    }, null, 2),
  },
  {
    method: "POST",
    path: "/api/v1/providers/<name>",
    version: "v1",
    description:
      "Executa um único Provider. URL pública real: POST /functions/v1/integration-v1-provider. Informe o nome em body.provider ou no header x-provider-name. Dependências declaradas são resolvidas automaticamente. Use x-integration-cache-bypass: true para forçar refresh.",
    rate_limit: "120 req/min por client_id + user_id + provider.",
    required_headers: [...HEADERS, "x-provider-name: <opcional se body.provider for enviado>"],
    request_example: JSON.stringify({
      provider: "cockpit",
      filters: { period: { from: "2026-01-01", to: "2026-01-31" } },
    }, null, 2),
    response_example: JSON.stringify({
      status: 200, success: true, request_id: "…", company_id: "…", version: "v1",
      processing_time_ms: 82, cache: { hit: true, ttl_s: 44 },
      context: {
        cockpit: {
          data: { leads_total: 120, leads_conversion_rate: 0.32 },
          metadata: { version: "1.0.0", processing_time_ms: 60, cache: { hit: true, ttl_s: 44 }, records_count: 1 },
        },
      },
      errors: [],
    }, null, 2),
  },
];
