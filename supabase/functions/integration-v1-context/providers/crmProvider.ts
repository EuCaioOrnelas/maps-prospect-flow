// Provider CRM: expõe leads e pipeline via DTO. Nunca vaza colunas internas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { IntegrationFilters } from "../filters/filterSchema.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface LeadDTO {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  opportunity_level: string | null;
  ai_score: number | null;
  stage_id: string | null;
  responded: boolean;
  created_at: string;
}

export interface PipelineStageDTO {
  id: string;
  name: string;
  sort_order: number;
  leads_count: number;
}

export async function getLeads(companyId: string, filters: IntegrationFilters) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const page = filters.pagination?.page ?? 1;
  const size = filters.pagination?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let q = admin
    .from("leads")
    .select("id, contact_name, company_name, opportunity_level, ai_score, stage_id, has_responded, created_at", { count: "exact" })
    .eq("user_id", companyId);

  if (filters.stage_id) q = q.eq("stage_id", filters.stage_id);
  if (filters.period?.from) q = q.gte("created_at", filters.period.from);
  if (filters.period?.to) q = q.lte("created_at", filters.period.to);

  const [sortField, sortDir] = (filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortField, { ascending: sortDir === "asc" });
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const items: LeadDTO[] = (data ?? []).map((l: any) => ({
    id: l.id,
    contact_name: l.contact_name,
    company_name: l.company_name,
    opportunity_level: l.opportunity_level,
    ai_score: l.ai_score,
    stage_id: l.stage_id,
    responded: Boolean(l.has_responded),
    created_at: l.created_at,
  }));

  return { data: items, meta: { total: count ?? items.length, page, size } };
}

export async function getPipeline(companyId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: stages, error: sErr } = await admin
    .from("pipeline_stages")
    .select("id, name, sort_order")
    .eq("user_id", companyId)
    .order("sort_order", { ascending: true });
  if (sErr) throw new Error(sErr.message);

  const { data: leads } = await admin
    .from("leads")
    .select("stage_id")
    .eq("user_id", companyId);

  const countByStage = new Map<string, number>();
  for (const l of leads ?? []) {
    countByStage.set(l.stage_id, (countByStage.get(l.stage_id) ?? 0) + 1);
  }

  const items: PipelineStageDTO[] = (stages ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    sort_order: s.sort_order,
    leads_count: countByStage.get(s.id) ?? 0,
  }));
  return { data: items, meta: { total: items.length } };
}
