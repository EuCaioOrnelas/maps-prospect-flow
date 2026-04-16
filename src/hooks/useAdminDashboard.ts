import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  payingUsers: number;
  freeUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  mrrLocal: number;
  activationRate: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
}

interface StripeMRRData {
  totalMRR: number;
  activeSubscriptions: number;
  churnRate: number;
  monthlyMRR: Array<{ month: string; mrr: number; activeCount?: number }>;
  monthlySales?: Array<{ month: string; newSales: number; salesValue: number; cancellations: number }>;
  monthlyRefunds?: Array<{ month: string; amount: number; count: number }>;
  totalRefunded: number;
  refundCount: number;
  canceledSubscriptions: number;
}

interface PixMRRData {
  pixMrr: number;
  pixActiveSubscriptions: number;
  pixMonthlyMRR: Array<{ month: string; mrr: number; activeCount: number }>;
}

interface AsaasCardMRRData {
  asaasCardMrr: number;
  asaasCardSubscriptions: number;
}

interface PayingProfile {
  id: string;
  plan: string;
  payment_provider: string | null;
  subscription_current_period_end: string | null;
  subscription_price_cents: number | null;
  created_at: string;
}

const PLAN_PRICES_MONTHLY: Record<string, number> = {
  start: 296,
  growth: 696,
  scale: 897,
};

