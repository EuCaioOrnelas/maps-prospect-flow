import { useMemo } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  BarChart3,
  UserCheck,
  CreditCard,
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
} from "recharts";

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
    totalMRR,
    totalSubscribers,
    churnRate,
    averageTicket,
    alerts,
  } = useAdminDashboard();

  const mrrChartData = useMemo(() => {
    if (!stripeMRR?.monthlyMRR?.length) return [];
    return stripeMRR.monthlyMRR.slice(-12).map((item) => {
      const [y, m] = item.month.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        mrr: item.mrr,
        active: item.activeCount ?? 0,
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
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[130px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] rounded-2xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
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

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="MRR Total"
          value={formatCurrency(totalMRR)}
          icon={DollarSign}
          accent="text-emerald-400"
        />
        <KPICard
          label="Assinantes Ativos"
          value={totalSubscribers.toString()}
          icon={CreditCard}
          accent="text-blue-400"
        />
        <KPICard
          label="Churn %"
          value={`${churnRate.toFixed(1)}%`}
          icon={TrendingDown}
          accent={
            churnRate > 8
              ? "text-destructive"
              : churnRate > 5
              ? "text-yellow-400"
              : "text-emerald-400"
          }
          status={
            churnRate > 8
              ? "danger"
              : churnRate > 5
              ? "warning"
              : "healthy"
          }
        />
        <KPICard
          label="Ticket Médio"
          value={formatCurrency(averageTicket)}
          icon={BarChart3}
          accent="text-violet-400"
        />
        <KPICard
          label="Ativos 7d"
          value={(stats?.activeUsers7d ?? 0).toString()}
          icon={Zap}
          accent="text-amber-400"
        />
        <KPICard
          label="Ativação"
          value={`${(stats?.activationRate ?? 0).toFixed(0)}%`}
          icon={UserCheck}
          accent="text-cyan-400"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-border/40 rounded-2xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" />
              Alertas Executivos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1.5">
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={() => navigate(alert.route)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors text-left"
              >
                <span
                  className={cn(
                    "shrink-0",
                    alert.type === "danger"
                      ? "text-destructive"
                      : alert.type === "warning"
                      ? "text-yellow-500"
                      : "text-blue-400"
                  )}
                >
                  {alert.type === "danger" ? (
                    <XCircle size={16} />
                  ) : alert.type === "warning" ? (
                    <AlertCircle size={16} />
                  ) : (
                    <Info size={16} />
                  )}
                </span>
                <span className="text-sm text-foreground/80 flex-1">
                  {alert.text}
                </span>
                <ArrowRight size={14} className="text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* MRR Chart */}
        <Card className="lg:col-span-3 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Evolução MRR
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-[280px]">
              {mrrChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrChartData}>
                    <defs>
                      <linearGradient id="adminMrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(158,72%,38%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(158,72%,38%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "MRR"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(158,72%,38%)"
                      fill="url(#adminMrrGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Carregando dados do Stripe...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="lg:col-span-2 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-[200px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PLAN_COLORS[entry.name.toLowerCase()] || "#8884d8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
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
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PLAN_COLORS[d.name.toLowerCase()] || "#8884d8" }}
                  />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Health Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard label="Total Usuários" value={stats?.totalUsers ?? 0} icon={Users} />
        <HealthCard label="Pagantes" value={stats?.payingUsers ?? 0} icon={CreditCard} color="text-emerald-400" />
        <HealthCard label="Free" value={stats?.freeUsers ?? 0} icon={Users} color="text-muted-foreground" />
        <HealthCard label="Ativos 30d" value={stats?.activeUsers30d ?? 0} icon={Activity} color="text-blue-400" />
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
              { label: "Emails", href: "/admin/email-tests", icon: Target },
              { label: "Score", href: "/admin/user-scoring", icon: BarChart3 },
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
  icon: Icon,
  accent = "text-primary",
  status,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: string;
  status?: "healthy" | "warning" | "danger";
}) {
  return (
    <Card className="border-border/40 rounded-2xl hover:border-border/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center", accent)}>
            <Icon size={16} />
          </div>
          {status && (
            <div
              className={cn(
                "w-2 h-2 rounded-full ml-auto",
                status === "healthy"
                  ? "bg-emerald-400"
                  : status === "warning"
                  ? "bg-yellow-400"
                  : "bg-red-400"
              )}
            />
          )}
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function HealthCard({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="border-border/40 rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
          <Icon size={18} className={color} />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{value.toLocaleString("pt-BR")}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
