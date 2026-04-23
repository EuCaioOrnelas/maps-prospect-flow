import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  MousePointerClick,
  UserCheck,
  DollarSign,
  Wallet,
  Clock,
  TrendingUp,
  Award,
  HelpCircle,
  LayoutDashboard,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";

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

type Accent = "primary" | "emerald" | "amber" | "violet" | "sky" | "rose";

const accentMap: Record<Accent, { bg: string; ring: string; glow: string; text: string }> = {
  primary: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  emerald: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  amber: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  violet: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  sky: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  rose: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: any;
  accent: Accent;
  hint?: string;
}) {
  const a = accentMap[accent];
  return (
    <Card className={`group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5 hover:ring-1 hover:${a.ring}`}>
      <div className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} to-transparent blur-3xl opacity-50 group-hover:opacity-80 transition-opacity`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`rounded-xl p-2 ${a.bg} ring-1 ${a.ring} ${a.text}`}>
            <Icon size={16} />
          </div>
          {hint && (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-foreground transition-colors">
                  <HelpCircle size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{hint}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

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

  const cards: Array<{ label: string; value: string; icon: any; accent: Accent; hint?: string } | null> = stats
    ? [
        { label: "Parceiros totais", value: stats.totalPartners.toString(), icon: Users, accent: "primary", hint: "Total de parceiros cadastrados (ativos + inativos + bloqueados)." },
        { label: "Parceiros ativos", value: stats.activePartners.toString(), icon: UserCheck, accent: "emerald", hint: "Parceiros com status 'active' que podem gerar comissões." },
        { label: "Cliques no link", value: stats.totalClicks.toLocaleString("pt-BR"), icon: MousePointerClick, accent: "sky", hint: "Cliques únicos rastreados nos links de indicação." },
        { label: "Leads indicados", value: stats.totalLeads.toString(), icon: TrendingUp, accent: "violet", hint: "Pessoas que se cadastraram via link de algum parceiro." },
        { label: "Em trial", value: stats.trialLeads.toString(), icon: Clock, accent: "amber", hint: "Indicados que estão no período de teste gratuito." },
        { label: "Clientes pagos", value: stats.paidClients.toString(), icon: Award, accent: "emerald", hint: "Indicados que viraram assinantes pagantes." },
        { label: "Receita gerada", value: fmt(stats.totalRevenueCents), icon: DollarSign, accent: "emerald", hint: "Receita total trazida pelos parceiros desde o início." },
        { label: "Comissão pendente", value: fmt(stats.pendingCommissionCents), icon: Clock, accent: "amber", hint: "Comissões aguardando o prazo de liberação (anti-chargeback)." },
        { label: "Disponível p/ saque", value: fmt(stats.availableCommissionCents), icon: Wallet, accent: "primary", hint: "Comissões já liberadas que parceiros podem sacar." },
        { label: "Comissão paga", value: fmt(stats.paidCommissionCents), icon: DollarSign, accent: "violet", hint: "Total já pago aos parceiros via saques aprovados." },
        { label: "Saques pendentes", value: stats.pendingWithdrawals.toString(), icon: Wallet, accent: "rose", hint: "Solicitações de saque aguardando aprovação." },
        {
          label: "Conversão trial→pago",
          value: stats.trialLeads > 0 ? `${Math.round((stats.paidClients / stats.trialLeads) * 100)}%` : "—",
          icon: TrendingUp,
          accent: "sky",
          hint: "% de leads em trial que viraram clientes pagantes.",
        },
      ]
    : [];

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/20 p-6 lg:p-8 backdrop-blur-sm">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="rounded-2xl bg-primary/15 p-3 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
              <LayoutDashboard size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Programa de Parceiros</h1>
              <p className="text-sm text-muted-foreground mt-1">Visão geral em tempo real do programa de indicações</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5">
                  <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map((c) => c && <StatCard key={c.label} {...c} />)}
          </div>
        )}

        {/* Roadmap card */}
        <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 ring-1 ring-primary/20 text-primary">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <CardTitle className="text-base">Status da Implementação</CardTitle>
                <CardDescription className="text-xs">Roadmap do módulo Partners</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-2.5">
            {[
              { done: true, text: "Backend completo (9 tabelas, RLS, triggers de comissão automática)" },
              { done: true, text: "Tracking last-click ativo em todas as rotas públicas" },
              { done: true, text: "Cadastro manual de parceiros funcional" },
              { done: false, text: "Fase 2: Vendas / Comissões / Saques + Portal do Parceiro + Emails" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 p-3">
                {item.done ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                ) : (
                  <CircleDashed size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
