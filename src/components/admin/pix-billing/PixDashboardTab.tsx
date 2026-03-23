import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, CreditCard, QrCode, Users, AlertTriangle,
  TrendingUp, Clock, RefreshCw, ArrowUpRight, Percent
} from "lucide-react";

interface DashboardMetrics {
  stripeMrr: number;
  pixMrr: number;
  activePixSubscriptions: number;
  overduePixClients: number;
  pixRevenueThisMonth: number;
  renewalsNext7Days: number;
  overdueRenewals: number;
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

      let stripeMrr = 0;
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke("get-stripe-mrr");
        if (!stripeError && stripeData) {
          stripeMrr = stripeData.totalMRR || 0;
        }
      } catch {
        console.debug("Could not fetch Stripe MRR");
      }

      const planPrices: Record<string, number> = { start: 197, growth: 497, scale: 897 };

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, subscription_current_period_end, admin_assigned_plan")
        .neq("plan", "free")
        .eq("is_blocked", false);

      const { data: pixInvoiceUsers } = await supabase
        .from("pix_invoices")
        .select("user_id");

      const pixUserIds = new Set((pixInvoiceUsers || []).map((p: any) => p.user_id));

      const { data: pixCheckouts } = await supabase
        .from("checkout_leads")
        .select("user_id")
        .eq("checkout_completed", true)
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_%");

      for (const c of pixCheckouts || []) {
        if (c.user_id) pixUserIds.add(c.user_id);
      }

      let pixMrr = 0;
      let activePixSubs = 0;
      let overdueCount = 0;
      let renewalNext7 = 0;
      let overdueRenewals = 0;

      for (const p of profiles || []) {
        if (!pixUserIds.has(p.id)) continue;
        const price = planPrices[p.plan] || 0;
        const periodEnd = p.subscription_current_period_end ? new Date(p.subscription_current_period_end) : null;
        const isExpired = periodEnd && periodEnd < now;

        pixMrr += price;
        if (!isExpired) {
          activePixSubs++;
        } else {
          overdueCount++;
          overdueRenewals++;
        }
        if (periodEnd && periodEnd > now && periodEnd <= sevenDaysFromNow) {
          renewalNext7++;
        }
      }

      const { data: paidInvoices } = await supabase
        .from("pix_invoices")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", monthStart);

      const pixInvoiceRevenue = (paidInvoices || []).reduce((sum: number, inv: any) => sum + (inv.amount_cents / 100), 0);

      const { data: paidCheckouts } = await supabase
        .from("checkout_leads")
        .select("plan_attempted")
        .eq("checkout_completed", true)
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_%")
        .gte("checkout_completed_at", monthStart);

      const checkoutRevenue = (paidCheckouts || []).reduce((sum: number, c: any) => {
        const plan = c.plan_attempted;
        if (plan?.includes("Start")) return sum + 197;
        if (plan?.includes("Growth")) return sum + 497;
        if (plan?.includes("Scale")) return sum + 897;
        return sum;
      }, 0);

      setMetrics({
        stripeMrr,
        pixMrr,
        activePixSubscriptions: activePixSubs,
        overduePixClients: overdueCount,
        pixRevenueThisMonth: pixInvoiceRevenue + checkoutRevenue,
        renewalsNext7Days: renewalNext7,
        overdueRenewals,
      });

      // Stage metrics
      const { data: trackingData } = await supabase
        .from("pix_tracking_events")
        .select("renewal_stage, event_type")
        .not("renewal_stage", "is", null);

      const { data: emailLogs } = await supabase
        .from("email_logs")
        .select("subject, opened_count, clicked_count, status")
        .eq("email_type", "SUBSCRIPTION_RENEWAL" as any);

      const stages = ["D-5", "D-3", "D-1", "D0", "D+1"];
      const stageMets: StageMetric[] = stages.map(stage => {
        const stageEvents = (trackingData || []).filter((e: any) => e.renewal_stage === stage);
        const sent = stageEvents.filter((e: any) => e.event_type === "email_sent").length;
        const paid = stageEvents.filter((e: any) => e.event_type === "payment_confirmed").length;

        const stageEmails = (emailLogs || []).filter((l: any) =>
          l.subject?.includes(stage) || (stage === "D-5" && l.subject?.includes("chegando"))
        );
        const opened = stageEvents.filter((e: any) => e.event_type === "email_opened").length ||
          stageEmails.reduce((s: number, l: any) => s + (l.opened_count || 0), 0);
        const clicked = stageEvents.filter((e: any) => e.event_type === "email_clicked").length ||
          stageEmails.reduce((s: number, l: any) => s + (l.clicked_count || 0), 0);

        return {
          stage,
          sent,
          opened,
          clicked,
          paid,
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

  const totalMrr = metrics.stripeMrr + metrics.pixMrr;
  const stripePercent = totalMrr > 0 ? ((metrics.stripeMrr / totalMrr) * 100).toFixed(1) : "0";
  const pixPercent = totalMrr > 0 ? ((metrics.pixMrr / totalMrr) * 100).toFixed(1) : "0";

  const stageColors: Record<string, string> = {
    "D-5": "text-emerald-400",
    "D-3": "text-emerald-400",
    "D-1": "text-yellow-400",
    "D0": "text-orange-400",
    "D+1": "text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadMetrics} className="gap-1.5 text-xs">
          <RefreshCw size={14} /> Atualizar dados
        </Button>
      </div>

      {/* MRR Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard size={15} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                <Percent size={10} />
                {stripePercent}%
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(metrics.stripeMrr)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MRR Cartão · Stripe</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <QrCode size={15} className="text-emerald-400" />
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <Percent size={10} />
                {pixPercent}%
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(metrics.pixMrr)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MRR PIX · AbacatePay</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users size={15} className="text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums font-sans">{metrics.activePixSubscriptions}</p>
            <p className="text-xs text-muted-foreground mt-1">Assinaturas PIX ativas</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={15} className="text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-destructive tabular-nums font-sans">{metrics.overduePixClients}</p>
            <p className="text-xs text-muted-foreground mt-1">Inadimplentes PIX</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight size={15} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums font-sans">{formatCurrency(metrics.pixRevenueThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">Receita PIX no mês</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock size={15} className="text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums font-sans">{metrics.renewalsNext7Days}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Renovações em 7 dias
              {metrics.overdueRenewals > 0 && (
                <span className="text-destructive ml-1">· {metrics.overdueRenewals} atrasadas</span>
              )}
            </p>
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
