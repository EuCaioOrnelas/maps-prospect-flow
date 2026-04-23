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
  cancellationsLast30d?: number;
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
  /** Mantido por compatibilidade — hoje sempre 0 (Asaas é só PIX). */
  asaasCardMrr: number;
  asaasCardSubscriptions: number;
}

interface OtherMRRData {
  otherMrr: number;
  otherSubscriptions: number;
  /** MRR e assinantes agregados por método de pagamento das custom_subscriptions ativas. */
  byMethod: Array<{ method: string; label: string; mrr: number; count: number }>;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX (manual)",
  transfer: "Transferência",
  card: "Cartão (manual)",
  cash: "Dinheiro",
  other: "Outro",
  free: "Cortesia",
};

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
  const [otherMRR, setOtherMRR] = useState<OtherMRRData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [payingProfiles, setPayingProfiles] = useState<PayingProfile[]>([]);
  // Churn calculado SOMENTE pelo novo sistema de gerenciamento (exclui Stripe).
  // Fonte: tabela subscription_cancellations onde provider != 'stripe', últimos 30 dias.
  const [newSystemChurn, setNewSystemChurn] = useState<{ cancellations30d: number }>({ cancellations30d: 0 });

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

      const typedProfiles = profiles as PayingProfile[];
      const recognizedProfiles = typedProfiles.filter((p) => p.payment_provider === "stripe" || p.payment_provider === "asaas");
      setPayingProfiles(
        recognizedProfiles.filter((p) => !p.subscription_current_period_end || new Date(p.subscription_current_period_end) >= now)
      );

      const getMonthlyValue = (profile: PayingProfile) => {
        let monthlyValue = PLAN_PRICES_MONTHLY[profile.plan] || 0;
        if (profile.subscription_price_cents) {
          const priceReais = profile.subscription_price_cents / 100;
          if (profile.subscription_current_period_end) {
            const created = new Date(profile.created_at);
            const end = new Date(profile.subscription_current_period_end);
            const daysSpan = (end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            monthlyValue = daysSpan > 300 ? priceReais / 12 : priceReais;
          } else {
            monthlyValue = priceReais;
          }
        }
        return monthlyValue;
      };

      for (const p of recognizedProfiles) {
        const periodEnd = p.subscription_current_period_end;
        if (periodEnd && new Date(periodEnd) < now) continue;

        const monthlyValue = getMonthlyValue(p);

        const provider = p.payment_provider;
        if (provider === "asaas") {
          pixMrrTotal += monthlyValue;
          pixActiveSubs++;
        } else if (provider === "stripe") {
          // Skip - já contabilizado via get-stripe-mrr (cartão)
        }
      }

      const asaasProfiles = recognizedProfiles.filter((p) => p.payment_provider === "asaas");
      const pixMonthlyMRRMap = new Map<string, { mrr: number; activeCount: number }>();

      if (asaasProfiles.length > 0) {
        let earliestStart = new Date(asaasProfiles[0].created_at);
        for (const profile of asaasProfiles) {
          const created = new Date(profile.created_at);
          if (created < earliestStart) earliestStart = created;
        }

        const cursor = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
        while (cursor <= now) {
          const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
          const snapshotDate = monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` ? now : monthEnd;

          let mrr = 0;
          let activeCount = 0;

          for (const profile of asaasProfiles) {
            const created = new Date(profile.created_at);
            const periodEnd = profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null;
            if (created > snapshotDate) continue;
            if (periodEnd && periodEnd <= snapshotDate) continue;

            mrr += getMonthlyValue(profile);
            activeCount++;
          }

          pixMonthlyMRRMap.set(monthKey, { mrr, activeCount });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      setPixMRR({
        pixMrr: pixMrrTotal,
        pixActiveSubscriptions: pixActiveSubs,
        pixMonthlyMRR: Array.from(pixMonthlyMRRMap.entries())
          .map(([month, data]) => ({ month, mrr: data.mrr, activeCount: data.activeCount }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      });

      setAsaasCardMRR({
        asaasCardMrr: 0,
        asaasCardSubscriptions: 0,
      });

      setOtherMRR({
        otherMrr: 0,
        otherSubscriptions: 0,
      });
    } catch {
      setPixMRR(null);
      setAsaasCardMRR(null);
      setOtherMRR(null);
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

  // Carrega cancelamentos Asaas/PIX dos últimos 30 dias.
  const loadNewSystemChurn = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [cancellationsRes, eventsRes] = await Promise.all([
        supabase
          .from("subscription_cancellations")
          .select("user_id, provider, cancelled_at")
          .eq("provider", "asaas")
          .gte("cancelled_at", thirtyDaysAgo),
        supabase
          .from("subscription_events")
          .select("user_id, event_type, event_source, created_at")
          .eq("event_type", "pix_not_renewed")
          .eq("event_source", "asaas")
          .gte("created_at", thirtyDaysAgo),
      ]);

      if (cancellationsRes.error) throw cancellationsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const asaasUsers = new Set<string>();
      (cancellationsRes.data || []).forEach((item: any) => {
        if (item.user_id) asaasUsers.add(item.user_id);
      });
      (eventsRes.data || []).forEach((item: any) => {
        if (item.user_id) asaasUsers.add(item.user_id);
      });

      setNewSystemChurn({ cancellations30d: asaasUsers.size });
    } catch {
      setNewSystemChurn({ cancellations30d: 0 });
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadStripeMRR(), loadNonStripeMRR(), loadAlerts(), loadNewSystemChurn()]);
      setLoading(false);
    })();
  }, []);

  // Total MRR = Stripe (cartão) + Asaas (PIX)
  const totalMRR = useMemo(() => {
    return (stripeMRR?.totalMRR ?? 0) + (pixMRR?.pixMrr ?? 0);
  }, [stripeMRR, pixMRR]);

  const totalSubscribers = useMemo(() => {
    return (stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0);
  }, [stripeMRR, pixMRR]);

  // Churn = cancelamentos Stripe + Asaas nos últimos 30 dias ÷ base ativa total.
  const churnRate = useMemo(() => {
    if (totalSubscribers <= 0) return 0;
    const stripeCancellations30d = stripeMRR?.cancellationsLast30d ?? 0;
    return ((stripeCancellations30d + newSystemChurn.cancellations30d) / totalSubscribers) * 100;
  }, [newSystemChurn, stripeMRR, totalSubscribers]);
  const churnCancellations30d = (stripeMRR?.cancellationsLast30d ?? 0) + newSystemChurn.cancellations30d;

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
    otherMRR,
    totalMRR,
    totalSubscribers,
    churnRate,
    churnCancellations30d,
    averageTicket,
    ltvData,
    alerts,
  };
}
