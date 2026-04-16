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

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  start: 296,
  growth: 696,
  scale: 897,
};

export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [pixMRR, setPixMRR] = useState<PixMRRData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, searches_used, searches_limit, created_at, updated_at, is_blocked")
        .order("created_at", { ascending: false });

      if (!profiles) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsers = profiles.length;
      const payingUsers = profiles.filter((p) => p.plan !== "free").length;
      const freeUsers = profiles.filter((p) => p.plan === "free").length;
      const activeUsers7d = profiles.filter(
        (p) => new Date(p.updated_at) >= sevenDaysAgo && p.searches_used > 0
      ).length;
      const activeUsers30d = profiles.filter(
        (p) => new Date(p.updated_at) >= thirtyDaysAgo && p.searches_used > 0
      ).length;

      const mrrLocal = profiles
        .filter((p) => p.plan !== "free")
        .reduce((acc, p) => acc + (PLAN_PRICES[p.plan] || 0), 0);

      const activationRate =
        totalUsers > 0
          ? (profiles.filter((p) => p.searches_used > 0).length / totalUsers) * 100
          : 0;

      const planCounts: Record<string, { count: number; revenue: number }> = {};
      profiles.forEach((p) => {
        if (!planCounts[p.plan]) planCounts[p.plan] = { count: 0, revenue: 0 };
        planCounts[p.plan].count++;
        planCounts[p.plan].revenue += PLAN_PRICES[p.plan] || 0;
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

  const loadPixMRR = useCallback(async () => {
    try {
      const planPrices: Record<string, number> = { start: 296, growth: 696, scale: 897 };
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, subscription_current_period_end")
        .neq("plan", "free")
        .eq("is_blocked", false);

      let pixMrrTotal = 0;
      let pixActiveSubs = 0;
      const now = new Date();
      for (const p of profiles || []) {
        if ((p as any).payment_provider !== "abacate_pay" && (p as any).payment_provider !== "asaas") continue;
        if (p.subscription_current_period_end && new Date(p.subscription_current_period_end) < now) continue;
        pixMrrTotal += planPrices[p.plan] || 0;
        pixActiveSubs++;
      }

      setPixMRR({
        pixMrr: pixMrrTotal,
        pixActiveSubscriptions: pixActiveSubs,
        pixMonthlyMRR: [],
      });
    } catch {
      setPixMRR(null);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const alertsList: any[] = [];

      // Check churn events last 7 days
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

      // Check trials near expiry
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiringTrials, count: trialCount } = await supabase
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

      // Free users with high usage
      const { data: hotFree, count: hotFreeCount } = await supabase
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
      await Promise.all([loadStats(), loadStripeMRR(), loadPixMRR(), loadAlerts()]);
      setLoading(false);
    })();
  }, []);

  const totalMRR = useMemo(() => {
    return (stripeMRR?.totalMRR ?? 0) + (pixMRR?.pixMrr ?? 0);
  }, [stripeMRR, pixMRR]);

  const totalSubscribers = useMemo(() => {
    return (stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0);
  }, [stripeMRR, pixMRR]);

  const churnRate = stripeMRR?.churnRate ?? 0;

  const averageTicket = useMemo(() => {
    return totalSubscribers > 0 ? totalMRR / totalSubscribers : 0;
  }, [totalMRR, totalSubscribers]);

  return {
    loading,
    stats,
    stripeMRR,
    pixMRR,
    totalMRR,
    totalSubscribers,
    churnRate,
    averageTicket,
    alerts,
  };
}
