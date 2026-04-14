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
  opportunityLeads: number;
  opportunitySales: number;
  opportunityRevenue: number;
  scoredLeads: number;
  scoreSales: number;
  scoreRevenue: number;
  scoreBuckets: { label: string; count: number; estimatedSales: number; revenue: number }[];
  totalEstimatedSales: number;
  totalEstimatedRevenue: number;
  prevTotalEstimatedRevenue: number;
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
      const prevPeriodStart = subDays(now, periodDays * 2);

      // Fetch current AND previous period in parallel
      const [currentSearchRes, prevSearchRes, currentScoredRes, prevScoredRes] = await Promise.all([
        supabase.from("search_history").select("results_count, leads").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("search_history").select("results_count, leads").eq("user_id", user.id)
          .gte("created_at", prevPeriodStart.toISOString())
          .lt("created_at", periodStart.toISOString()),
        supabase.from("revenue_leads").select("id, phone_e164, score_total").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("revenue_leads").select("id, phone_e164, score_total").eq("user_id", user.id)
          .gte("created_at", prevPeriodStart.toISOString())
          .lt("created_at", periodStart.toISOString()),
      ]);

      const extractData = (searchData: any[], scoredData: any[]) => {
        const totalProspected = searchData.reduce((s, r) => s + (r.results_count || 0), 0);
        const prospectedPhones = new Set<string>();
        searchData.forEach((search: any) => {
          const leads = search.leads;
          if (Array.isArray(leads)) {
            leads.forEach((lead: any) => {
              const phone = lead.phone || lead.telefone || "";
              const key = phone.replace(/\D/g, "").slice(-8);
              if (key.length >= 8) prospectedPhones.add(key);
            });
          }
        });
        return {
          totalProspected,
          prospectedPhones: Array.from(prospectedPhones),
          scoredLeads: scoredData.map((l) => ({
            id: l.id,
            phoneKey: l.phone_e164.replace(/\D/g, "").slice(-8),
            score: l.score_total || 0,
          })),
        };
      };

      return {
        current: extractData(currentSearchRes.data || [], currentScoredRes.data || []),
        prev: extractData(prevSearchRes.data || [], prevScoredRes.data || []),
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading || servicesLoading || !data) {
    return {
      opportunityLeads: 0, opportunitySales: 0, opportunityRevenue: 0,
      scoredLeads: 0, scoreSales: 0, scoreRevenue: 0, scoreBuckets: [],
      totalEstimatedSales: 0, totalEstimatedRevenue: 0, prevTotalEstimatedRevenue: 0,
      averageTicket, loading: true,
    };
  }

  const calcRevenue = (periodData: typeof data.current) => {
    const prospectedSet = new Set(periodData.prospectedPhones);
    const scoredPhoneKeys = new Set(periodData.scoredLeads.map(l => l.phoneKey));
    const pureOppCount = Math.max(0, periodData.totalProspected -
      Array.from(prospectedSet).filter(p => scoredPhoneKeys.has(p)).length);
    const oppSales = Math.round(pureOppCount * 0.01);
    const oppRevenue = Math.round(oppSales * averageTicket);

    let sSales = 0;
    SCORE_BUCKETS.forEach((bucket) => {
      const inBucket = periodData.scoredLeads.filter(l => l.score >= bucket.min && l.score <= bucket.max);
      sSales += Math.round(inBucket.length * ((bucket.conversionLow + bucket.conversionHigh) / 2));
    });
    const sRevenue = Math.round(sSales * averageTicket);
    return { oppSales, oppRevenue, sSales, sRevenue, total: oppRevenue + sRevenue, totalSales: oppSales + sSales, pureOppCount };
  };

  const current = calcRevenue(data.current);
  const prev = calcRevenue(data.prev);

  const bucketResults = SCORE_BUCKETS.map((bucket) => {
    const inBucket = data.current.scoredLeads.filter(l => l.score >= bucket.min && l.score <= bucket.max);
    const avgConversion = (bucket.conversionLow + bucket.conversionHigh) / 2;
    const estimatedSales = Math.round(inBucket.length * avgConversion);
    return { label: bucket.label, count: inBucket.length, estimatedSales, revenue: Math.round(estimatedSales * averageTicket) };
  });

  return {
    opportunityLeads: current.pureOppCount,
    opportunitySales: current.oppSales,
    opportunityRevenue: current.oppRevenue,
    scoredLeads: data.current.scoredLeads.length,
    scoreSales: current.sSales,
    scoreRevenue: current.sRevenue,
    scoreBuckets: bucketResults,
    totalEstimatedSales: current.totalSales,
    totalEstimatedRevenue: current.total,
    prevTotalEstimatedRevenue: prev.total,
    averageTicket,
    loading: false,
  };
}
