import { useEffect, useMemo, useState } from "react";
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
  Repeat,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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
  totalMRRCents: number;
  trialToPaidRate: number | null;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const fmtCompact = (cents: number) => {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `R$${v.toFixed(0)}`;
};

type Accent = "primary" | "emerald" | "amber" | "violet" | "sky" | "rose";

const accentMap: Record<Accent, { bg: string; ring: string; glow: string; text: string }> = {
  primary: { bg: "bg-primary/10", ring: "ring-primary/20", glow: "from-primary/25", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", glow: "from-emerald-500/25", text: "text-emerald-600" },
  amber: { bg: "bg-amber-500/10", ring: "ring-amber-500/20", glow: "from-amber-500/25", text: "text-amber-600" },
  violet: { bg: "bg-violet-500/10", ring: "ring-violet-500/20", glow: "from-violet-500/25", text: "text-violet-600" },
  sky: { bg: "bg-sky-500/10", ring: "ring-sky-500/20", glow: "from-sky-500/25", text: "text-sky-600" },
  rose: { bg: "bg-rose-500/10", ring: "ring-rose-500/20", glow: "from-rose-500/25", text: "text-rose-600" },
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
    <Card className="group relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.18)]">
      <div className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} to-transparent blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`rounded-xl p-2 ${a.bg} ring-1 ${a.ring} ${a.text} transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[8deg]`}
          >
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
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

