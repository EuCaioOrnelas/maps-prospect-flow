// Registry: metadados dos Providers da Integration Layer.
// Fonte única para renderizar docs no portal admin.

export interface ProviderDoc {
  key: string;
  name: string;
  domain: string;
  description: string;
  modules: string[];
  filters: string[];
  dto_fields: { field: string; type: string; note?: string }[];
}

export const PROVIDER_DOCS: ProviderDoc[] = [
  {
    key: "crm",
    name: "CRM Provider",
    domain: "Leads e pipeline de vendas",
    description:
      "Expõe leads da empresa e o pipeline (colunas do kanban) com contagem por estágio. Nunca retorna telefones, tokens ou dados sensíveis.",
    modules: ["crm.leads", "crm.pipeline"],
    filters: ["period", "pagination", "stage_id", "tags", "sort"],
    dto_fields: [
      { field: "id", type: "uuid" },
      { field: "contact_name", type: "string" },
      { field: "company_name", type: "string" },
      { field: "opportunity_level", type: "enum", note: "baixa | media | alta | quente" },
      { field: "ai_score", type: "number", note: "0 a 1000" },
      { field: "stage_id", type: "uuid" },
      { field: "responded", type: "boolean" },
      { field: "created_at", type: "ISO 8601" },
    ],
  },
  {
    key: "meta_campaigns",
    name: "Meta Campaigns Provider",
    domain: "Campanhas WhatsApp via Meta Cloud API",
    description:
      "Expõe as campanhas Meta com métricas agregadas (enviados, entregues, lidos, respondidos, taxa de resposta). Nunca retorna tokens Meta, waba_id ou phone_number_id.",
    modules: ["campaigns.meta"],
    filters: ["period", "pagination", "campaign_id", "sort"],
    dto_fields: [
      { field: "id", type: "uuid" },
      { field: "name", type: "string" },
      { field: "status", type: "enum" },
      { field: "total_recipients", type: "number" },
      { field: "sent", type: "number" },
      { field: "delivered", type: "number" },
      { field: "read", type: "number" },
      { field: "replied", type: "number" },
      { field: "failed", type: "number" },
      { field: "reply_rate", type: "number", note: "0 a 1" },
      { field: "started_at", type: "ISO 8601 | null" },
      { field: "completed_at", type: "ISO 8601 | null" },
      { field: "scheduled_at", type: "ISO 8601 | null" },
    ],
  },
  {
    key: "kpis",
    name: "KPIs / Forecast Provider",
    domain: "Métricas executivas consolidadas",
    description:
      "Agrega KPIs de negócio (leads, conversão, campanhas, pipeline). Toda regra de cálculo continua na Wiize — o Wian apenas interpreta.",
    modules: ["kpis.forecast"],
    filters: ["period"],
    dto_fields: [
      { field: "leads_total", type: "number" },
      { field: "leads_responded", type: "number" },
      { field: "leads_conversion_rate", type: "number", note: "0 a 1" },
      { field: "campaigns_total", type: "number" },
      { field: "campaigns_messages_sent", type: "number" },
      { field: "campaigns_reply_rate", type: "number", note: "0 a 1" },
      { field: "pipeline_open_leads", type: "number" },
    ],
  },
];
