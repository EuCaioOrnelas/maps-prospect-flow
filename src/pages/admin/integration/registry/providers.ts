// Registry: metadados dos Providers da Integration Layer.
// Fonte única para renderizar docs no portal admin.
// Sincronizado manualmente com _integration-core/providers/*.ts

export type ProviderStatus = "stable" | "beta" | "not_implemented";

export interface ProviderDoc {
  key: string;
  name: string;
  domain: string;
  description: string;
  version: string;
  status: ProviderStatus;
  minimum_plan: "start" | "growth" | "scale";
  default_cache_ttl: number;
  priority: number;
  dependencies: string[];
  filters: string[];
  dto_fields: { field: string; type: string; note?: string }[];
}

export const PROVIDER_DOCS: ProviderDoc[] = [
  {
    key: "cockpit", name: "Cockpit Provider", domain: "Growth Cockpit / KPIs",
    description: "KPIs executivos consolidados (leads, conversão, campanhas, pipeline).",
    version: "1.0.0", status: "stable", minimum_plan: "start",
    default_cache_ttl: 60, priority: 1, dependencies: [],
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
  {
    key: "crm", name: "CRM Provider", domain: "Leads",
    description: "Leads paginados com filtros por estágio e período.",
    version: "1.0.0", status: "stable", minimum_plan: "start",
    default_cache_ttl: 30, priority: 2, dependencies: [],
    filters: ["period", "pagination", "stage_id", "sort"],
    dto_fields: [
      { field: "id", type: "uuid" }, { field: "contact_name", type: "string" },
      { field: "company_name", type: "string" }, { field: "opportunity_level", type: "enum" },
      { field: "ai_score", type: "number" }, { field: "stage_id", type: "uuid" },
      { field: "responded", type: "boolean" }, { field: "created_at", type: "ISO 8601" },
    ],
  },
  {
    key: "pipeline", name: "Pipeline Provider", domain: "Kanban de vendas",
    description: "Estágios do pipeline com contagem de leads por coluna.",
    version: "1.0.0", status: "stable", minimum_plan: "start",
    default_cache_ttl: 60, priority: 3, dependencies: [],
    filters: [],
    dto_fields: [
      { field: "id", type: "uuid" }, { field: "name", type: "string" },
      { field: "sort_order", type: "number" }, { field: "leads_count", type: "number" },
    ],
  },
  {
    key: "campaigns", name: "Campaigns Provider", domain: "Campanhas Meta",
    description: "Campanhas WhatsApp com métricas agregadas por campanha.",
    version: "1.0.0", status: "stable", minimum_plan: "growth",
    default_cache_ttl: 30, priority: 3, dependencies: [],
    filters: ["period", "pagination", "campaign_id", "sort"],
    dto_fields: [
      { field: "id", type: "uuid" }, { field: "name", type: "string" }, { field: "status", type: "enum" },
      { field: "sent", type: "number" }, { field: "delivered", type: "number" },
      { field: "read", type: "number" }, { field: "replied", type: "number" }, { field: "failed", type: "number" },
      { field: "reply_rate", type: "number", note: "0 a 1" },
    ],
  },
  {
    key: "meta", name: "Meta Provider", domain: "Meta agregado",
    description: "Métricas Meta agregadas no período (consome dependência de campaigns).",
    version: "1.0.0", status: "stable", minimum_plan: "growth",
    default_cache_ttl: 60, priority: 4, dependencies: ["campaigns"],
    filters: ["period"],
    dto_fields: [
      { field: "campaigns_total", type: "number" },
      { field: "sent", type: "number" }, { field: "delivered", type: "number" },
      { field: "read", type: "number" }, { field: "replied", type: "number" }, { field: "failed", type: "number" },
      { field: "reply_rate", type: "number" },
    ],
  },
  // Stubs planejados
  ...(([
    ["opportunities", "Oportunidades", "Oportunidades quentes, score e nível de negócio.", "growth", 60, 2, [], ["period","pagination","sort"]],
    ["forecast", "Forecast", "Previsão de receita e conversões futuras.", "growth", 120, 4, ["pipeline","cockpit"], ["period"]],
    ["contacts", "Contatos", "Contatos únicos deduplicados.", "start", 60, 5, [], ["pagination"]],
    ["analytics", "Analytics", "Eventos analíticos agregados.", "growth", 120, 5, [], ["period"]],
    ["dashboard", "Dashboard", "Snapshot dos widgets do dashboard.", "start", 30, 2, ["cockpit","pipeline"], ["period"]],
    ["finance", "Finance", "Assinatura, cobranças e MRR.", "start", 300, 4, [], []],
    ["automation", "Automation", "Fluxos WhatsApp e execuções.", "growth", 60, 4, [], ["pagination"]],
    ["conversations", "Conversations", "Conversas ativas do Chat.", "growth", 15, 3, [], ["period","pagination"]],
    ["leads", "Leads", "Detalhamento individual de lead (alias de CRM).", "start", 30, 3, ["crm"], ["pagination"]],
    ["scores", "Scores", "Score de leads e histórico.", "growth", 60, 5, [], ["period","pagination"]],
    ["users", "Users", "Membros da conta.", "growth", 120, 6, [], []],
    ["company", "Company", "Perfil e serviços da empresa.", "start", 300, 6, [], []],
    ["settings", "Settings", "Configurações da conta.", "start", 300, 6, [], []],
    ["permissions", "Permissions", "Permissões efetivas do usuário.", "start", 60, 6, [], []],
    ["insights", "Insights", "Insights de IA sobre performance.", "growth", 300, 5, ["cockpit","campaigns"], ["period"]],
  ] as const).map(([key, name, description, plan, ttl, priority, deps, filters]) => ({
    key: key as string,
    name: `${name} Provider`,
    domain: name as string,
    description: description as string,
    version: "0.1.0",
    status: "not_implemented" as ProviderStatus,
    minimum_plan: plan as ProviderDoc["minimum_plan"],
    default_cache_ttl: ttl as number,
    priority: priority as number,
    dependencies: [...deps] as string[],
    filters: [...filters] as string[],
    dto_fields: [],
  }))),
];
