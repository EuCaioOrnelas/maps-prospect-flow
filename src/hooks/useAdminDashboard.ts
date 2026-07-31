import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHURN_METRICS_SINCE, fetchPayingUserIds } from "@/lib/adminMetrics";

interface DashboardStats {
  totalUsers: number;
  payingUsers: number;
  trialingUsers: number;
  freeUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  mrrLocal: number;
  activationRate: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
}

interface StripeMRRData {
  totalMRR: number;
  stripeMRR?: number;
  activeSubscriptions: number;
  stripeActiveSubscriptions?: number;
  churnRate: number;
  cancellationsLast30d?: number;
  monthlyMRR: Array<{ month: string; mrr: number; activeCount?: number }>;
  monthlySales?: Array<{ month: string; newSales: number; salesValue: number; cancellations: number }>;
  monthlyRefunds?: Array<{ month: string; amount: number; count: number }>;
  totalRefunded: number;
  refundCount: number;
  canceledSubscriptions: number;
  /** MRR proveniente de order bumps (itens extras da assinatura). */
  addOnsMRR?: number;
  subscriptionsWithAddOns?: number;
}

interface PixMRRData {
  pixMrr: number;
  pixActiveSubscriptions: number;
  pixMonthlyMRR: Array<{ month: string; mrr: number; activeCount: number }>;
}

interface AsaasCardMRRData {
  /** Cartão recorrente via Asaas (consultado em tempo real na API). */
  asaasCardMrr: number;
  asaasCardSubscriptions: number;
}

interface AsaasLiveStats {
  card_active_subs: number;
  pix_active_subs: number;
  card_mrr: number;
  pix_mrr: number;
  pix_received_this_month: number;
  pix_paid_count_90d: number;
  pix_pending_count_90d: number;
  pix_overdue_count_90d: number;
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
  const [newSystemChurn, setNewSystemChurn] = useState<{ cancellations30d: number; payingUsersCount: number }>({ cancellations30d: 0, payingUsersCount: 0 });
  // Dados em tempo real direto da API do Asaas (fonte de verdade para PIX + cartão Asaas).
  const [asaasLive, setAsaasLive] = useState<AsaasLiveStats | null>(null);

