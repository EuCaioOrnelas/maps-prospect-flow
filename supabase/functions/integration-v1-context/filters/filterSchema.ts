// Contrato oficial de filtros aceitos pela Integration Layer.
// Cada Provider aplica apenas o que faz sentido para seu domínio.

export interface Period {
  from?: string | null; // ISO date
  to?: string | null;
}

export interface Pagination {
  page: number;
  size: number;
}

export interface IntegrationFilters {
  period?: Period;
  pagination?: Pagination;
  tags?: string[];
  stage_id?: string | null;
  campaign_id?: string | null;
  sort?: string; // "field:asc|desc"
}

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export function parseFilters(raw: unknown): { ok: true; filters: IntegrationFilters } | { ok: false; reason: string } {
  if (raw == null) return { ok: true, filters: { pagination: { page: 1, size: DEFAULT_PAGE_SIZE } } };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "filters must be an object" };
  const f = raw as Record<string, unknown>;
  const out: IntegrationFilters = {};

  if (f.period !== undefined) {
    if (typeof f.period !== "object" || f.period === null) return { ok: false, reason: "period must be object" };
    const p = f.period as Record<string, unknown>;
    out.period = {
      from: typeof p.from === "string" ? p.from : null,
      to: typeof p.to === "string" ? p.to : null,
    };
    if (out.period.from && Number.isNaN(Date.parse(out.period.from))) return { ok: false, reason: "period.from invalid ISO date" };
    if (out.period.to && Number.isNaN(Date.parse(out.period.to))) return { ok: false, reason: "period.to invalid ISO date" };
  }

  if (f.pagination !== undefined) {
    if (typeof f.pagination !== "object" || f.pagination === null) return { ok: false, reason: "pagination must be object" };
    const pg = f.pagination as Record<string, unknown>;
    const page = Number(pg.page ?? 1);
    const size = Number(pg.size ?? DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(page) || page < 1) return { ok: false, reason: "pagination.page invalid" };
    if (!Number.isFinite(size) || size < 1) return { ok: false, reason: "pagination.size invalid" };
    out.pagination = { page: Math.floor(page), size: Math.min(Math.floor(size), MAX_PAGE_SIZE) };
  } else {
    out.pagination = { page: 1, size: DEFAULT_PAGE_SIZE };
  }

  if (f.tags !== undefined) {
    if (!Array.isArray(f.tags) || f.tags.some((t) => typeof t !== "string")) return { ok: false, reason: "tags must be string[]" };
    out.tags = f.tags as string[];
  }

  if (f.stage_id !== undefined) {
    if (f.stage_id !== null && typeof f.stage_id !== "string") return { ok: false, reason: "stage_id must be string or null" };
    out.stage_id = (f.stage_id as string | null) ?? null;
  }

  if (f.campaign_id !== undefined) {
    if (f.campaign_id !== null && typeof f.campaign_id !== "string") return { ok: false, reason: "campaign_id must be string or null" };
    out.campaign_id = (f.campaign_id as string | null) ?? null;
  }

  if (f.sort !== undefined) {
    if (typeof f.sort !== "string" || !/^[a-z_]+:(asc|desc)$/i.test(f.sort)) return { ok: false, reason: "sort must be 'field:asc|desc'" };
    out.sort = f.sort;
  }

  return { ok: true, filters: out };
}

export const FILTER_LIMITS = { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE };
