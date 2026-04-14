import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyServices } from "./useCompanyServices";
import { subDays } from "date-fns";

interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  conversionLow: number;
  conversionHigh: number;
}

const SCORE_BUCKETS: ScoreBucket[] = [
  { label: "Pronto p/ venda", min: 801, max: 1000, conversionLow: 0.40, conversionHigh: 0.65 },
  { label: "Alto valor", min: 601, max: 800, conversionLow: 0.20, conversionHigh: 0.35 },
  { label: "Engajado", min: 401, max: 600, conversionLow: 0.10, conversionHigh: 0.18 },
  { label: "Baixo engajamento", min: 201, max: 400, conversionLow: 0.04, conversionHigh: 0.08 },
  { label: "Frio", min: 0, max: 200, conversionLow: 0.01, conversionHigh: 0.03 },
];

export interface CockpitForecast {
  // Opportunity-based (1% each prospected lead)
  opportunityLeads: number;
  opportunitySales: number;
  opportunityRevenue: number;
  // Score-based
  scoredLeads: number;
  scoreSales: number;
  scoreRevenue: number;
  scoreBuckets: { label: string; count: number; estimatedSales: number; revenue: number }[];
  // Combined (deduplicated)
  totalEstimatedSales: number;
  totalEstimatedRevenue: number;
  averageTicket: number;
  loading: boolean;
}

export function useCockpitForecast(periodDays: number): CockpitForecast {
  const { user } = useAuth();
  const { averageTicket, isLoading: servicesLoading } = useCompanyServices();

  const { data, isLoading } = useQuery({
    queryKey: ["cockpit-forecast", user?.id, periodDays],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      const periodStart = subDays(now, periodDays);

      // Fetch leads prospected in period (from search_history)
      const { data: searchData } = await supabase
        .from("search_history")
        .select("results_count, leads")
        .eq("user_id", user.id)
        .gte("created_at", periodStart.toISOString());

      const totalProspected = (searchData || []).reduce(
        (s, r) => s + (r.results_count || 0),
        0
      );

      // Extract phone numbers from prospected leads for deduplication
      const prospectedPhones = new Set<string>();
      (searchData || []).forEach((search: any) => {
        const leads = search.leads;
        if (Array.isArray(leads)) {
          leads.forEach((lead: any) => {
            const phone = lead.phone || lead.telefone || "";
            const key = phone.replace(/\D/g, "").slice(-8);
            if (key.length >= 8) prospectedPhones.add(key);
          });
        }
      });

      // Fetch scored leads (from revenue_leads) created in period
      const { data: scoredData } = await supabase
        .from("revenue_leads")
        .select("id, phone_e164, score_total")
        .eq("user_id", user.id)
        .gte("created_at", periodStart.toISOString());

      return {
        totalProspected,
        prospectedPhones: Array.from(prospectedPhones),
        scoredLeads: (scoredData || []).map((l) => ({
          id: l.id,
          phoneKey: l.phone_e164.replace(/\D/g, "").slice(-8),
          score: l.score_total || 0,
        })),
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading || servicesLoading || !data) {
    return {
      opportunityLeads: 0,
      opportunitySales: 0,
      opportunityRevenue: 0,
      scoredLeads: 0,
      scoreSales: 0,
      scoreRevenue: 0,
      scoreBuckets: [],
      totalEstimatedSales: 0,
      totalEstimatedRevenue: 0,
      averageTicket,
      loading: true,
    };
  }

  const prospectedSet = new Set(data.prospectedPhones);

  // Deduplicate: scored leads that were ALSO prospected are counted only as opportunity leads
  const pureScoreLeads = data.scoredLeads.filter(
    (l) => !prospectedSet.has(l.phoneKey)
  );

  // Opportunity-based: 1% conversion
  const opportunityLeads = data.totalProspected;
  const opportunitySales = Math.round(opportunityLeads * 0.01);
  const opportunityRevenue = Math.round(opportunitySales * averageTicket);

  // Score-based forecast (only non-prospected scored leads)
  const bucketResults = SCORE_BUCKETS.map((bucket) => {
    const inBucket = pureScoreLeads.filter(
      (l) => l.score >= bucket.min && l.score <= bucket.max
    );
    const avgConversion = (bucket.conversionLow + bucket.conversionHigh) / 2;
    const estimatedSales = Math.round(inBucket.length * avgConversion);
    return {
      label: bucket.label,
      count: inBucket.length,
      estimatedSales,
      revenue: Math.round(estimatedSales * averageTicket),
    };
  });

  const scoredLeadsCount = pureScoreLeads.length;
  const scoreSales = bucketResults.reduce((s, b) => s + b.estimatedSales, 0);
  const scoreRevenue = Math.round(scoreSales * averageTicket);

  const totalEstimatedSales = opportunitySales + scoreSales;
  const totalEstimatedRevenue = opportunityRevenue + scoreRevenue;

  return {
    opportunityLeads,
    opportunitySales,
    opportunityRevenue,
    scoredLeads: scoredLeadsCount,
    scoreSales,
    scoreRevenue,
    scoreBuckets: bucketResults,
    totalEstimatedSales,
    totalEstimatedRevenue,
    averageTicket,
    loading: false,
  };
}
