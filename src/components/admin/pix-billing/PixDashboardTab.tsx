import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, QrCode, Users, AlertTriangle, TrendingUp, Clock } from "lucide-react";

interface DashboardMetrics {
  stripeMrr: number;
  pixMrr: number;
  activePixSubscriptions: number;
  activePixClients: number;
  overduePixClients: number;
  pixRevenueThisMonth: number;
  renewalsNext7Days: number;
  overdueRenewals: number;
}

export function PixDashboardTab() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageMetrics, setStageMetrics] = useState<any[]>([]);

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

      // Get all profiles for MRR calculation
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, subscription_current_period_end, admin_assigned_plan")
        .neq("plan", "free")
        .eq("is_blocked", false);

      const planPrices: Record<string, number> = { start: 197, growth: 497, scale: 897 };

      let stripeMrr = 0;
      let pixMrr = 0;
      let activePixSubs = 0;
      let overdueCount = 0;
      let renewalNext7 = 0;
      let overdueRenewals = 0;

      for (const p of profiles || []) {
        const price = planPrices[p.plan] || 0;
        const periodEnd = p.subscription_current_period_end ? new Date(p.subscription_current_period_end) : null;
        const isExpired = periodEnd && periodEnd < now;

        // Check if user has PIX invoices
        const { data: pixInvoices } = await supabase
          .from("pix_invoices" as any)
          .select("id")
          .eq("user_id", p.id)
          .limit(1);

        const { data: checkoutLeads } = await supabase
          .from("checkout_leads")
          .select("stripe_session_id")
          .eq("user_id", p.id)
          .eq("checkout_completed", true)
          .like("stripe_session_id", "abacate_%")
          .limit(1);

        const isPix = (pixInvoices && pixInvoices.length > 0) || (checkoutLeads && checkoutLeads.length > 0);

        if (isPix) {
          pixMrr += price;
          if (!isExpired) {
            activePixSubs++;
          } else {
            overdueCount++;
          }
          if (periodEnd && periodEnd > now && periodEnd <= sevenDaysFromNow) {
            renewalNext7++;
          }
          if (isExpired) {
            overdueRenewals++;
          }
        } else if (!p.admin_assigned_plan) {
          stripeMrr += price;
        }
      }

      // PIX revenue this month
      const { data: paidInvoices } = await supabase
        .from("pix_invoices" as any)
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", monthStart);

      const pixRevenueThisMonth = (paidInvoices || []).reduce((sum: number, inv: any) => sum + (inv.amount_cents / 100), 0);

      // Also check checkout_leads for this month
      const { data: paidCheckouts } = await supabase
        .from("checkout_leads")
        .select("plan_attempted")
        .eq("checkout_completed", true)
        .like("stripe_session_id", "abacate_%")
        .gte("checkout_completed_at", monthStart);

      const checkoutRevenue = (paidCheckouts || []).reduce((sum: number, c: any) => {
        const p = c.plan_attempted;
        if (p?.includes("Start")) return sum + 197;
        if (p?.includes("Growth")) return sum + 497;
        if (p?.includes("Scale")) return sum + 897;
        return sum;
      }, 0);

      setMetrics({
        stripeMrr,
        pixMrr,
        activePixSubscriptions: activePixSubs,
        activePixClients: activePixSubs,
        overduePixClients: overdueCount,
        pixRevenueThisMonth: pixRevenueThisMonth + checkoutRevenue,
        renewalsNext7Days: renewalNext7,
        overdueRenewals,
      });

      // Stage metrics from tracking events
      const { data: trackingData } = await supabase
        .from("pix_tracking_events" as any)
        .select("renewal_stage, event_type")
        .not("renewal_stage", "is", null);

      const stages = ["D-5", "D-3", "D-1", "D0", "D+1"];
      const stageMets = stages.map(stage => {
        const stageEvents = (trackingData || []).filter((e: any) => e.renewal_stage === stage);
        const sent = stageEvents.filter((e: any) => e.event_type === "email_sent").length;
        const opened = stageEvents.filter((e: any) => e.event_type === "email_opened").length;
        const clicked = stageEvents.filter((e: any) => e.event_type === "email_clicked").length;
        const paid = stageEvents.filter((e: any) => e.event_type === "payment_confirmed").length;
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