export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [pixMRR, setPixMRR] = useState<PixMRRData | null>(null);
  const [asaasCardMRR, setAsaasCardMRR] = useState<AsaasCardMRRData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [payingProfiles, setPayingProfiles] = useState<PayingProfile[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, searches_used, searches_limit, created_at, updated_at, is_blocked, trial_messages_sent, trial_leads_used, trial_flows_used, trial_campaigns_used")
        .order("created_at", { ascending: false });

      if (!profiles) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsers = profiles.length;
      const payingUsers = profiles.filter((p) => p.plan !== "free").length;
      const freeUsers = profiles.filter((p) => p.plan === "free").length;
      
      // Active users: updated in the period AND has any usage
      const activeUsers7d = profiles.filter(
        (p) => new Date(p.updated_at) >= sevenDaysAgo && (p.searches_used > 0 || (p as any).trial_messages_sent > 0 || (p as any).trial_leads_used > 0 || (p as any).trial_flows_used > 0 || (p as any).trial_campaigns_used > 0)
      ).length;
      const activeUsers30d = profiles.filter(
        (p) => new Date(p.updated_at) >= thirtyDaysAgo && (p.searches_used > 0 || (p as any).trial_messages_sent > 0 || (p as any).trial_leads_used > 0 || (p as any).trial_flows_used > 0 || (p as any).trial_campaigns_used > 0)
      ).length;

      const mrrLocal = profiles
        .filter((p) => p.plan !== "free")
        .reduce((acc, p) => acc + (PLAN_PRICES_MONTHLY[p.plan] || 0), 0);

      // Activation: users who used any feature
      const activatedUsers = profiles.filter((p) => 
        p.searches_used > 0 || 
        (p as any).trial_messages_sent > 0 || 
        (p as any).trial_leads_used > 0 || 
        (p as any).trial_flows_used > 0 || 
        (p as any).trial_campaigns_used > 0
      ).length;
      
      const activationRate = totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0;

      const planCounts: Record<string, { count: number; revenue: number }> = {};
      profiles.forEach((p) => {
        if (!planCounts[p.plan]) planCounts[p.plan] = { count: 0, revenue: 0 };
        planCounts[p.plan].count++;
        planCounts[p.plan].revenue += PLAN_PRICES_MONTHLY[p.plan] || 0;
      });

      setStats({
        totalUsers,
        payingUsers,
        freeUsers,
        activeUsers7d,
        activeUsers30d,
        mrrLocal,
        activationRate,
        planDistribution: Object.entries(planCounts).map(([plan, d]) => ({
          plan,
          ...d,
        })),
      });
    } catch (err) {
      console.error("Error loading admin stats:", err);
    }
  }, []);

  const loadStripeMRR = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-stripe-mrr");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeMRR(data);
    } catch {
      setStripeMRR(null);
    }
  }, []);

  const loadNonStripeMRR = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, subscription_current_period_end, subscription_price_cents, created_at")
        .neq("plan", "free")
        .eq("is_blocked", false);

      if (!profiles) return;

      const now = new Date();
      let pixMrrTotal = 0;
      let pixActiveSubs = 0;
      let asaasCardMrrTotal = 0;
      let asaasCardSubs = 0;
      let otherMrrTotal = 0;
      let otherSubs = 0;

      const typedProfiles = profiles as PayingProfile[];
      setPayingProfiles(typedProfiles);

      for (const p of typedProfiles) {
        const periodEnd = p.subscription_current_period_end;
        if (periodEnd && new Date(periodEnd) < now) continue;

        // Determine monthly MRR from subscription_price_cents
        let monthlyValue = PLAN_PRICES_MONTHLY[p.plan] || 0;
        if (p.subscription_price_cents) {
          const priceReais = p.subscription_price_cents / 100;
          // If period is ~1 year, it's annual - divide by 12
          if (periodEnd) {
            const created = new Date(p.created_at);
            const end = new Date(periodEnd);
            const daysSpan = (end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSpan > 300) {
              monthlyValue = priceReais / 12;
            } else {
              monthlyValue = priceReais;
            }
          }
        }

        const provider = p.payment_provider;
        if (provider === "abacate_pay") {
          pixMrrTotal += monthlyValue;
          pixActiveSubs++;
        } else if (provider === "asaas") {
          asaasCardMrrTotal += monthlyValue;
          asaasCardSubs++;
        } else if (provider === "stripe") {
          // Skip - already counted via get-stripe-mrr
        } else if (!provider || provider !== "stripe") {
          // Unknown provider - count as "other" toward total but not in specific buckets
          if (p.subscription_price_cents) {
            otherMrrTotal += monthlyValue;
            otherSubs++;
          }
        }
      }

      setPixMRR({
        pixMrr: pixMrrTotal,
        pixActiveSubscriptions: pixActiveSubs,
        pixMonthlyMRR: [],
      });

      setAsaasCardMRR({
        asaasCardMrr: asaasCardMrrTotal,
        asaasCardSubscriptions: asaasCardSubs,
      });
    } catch {
      setPixMRR(null);
      setAsaasCardMRR(null);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const alertsList: any[] = [];

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: churnEvents } = await supabase
        .from("subscription_events")
        .select("id")
        .in("event_type", ["subscription_canceled", "subscription_deleted", "pix_not_renewed"])
        .gte("created_at", weekAgo);

      if (churnEvents && churnEvents.length > 0) {
        alertsList.push({
          type: "danger",
          text: `${churnEvents.length} cancelamento(s) nos últimos 7 dias`,
          route: "/admin/churn",
        });
      }

      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { count: trialCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free")
        .lte("trial_end_at", threeDaysFromNow)
        .gte("trial_end_at", new Date().toISOString());

      if (trialCount && trialCount > 0) {
        alertsList.push({
          type: "warning",
          text: `${trialCount} trial(s) expirando em 3 dias`,
          route: "/admin/usuarios",
        });
      }

      const { count: hotFreeCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free")
        .gte("searches_used", 80);

      if (hotFreeCount && hotFreeCount > 0) {
        alertsList.push({
          type: "info",
          text: `${hotFreeCount} usuário(s) Free com uso alto — oportunidade de upgrade`,
          route: "/admin/usuarios",
        });
      }

      setAlerts(alertsList);
    } catch (err) {
      console.error("Error loading alerts:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadStripeMRR(), loadNonStripeMRR(), loadAlerts()]);
      setLoading(false);
    })();
  }, []);

  // Total MRR = Stripe + PIX + Asaas Card
  const totalMRR = useMemo(() => {
    return (stripeMRR?.totalMRR ?? 0) + (pixMRR?.pixMrr ?? 0) + (asaasCardMRR?.asaasCardMrr ?? 0);
  }, [stripeMRR, pixMRR, asaasCardMRR]);

  const totalSubscribers = useMemo(() => {
    return (stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0) + (asaasCardMRR?.asaasCardSubscriptions ?? 0);
  }, [stripeMRR, pixMRR, asaasCardMRR]);

  const churnRate = stripeMRR?.churnRate ?? 0;

  // Average ticket: uses monthly-equivalent values
  const averageTicket = useMemo(() => {
    return totalSubscribers > 0 ? totalMRR / totalSubscribers : 0;
  }, [totalMRR, totalSubscribers]);

  // LTV: average subscription duration * average ticket
  const ltvData = useMemo(() => {
    if (payingProfiles.length === 0) return { avgMonths: 0, ltv: 0 };
    
    const now = new Date();
    let totalMonths = 0;
    let count = 0;
    
    for (const p of payingProfiles) {
      const created = new Date(p.created_at);
      const months = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
      totalMonths += months;
      count++;
    }
    
    const avgMonths = count > 0 ? totalMonths / count : 0;
    const ltv = avgMonths * averageTicket;
    
    return { avgMonths, ltv };
  }, [payingProfiles, averageTicket]);

  return {
    loading,
    stats,
    stripeMRR,
    pixMRR,
    asaasCardMRR,
    totalMRR,
    totalSubscribers,
    churnRate,
    averageTicket,
    ltvData,
    alerts,
  };
}
