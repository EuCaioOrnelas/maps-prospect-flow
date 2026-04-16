import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, CreditCard, QrCode, Users, AlertTriangle,
  TrendingUp, Clock, RefreshCw, ArrowUpRight, Percent, Banknote
} from "lucide-react";

interface DashboardMetrics {
  stripeMrr: number;
  pixMrr: number;
  asaasCardMrr: number;
  activePixSubscriptions: number;
  overduePixClients: number;
  pixRevenueThisMonth: number;
  renewalsNext7Days: number;
  overdueRenewals: number;
  totalPaidInvoices: number;
  totalPendingInvoices: number;
}

interface StageMetric {
  stage: string;
  sent: number;
  opened: number;
  clicked: number;
  paid: number;
  openRate: number;
  clickRate: number;
  payRate: number;
}

export function PixDashboardTab() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageMetrics, setStageMetrics] = useState<StageMetric[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Stripe MRR
      let stripeMrr = 0;
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke("get-stripe-mrr");
        if (!stripeError && stripeData) stripeMrr = stripeData.totalMRR || 0;
      } catch { console.debug("Could not fetch Stripe MRR"); }

      // All paying profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, payment_provider, subscription_current_period_end, admin_assigned_plan, subscription_price_cents, created_at")
        .neq("plan", "free")
        .eq("is_blocked", false);

      let pixMrr = 0;
      let asaasCardMrr = 0;
      let activePixSubs = 0;
      let overdueCount = 0;
      let renewalNext7 = 0;
      let overdueRenewals = 0;

      for (const p of profiles || []) {
        const provider = p.payment_provider;
        const priceCents = p.subscription_price_cents || 0;
        const priceReais = priceCents / 100;
        const periodEnd = p.subscription_current_period_end ? new Date(p.subscription_current_period_end) : null;
        const isExpired = periodEnd && periodEnd < now;

        // Detect annual plans
        let monthlyValue = priceReais;
        if (priceCents > 0) {
          const createdAt = new Date(p.created_at);
          const daysSpan = periodEnd 
            ? (periodEnd.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) 
            : 0;
          if (daysSpan > 300) monthlyValue = priceReais / 12;
        }

        if (provider === "abacate_pay") {
          pixMrr += monthlyValue;
          if (!isExpired) activePixSubs++;
          else { overdueCount++; overdueRenewals++; }
          if (periodEnd && periodEnd > now && periodEnd <= sevenDaysFromNow) renewalNext7++;
        } else if (provider === "asaas") {
          asaasCardMrr += monthlyValue;
        }
        // stripe is handled by get-stripe-mrr
      }

      // PIX invoices stats
      const [paidInvRes, pendingInvRes] = await Promise.all([
        supabase.from("pix_invoices").select("amount_cents").eq("status", "paid").gte("paid_at", monthStart),
        supabase.from("pix_invoices").select("id").eq("status", "pending"),
      ]);

      const pixInvoiceRevenue = (paidInvRes.data || []).reduce((sum: number, inv: any) => sum + (inv.amount_cents / 100), 0);

      // Checkout revenue this month (PIX/Asaas)
      const { data: paidCheckouts } = await supabase
        .from("checkout_leads")
        .select("plan_attempted, stripe_session_id")
        .eq("checkout_completed", true)
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_pixauto_%")
        .gte("checkout_completed_at", monthStart);

      const checkoutRevenue = (paidCheckouts || []).reduce((sum: number, c: any) => {
        if (c.plan_attempted?.includes("Start")) return sum + 296;
        if (c.plan_attempted?.includes("Growth")) return sum + 696;
        if (c.plan_attempted?.includes("Scale")) return sum + 897;
        return sum;
      }, 0);

      setMetrics({
        stripeMrr,
        pixMrr,
        asaasCardMrr,
        activePixSubscriptions: activePixSubs,
        overduePixClients: overdueCount,
        pixRevenueThisMonth: pixInvoiceRevenue + checkoutRevenue,
        renewalsNext7Days: renewalNext7,
        overdueRenewals,
        totalPaidInvoices: paidInvRes.data?.length || 0,
        totalPendingInvoices: pendingInvRes.data?.length || 0,
      });

      // Stage metrics
      const { data: trackingData } = await supabase
        .from("pix_tracking_events")
        .select("renewal_stage, event_type")
        .not("renewal_stage", "is", null);

      const stages = ["D-5", "D-3", "D-1", "D0", "D+1"];
      const stageMets: StageMetric[] = stages.map(stage => {
        const stageEvents = (trackingData || []).filter((e: any) => e.renewal_stage === stage);
        const sent = stageEvents.filter((e: any) => e.event_type === "email_sent").length;
        const opened = stageEvents.filter((e: any) => e.event_type === "email_opened").length;
        const clicked = stageEvents.filter((e: any) => e.event_type === "email_clicked").length;
        const paid = stageEvents.filter((e: any) => e.event_type === "payment_confirmed").length;
        return {
          stage, sent, opened, clicked, paid,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
          payRate: sent > 0 ? Math.round((paid / sent) * 100) : 0,
        };
      });
      setStageMetrics(stageMets);
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalMrr = metrics.stripeMrr + metrics.pixMrr + metrics.asaasCardMrr;
  const stripePercent = totalMrr > 0 ? ((metrics.stripeMrr / totalMrr) * 100).toFixed(1) : "0";
  const pixPercent = totalMrr > 0 ? ((metrics.pixMrr / totalMrr) * 100).toFixed(1) : "0";
  const asaasPercent = totalMrr > 0 ? ((metrics.asaasCardMrr / totalMrr) * 100).toFixed(1) : "0";

  const stageColors: Record<string, string> = {
    "D-5": "text-emerald-400",
    "D-3": "text-emerald-400",
    "D-1": "text-yellow-400",
    "D0": "text-orange-400",
    "D+1": "text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadMetrics} className="gap-1.5 text-xs">
          <RefreshCw size={14} /> Atualizar dados
        </Button>
      </div>

      {/* MRR by Provider */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard size={15} className="text-blue-400" />
              </div>
              <span className="text-xs text-blue-400 font-medium">{stripePercent}%</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.stripeMrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR Stripe</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <QrCode size={15} className="text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">{pixPercent}%</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.pixMrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR PIX</p>
          </CardContent>
        </Card>

        {metrics.asaasCardMrr > 0 && (
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Banknote size={15} className="text-violet-400" />
                </div>
                <span className="text-xs text-violet-400 font-medium">{asaasPercent}%</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.asaasCardMrr)}</p>
              <p className="text-xs text-muted-foreground mt-1">MRR Asaas Cartão</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Users size={15} className="text-[#34A853]" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{metrics.activePixSubscriptions}</p>
            <p className="text-xs text-muted-foreground mt-1">PIX ativas</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
              <AlertTriangle size={15} className="text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive tabular-nums">{metrics.overduePixClients}</p>
            <p className="text-xs text-muted-foreground mt-1">Inadimplentes</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <ArrowUpRight size={15} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.pixRevenueThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">Receita PIX/mês</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
              <Clock size={15} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{metrics.renewalsNext7Days}</p>
            <p className="text-xs text-muted-foreground mt-1">Renovam em 7d</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <TrendingUp size={15} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {metrics.totalPaidInvoices}
              <span className="text-sm text-muted-foreground font-normal ml-1">/ {metrics.totalPendingInvoices} pendentes</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Faturas pagas/pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Funnel */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground font-sans">Funil de Renovação por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Etapa</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Enviados</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Abertos</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Clicados</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Abertura</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Clique</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {stageMetrics.map((s) => (
                  <tr key={s.stage} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`font-semibold text-sm ${stageColors[s.stage] || "text-foreground"}`}>
                        {s.stage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums text-foreground">{s.sent}</td>
                    <td className="py-3 px-3 text-center tabular-nums text-foreground">{s.opened}</td>
                    <td className="py-3 px-3 text-center tabular-nums text-foreground">{s.clicked}</td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-primary">{s.paid}</td>
                    <td className="py-3 px-3 text-center tabular-nums text-muted-foreground">{s.openRate}%</td>
                    <td className="py-3 px-3 text-center tabular-nums text-muted-foreground">{s.clickRate}%</td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-primary">{s.payRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stageMetrics.every(s => s.sent === 0) && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum dado de tracking ainda. Os dados aparecerão conforme os emails de renovação forem enviados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
