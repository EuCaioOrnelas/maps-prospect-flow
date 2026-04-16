import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Target, DollarSign, BarChart3, AlertTriangle,
  Calendar, Users, ArrowUpRight, ArrowDownRight, Sparkles, ShieldCheck,
  Activity, Repeat, Heart, Zap, Info, HelpCircle, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

// ============================================================
// CONSTANTS — easy to tweak in one place
// ============================================================

/** Plan monthly prices (R$). Used as fallback when subscription_price_cents is null. */
const PLAN_PRICES_MONTHLY: Record<string, number> = { start: 296, growth: 696, scale: 897 };

/** Auto-refresh interval (ms). Page reloads data every 5 minutes. */
const AUTO_REFRESH_MS = 5 * 60 * 1000;

/**
 * Minimum cancellations across the last 3 months in the NEW system
 * required before we trust the calculated churn rate.
 * Below this we use the DEFAULT_REALISTIC_CHURN baseline (6%).
 */
const MIN_CANCELLATIONS_FOR_REAL_CHURN = 3;

/** Default churn for the realistic scenario when there isn't enough internal data. */
const DEFAULT_REALISTIC_CHURN = 0.06;

interface NewSystemMetrics {
  loading: boolean;
  totalMRR: number;
  totalSubscribers: number;
  averageTicket: number;
  monthlyMRR: { month: string; mrr: number; activeCount: number }[];
  monthlySales: { month: string; newSales: number; salesValue: number; cancellations: number }[];
  realChurnRate: number;
  avgNewMRR: number;
  avgNewClients: number;
  avgExpansionMRR: number;
  avgCancellations: number;
  /** true when we don't have enough internal data and we're using the default 6% baseline */
  usingDefaultChurn: boolean;
  /** Breakdown by source for transparency */
  stripeMRR: number;
  newSystemMRR: number;
  /** Last refresh timestamp */
  lastRefresh: Date;
}

/**
 * Pulls forecast data ONLY from the new management system:
 * - profiles (excluding stripe and free)
 * - subscription_cancellations (real cancellations registered)
 * - pix_invoices (paid renewals)
 */
