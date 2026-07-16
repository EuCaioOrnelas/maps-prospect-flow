export interface EndpointDoc {
  method: "POST" | "GET";
  path: string;
  version: string;
  description: string;
  providers: string[];
  required_headers: string[];
  request_example: string;
  response_example: string;
  rate_limit: string;
}

export const ENDPOINT_DOCS: EndpointDoc[] = [
  {
    method: "POST",
    path: "/api/v1/context",
    version: "v1",
    description:
      "Endpoint único (Context Builder). Recebe a lista de módulos desejados e devolve um contexto consolidado com todos os dados.",
    providers: ["crm", "meta_campaigns", "kpis"],
    required_headers: [
      "Authorization: Bearer <JWT do usuário Wiize>",
      "x-integration-client-id: <client_id do Wian>",
      "x-integration-client-secret: <client_secret do Wian>",
    ],
    request_example: JSON.stringify(
      {
        version: "v1",
        modules: ["crm.leads", "crm.pipeline", "campaigns.meta", "kpis.forecast"],
        filters: {
          period: { from: "2026-01-01", to: "2026-01-31" },
          pagination: { page: 1, size: 50 },
          sort: "created_at:desc",
        },
      },
      null,
      2,
    ),
    response_example: JSON.stringify(
      {
        status: 200,
        success: true,
        request_id: "…",
        company_id: "…",
        version: "v1",
        processing_time_ms: 142,
        cache: { hit: false, ttl_s: 0 },
        filters_applied: {},
        context: {
          "crm.leads": { data: [], meta: { total: 0, page: 1, size: 50 } },
          "kpis.forecast": {},
        },
        errors: [],
      },
      null,
      2,
    ),
    rate_limit: "60 req/min por (client_id + user_id + endpoint)",
  },
];
