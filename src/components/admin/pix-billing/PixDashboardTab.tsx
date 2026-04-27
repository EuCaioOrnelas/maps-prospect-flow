import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, CreditCard, QrCode, Users, AlertTriangle,
  TrendingUp, Clock, RefreshCw, ArrowUpRight, Percent, Banknote, ExternalLink
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

interface AsaasInvoice {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_doc: string | null;
  value: number;
  status: string;
  description: string | null;
  due_date: string | null;
  payment_date: string | null;
  invoice_url: string | null;
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
  const [asaasInvoices, setAsaasInvoices] = useState<AsaasInvoice[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Stripe MRR
      let stripeMrr = 0;
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke("get-stripe-mrr");
        if (!stripeError && stripeData) stripeMrr = stripeData.totalMRR || 0;
      } catch { console.debug("Could not fetch Stripe MRR"); }

      // Asaas em tempo real (fonte de verdade para PIX + cartão Asaas)
      let pixMrr = 0;
      let asaasCardMrr = 0;
      let activePixSubs = 0;
      let pixPaidCount = 0;
      let pixPendingCount = 0;
      let pixOverdueCount = 0;
      let pixReceivedThisMonth = 0;
      let invoicesList: AsaasInvoice[] = [];

      try {
        const { data: asaasData, error: asaasError } = await supabase.functions.invoke("admin-asaas-stats");
        if (!asaasError && asaasData?.summary) {
          const s = asaasData.summary;
          pixMrr = s.pix_mrr || 0;
          asaasCardMrr = s.card_mrr || 0;
          activePixSubs = s.pix_active_subs || 0;
          pixPaidCount = s.pix_paid_count_90d || 0;
          pixPendingCount = s.pix_pending_count_90d || 0;
          pixOverdueCount = s.pix_overdue_count_90d || 0;
          pixReceivedThisMonth = s.pix_received_this_month || 0;
          invoicesList = (asaasData.pix_invoices || []) as AsaasInvoice[];
        }
      } catch (err) {
        console.warn("Asaas stats not available:", err);
      }

      setAsaasInvoices(invoicesList);

      setMetrics({
        stripeMrr,
        pixMrr,
        asaasCardMrr,
        activePixSubscriptions: activePixSubs,
        overduePixClients: pixOverdueCount,
        pixRevenueThisMonth: pixReceivedThisMonth,
        renewalsNext7Days: 0, // virá de outro endpoint se necessário
        overdueRenewals: pixOverdueCount,
        totalPaidInvoices: pixPaidCount,
        totalPendingInvoices: pixPendingCount,
      });

      // Stage metrics (mantido — emails de renovação locais)
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

      {/* MRR Total + por provedor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Banknote size={15} className="text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">100%</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalMrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR Total (Stripe + PIX)</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard size={15} className="text-blue-400" />
              </div>
              <span className="text-xs text-blue-400 font-medium">{stripePercent}%</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(metrics.stripeMrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR Stripe (Cartão)</p>
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
            <p className="text-xs text-muted-foreground mt-1">MRR Asaas (PIX)</p>
          </CardContent>
        </Card>
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

      {/* Faturas Asaas (PIX) — direto da API */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-foreground font-sans">
            Faturas PIX (Asaas) — últimos 90 dias
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {asaasInvoices.length} fatura{asaasInvoices.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent>
          {asaasInvoices.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma fatura PIX encontrada nos últimos 90 dias na sua conta Asaas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                    <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vencimento</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pago em</th>
                    <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {asaasInvoices.slice(0, 100).map((inv) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      CONFIRMED: { label: "Pago", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                      RECEIVED: { label: "Recebido", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                      PENDING: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
                      OVERDUE: { label: "Vencido", color: "bg-red-500/10 text-red-400 border-red-500/20" },
                      REFUNDED: { label: "Estornado", color: "bg-muted text-muted-foreground" },
                    };
                    const st = statusMap[inv.status] || { label: inv.status, color: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-foreground">{inv.customer_name || "—"}</td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">{inv.customer_email || "—"}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(inv.value)}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline" className={`text-xs ${st.color}`}>{st.label}</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {inv.payment_date ? new Date(inv.payment_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inv.invoice_url ? (
                            <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                              <ExternalLink size={14} />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {asaasInvoices.length > 100 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  Mostrando 100 de {asaasInvoices.length} faturas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
