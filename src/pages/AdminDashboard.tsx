import { useMemo, useState, useEffect } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Activity,
  Target,
  ArrowRight,
  XCircle,
  AlertCircle,
  Info,
  BarChart3,
  UserCheck,
  CreditCard,
  Eye,
  ArrowUpRight,
  CheckCircle,
  Percent,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  start: "#3b82f6",
  growth: "#8b5cf6",
  scale: "#f59e0b",
};

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    loading,
    stats,
    stripeMRR,
    pixMRR,
    totalMRR,
    totalSubscribers,
    churnRate,
    averageTicket,
    alerts,
  } = useAdminDashboard();

  // Extra data: trial conversion, active now proxy, upgrade opportunities
  const [trialConversion, setTrialConversion] = useState<{ total: number; converted: number }>({ total: 0, converted: 0 });
  const [upgradeOpportunities, setUpgradeOpportunities] = useState<number>(0);

  useEffect(() => {
    const loadExtra = async () => {
      // Trial conversion: profiles created in last 30d that upgraded from free
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, plan, created_at")
        .gte("created_at", thirtyDaysAgo);

      if (recentUsers) {
        const total = recentUsers.length;
        const converted = recentUsers.filter((u) => u.plan !== "free").length;
        setTrialConversion({ total, converted });
      }

      // Upgrade opportunities: free users with high usage
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free")
        .gte("searches_used", 60);
      setUpgradeOpportunities(count ?? 0);
    };
    loadExtra();
  }, []);

  const ltv = churnRate > 0 ? averageTicket / (churnRate / 100) : 0;
  const trialRate = trialConversion.total > 0 ? (trialConversion.converted / trialConversion.total) * 100 : 0;

  // Forecast scenarios
  const forecastScenarios = [
    { label: "Pessimista", value: totalMRR * 0.85, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Realista", value: totalMRR * 1.05, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Otimista", value: totalMRR * 1.2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const mrrChartData = useMemo(() => {
    const stripeData = stripeMRR?.monthlyMRR || [];
    const pixData = pixMRR?.pixMonthlyMRR || [];
    const months = new Map<string, { stripe: number; pix: number; total: number }>();
    stripeData.forEach((d) => {
      const e = months.get(d.month) || { stripe: 0, pix: 0, total: 0 };
      e.stripe = d.mrr;
      e.total = e.stripe + e.pix;
      months.set(d.month, e);
    });
    pixData.forEach((d) => {
      const e = months.get(d.month) || { stripe: 0, pix: 0, total: 0 };
      e.pix = d.mrr;
      e.total = e.stripe + e.pix;
      months.set(d.month, e);
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return {
          label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          ...data,
        };
      });
  }, [stripeMRR, pixMRR]);

  const salesHistory = useMemo(() => {
    return (stripeMRR?.monthlySales || []).slice(-12).map((d) => {
      const [y, m] = d.month.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        label: date.toLocaleDateString("pt-BR", { month: "short" }),
        newSales: d.newSales,
        cancellations: d.cancellations,
      };
    });
  }, [stripeMRR]);

  const pieData = useMemo(() => {
    return (stats?.planDistribution ?? []).map((d) => ({
      name: d.plan.charAt(0).toUpperCase() + d.plan.slice(1),
      value: d.count,
      revenue: d.revenue,
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Cockpit Executivo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Primary KPIs - 5 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="MRR Total" value={formatCurrency(totalMRR)} icon={DollarSign} accent="text-emerald-500" />
        <KPICard label="Assinantes" value={totalSubscribers.toString()} icon={CreditCard} accent="text-blue-500" />
        <KPICard
          label="Churn"
          value={`${churnRate.toFixed(1)}%`}
          icon={TrendingDown}
          accent={churnRate > 8 ? "text-red-500" : churnRate > 5 ? "text-amber-500" : "text-emerald-500"}
          status={churnRate > 8 ? "danger" : churnRate > 5 ? "warning" : "healthy"}
        />
        <KPICard label="Ticket Médio" value={formatCurrency(averageTicket)} icon={BarChart3} accent="text-violet-500" />
        <KPICard label="LTV" value={formatCurrency(ltv)} icon={TrendingUp} accent="text-cyan-500" />
      </div>

      {/* Secondary KPIs - user activity + conversion */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Ativos 7d" value={(stats?.activeUsers7d ?? 0).toString()} icon={Zap} accent="text-amber-500" />
        <KPICard label="Ativos 30d" value={(stats?.activeUsers30d ?? 0).toString()} icon={Activity} accent="text-blue-400" />
        <KPICard label="Total Usuários" value={(stats?.totalUsers ?? 0).toString()} icon={Users} accent="text-muted-foreground" />
        <KPICard
          label="Conversão Trial"
          value={`${trialRate.toFixed(0)}%`}
          sub={`${trialConversion.converted}/${trialConversion.total} (30d)`}
          icon={UserCheck}
          accent="text-emerald-500"
        />
        <KPICard label="Ativação" value={`${(stats?.activationRate ?? 0).toFixed(0)}%`} icon={Target} accent="text-primary" />
      </div>

      {/* Alerts + Upgrade Opportunities */}
      {(alerts.length > 0 || upgradeOpportunities > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Alerts */}
          <Card className="lg:col-span-2 border-border/40 rounded-2xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Alertas Executivos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-1.5">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm">
                  <CheckCircle size={16} />
                  Tudo operando normalmente
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(alert.route)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className={cn("shrink-0", alert.type === "danger" ? "text-red-500" : alert.type === "warning" ? "text-amber-500" : "text-blue-500")}>
                      {alert.type === "danger" ? <XCircle size={16} /> : alert.type === "warning" ? <AlertCircle size={16} /> : <Info size={16} />}
                    </span>
                    <span className="text-sm text-foreground/80 flex-1">{alert.text}</span>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upgrade opportunities + Forecast mini */}
          <Card className="border-border/40 rounded-2xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <ArrowUpRight size={16} className="text-primary" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {upgradeOpportunities > 0 && (
                <button
                  onClick={() => navigate("/admin/growth-intel")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
                >
                  <Zap size={16} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{upgradeOpportunities} usuários Free</p>
                    <p className="text-xs text-muted-foreground">com uso alto — oportunidade de upgrade</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </button>
              )}
              {/* Forecast mini */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forecast Próximo Mês</p>
                {forecastScenarios.map((s) => (
                  <div key={s.label} className={cn("flex items-center justify-between px-3 py-2 rounded-lg", s.bg)}>
                    <span className={cn("text-xs font-semibold", s.color)}>{s.label}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(s.value)}</span>
                  </div>
                ))}
                <button
                  onClick={() => navigate("/admin/forecast")}
                  className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
                >
                  Ver projeção completa <ArrowRight size={12} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Evolução MRR
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Tabs defaultValue="total">
              <TabsList className="mb-3">
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="breakdown">Stripe vs PIX</TabsTrigger>
                <TabsTrigger value="sales">Vendas vs Cancel.</TabsTrigger>
              </TabsList>
              <TabsContent value="total">
                <div className="h-[280px]">
                  {mrrChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mrrChartData}>
                        <defs>
                          <linearGradient id="ceoMrrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(158,72%,38%)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="hsl(158,72%,38%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} formatter={(v: number) => [formatCurrency(v), "MRR"]} />
                        <Area type="monotone" dataKey="total" stroke="hsl(158,72%,38%)" fill="url(#ceoMrrGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando dados...</div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="breakdown">
                <div className="h-[280px]">
                  {mrrChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mrrChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} />
                        <Bar dataKey="stripe" name="Stripe" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pix" name="PIX" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="sales">
                <div className="h-[280px]">
                  {salesHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} />
                        <Bar dataKey="newSales" name="Novos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancellations" name="Cancel." fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Plan Distribution + Receita resumida */}
        <Card className="lg:col-span-2 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Distribuição & Receita
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-[180px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={PLAN_COLORS[entry.name.toLowerCase()] || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} usuários (${formatCurrency(props.payload.revenue || 0)}/mês)`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[d.name.toLowerCase()] || "#8884d8" }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
            {/* Revenue summary */}
            <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stripe MRR</span>
                <span className="font-semibold text-foreground">{formatCurrency(stripeMRR?.totalMRR ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PIX MRR</span>
                <span className="font-semibold text-foreground">{formatCurrency(pixMRR?.pixMrr ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-border/20">
                <span className="text-muted-foreground font-medium">Total MRR</span>
                <span className="font-bold text-primary">{formatCurrency(totalMRR)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/40 rounded-2xl">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-[15px] font-semibold">Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {[
              { label: "Usuários", href: "/admin/usuarios", icon: Users },
              { label: "Billing PIX", href: "/admin/pix-billing", icon: DollarSign },
              { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
              { label: "Score", href: "/admin/user-scoring", icon: Target },
              { label: "Fluxos Email", href: "/admin/email-flows", icon: Zap },
              { label: "Avisos", href: "/admin/announcements", icon: AlertCircle },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors text-sm text-foreground/80"
              >
                <action.icon size={15} className="text-primary shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Sub-components --
function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-primary",
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  status?: "healthy" | "warning" | "danger";
}) {
  return (
    <Card className="border-border/40 rounded-2xl hover:border-border/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center", accent)}>
            <Icon size={18} />
          </div>
          {status && (
            <div
              className={cn(
                "w-2 h-2 rounded-full ml-auto",
                status === "healthy" ? "bg-emerald-400" : status === "warning" ? "bg-amber-400" : "bg-red-400"
              )}
            />
          )}
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
