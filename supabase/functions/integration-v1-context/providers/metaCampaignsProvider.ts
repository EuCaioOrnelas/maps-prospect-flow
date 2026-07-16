// Provider Meta Campaigns: expõe campanhas WhatsApp e métricas agregadas.
// Nunca retorna tokens Meta, phone_number_id, waba_id ou payloads brutos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { IntegrationFilters } from "../filters/filterSchema.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface CampaignDTO {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  reply_rate: number;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
}

export async function getMetaCampaigns(companyId: string, filters: IntegrationFilters) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const page = filters.pagination?.page ?? 1;
  const size = filters.pagination?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let q = admin
    .from("meta_campaigns")
    .select(
      "id, name, status, total_recipients, sent_count, delivered_count, read_count, replied_count, failed_count, started_at, completed_at, scheduled_at, created_at",
      { count: "exact" },
    )
    .eq("user_id", companyId);

  if (filters.period?.from) q = q.gte("created_at", filters.period.from);
  if (filters.period?.to) q = q.lte("created_at", filters.period.to);
  if (filters.campaign_id) q = q.eq("id", filters.campaign_id);

  const [sortField, sortDir] = (filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortField, { ascending: sortDir === "asc" });
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const items: CampaignDTO[] = (data ?? []).map((c: any) => {
    const sent = c.sent_count ?? 0;
    const replied = c.replied_count ?? 0;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      total_recipients: c.total_recipients ?? 0,
      sent,
      delivered: c.delivered_count ?? 0,
      read: c.read_count ?? 0,
      replied,
      failed: c.failed_count ?? 0,
      reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
      started_at: c.started_at,
      completed_at: c.completed_at,
      scheduled_at: c.scheduled_at,
    };
  });

  return { data: items, meta: { total: count ?? items.length, page, size } };
}
