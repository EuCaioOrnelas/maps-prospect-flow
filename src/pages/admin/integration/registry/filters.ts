export interface FilterDoc {
  name: string;
  type: string;
  format: string;
  example: string;
  applies_to: string[];
}

export const FILTER_DOCS: FilterDoc[] = [
  { name: "period.from", type: "string", format: "ISO 8601", example: "2026-01-01", applies_to: ["crm.leads", "campaigns.meta", "kpis.forecast"] },
  { name: "period.to", type: "string", format: "ISO 8601", example: "2026-01-31", applies_to: ["crm.leads", "campaigns.meta", "kpis.forecast"] },
  { name: "pagination.page", type: "number", format: ">= 1", example: "1", applies_to: ["crm.leads", "campaigns.meta"] },
  { name: "pagination.size", type: "number", format: "1..200", example: "50", applies_to: ["crm.leads", "campaigns.meta"] },
  { name: "stage_id", type: "uuid | null", format: "id de pipeline_stage", example: "9c…", applies_to: ["crm.leads"] },
  { name: "campaign_id", type: "uuid | null", format: "id da campanha Meta", example: "a1…", applies_to: ["campaigns.meta"] },
  { name: "tags", type: "string[]", format: "lista de tags", example: '["quente"]', applies_to: ["crm.leads"] },
  { name: "sort", type: "string", format: "field:asc|desc", example: "created_at:desc", applies_to: ["crm.leads", "campaigns.meta"] },
];
