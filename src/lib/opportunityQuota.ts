export function opportunityQuota(p: {searches_limit?: number | null; searches_used?: number | null; extra_opportunities_packs?: number | null; bonus_searches?: number | null} | null | undefined) {
  if (!p || p.searches_limit == null) return null;
  const limit = p.searches_limit + (p.extra_opportunities_packs ?? 0)*1000 + (p.bonus_searches ?? 0);
  const used = p.searches_used ?? 0;
  return {limit,used,remaining: Math.max(0,limit-used),progress: limit > 0 ? Math.min(100,Math.max(0,used/limit*100)) : 0};
}