interface SalesPoint {
  month: string;
  sales_cents: number;
  commissions_cents: number;
  count: number;
}
interface MRRPoint {
  month: string;
  mrr_cents: number;
}
interface PartnerSlice {
  name: string;
  value: number;
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(280 67% 60%)", "hsl(340 75% 55%)", "hsl(160 84% 39%)"];

export default function AdminPartnersDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesSeries, setSalesSeries] = useState<SalesPoint[]>([]);
  const [mrrSeries, setMrrSeries] = useState<MRRPoint[]>([]);
  const [topPartners, setTopPartners] = useState<PartnerSlice[]>([]);
  const [planMix, setPlanMix] = useState<PartnerSlice[]>([]);

  useEffect(() => {
    (async () => {
      const [partnersRes, leadsRes, commRes, withRes, clicksRes, salesRes, payoutsRes] = await Promise.all([
        supabase.from("partners").select("id, full_name, status, lifetime_revenue_cents, lifetime_commission_cents"),
        supabase.from("partner_leads").select("id, is_trial, is_paid, is_cancelled, current_plan, user_id, partner_id"),
        supabase.from("partner_commissions").select("status, commission_amount_cents"),
        supabase.from("partner_withdrawals").select("status").eq("status", "pending"),
        supabase.from("partner_clicks").select("id", { count: "exact", head: true }),
        supabase.from("partner_sales").select("partner_id, plan, amount_cents, paid_at, is_recurring, refunded_at, chargeback_at").order("paid_at", { ascending: true }),
        supabase.from("partner_payouts").select("amount_cents"),
      ]);

      const partners = partnersRes.data || [];
      const leads = leadsRes.data || [];
      const commissions = commRes.data || [];
      const sales = salesRes.data || [];
      const payouts = payoutsRes.data || [];

      // ========== Build 6-month series for sales & MRR ==========
      const now = new Date();
      const monthsMeta: Array<{ key: string; label: string; start: Date; end: Date }> = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const label = start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        monthsMeta.push({ key: `${start.getFullYear()}-${start.getMonth()}`, label, start, end });
      }

      // Commission percent ratio approx (per-sale): use observed avg = total commission / total revenue
      // We will compute commissions as sum over commission table later; for chart use simple proxy.
      const totalRevenue = partners.reduce((s, p) => s + (p.lifetime_revenue_cents || 0), 0);
      const totalCommission = commissions.reduce((s, c) => s + (c.commission_amount_cents || 0), 0);
      const commRatio = totalRevenue > 0 ? totalCommission / totalRevenue : 0.2;

      const seriesSales: SalesPoint[] = monthsMeta.map((m) => {
        const inMonth = sales.filter((s: any) => {
          const d = new Date(s.paid_at);
          return d >= m.start && d < m.end && !s.refunded_at && !s.chargeback_at;
        });
        const sum = inMonth.reduce((acc: number, s: any) => acc + (s.amount_cents || 0), 0);
        return {
          month: m.label,
          sales_cents: sum,
          commissions_cents: Math.round(sum * commRatio),
          count: inMonth.length,
        };
      });
      setSalesSeries(seriesSales);

      const seriesMRR: MRRPoint[] = monthsMeta.map((m) => {
        const monthly = sales
          .filter((s: any) =>
            s.is_recurring &&
            new Date(s.paid_at) < m.end &&
            !(s.refunded_at && new Date(s.refunded_at) < m.end) &&
            !(s.chargeback_at && new Date(s.chargeback_at) < m.end),
          )
          .reduce((acc: number, s: any) => acc + (s.amount_cents || 0), 0);
        return { month: m.label, mrr_cents: monthly };
      });
      setMrrSeries(seriesMRR);

      // Top partners by revenue
      const top = [...partners]
        .filter((p) => (p.lifetime_revenue_cents || 0) > 0)
        .sort((a, b) => (b.lifetime_revenue_cents || 0) - (a.lifetime_revenue_cents || 0))
        .slice(0, 5)
        .map((p) => ({ name: p.full_name || "—", value: (p.lifetime_revenue_cents || 0) / 100 }));
      setTopPartners(top);

      // Plan mix among active paid leads
      const planMap = new Map<string, number>();
      leads
        .filter((l: any) => l.is_paid && !l.is_cancelled)
        .forEach((l: any) => {
          const k = (l.current_plan || "—").toLowerCase();
          planMap.set(k, (planMap.get(k) || 0) + 1);
        });
      setPlanMix(Array.from(planMap.entries()).map(([name, value]) => ({ name, value })));

      // Total MRR (current) – soma do último ponto
      const currentMRR = seriesMRR.length ? seriesMRR[seriesMRR.length - 1].mrr_cents : 0;

      // Trial → paid (denominator: leads que já passaram trial: is_paid OR is_cancelled OR not is_trial)
      const trialLeads = leads.filter((l: any) => l.is_trial && !l.is_paid).length;
      const paidClients = leads.filter((l: any) => l.is_paid).length;
      const trialBase = leads.filter((l: any) => l.is_paid || (!l.is_trial && !l.is_paid) || l.is_cancelled).length;
      const conv = trialBase > 0 ? Math.round((paidClients / trialBase) * 100) : null;

      setStats({
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.status === "active").length,
        totalLeads: leads.length,
        trialLeads,
        paidClients,
        totalRevenueCents: totalRevenue,
        pendingCommissionCents: commissions.filter((c) => c.status === "pending").reduce((s, c) => s + (c.commission_amount_cents || 0), 0),
        availableCommissionCents: commissions.filter((c) => c.status === "available").reduce((s, c) => s + (c.commission_amount_cents || 0), 0),
        paidCommissionCents: payouts.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0),
        pendingWithdrawals: (withRes.data || []).length,
        totalClicks: clicksRes.count || 0,
        totalMRRCents: currentMRR,
        trialToPaidRate: conv,
      });
      setLoading(false);
    })();
  }, []);

  const cards = useMemo(
    () =>
      stats
        ? [
            { label: "Parceiros totais", value: stats.totalPartners.toString(), icon: Users, accent: "primary" as Accent, hint: "Total de parceiros cadastrados (ativos + inativos + bloqueados)." },
            { label: "Parceiros ativos", value: stats.activePartners.toString(), icon: UserCheck, accent: "emerald" as Accent, hint: "Parceiros com status 'active' que podem gerar comissões." },
            { label: "Cliques no link", value: stats.totalClicks.toLocaleString("pt-BR"), icon: MousePointerClick, accent: "sky" as Accent, hint: "Cliques únicos rastreados nos links de indicação." },
            { label: "Leads indicados", value: stats.totalLeads.toString(), icon: TrendingUp, accent: "violet" as Accent, hint: "Pessoas que se cadastraram via link de algum parceiro." },
            { label: "Em trial", value: stats.trialLeads.toString(), icon: Clock, accent: "amber" as Accent, hint: "Indicados que estão no período de teste gratuito." },
            { label: "Clientes pagos", value: stats.paidClients.toString(), icon: Award, accent: "emerald" as Accent, hint: "Indicados que viraram assinantes pagantes." },
            { label: "MRR de parceiros", value: fmt(stats.totalMRRCents), icon: Repeat, accent: "primary" as Accent, hint: "Soma das mensalidades recorrentes ativas atribuídas a parceiros." },
            { label: "Receita gerada", value: fmt(stats.totalRevenueCents), icon: DollarSign, accent: "emerald" as Accent, hint: "Receita total trazida pelos parceiros desde o início." },
            { label: "Comissão pendente", value: fmt(stats.pendingCommissionCents), icon: Clock, accent: "amber" as Accent, hint: "Comissões aguardando o prazo de liberação (anti-chargeback)." },
            { label: "Disponível p/ saque", value: fmt(stats.availableCommissionCents), icon: Wallet, accent: "primary" as Accent, hint: "Comissões já liberadas que parceiros podem sacar." },
            { label: "Comissão paga", value: fmt(stats.paidCommissionCents), icon: DollarSign, accent: "violet" as Accent, hint: "Total efetivamente pago aos parceiros via payouts registrados." },
            { label: "Saques pendentes", value: stats.pendingWithdrawals.toString(), icon: Wallet, accent: "rose" as Accent, hint: "Solicitações de saque aguardando aprovação." },
            {
              label: "Conversão trial→pago",
              value: stats.trialToPaidRate === null ? "—" : `${stats.trialToPaidRate}%`,
              icon: TrendingUp,
              accent: "sky" as Accent,
              hint: "% de leads de parceiros que viraram clientes pagantes.",
            },
          ]
        : [],
    [stats],
  );

  const hasSales = salesSeries.some((p) => p.sales_cents > 0);
  const hasMRR = mrrSeries.some((p) => p.mrr_cents > 0);

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
            {Array.from({ length: 13 }).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5">
                  <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
        )}

        {/* Charts: Sales evolution + MRR evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20 text-emerald-600">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base">Evolução de vendas</CardTitle>
                    <CardDescription className="text-xs">Receita gerada e comissões nos últimos 6 meses</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Total 6m</div>
                  <div className="text-base font-bold text-emerald-600">
                    {fmt(salesSeries.reduce((a, b) => a + b.sales_cents, 0))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasSales ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <AreaChart data={salesSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="commFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => fmtCompact(v)}
                      />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        formatter={(value: any, name: any) => [fmt(value), name === "sales_cents" ? "Receita" : "Comissão"]}
                      />
                      <Area type="monotone" dataKey="sales_cents" name="sales_cents" stroke="hsl(160 84% 39%)" strokeWidth={2.5} fill="url(#salesFill)" />
                      <Area type="monotone" dataKey="commissions_cents" name="commissions_cents" stroke="hsl(38 92% 50%)" strokeWidth={2} fill="url(#commFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  Nenhuma venda atribuída ainda
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 ring-1 ring-primary/20 text-primary">
                    <Repeat size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base">Evolução do MRR</CardTitle>
                    <CardDescription className="text-xs">Receita recorrente atribuída a parceiros (últimos 6 meses)</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Atual</div>
                  <div className="text-base font-bold text-primary">{fmt(stats?.totalMRRCents || 0)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasMRR ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={mrrSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => fmtCompact(v)}
                      />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        formatter={(value: any) => [fmt(value), "MRR"]}
                      />
                      <Line type="monotone" dataKey="mrr_cents" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  Sem MRR recorrente atribuído ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top partners + Plan mix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/10 p-2 ring-1 ring-violet-500/20 text-violet-600">
                  <Award size={16} />
                </div>
                <div>
                  <CardTitle className="text-base">Top 5 parceiros por receita</CardTitle>
                  <CardDescription className="text-xs">Receita lifetime atribuída a cada parceiro</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topPartners.length > 0 ? (
                <div className="space-y-2.5">
                  {topPartners.map((p, i) => {
                    const max = topPartners[0]?.value || 1;
                    const pct = (p.value / max) * 100;
                    return (
                      <div key={p.name + i} className="rounded-lg border border-border/40 bg-background/40 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold tabular-nums w-5 h-5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium truncate">{p.name}</span>
                          </div>
                          <span className="text-sm font-bold tabular-nums">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.value)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                  Nenhum parceiro com receita ainda
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-500/10 p-2 ring-1 ring-sky-500/20 text-sky-600">
                  <PieChartIcon size={16} />
                </div>
                <div>
                  <CardTitle className="text-base">Distribuição por plano</CardTitle>
                  <CardDescription className="text-xs">Clientes pagos ativos vindos de parceiros</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {planMix.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={planMix}
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={(e: any) => `${e.name} (${e.value})`}
                        labelLine={false}
                        fontSize={11}
                      >
                        {planMix.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  Nenhum cliente pago atribuído ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
