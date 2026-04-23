import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MousePointerClick, UserCheck, DollarSign, Wallet, Clock, TrendingUp, Award } from "lucide-react";

interface Stats {
  totalPartners: number;
  activePartners: number;
  totalLeads: number;
  trialLeads: number;
  paidClients: number;
  totalRevenueCents: number;
  pendingCommissionCents: number;
  availableCommissionCents: number;
  paidCommissionCents: number;
  pendingWithdrawals: number;
  totalClicks: number;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function AdminPartnersDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [partnersRes, leadsRes, commRes, withRes, clicksRes] = await Promise.all([
        supabase.from("partners").select("id, status, lifetime_revenue_cents, lifetime_commission_cents"),
        supabase.from("partner_leads").select("id, is_trial, is_paid"),
        supabase.from("partner_commissions").select("status, commission_amount_cents"),
        supabase.from("partner_withdrawals").select("status").eq("status", "pending"),
        supabase.from("partner_clicks").select("id", { count: "exact", head: true }),
      ]);

      const partners = partnersRes.data || [];
      const leads = leadsRes.data || [];
      const commissions = commRes.data || [];

      setStats({
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.status === "active").length,
        totalLeads: leads.length,
        trialLeads: leads.filter((l) => l.is_trial).length,
        paidClients: leads.filter((l) => l.is_paid).length,
        totalRevenueCents: partners.reduce((s, p) => s + (p.lifetime_revenue_cents || 0), 0),
        pendingCommissionCents: commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commission_amount_cents, 0),
        availableCommissionCents: commissions.filter((c) => c.status === "available").reduce((s, c) => s + c.commission_amount_cents, 0),
        paidCommissionCents: commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_amount_cents, 0),
        pendingWithdrawals: (withRes.data || []).length,
        totalClicks: clicksRes.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = stats ? [
    { label: "Parceiros totais", value: stats.totalPartners.toString(), icon: Users },
    { label: "Parceiros ativos", value: stats.activePartners.toString(), icon: UserCheck },
    { label: "Cliques no link", value: stats.totalClicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Leads indicados", value: stats.totalLeads.toString(), icon: TrendingUp },
    { label: "Em trial", value: stats.trialLeads.toString(), icon: Clock },
    { label: "Clientes pagos", value: stats.paidClients.toString(), icon: Award },
    { label: "Receita gerada", value: fmt(stats.totalRevenueCents), icon: DollarSign },
    { label: "Comissão pendente", value: fmt(stats.pendingCommissionCents), icon: Clock },
    { label: "Disponível p/ saque", value: fmt(stats.availableCommissionCents), icon: Wallet },
    { label: "Comissão paga", value: fmt(stats.paidCommissionCents), icon: DollarSign },
    { label: "Saques pendentes", value: stats.pendingWithdrawals.toString(), icon: Wallet },
    { label: "Conversão trial→pago", value: stats.trialLeads > 0 ? `${Math.round((stats.paidClients / stats.trialLeads) * 100)}%` : "—", icon: TrendingUp },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Programa de Parceiros</h1>
        <p className="text-sm text-muted-foreground">Visão geral do programa de indicações</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-24 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</span>
                  <c.icon size={16} className="text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Próximos passos</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>✅ Backend completo (9 tabelas, RLS, triggers de comissão automática)</p>
          <p>✅ Tracking last-click ativo em todas as rotas públicas</p>
          <p>✅ Cadastro manual de parceiros funcional</p>
          <p>⏳ Fase 2: Vendas/Comissões/Saques + Portal do Parceiro + Emails</p>
        </CardContent>
      </Card>
    </div>
  );
}
