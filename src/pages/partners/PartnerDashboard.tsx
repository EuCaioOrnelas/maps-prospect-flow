import { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, Wallet, Clock, TrendingUp, MousePointerClick, Repeat, Target, Sparkles, BadgeCheck, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fmtBRL, fmtPct } from "@/lib/partnerFormat";
import { StatCard } from "@/components/partners/StatCard";
import { PageHeader } from "@/components/partners/PageHeader";
import { ReferralLinksCard } from "@/components/partners/ReferralLinksCard";
import { MRRChart } from "@/components/partners/MRRChart";
import { PlanDistributionChart } from "@/components/partners/PlanDistributionChart";

export default function PartnerDashboard() {
  const { partner } = useOutletContext<any>();
  const [stats, setStats] = useState<any>(null);
  const [mrrCents, setMrrCents] = useState<number>(0);
  const [mrrSeries, setMrrSeries] = useState<Array<{ month: string; mrr_cents: number }>>([]);
  const [planDist, setPlanDist] = useState<Array<{ plan: string; count: number }>>([]);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const [balRes, leadsRes, partnerData, mrrRes, salesRes] = await Promise.all([
        supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
        supabase.from("partner_leads").select("id, is_trial, is_paid, is_cancelled, current_plan, attributed_at").eq("partner_id", partner.id),
        supabase.from("partners").select("total_clicks, total_leads, total_paid_clients, lifetime_revenue_cents").eq("id", partner.id).maybeSingle(),
        supabase.rpc("compute_partner_mrr", { p_partner_id: partner.id }),
        supabase.from("partner_sales").select("plan, amount_cents, paid_at, is_recurring, refunded_at, chargeback_at").eq("partner_id", partner.id).order("paid_at", { ascending: true }),
      ]);

      const leads = leadsRes.data || [];
      const sales = salesRes.data || [];

      // Plan distribution among active paid clients
      const planMap = new Map<string, number>();
      leads.filter((l: any) => l.is_paid && !l.is_cancelled).forEach((l: any) => {
        const k = (l.current_plan || "—").toLowerCase();
        planMap.set(k, (planMap.get(k) || 0) + 1);
      });
      setPlanDist(Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count })));

      // MRR series last 6 months
      const now = new Date();
      const series: Array<{ month: string; mrr_cents: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        // estimate: MRR = sum of recurring sales whose first paid_at <= end of month and not refunded/charged back before that
        const monthly = sales
          .filter((s: any) => s.is_recurring && new Date(s.paid_at) < next && !(s.refunded_at && new Date(s.refunded_at) < next) && !(s.chargeback_at && new Date(s.chargeback_at) < next))
          .reduce((acc: number, s: any) => acc + (s.amount_cents || 0), 0);
        series.push({ month: label, mrr_cents: monthly });
      }
      setMrrSeries(series);

      const totalLeads = leads.length;
      const trials = leads.filter((l: any) => l.is_trial && !l.is_paid).length;
      const paid = leads.filter((l: any) => l.is_paid).length;
      const cancelled = leads.filter((l: any) => l.is_cancelled).length;
      const conv = totalLeads > 0 ? (paid / totalLeads) * 100 : 0;

      setStats({
        ...(balRes.data as any || {}),
        total_leads: totalLeads,
        trials,
        paid,
        cancelled,
        conversion_rate: conv,
        ...(partnerData.data || {}),
      });
      setMrrCents(Number(mrrRes.data || 0));
    })();
  }, [partner?.id]);

  const headlineCards = useMemo(() => stats ? [
    { label: "MRR atribuído", value: fmtBRL(mrrCents), icon: Repeat, accent: "primary" as const, hint: "Mensalidades ativas", highlight: true, empty: !mrrCents },
    { label: "Disponível p/ saque", value: fmtBRL(stats.available_cents), icon: Wallet, accent: "emerald" as const, hint: "Pronto para resgate", highlight: true, empty: !stats.available_cents },
    { label: "Comissão pendente", value: fmtBRL(stats.pending_cents), icon: Clock, accent: "amber" as const, hint: "Liberação programada", highlight: true, empty: !stats.pending_cents },
    { label: "Receita gerada (LTV)", value: fmtBRL(stats.lifetime_revenue_cents || 0), icon: DollarSign, accent: "violet" as const, hint: "Total histórico", highlight: true, empty: !stats.lifetime_revenue_cents },
  ] : [], [stats, mrrCents]);

  const funnelCards = useMemo(() => stats ? [
    { label: "Cliques rastreados", value: stats.total_clicks ?? 0, icon: MousePointerClick, accent: "blue" as const, empty: !(stats.total_clicks ?? 0) },
    { label: "Leads totais", value: stats.total_leads, icon: Users, accent: "primary" as const, empty: !stats.total_leads },
    { label: "Em trial", value: stats.trials, icon: Target, accent: "amber" as const, empty: !stats.trials },
    { label: "Clientes pagos", value: stats.paid, icon: TrendingUp, accent: "emerald" as const, empty: !stats.paid },
    { label: "Taxa de conversão", value: fmtPct(stats.conversion_rate), icon: TrendingUp, accent: "violet" as const, hint: "Lead → cliente pago", empty: !stats.total_leads },
    { label: "Cancelados", value: stats.cancelled, icon: Clock, accent: "rose" as const, empty: !stats.cancelled },
  ] : [], [stats]);

  if (!stats) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="h-9 w-48 bg-muted/40 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight">
            Olá, {partner.full_name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cockpit de indicações — receita recorrente, conversões e materiais.
          </p>
        </div>
        <Link
          to="/partners/niveis"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Sparkles size={16} /> Ver níveis & progresso
        </Link>
      </div>
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {headlineCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Evolução do MRR</div>
                <div className="text-xs text-muted-foreground">Receita recorrente atribuída a você (últimos 6 meses)</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Atual</div>
                <div className="text-lg font-bold text-primary">{fmtBRL(mrrCents)}</div>
              </div>
            </div>
            <MRRChart data={mrrSeries} />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="text-sm font-semibold">Distribuição por plano</div>
            <div className="text-xs text-muted-foreground mb-2">Clientes pagos ativos</div>
            <PlanDistributionChart data={planDist} />
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <div>
        <div className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Funil de conversão</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {funnelCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* Referral links */}
      <ReferralLinksCard partner={partner} />
    </div>
  );
}