function useNewSystemMetrics(): NewSystemMetrics {
  const [data, setData] = useState<NewSystemMetrics>({
    loading: true,
    totalMRR: 0,
    totalSubscribers: 0,
    averageTicket: 0,
    monthlyMRR: [],
    monthlySales: [],
    realChurnRate: DEFAULT_REALISTIC_CHURN,
    avgNewMRR: 0,
    avgNewClients: 0,
    avgExpansionMRR: 0,
    avgCancellations: 0,
    usingDefaultChurn: true,
    stripeMRR: 0,
    newSystemMRR: 0,
    lastRefresh: new Date(),
  });

  // ----------------------------------------------------------------
  // FETCH FUNCTION — runs once on mount, then every AUTO_REFRESH_MS
  // ----------------------------------------------------------------
  const fetchAll = async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

      // ============================================================
      // STEP 1 — Pull active subscribers from `profiles`
      // We include ALL paid plans (free excluded). Stripe is kept here
      // because we need its REVENUE; we'll separate sources below.
      // ============================================================
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, subscription_current_period_end, subscription_price_cents, created_at, is_blocked")
        .neq("plan", "free")
        .eq("is_blocked", false);

      // ============================================================
      // STEP 2 — Pull cancellations from new system ONLY
      // Stripe cancellations are unreliable for forecasting (we don't
      // have full webhook history), so we ignore them.
      // ============================================================
      const { data: cancellations } = await supabase
        .from("subscription_cancellations")
        .select("provider, billing_type, cancelled_at, active_until")
        .gte("cancelled_at", sixMonthsAgo.toISOString());

      // ============================================================
      // STEP 3 — Pull paid PIX invoices (renewal + new sales revenue)
      // ============================================================
      const { data: pixPaid } = await supabase
        .from("pix_invoices")
        .select("amount_cents, paid_at, plan, user_id")
        .eq("status", "paid")
        .gte("paid_at", sixMonthsAgo.toISOString());

      // ============================================================
      // STEP 4 — Stripe MRR (revenue only, no churn data)
      // Pulled from existing edge function `get-stripe-mrr`.
      // ============================================================
      let stripeMRR = 0;
      try {
        const { data: stripeData } = await supabase.functions.invoke("get-stripe-mrr");
        stripeMRR = stripeData?.totalMRR || 0;
      } catch {
        stripeMRR = 0;
      }

      // ============================================================
      // STEP 5 — Filter sources
      // newSystemProfiles: everything EXCEPT stripe (used for churn/ticket math)
      // newSystemCancellations: only non-stripe cancellations
      // ============================================================
      const newSystemProfiles = (profiles || []).filter(
        (p: any) => p.payment_provider !== "stripe"
      );
      const newSystemCancellations = (cancellations || []).filter(
        (c: any) => c.provider !== "stripe"
      );

      // ============================================================
      // STEP 6 — Calculate New System MRR + active count
      // For each active subscription, derive monthly value:
      //   - If period > 300 days → annual plan, divide price by 12
      //   - Else → monthly plan, use price as-is
      //   - Fallback to PLAN_PRICES_MONTHLY if subscription_price_cents is null
      // ============================================================
      let newSystemMRR = 0;
      let totalSubscribers = 0;
      for (const p of newSystemProfiles as any[]) {
        const periodEnd = p.subscription_current_period_end;
        if (periodEnd && new Date(periodEnd) < now) continue; // expired
        let monthlyValue = PLAN_PRICES_MONTHLY[p.plan] || 0;
        if (p.subscription_price_cents) {
          const priceReais = p.subscription_price_cents / 100;
          if (periodEnd) {
            const created = new Date(p.created_at);
            const end = new Date(periodEnd);
            const daysSpan = (end.getTime() - created.getTime()) / 86400000;
            monthlyValue = daysSpan > 300 ? priceReais / 12 : priceReais;
          }
        }
        newSystemMRR += monthlyValue;
        totalSubscribers++;
      }

      // Final MRR shown on screen = Stripe revenue + New System revenue
      const totalMRR = stripeMRR + newSystemMRR;
      const averageTicket = totalSubscribers > 0 ? newSystemMRR / totalSubscribers : 0;

      // ============================================================
      // STEP 7 — Build month keys for last 6 months: ["2025-06", ...]
      // ============================================================
      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }

      // ============================================================
      // STEP 8 — Aggregate new clients & revenue per month
      // ============================================================
      const monthlyNewClients: Record<string, number> = {};
      const monthlyNewRevenue: Record<string, number> = {};
      for (const p of newSystemProfiles as any[]) {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthKeys.includes(key)) continue;
        monthlyNewClients[key] = (monthlyNewClients[key] || 0) + 1;
        monthlyNewRevenue[key] = (monthlyNewRevenue[key] || 0) + (PLAN_PRICES_MONTHLY[p.plan] || 0);
      }

      // PIX renewal revenue per month
      const monthlyPixRevenue: Record<string, number> = {};
      for (const inv of (pixPaid || []) as any[]) {
        if (!inv.paid_at) continue;
        const d = new Date(inv.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthKeys.includes(key)) continue;
        monthlyPixRevenue[key] = (monthlyPixRevenue[key] || 0) + ((inv.amount_cents || 0) / 100);
      }

      // Cancellations per month
      const monthlyCancellations: Record<string, number> = {};
      for (const c of newSystemCancellations as any[]) {
        if (!c.cancelled_at) continue;
        const d = new Date(c.cancelled_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthKeys.includes(key)) continue;
        monthlyCancellations[key] = (monthlyCancellations[key] || 0) + 1;
      }

      // ============================================================
      // STEP 9 — Reconstruct historical MRR per month
      // We don't have MRR snapshots, so we walk BACKWARDS from today's
      // total: each month, subtract net new clients to get past active count.
      // ============================================================
      const monthlyMRR: { month: string; mrr: number; activeCount: number }[] = [];
      const monthlySales: { month: string; newSales: number; salesValue: number; cancellations: number }[] = [];

      const reversed = [...monthKeys].reverse();
      const activeHistory: Record<string, number> = {};
      let backClients = totalSubscribers;
      for (const key of reversed) {
        activeHistory[key] = backClients;
        backClients = backClients - (monthlyNewClients[key] || 0) + (monthlyCancellations[key] || 0);
      }

      for (const key of monthKeys) {
        const active = activeHistory[key] || 0;
        const mrrEstimate = active * averageTicket;
        monthlyMRR.push({ month: key, mrr: mrrEstimate, activeCount: active });
        monthlySales.push({
          month: key,
          newSales: monthlyNewClients[key] || 0,
          salesValue: (monthlyNewRevenue[key] || 0) + (monthlyPixRevenue[key] || 0),
          cancellations: monthlyCancellations[key] || 0,
        });
      }

      // ============================================================
      // STEP 10 — Compute baseline metrics (last 3 months)
      // ============================================================
      const recentSales = monthlySales.slice(-3);
      const recentMRR = monthlyMRR.slice(-3);

      // -- Churn rate: cancellations / active (avg of last 3 months) --
      // If we don't have at least MIN_CANCELLATIONS_FOR_REAL_CHURN data
      // points, fall back to DEFAULT_REALISTIC_CHURN (6%).
      let totalChurnPct = 0;
      let churnMonths = 0;
      let totalCancellations = 0;
      for (let i = 0; i < recentSales.length; i++) {
        const active = recentMRR[i]?.activeCount || 0;
        totalCancellations += recentSales[i].cancellations || 0;
        if (active > 0) {
          totalChurnPct += (recentSales[i].cancellations || 0) / active;
          churnMonths++;
        }
      }

      let realChurnRate: number;
      let usingDefaultChurn: boolean;
      if (totalCancellations >= MIN_CANCELLATIONS_FOR_REAL_CHURN && churnMonths > 0) {
        realChurnRate = Math.min(Math.max(totalChurnPct / churnMonths, 0.01), 0.15);
        usingDefaultChurn = false;
      } else {
        realChurnRate = DEFAULT_REALISTIC_CHURN;
        usingDefaultChurn = true;
      }

      // -- Weighted avg new clients/MRR (last month counts 2x) --
      let wSumClients = 0, wSumValue = 0, wTotal = 0;
      recentSales.forEach((s, i) => {
        const w = i === recentSales.length - 1 ? 2 : 1;
        wSumClients += (s.newSales || 0) * w;
        wSumValue += (s.salesValue || 0) * w;
        wTotal += w;
      });
      const avgNewClients = wTotal > 0 ? wSumClients / wTotal : 0;
      const avgNewMRR = wTotal > 0 ? wSumValue / wTotal : 0;

      // -- Expansion MRR: portion of monthly MRR delta NOT explained by
      //    new sales or churn (i.e. upgrades & extra seats). --
      let totalExpansion = 0;
      let expMonths = 0;
      for (let i = 1; i < monthlyMRR.length; i++) {
        const prev = monthlyMRR[i - 1].mrr;
        const cur = monthlyMRR[i].mrr;
        const newRev = monthlySales[i].salesValue;
        const churnLoss = (monthlySales[i].cancellations || 0) * averageTicket;
        const exp = (cur - prev) - newRev + churnLoss;
        if (exp > 0) totalExpansion += exp;
        expMonths++;
      }
      const avgExpansionMRR = expMonths > 0 ? totalExpansion / expMonths : 0;

      const avgCancellations = recentSales.length > 0
        ? recentSales.reduce((s, x) => s + (x.cancellations || 0), 0) / recentSales.length
        : 0;

      setData({
        loading: false,
        totalMRR,
        totalSubscribers,
        averageTicket,
        monthlyMRR,
        monthlySales,
        realChurnRate,
        avgNewMRR,
        avgNewClients,
        avgExpansionMRR,
        avgCancellations,
        usingDefaultChurn,
        stripeMRR,
        newSystemMRR,
        lastRefresh: new Date(),
      });
  };

  // Run once on mount + every AUTO_REFRESH_MS thereafter
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return data;
}
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ============================================================
 * Wiize · Forecast de Receita — Data-Driven CFO Model
 * 
 * ALL metrics derived from real data:
 *   - Churn %  = avg(cancellations / active) last 3 months
 *   - New MRR  = weighted avg of monthly new sales revenue
 *   - Expansion = calculated from upgrade patterns
 *   - Growth   = Net New / MRR
 *
 * Scenarios apply multipliers to REAL historical averages:
 *   Pessimista:  churn ×1.4, vendas ×0.65, expansão ×0.3
 *   Realista:    churn ×1.0, vendas ×1.0,  expansão ×1.0
 *   Otimista:    churn ×0.75, vendas ×1.3, expansão ×1.4
 * ============================================================ */