  const loadAsaasLive = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("No auth session for Asaas stats");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-asaas-stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `admin-asaas-stats HTTP ${response.status}`);
      if (data?.error) throw new Error(data.error);
      if (data?.summary) setAsaasLive(data.summary);
    } catch (err) {
      console.warn("[useAdminDashboard] Asaas live stats unavailable:", err);
      setAsaasLive(null);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, trial_will_charge_at, searches_used, searches_limit, created_at, updated_at, is_blocked, trial_messages_sent, trial_leads_used, trial_flows_used, trial_campaigns_used")
        .order("created_at", { ascending: false });

      if (!profiles) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Helper: usuário em trial = tem trial_will_charge_at futuro (ainda não foi cobrado).
      const isTrialing = (p: any) =>
        p.plan !== "free" &&
        p.trial_will_charge_at &&
        new Date(p.trial_will_charge_at).getTime() > now.getTime();

      const totalUsers = profiles.length;
      const trialingUsers = profiles.filter(isTrialing).length;
      // Pagantes "de verdade" = plano pago E NÃO está em trial.
      const payingUsers = profiles.filter((p) => p.plan !== "free" && !isTrialing(p)).length;
      const freeUsers = profiles.filter((p) => p.plan === "free").length;

      // Active users: updated in the period AND has any usage
      const activeUsers7d = profiles.filter(
        (p) => new Date(p.updated_at) >= sevenDaysAgo && (p.searches_used > 0 || (p as any).trial_messages_sent > 0 || (p as any).trial_leads_used > 0 || (p as any).trial_flows_used > 0 || (p as any).trial_campaigns_used > 0)
      ).length;
      const activeUsers30d = profiles.filter(
        (p) => new Date(p.updated_at) >= thirtyDaysAgo && (p.searches_used > 0 || (p as any).trial_messages_sent > 0 || (p as any).trial_leads_used > 0 || (p as any).trial_flows_used > 0 || (p as any).trial_campaigns_used > 0)
      ).length;

      // MRR local NÃO conta trials (ainda não pagaram)
      const mrrLocal = profiles
        .filter((p) => p.plan !== "free" && !isTrialing(p))
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

      // Distribuição de planos: APENAS planos pagos (não-trial). Trials e Free NÃO entram na distribuição/receita.
      const planCounts: Record<string, { count: number; revenue: number }> = {};
      profiles.forEach((p) => {
        if (p.plan === "free") return;
        if (isTrialing(p)) return;
        if (!planCounts[p.plan]) planCounts[p.plan] = { count: 0, revenue: 0 };
        planCounts[p.plan].count++;
        planCounts[p.plan].revenue += PLAN_PRICES_MONTHLY[p.plan] || 0;
      });

      setStats({
        totalUsers,
        payingUsers,
        trialingUsers,
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
    } catch (err) {
      console.error("[useAdminDashboard] get-stripe-mrr failed:", err);
      setStripeMRR(null);
    }
  }, []);

  const loadNonStripeMRR = useCallback(async () => {
    // ===== 1. PIX/Asaas (a partir de profiles) — independente do bloco manual =====
    try {
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, subscription_current_period_end, subscription_price_cents, created_at, trial_will_charge_at")
        .neq("plan", "free")
        .eq("is_blocked", false);

      if (profilesErr) throw profilesErr;
      if (!profiles) throw new Error("No profiles returned");

      const now = new Date();
      let pixMrrTotal = 0;
      let pixActiveSubs = 0;

      const typedProfiles = profiles as (PayingProfile & { trial_will_charge_at?: string | null })[];
      // Excluir trials (cartão registrado mas ainda não cobrado) do MRR e da contagem.
      const isTrialingProfile = (p: any) =>
        p.trial_will_charge_at && new Date(p.trial_will_charge_at).getTime() > now.getTime();
      const recognizedProfiles = typedProfiles.filter(
        (p) =>
          !isTrialingProfile(p) &&
          (p.payment_provider === "stripe" ||
            p.payment_provider === "asaas" ||
            p.payment_provider === "manual" ||
            p.payment_provider === null)
      );
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
        if (p.payment_provider === "asaas") {
          pixMrrTotal += getMonthlyValue(p);
          pixActiveSubs++;
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

          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          if (monthKey === currentMonthKey) {
            pixMonthlyMRRMap.set(monthKey, { mrr: pixMrrTotal, activeCount: pixActiveSubs });
          } else {
            pixMonthlyMRRMap.set(monthKey, { mrr, activeCount });
          }
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

      setAsaasCardMRR({ asaasCardMrr: 0, asaasCardSubscriptions: 0 });
    } catch (err) {
      console.error("[useAdminDashboard] PIX/Asaas profiles load failed:", err);
      setPixMRR(null);
      setAsaasCardMRR(null);
    }

    // ===== 2. Custom subscriptions (manual) — bloco INDEPENDENTE =====
    try {
      const { data: customSubs, error: customErr } = await supabase
        .from("custom_subscriptions")
        .select("user_id, monthly_value_cents, payment_method, status, ends_at, is_lifetime")
        .eq("status", "active");

      if (customErr) throw customErr;

      // Só soma enquanto o usuário existir e tiver plano ativo (não free, não bloqueado).
      const userIds = Array.from(new Set(((customSubs || []) as any[]).map((s) => s.user_id).filter(Boolean)));
      const activeUserIds = new Set<string>();
      if (userIds.length > 0) {
        const { data: subProfiles } = await supabase
          .from("profiles")
          .select("id, plan, is_blocked")
          .in("id", userIds);
        ((subProfiles || []) as any[]).forEach((p) => {
          if (p.plan && p.plan !== "free" && !p.is_blocked) activeUserIds.add(p.id);
        });
      }

      const now = new Date();
      let otherMrrTotal = 0;
      let otherSubsTotal = 0;
      const byMethodMap = new Map<string, { mrr: number; count: number }>();
      for (const sub of (customSubs || []) as any[]) {
        if (!sub.user_id || !activeUserIds.has(sub.user_id)) continue;
        if (!sub.is_lifetime && sub.ends_at && new Date(sub.ends_at) < now) continue;
        const monthly = (sub.monthly_value_cents || 0) / 100;
        if (monthly <= 0) continue;
        otherMrrTotal += monthly;
        otherSubsTotal += 1;
        const key = sub.payment_method || "other";
        const cur = byMethodMap.get(key) || { mrr: 0, count: 0 };
        cur.mrr += monthly;
        cur.count += 1;
        byMethodMap.set(key, cur);
      }


      setOtherMRR({
        otherMrr: otherMrrTotal,
        otherSubscriptions: otherSubsTotal,
        byMethod: Array.from(byMethodMap.entries())
          .map(([method, d]) => ({
            method,
            label: PAYMENT_METHOD_LABELS[method] || method,
            mrr: d.mrr,
            count: d.count,
          }))
          .sort((a, b) => b.mrr - a.mrr),
      });
    } catch (err) {
      console.error("[useAdminDashboard] custom_subscriptions load failed:", err);
      setOtherMRR(null);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const alertsList: any[] = [];

      const weekAgo = new Date(Math.max(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
        CHURN_METRICS_SINCE.getTime()
      )).toISOString();
      const [{ data: churnEvents }, payingIds] = await Promise.all([
        supabase
          .from("subscription_events")
          .select("id, user_id")
          .in("event_type", ["subscription_canceled", "subscription_deleted", "pix_not_renewed"])
          .gte("created_at", weekAgo),
        fetchPayingUserIds(supabase),
      ]);

      // Só é churn quem já foi pagante — cancelamento no trial não entra.
      const realChurnEvents = ((churnEvents as any[]) || []).filter(
        (e) => e.user_id && payingIds.has(e.user_id)
      );

      if (realChurnEvents.length > 0) {
        alertsList.push({
          type: "danger",
          text: `${realChurnEvents.length} cancelamento(s) nos últimos 7 dias`,
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
          route: "/admin/oportunidades-upgrade",
        });
      }

      setAlerts(alertsList);
    } catch (err) {
      console.error("Error loading alerts:", err);
    }
  }, []);

  // Usa exatamente a mesma fonte consolidada da página Churn Intelligence.
  const loadNewSystemChurn = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-churn", { body: {} });
      if (error) throw error;
      setNewSystemChurn({
        cancellations30d: data?.churnMetrics?.last30d ?? 0,
        payingUsersCount: data?.churnMetrics?.payingUsersCount ?? data?.payingUsersCount ?? 0,
      });
    } catch {
      setNewSystemChurn({ cancellations30d: 0, payingUsersCount: 0 });
    }
  }, []);


  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadStripeMRR(), loadNonStripeMRR(), loadAlerts(), loadNewSystemChurn(), loadAsaasLive()]);
      setLoading(false);
    })();
  }, []);

  // ===== MRR consolidado =====
  // Quando a API do Asaas responde, ela é a FONTE DE VERDADE para PIX recorrente
  // e cartão Asaas (sobrescreve o cálculo local baseado em profiles).
  // Caso contrário, usamos os números locais como fallback.
  const effectivePixMrr = asaasLive ? asaasLive.pix_mrr : (pixMRR?.pixMrr ?? 0);
  const effectivePixSubs = asaasLive ? asaasLive.pix_active_subs : (pixMRR?.pixActiveSubscriptions ?? 0);
  const effectiveAsaasCardMrr = asaasLive ? asaasLive.card_mrr : (asaasCardMRR?.asaasCardMrr ?? 0);
  const effectiveAsaasCardSubs = asaasLive ? asaasLive.card_active_subs : (asaasCardMRR?.asaasCardSubscriptions ?? 0);

  // Total MRR = Stripe (cartão) + Asaas (PIX) + Asaas (cartão) + Custom subscriptions (manual)
  const totalMRR = useMemo(() => {
    return (stripeMRR?.stripeMRR ?? stripeMRR?.totalMRR ?? 0) + effectivePixMrr + effectiveAsaasCardMrr + (otherMRR?.otherMrr ?? 0);
  }, [stripeMRR, effectivePixMrr, effectiveAsaasCardMrr, otherMRR]);

  const totalSubscribers = useMemo(() => {
    return (stripeMRR?.stripeActiveSubscriptions ?? stripeMRR?.activeSubscriptions ?? 0) + effectivePixSubs + effectiveAsaasCardSubs + (otherMRR?.otherSubscriptions ?? 0);
  }, [stripeMRR, effectivePixSubs, effectiveAsaasCardSubs, otherMRR]);

  // Churn = cancelamentos reais no período ÷ base pagante real (todos que já
  // pagaram pelo menos uma vez). Usar só os ativos como denominador infla a taxa
  // e fazia o cockpit divergir da página de Churn Inteligente.
  const churnRate = useMemo(() => {
    if (newSystemChurn.payingUsersCount <= 0) return 0;
    return Math.min(100, (newSystemChurn.cancellations30d / newSystemChurn.payingUsersCount) * 100);
  }, [newSystemChurn]);
  const churnCancellations30d = newSystemChurn.cancellations30d;

  // Average ticket: uses monthly-equivalent values
  const averageTicket = useMemo(() => {
    return totalSubscribers > 0 ? totalMRR / totalSubscribers : 0;
  }, [totalMRR, totalSubscribers]);

  // LTV: preferimos a fórmula clássica (ticket médio ÷ churn mensal), que é
  // estável mesmo com base pequena. Sem churn no período, usamos o tempo real
  // de assinatura PAGA (o trial não conta como receita).
  const ltvData = useMemo(() => {
    if (payingProfiles.length === 0) return { avgMonths: 0, ltv: 0 };

    const now = Date.now();
    const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
    const TRIAL_MS = 1000 * 60 * 60 * 24 * 7;

    let totalMonths = 0;
    for (const p of payingProfiles) {
      const willCharge = (p as any).trial_will_charge_at
        ? new Date((p as any).trial_will_charge_at).getTime()
        : null;
      const paidStart = willCharge ?? new Date(p.created_at).getTime() + TRIAL_MS;
      totalMonths += Math.max(0, (now - paidStart) / MONTH_MS);
    }

    const avgMonths = totalMonths / payingProfiles.length;
    const ltv =
      churnRate > 0
        ? averageTicket / (churnRate / 100)
        : Math.max(avgMonths, 1) * averageTicket;

    return { avgMonths, ltv };
  }, [payingProfiles, averageTicket, churnRate]);


  // pixMRR efetivo: combina o histórico mensal local com o valor real do Asaas no mês corrente.
  const effectivePixMRR = useMemo(() => {
    if (!pixMRR) {
      return asaasLive
        ? {
            pixMrr: asaasLive.pix_mrr,
            pixActiveSubscriptions: asaasLive.pix_active_subs,
            pixMonthlyMRR: [],
          }
        : null;
    }
    if (!asaasLive) return pixMRR;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const updatedMonthly = pixMRR.pixMonthlyMRR.map((m) =>
      m.month === currentMonthKey
        ? { ...m, mrr: asaasLive.pix_mrr, activeCount: asaasLive.pix_active_subs }
        : m
    );
    // Garante que o mês corrente exista no array
    if (!updatedMonthly.some((m) => m.month === currentMonthKey)) {
      updatedMonthly.push({ month: currentMonthKey, mrr: asaasLive.pix_mrr, activeCount: asaasLive.pix_active_subs });
      updatedMonthly.sort((a, b) => a.month.localeCompare(b.month));
    }
    return {
      pixMrr: asaasLive.pix_mrr,
      pixActiveSubscriptions: asaasLive.pix_active_subs,
      pixMonthlyMRR: updatedMonthly,
    };
  }, [pixMRR, asaasLive]);

  const effectiveAsaasCardMRR = useMemo(() => {
    if (asaasLive) {
      return {
        asaasCardMrr: asaasLive.card_mrr,
        asaasCardSubscriptions: asaasLive.card_active_subs,
      };
    }
    return asaasCardMRR;
  }, [asaasCardMRR, asaasLive]);

  return {
    loading,
    stats,
    stripeMRR,
    pixMRR: effectivePixMRR,
    asaasCardMRR: effectiveAsaasCardMRR,
    otherMRR,
    asaasLive,
    totalMRR,
    totalSubscribers,
    churnRate,
    churnCancellations30d,
    averageTicket,
    ltvData,
    alerts,
  };
}
