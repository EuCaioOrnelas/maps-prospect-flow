import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, QrCode, Users, AlertTriangle, TrendingUp, Clock, RefreshCw } from "lucide-react";

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

      // Fetch Stripe MRR from real edge function
      let stripeMrr = 0;
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke("get-stripe-mrr");
        if (!stripeError && stripeData) {
          stripeMrr = stripeData.totalMRR || 0;
        }
      } catch {
        console.debug("Could not fetch Stripe MRR");
      }

      // Get PIX-paying profiles (users with pix_invoices OR abacate checkout_leads)
      const planPrices: Record<string, number> = { start: 197, growth: 497, scale: 897 };

      // Get all non-free profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, subscription_current_period_end, admin_assigned_plan")
        .neq("plan", "free")
        .eq("is_blocked", false);

      // Get all pix invoice user IDs
      const { data: pixInvoiceUsers } = await supabase
        .from("pix_invoices")
        .select("user_id");

      const pixUserIds = new Set((pixInvoiceUsers || []).map((p: any) => p.user_id));

      // Get all abacate checkout user IDs
      const { data: abacateCheckouts } = await supabase
        .from("checkout_leads")
        .select("user_id")
        .eq("checkout_completed", true)
        .like("stripe_session_id", "abacate_%");

      for (const c of abacateCheckouts || []) {
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

      // PIX revenue this month from pix_invoices
      const { data: paidInvoices } = await supabase
        .from("pix_invoices")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", monthStart);

      const pixInvoiceRevenue = (paidInvoices || []).reduce((sum: number, inv: any) => sum + (inv.amount_cents / 100), 0);

      // Also count checkout_leads paid this month via abacate
      const { data: paidCheckouts } = await supabase
        .from("checkout_leads")
        .select("plan_attempted")
        .eq("checkout_completed", true)
        .like("stripe_session_id", "abacate_%")
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

      // Stage metrics from tracking events
      const { data: trackingData } = await supabase
        .from("pix_tracking_events")
        .select("renewal_stage, event_type")
        .not("renewal_stage", "is", null);

      // Also get email logs for open/click data
      const { data: emailLogs } = await supabase
        .from("email_logs")
        .select("subject, opened_count, clicked_count, status")
        .eq("email_type", "SUBSCRIPTION_RENEWAL" as any);

      const stages = ["D-5", "D-3", "D-1", "D0", "D+1"];
      const stageMets: StageMetric[] = stages.map(stage => {
        const stageEvents = (trackingData || []).filter((e: any) => e.renewal_stage === stage);
        const sent = stageEvents.filter((e: any) => e.event_type === "email_sent").length;
        const paid = stageEvents.filter((e: any) => e.event_type === "payment_confirmed").length;

        // Get open/click from email_logs that match this stage
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

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadMetrics} className="gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      {/* MRR Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard size={16} className="text-blue-500" /> MRR Cartão (Stripe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.stripeMrr)}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <QrCode size={16} className="text-primary" /> MRR PIX (AbacatePay)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.pixMrr)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users size={14} /> Assinaturas PIX Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{metrics.activePixSubscriptions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-destructive" /> Inadimplentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive tabular-nums">{metrics.overduePixClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp size={14} className="text-primary" /> Receita Mês (PIX)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.pixRevenueThisMonth)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock size={14} /> Renovações 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground tabular-nums">{metrics.renewalsNext7Days}</p>
            {metrics.overdueRenewals > 0 && (
              <p className="text-xs text-destructive mt-1">{metrics.overdueRenewals} atrasadas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Funil de Renovação por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground">Etapa</th>
                  <th className="text-center p-3 font-medium text-foreground">Enviados</th>
                  <th className="text-center p-3 font-medium text-foreground">Abertos</th>
                  <th className="text-center p-3 font-medium text-foreground">Clicados</th>
                  <th className="text-center p-3 font-medium text-foreground">Pagos</th>
                  <th className="text-center p-3 font-medium text-foreground">Taxa Abertura</th>
                  <th className="text-center p-3 font-medium text-foreground">Taxa Clique</th>
                  <th className="text-center p-3 font-medium text-foreground">Taxa Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {stageMetrics.map((s) => (
                  <tr key={s.stage} className="border-t border-border">
                    <td className="p-3">
                      <Badge variant={s.stage === "D+1" ? "destructive" : s.stage === "D0" || s.stage === "D-1" ? "secondary" : "default"}>
                        {s.stage}
                      </Badge>
                    </td>
                    <td className="p-3 text-center tabular-nums">{s.sent}</td>
                    <td className="p-3 text-center tabular-nums">{s.opened}</td>
                    <td className="p-3 text-center tabular-nums">{s.clicked}</td>
                    <td className="p-3 text-center tabular-nums font-semibold text-primary">{s.paid}</td>
                    <td className="p-3 text-center tabular-nums">{s.openRate}%</td>
                    <td className="p-3 text-center tabular-nums">{s.clickRate}%</td>
                    <td className="p-3 text-center tabular-nums font-semibold">{s.payRate}%</td>
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