// ============================================================
// SCENARIO MODEL — easy to tweak per scenario
// ============================================================
//
// SCENARIO_MULT: applied to historical averages each month.
//   - churn:     multiplier on baseline churn rate
//                  → Pess 6% × 1.5 = 9% | Real 6% | Otim 6% × 0.667 ≈ 4%
//   - sales:     multiplier on avgNewMRR (new sales per month)
//   - expansion: multiplier on avgExpansionMRR (upgrades / extra seats)
//
const SCENARIO_MULT = {
  pessimistic: { churn: 1.5,   sales: 0.65, expansion: 0.3 },
  realistic:   { churn: 1.0,   sales: 1.0,  expansion: 1.0 },
  optimistic:  { churn: 0.667, sales: 1.3,  expansion: 1.4 },
};

// SALES_RAMP: month-by-month behavioral curve over 12 months.
//   - Pess: contracts in months 1-3, slow recovery after
//   - Real: gentle compound growth (+2-4% / month)
//   - Otim: accelerated ramp, decelerating at the end
const SALES_RAMP = {
  pessimistic: [0.60, 0.50, 0.45, 0.50, 0.58, 0.65, 0.72, 0.78, 0.84, 0.90, 0.95, 1.00],
  realistic:   [1.00, 1.02, 1.05, 1.08, 1.11, 1.15, 1.19, 1.23, 1.27, 1.31, 1.36, 1.40],
  optimistic:  [1.05, 1.12, 1.20, 1.30, 1.40, 1.50, 1.58, 1.65, 1.70, 1.74, 1.77, 1.80],
};

// CHURN_RAMP: spike pattern for churn over 12 months.
//   - Pess: peaks in month 2-3 (operational deterioration)
//   - Real: flat (uses base churn)
//   - Otim: continuous improvement
const CHURN_RAMP = {
  pessimistic: [1.20, 1.30, 1.25, 1.15, 1.08, 1.03, 1.00, 0.98, 0.96, 0.95, 0.94, 0.93],
  realistic:   [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
  optimistic:  [0.95, 0.92, 0.89, 0.86, 0.84, 0.82, 0.80, 0.78, 0.77, 0.76, 0.75, 0.74],
};

const COLORS = {
  realistic: "#3b82f6",
  optimistic: "#10b981",
  pessimistic: "#ef4444",
  historical: "#94a3b8",
};

function fmt(n: number) {
  if (!isFinite(n) || isNaN(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtMonth(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

interface ProjMonth {
  month: string;
  label: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
  newMRR: number;
  expansionMRR: number;
  churnMRR: number;
  netNewMRR: number;
  growthRate: number;
}

export default function AdminForecast() {
  const m = useNewSystemMetrics();
  const {
    loading, totalMRR, totalSubscribers, averageTicket,
    monthlyMRR, monthlySales,
    realChurnRate, avgNewMRR, avgNewClients, avgExpansionMRR, avgCancellations,
  } = m;

  const forecast = useMemo(() => {
    if (totalMRR <= 0 && monthlyMRR.length === 0) return null;

    const currentMRR = totalMRR;
    const currentClients = Math.max(totalSubscribers, 1);

    // All metrics already calculated from REAL data in useNewSystemMetrics
    const churnMRRCurrent = currentMRR * realChurnRate;
    const netNewMRR = avgNewMRR + avgExpansionMRR - churnMRRCurrent;
    const growthRate = currentMRR > 0 ? netNewMRR / currentMRR : 0;


    // ===================================================================
    // BUILD 12-MONTH COMPOUND PROJECTIONS
    // ===================================================================
    const buildProjection = (
      scenarioKey: "pessimistic" | "realistic" | "optimistic",
    ) => {
      const mult = SCENARIO_MULT[scenarioKey];
      const salesRamp = SALES_RAMP[scenarioKey];
      const churnRamp = CHURN_RAMP[scenarioKey];

      const months: { mrr: number; newM: number; expM: number; churnM: number; clients: number }[] = [];
      let mrr = currentMRR;
      let clients = currentClients;

      for (let i = 0; i < 12; i++) {
        const effectiveChurn = Math.min(realChurnRate * mult.churn * churnRamp[i], 0.15);
        const churnLoss = mrr * effectiveChurn;
        const newM = avgNewMRR * mult.sales * salesRamp[i];
        // Expansion scales with client base
        const expM = (avgExpansionMRR / currentClients) * clients * mult.expansion;
        
        const nextMRR = Math.max(currentMRR * 0.35, mrr + newM + expM - churnLoss);
        
        // Update client count
        const lostClients = clients * effectiveChurn;
        const newClients = avgNewClients * mult.sales * salesRamp[i];
        clients = Math.max(1, clients - lostClients + newClients);
        mrr = nextMRR;
        
        months.push({
          mrr: Math.round(mrr),
          newM: Math.round(newM),
          expM: Math.round(expM),
          churnM: Math.round(churnLoss),
          clients: Math.round(clients),
        });
      }
      return months;
    };

    const pessSeries = buildProjection("pessimistic");
    const realSeries = buildProjection("realistic");
    const optSeries = buildProjection("optimistic");

    // Build projection rows
    const now = new Date();
    const projection: ProjMonth[] = [];
    let prevMRR = currentMRR;
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const r = realSeries[i];
      const net = r.newM + r.expM - r.churnM;
      projection.push({
        month: monthKey,
        label: fmtMonth(monthKey),
        pessimistic: pessSeries[i].mrr,
        realistic: realSeries[i].mrr,
        optimistic: optSeries[i].mrr,
        newMRR: r.newM,
        expansionMRR: r.expM,
        churnMRR: r.churnM,
        netNewMRR: Math.round(net),
        growthRate: prevMRR > 0 ? net / prevMRR : 0,
      });
      prevMRR = realSeries[i].mrr;
    }

    // 30-day cards
    const next30 = {
      pessimistic: pessSeries[0].mrr,
      realistic: realSeries[0].mrr,
      optimistic: optSeries[0].mrr,
    };
    const breakdown = {
      pessimistic: { churnRate: realChurnRate * SCENARIO_MULT.pessimistic.churn, churnMRR: pessSeries[0].churnM, newMRR: pessSeries[0].newM, expansionMRR: pessSeries[0].expM },
      realistic:   { churnRate: realChurnRate, churnMRR: realSeries[0].churnM, newMRR: realSeries[0].newM, expansionMRR: realSeries[0].expM },
      optimistic:  { churnRate: realChurnRate * SCENARIO_MULT.optimistic.churn, churnMRR: optSeries[0].churnM, newMRR: optSeries[0].newM, expansionMRR: optSeries[0].expM },
    };

    // Historical chart data
    const historical = monthlyMRR.map((m) => ({
      month: m.month,
      label: fmtMonth(m.month),
      mrr: Math.round(m.mrr),
    }));

    // SaaS health
    const ltv = realChurnRate > 0 ? averageTicket / realChurnRate : averageTicket * 12;
    const estCAC = averageTicket * 1.2;
    const cacPayback = averageTicket > 0 ? estCAC / averageTicket : 0;
    const retention = (1 - realChurnRate) * 100;

    return {
      projection,
      historical,
      next30,
      breakdown,
      drivers: {
        realChurnRate,
        avgNewMRR: Math.round(avgNewMRR),
        avgExpansionMRR: Math.round(avgExpansionMRR),
        avgNewClients: Math.round(avgNewClients),
        avgCancellations: Math.round(avgCancellations),
      },
      metrics: {
        churnMRR: Math.round(churnMRRCurrent),
        newMRR: Math.round(avgNewMRR),
        expansionMRR: Math.round(avgExpansionMRR),
        netNewMRR: Math.round(netNewMRR),
        growthRate,
        ltv: Math.round(ltv),
        cacPayback: cacPayback.toFixed(1),
        retention,
      },
    };
  }, [totalMRR, totalSubscribers, averageTicket, monthlyMRR, monthlySales, realChurnRate, avgNewMRR, avgNewClients, avgExpansionMRR, avgCancellations]);

  // Combined chart data
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const hist = forecast.historical.map((h) => ({
      ...h,
      pessimistic: undefined as number | undefined,
      realistic: undefined as number | undefined,
      optimistic: undefined as number | undefined,
    }));
    const last = forecast.historical[forecast.historical.length - 1];
    if (last && hist.length) {
      hist[hist.length - 1] = {
        ...hist[hist.length - 1],
        pessimistic: last.mrr,
        realistic: last.mrr,
        optimistic: last.mrr,
      };
    }
    const proj = forecast.projection.map((p) => ({
      month: p.month,
      label: p.label,
      mrr: undefined as number | undefined,
      pessimistic: p.pessimistic,
      realistic: p.realistic,
      optimistic: p.optimistic,
    }));
    return [...hist, ...proj];
  }, [forecast]);

  // KPIs
  const kpis = useMemo(() => {
    const m = forecast?.metrics;
    const d = forecast?.drivers;
    return [
      { label: "MRR Atual", value: `R$ ${fmt(totalMRR)}`, sub: "Receita recorrente mensal", icon: DollarSign, accent: "text-primary", tooltip: "Soma de todas as assinaturas ativas" },
      { label: "Clientes Ativos", value: totalSubscribers.toLocaleString("pt-BR"), sub: "Assinaturas pagantes", icon: Users, accent: "text-blue-500", tooltip: "Total de assinantes com plano ativo" },
      { label: "Ticket Médio", value: `R$ ${fmt(averageTicket)}`, sub: "MRR / clientes", icon: Target, accent: "text-emerald-500", tooltip: "MRR total ÷ número de clientes" },
      { label: "Net New MRR", value: m ? `${m.netNewMRR >= 0 ? "+" : ""}R$ ${fmt(m.netNewMRR)}` : "—", sub: "New + Exp − Churn", icon: m && m.netNewMRR >= 0 ? ArrowUpRight : ArrowDownRight, accent: (m?.netNewMRR ?? 0) >= 0 ? "text-emerald-500" : "text-red-500", tooltip: `Baseado na média: +R$${fmt(m?.newMRR ?? 0)} new, +R$${fmt(m?.expansionMRR ?? 0)} exp, −R$${fmt(m?.churnMRR ?? 0)} churn` },
      { label: "Churn Rate", value: d ? `${(d.realChurnRate * 100).toFixed(1)}%` : "—", sub: `~${d?.avgCancellations ?? 0} cancel/mês`, icon: AlertTriangle, accent: "text-amber-500", tooltip: "Calculado: cancelamentos ÷ clientes ativos (média 3 meses)" },
      { label: "Growth Rate", value: m ? `${(m.growthRate * 100).toFixed(1)}%` : "—", sub: "Crescimento líquido/mês", icon: BarChart3, accent: (m?.growthRate ?? 0) >= 0 ? "text-emerald-500" : "text-red-500", tooltip: "Net New MRR ÷ MRR atual" },
    ];
  }, [totalMRR, totalSubscribers, averageTicket, forecast]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[440px] rounded-2xl" />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
        <Card className="border-border/30 rounded-2xl">
          <CardContent className="p-12 text-center text-muted-foreground">
            Sem dados suficientes para gerar o forecast. Aguarde assinaturas ativas.
          </CardContent>
        </Card>
      </div>
    );
  }

  const realDelta = forecast.next30.realistic - totalMRR;
  const optDelta = forecast.next30.optimistic - totalMRR;
  const pessDelta = forecast.next30.pessimistic - totalMRR;

  // Drivers acumulado 12m (realista)
  const accNew = forecast.projection.reduce((s, p) => s + p.newMRR, 0);
  const accExp = forecast.projection.reduce((s, p) => s + p.expansionMRR, 0);
  const accChurn = forecast.projection.reduce((s, p) => s + p.churnMRR, 0);
  const accNet = accNew + accExp - accChurn;
  const driverMax = Math.max(accNew, accExp, accChurn, Math.abs(accNet)) || 1;

  return (
    <div className="p-6 lg:p-8 space-y-7 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Forecast de Receita</h1>
              <ForecastHelpDialog
                avgNewMRR={forecast.drivers.avgNewMRR}
                avgExpansionMRR={forecast.drivers.avgExpansionMRR}
                churnRate={forecast.drivers.realChurnRate}
                currentMRR={totalMRR}
                usingDefaultChurn={m.usingDefaultChurn}
              />
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Projeção automática baseada em métricas reais · MRR(n) = MRR(n-1) + New + Expansion − Churn
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/30">
            <RefreshCw size={10} className="text-muted-foreground/60" />
            <span className="text-[9px] font-medium text-muted-foreground/70">
              Atualizado {m.lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · auto 5min
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Activity size={12} className="text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Data-Driven</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <UITooltip key={kpi.label}>
              <TooltipTrigger asChild>
                <Card className="border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl bg-muted/50 group-hover:bg-muted/70 transition-colors`}>
                        <kpi.icon size={14} className={kpi.accent} />
                      </div>
                      <Info size={10} className="text-muted-foreground/30" />
                    </div>
                    <p className="text-xl font-bold text-foreground tracking-tight leading-none">{kpi.value}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 mt-1.5 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs p-3">
                {kpi.tooltip}
              </TooltipContent>
            </UITooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Data Sources Badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/20">
        <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          <span className="font-semibold text-muted-foreground">Receita:</span>{" "}
          Stripe R$ {fmt(m.stripeMRR)} + Novo Sistema R$ {fmt(m.newSystemMRR)} ·{" "}
          <span className="font-semibold text-muted-foreground">Churn:</span>{" "}
          {m.usingDefaultChurn
            ? `${(forecast.drivers.realChurnRate * 100).toFixed(1)}% (baseline · dados insuficientes)`
            : `${(forecast.drivers.realChurnRate * 100).toFixed(1)}% (real · novo sistema)`} ·{" "}
          New MRR R$ {fmt(forecast.drivers.avgNewMRR)}/mês ·{" "}
          ~{forecast.drivers.avgNewClients} novos/mês
        </p>
      </div>

      {/* Scenario Cards (30 dias) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            Projeção · Próximos 30 Dias
          </h2>
          <span className="text-[10px] text-muted-foreground/50 font-mono">MRR base: R$ {fmt(totalMRR)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScenarioCard
            label="Pessimista"
            subtitle={`Churn ×1.4 · Vendas ×0.65`}
            value={forecast.next30.pessimistic}
            delta={pessDelta}
            churn={forecast.breakdown.pessimistic.churnRate * 100}
            newMRR={forecast.breakdown.pessimistic.newMRR}
            expansion={forecast.breakdown.pessimistic.expansionMRR}
            churnMRR={forecast.breakdown.pessimistic.churnMRR}
            color="red"
          />
          <ScenarioCard
            label="Realista"
            subtitle="Baseado na média histórica"
            value={forecast.next30.realistic}
            delta={realDelta}
            churn={forecast.breakdown.realistic.churnRate * 100}
            newMRR={forecast.breakdown.realistic.newMRR}
            expansion={forecast.breakdown.realistic.expansionMRR}
            churnMRR={forecast.breakdown.realistic.churnMRR}
            color="blue"
            highlighted
          />
          <ScenarioCard
            label="Otimista"
            subtitle={`Churn ×0.75 · Vendas ×1.3`}
            value={forecast.next30.optimistic}
            delta={optDelta}
            churn={forecast.breakdown.optimistic.churnRate * 100}
            newMRR={forecast.breakdown.optimistic.newMRR}
            expansion={forecast.breakdown.optimistic.expansionMRR}
            churnMRR={forecast.breakdown.optimistic.churnMRR}
            color="green"
          />
        </div>
      </div>

      {/* Chart 12 meses */}
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Projeção MRR · 12 Meses
              </CardTitle>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Crescimento composto mês a mês · Cada mês usa o resultado do anterior
              </p>
            </div>
            <div className="flex items-center gap-4">
              {[
                { label: "Pessimista", value: forecast.projection[11]?.pessimistic ?? 0, color: "text-red-500" },
                { label: "Realista", value: forecast.projection[11]?.realistic ?? 0, color: "text-blue-500" },
                { label: "Otimista", value: forecast.projection[11]?.optimistic ?? 0, color: "text-emerald-500" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  {i > 0 && <div className="w-px h-8 bg-border/30" />}
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-medium">{s.label} 12m</p>
                    <p className={`text-sm font-bold ${s.color}`}>R$ {fmt(s.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.historical} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.historical} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.realistic} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.realistic} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.optimistic} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.optimistic} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.pessimistic} stopOpacity={0.08} />
                    <stop offset="95%" stopColor={COLORS.pessimistic} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${fmt(v)}`} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "11px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    padding: "10px 14px",
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      mrr: "Histórico",
                      realistic: "Realista",
                      optimistic: "Otimista",
                      pessimistic: "Pessimista",
                    };
                    return value != null ? [`R$ ${fmt(value)}`, labels[name] || name] : [null, null];
                  }}
                />
                <Area type="monotone" dataKey="mrr" stroke={COLORS.historical} strokeWidth={2.5} fill="url(#gHist)" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="pessimistic" stroke={COLORS.pessimistic} strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gPess)" dot={false} connectNulls />
                <Area type="monotone" dataKey="optimistic" stroke={COLORS.optimistic} strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gOpt)" dot={false} connectNulls />
                <Area type="monotone" dataKey="realistic" stroke={COLORS.realistic} strokeWidth={2.5} fill="url(#gReal)" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
            <LegendDot color={COLORS.historical} label="Histórico" solid />
            <LegendDot color={COLORS.pessimistic} label="Pessimista" />
            <LegendDot color={COLORS.realistic} label="Realista" solid />
            <LegendDot color={COLORS.optimistic} label="Otimista" />
          </div>
        </CardContent>
      </Card>

      {/* Drivers + Saúde SaaS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Drivers do Crescimento
            </CardTitle>
            <p className="text-[10px] text-muted-foreground/60">
              Acumulado 12 meses · Cenário realista · Baseado em dados reais
            </p>
          </CardHeader>
          <CardContent className="pb-5 space-y-4">
            <DriverBar label="Novas Vendas" value={accNew} max={driverMax} color="emerald" sign="+" />
            <DriverBar label="Expansão / Upsell" value={accExp} max={driverMax} color="blue" sign="+" />
            <DriverBar label="Churn (perda)" value={accChurn} max={driverMax} color="red" sign="−" />
            <div className="pt-3 border-t border-border/20">
              <DriverBar label="Net Growth" value={Math.abs(accNet)} max={driverMax} color={accNet >= 0 ? "primary" : "red"} sign={accNet >= 0 ? "=" : "=−"} bold />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />
              Saúde SaaS
            </CardTitle>
            <p className="text-[10px] text-muted-foreground/60">Unit economics calculados</p>
          </CardHeader>
          <CardContent className="pb-5 space-y-2">
            <HealthRow icon={Repeat} label="Retenção mensal" value={`${forecast.metrics.retention.toFixed(1)}%`} accent="text-emerald-500" />
            <HealthRow icon={Activity} label="LTV estimado" value={`R$ ${fmt(forecast.metrics.ltv)}`} accent="text-blue-500" />
            <HealthRow icon={Zap} label="CAC payback" value={`${forecast.metrics.cacPayback} meses`} accent="text-violet-500" />
            <HealthRow icon={DollarSign} label="Receita / cliente" value={`R$ ${fmt(averageTicket)}`} accent="text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Mensal */}
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Breakdown Mensal · Cenário Realista
          </CardTitle>
          <p className="text-[10px] text-muted-foreground/60">Decomposição mês a mês com crescimento composto real</p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-3 text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Mês</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-emerald-500/80 uppercase tracking-wider">+ New</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-blue-500/80 uppercase tracking-wider">+ Expansion</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-red-500/80 uppercase tracking-wider">− Churn</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Net New</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Growth</th>
                  <th className="text-right py-3 px-3 text-[9px] font-semibold text-foreground/80 uppercase tracking-wider">MRR Final</th>
                </tr>
              </thead>
              <tbody>
                {forecast.projection.map((row, i) => (
                  <tr key={row.month} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/15" : ""} hover:bg-muted/25 transition-colors`}>
                    <td className="py-2.5 px-3 font-medium text-foreground/90">{row.label}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-500 font-medium">+R$ {fmt(row.newMRR)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-500 font-medium">+R$ {fmt(row.expansionMRR)}</td>
                    <td className="py-2.5 px-3 text-right text-red-500 font-medium">−R$ {fmt(row.churnMRR)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold ${row.netNewMRR >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {row.netNewMRR >= 0 ? "+" : ""}R$ {fmt(row.netNewMRR)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${row.growthRate >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {(row.growthRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">R$ {fmt(row.realistic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Premissas */}
      <Card className="border-border/20 bg-muted/15 rounded-2xl">
        <CardContent className="p-4">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            <strong className="text-muted-foreground/80">Modelo data-driven:</strong>{" "}
            Churn calculado da média de cancelamentos/clientes ativos (últimos 3 meses) ·
            New MRR = média ponderada de novas vendas ·
            Expansão = diferença entre crescimento real vs new sales ·
            Pessimista: churn ×1.4, vendas ×0.65, expansão ×0.3 ·
            Otimista: churn ×0.75, vendas ×1.3, expansão ×1.4 ·
            Projeção composta: MRR(n) = MRR(n-1) + New + Expansion − Churn ·
            Floor pessimista: 35% do MRR atual (nunca zera).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function ScenarioCard({
  label, subtitle, value, delta, churn, newMRR, expansion, churnMRR, color, highlighted,
}: {
  label: string; subtitle: string; value: number; delta: number;
  churn: number; newMRR: number; expansion: number; churnMRR: number;
  color: "red" | "blue" | "green"; highlighted?: boolean;
}) {
  const palette = {
    red: { text: "text-red-500", bg: "bg-red-500/8", ring: highlighted ? "ring-2 ring-red-500/30" : "", bar: "bg-red-500", badge: "bg-red-500" },
    blue: { text: "text-blue-500", bg: "bg-blue-500/8", ring: highlighted ? "ring-2 ring-blue-500/40" : "", bar: "bg-blue-500", badge: "bg-blue-500" },
    green: { text: "text-emerald-500", bg: "bg-emerald-500/8", ring: highlighted ? "ring-2 ring-emerald-500/30" : "", bar: "bg-emerald-500", badge: "bg-emerald-500" },
  }[color];
  
  const Icon = color === "red" ? TrendingDown : color === "green" ? TrendingUp : Target;
  const baseValue = value - delta;
  const deltaPct = baseValue > 0 ? ((delta / baseValue) * 100).toFixed(1) : "0";
  const isPositive = delta >= 0;

  return (
    <Card className={`relative overflow-hidden border border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl ${palette.ring} ${highlighted ? "shadow-lg shadow-blue-500/5" : "shadow-sm"} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${palette.bar} rounded-l-2xl`} />
      
      {highlighted && (
        <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full ${palette.badge} text-white text-[8px] font-bold uppercase tracking-wider shadow-sm`}>
          <Sparkles size={8} />
          Recomendado
        </div>
      )}

      <CardContent className="relative p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${palette.bg}`}>
            <Icon size={16} className={palette.text} strokeWidth={2.5} />
          </div>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${palette.text}`}>{label}</p>
            <p className="text-[9px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div>
          <p className="text-[28px] font-extrabold text-foreground tracking-tight leading-none">
            R$ {fmt(value)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${palette.bg}`}>
              {isPositive ? <ArrowUpRight size={10} className={palette.text} /> : <ArrowDownRight size={10} className={palette.text} />}
              <span className={`text-[10px] font-bold ${palette.text}`}>
                {isPositive ? "+" : ""}R$ {fmt(delta)}
              </span>
            </div>
            <span className={`text-[10px] font-semibold ${palette.text}`}>
              ({isPositive ? "+" : ""}{deltaPct}%)
            </span>
          </div>
        </div>

        {/* Info button — opens popover with full breakdown */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 pt-3 mt-1 border-t border-border/20 group/info hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-1.5">
                <Info size={11} className="text-muted-foreground/60 group-hover/info:text-foreground transition-colors" />
                <span className="text-[10px] font-medium text-muted-foreground/70 group-hover/info:text-foreground transition-colors">
                  Ver decomposição (Churn · New · Expansão · Net)
                </span>
              </div>
              <ArrowUpRight size={10} className="text-muted-foreground/40 group-hover/info:text-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            className="w-72 p-4 rounded-xl border-border/40 bg-popover/95 backdrop-blur-xl shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${palette.text}`}>{label}</p>
                <span className="text-[9px] text-muted-foreground/50">Próximos 30 dias</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <BreakdownItem
                  label="Churn"
                  primary={`${churn.toFixed(1)}%`}
                  secondary={`−R$ ${fmt(churnMRR)}`}
                  tone="red"
                />
                <BreakdownItem
                  label="New MRR"
                  primary={`+R$ ${fmt(newMRR)}`}
                  secondary="Novas vendas"
                  tone="emerald"
                />
                <BreakdownItem
                  label="Expansão"
                  primary={`+R$ ${fmt(expansion)}`}
                  secondary="Upgrades"
                  tone="blue"
                />
                <BreakdownItem
                  label="Net"
                  primary={`${delta >= 0 ? "+" : ""}R$ ${fmt(delta)}`}
                  secondary="Saldo final"
                  tone={delta >= 0 ? "emerald" : "red"}
                  highlight
                />
              </div>

              <div className="pt-2 border-t border-border/20 text-[9px] text-muted-foreground/60 leading-relaxed">
                <strong className="text-muted-foreground/80">Cálculo:</strong>{" "}
                Net = New + Expansão − Churn = {fmt(newMRR)} + {fmt(expansion)} − {fmt(churnMRR)} = <strong className={delta >= 0 ? "text-emerald-500" : "text-red-500"}>R$ {fmt(delta)}</strong>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[8px] font-medium text-muted-foreground/50 uppercase tracking-wider">{label}</p>
      <p className={`text-[11px] font-bold mt-0.5 ${highlight ? "text-emerald-500" : "text-foreground/80"}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground/40">{sub}</p>}
    </div>
  );
}

function DriverBar({
  label, value, max, color, sign, bold,
}: {
  label: string; value: number; max: number;
  color: "emerald" | "blue" | "red" | "primary";
  sign: string; bold?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const bg = { emerald: "bg-emerald-500", blue: "bg-blue-500", red: "bg-red-500", primary: "bg-primary" }[color];
  const text = { emerald: "text-emerald-500", blue: "text-blue-500", red: "text-red-500", primary: "text-primary" }[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-xs ${bold ? "font-bold text-foreground" : "font-medium text-muted-foreground/80"}`}>{label}</p>
        <p className={`text-sm font-bold ${text}`}>{sign} R$ {fmt(value)}</p>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function HealthRow({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/15 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-muted/40">
          <Icon size={13} className={accent} />
        </div>
        <p className="text-xs text-muted-foreground/80">{label}</p>
      </div>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function LegendDot({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-[3px] rounded-full"
        style={{
          backgroundColor: color,
          backgroundImage: solid ? undefined : `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 7px)`,
        }}
      />
      <span className="text-[10px] font-medium text-muted-foreground/70">{label}</span>
    </div>
  );
}
