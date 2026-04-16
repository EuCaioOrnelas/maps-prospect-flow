import { useMemo, useState, useEffect } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  ArrowUpRight,
  CheckCircle,
  CalendarIcon,
  Clock,
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

const WIIZE_GREEN = "#34A853";

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type DateFilterType = "7d" | "30d" | "90d" | "custom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    loading,
    stats,
    stripeMRR,
    pixMRR,
    asaasCardMRR,
    otherMRR,
    totalMRR,
    totalSubscribers,
    churnRate,
    averageTicket,
    ltvData,
    alerts,
  } = useAdminDashboard();

  const [trialConversion, setTrialConversion] = useState<{ total: number; converted: number }>({ total: 0, converted: 0 });
  const [upgradeOpportunities, setUpgradeOpportunities] = useState<number>(0);
  const [activationData, setActivationData] = useState<{ total: number; activated: number }>({ total: 0, activated: 0 });

  // Date filter state for MRR chart
  const [dateFilter, setDateFilter] = useState<DateFilterType>("30d");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  useEffect(() => {
    const loadExtra = async () => {
      // Trial conversion: all users who started on free trial, how many upgraded
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, plan, trial_start_at, created_at");

      if (allUsers) {
        const withTrial = allUsers.filter((u) => (u as any).trial_start_at);
        const converted = withTrial.filter((u) => u.plan !== "free").length;
        setTrialConversion({ total: withTrial.length, converted });
      }

      // Activation: users who used any feature
      const { data: activationProfiles } = await supabase
        .from("profiles")
        .select("id, searches_used, trial_messages_sent, trial_leads_used, trial_flows_used, trial_campaigns_used");

      if (activationProfiles) {
        const total = activationProfiles.length;
        const activated = activationProfiles.filter((p) =>
          (p.searches_used ?? 0) > 0 ||
          ((p as any).trial_messages_sent ?? 0) > 0 ||
          ((p as any).trial_leads_used ?? 0) > 0 ||
          ((p as any).trial_flows_used ?? 0) > 0 ||
          ((p as any).trial_campaigns_used ?? 0) > 0
        ).length;
        setActivationData({ total, activated });
      }

      // Upgrade opportunities
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "free")
        .gte("searches_used", 60);
      setUpgradeOpportunities(count ?? 0);
    };
    loadExtra();
  }, []);

  const trialRate = trialConversion.total > 0 ? (trialConversion.converted / trialConversion.total) * 100 : 0;
  const activationRate = activationData.total > 0 ? (activationData.activated / activationData.total) * 100 : 0;

  // Forecast scenarios
  const forecastScenarios = [
    { label: "Pessimista", value: totalMRR * 0.85, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Realista", value: totalMRR * 1.05, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Otimista", value: totalMRR * 1.2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  // Calculate date range for filter
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const days = dateFilter === "7d" ? 7 : dateFilter === "90d" ? 90 : 30;
    return { start: new Date(now.getTime() - days * 86400000), end: now };
  };

  // Format x-axis labels based on date range
  const formatChartLabel = (dateStr: string, totalDays: number) => {
    const date = new Date(dateStr);
    if (totalDays <= 7) {
      // Show day of week + date
      return format(date, "EEE dd", { locale: ptBR });
    } else if (totalDays <= 30) {
      // Show week ranges
      return format(date, "dd/MM", { locale: ptBR });
    } else {
      // Show months
      return format(date, "MMM/yy", { locale: ptBR });
    }
  };

  // Group data by the appropriate period
  const groupDataByPeriod = (data: Array<{ month: string; [key: string]: any }>, totalDays: number) => {
    if (totalDays <= 7) return data; // daily
    if (totalDays <= 30) {
      // weekly grouping
      const weeks = new Map<string, any>();
      data.forEach((d) => {
        const date = new Date(d.month + "-01");
        const weekNum = Math.ceil(date.getDate() / 7);
        const key = `Sem ${weekNum}`;
        const existing = weeks.get(key) || { label: key, stripe: 0, pix: 0, asaasCard: 0, total: 0 };
        existing.stripe += d.stripe || 0;
        existing.pix += d.pix || 0;
        existing.asaasCard += d.asaasCard || 0;
        existing.total += d.total || 0;
        weeks.set(key, existing);
      });
      return Array.from(weeks.values());
    }
    return data; // monthly - already grouped by month
  };

  const mrrChartData = useMemo(() => {
    const stripeData = stripeMRR?.monthlyMRR || [];
    const pixData = pixMRR?.pixMonthlyMRR || [];
    const months = new Map<string, { stripe: number; pix: number; asaasCard: number; total: number }>();
    
    stripeData.forEach((d) => {
      const e = months.get(d.month) || { stripe: 0, pix: 0, asaasCard: 0, total: 0 };
      e.stripe = d.mrr;
      months.set(d.month, e);
    });
    pixData.forEach((d) => {
      const e = months.get(d.month) || { stripe: 0, pix: 0, asaasCard: 0, total: 0 };
      e.pix = d.mrr;
      months.set(d.month, e);
    });

    // Add current Asaas card MRR to latest month
    const asaasCardVal = asaasCardMRR?.asaasCardMrr ?? 0;
    if (asaasCardVal > 0) {
      const entries = Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b));
      if (entries.length > 0) {
        const lastKey = entries[entries.length - 1][0];
        const last = months.get(lastKey)!;
        last.asaasCard = asaasCardVal;
      }
    }

    // Recalculate totals
    months.forEach((v) => {
      v.total = v.stripe + v.pix + v.asaasCard;
    });

    const { start } = getDateRange();
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : dateFilter === "90d" ? 90 : 
      customStart && customEnd ? Math.ceil((customEnd.getTime() - customStart.getTime()) / 86400000) : 30;
    
    const sliceCount = days <= 7 ? 7 : days <= 30 ? 4 : Math.ceil(days / 30);

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-sliceCount)
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        const totalDays = days;
        return {
          label: totalDays <= 30
            ? date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" })
            : date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          ...data,
        };
      });
  }, [stripeMRR, pixMRR, asaasCardMRR, dateFilter, customStart, customEnd]);

  const salesHistory = useMemo(() => {
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : dateFilter === "90d" ? 90 : 30;
    const sliceCount = days <= 30 ? 4 : Math.ceil(days / 30);
    
    return (stripeMRR?.monthlySales || []).slice(-sliceCount).map((d) => {
      const [y, m] = d.month.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        label: date.toLocaleDateString("pt-BR", { month: "short" }),
        newSales: d.newSales,
        cancellations: d.cancellations,
      };
    });
  }, [stripeMRR, dateFilter]);

  const pieData = useMemo(() => {
    return (stats?.planDistribution ?? []).map((d) => ({
      name: d.plan.charAt(0).toUpperCase() + d.plan.slice(1),
      value: d.count,
      revenue: d.revenue,
    }));
  }, [stats]);

  // Revenue distribution with percentages
  const stripeMrrVal = stripeMRR?.totalMRR ?? 0;
  const pixMrrVal = pixMRR?.pixMrr ?? 0;
  const asaasCardMrrVal = asaasCardMRR?.asaasCardMrr ?? 0;
  const otherMrrVal = otherMRR?.otherMrr ?? 0;
  const pctStripe = totalMRR > 0 ? ((stripeMrrVal / totalMRR) * 100).toFixed(1) : "0";
  const pctPix = totalMRR > 0 ? ((pixMrrVal / totalMRR) * 100).toFixed(1) : "0";
  const pctAsaasCard = totalMRR > 0 ? ((asaasCardMrrVal / totalMRR) * 100).toFixed(1) : "0";
  const pctOther = totalMRR > 0 ? ((otherMrrVal / totalMRR) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Cockpit Executivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="MRR Total" value={formatCurrency(totalMRR)} icon={DollarSign} />
        <KPICard label="Assinantes" value={totalSubscribers.toString()} icon={CreditCard} />
        <KPICard
          label="Churn"
          value={`${churnRate.toFixed(1)}%`}
          icon={TrendingDown}
          status={churnRate > 8 ? "danger" : churnRate > 5 ? "warning" : "healthy"}
        />
        <KPICard label="Ticket Médio" value={formatCurrency(averageTicket)} icon={BarChart3} />
        <KPICard
          label="LTV"
          value={formatCurrency(ltvData.ltv)}
          sub={`~${ltvData.avgMonths.toFixed(1)} meses`}
          icon={TrendingUp}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Ativos 7d" value={(stats?.activeUsers7d ?? 0).toString()} icon={Zap} />
        <KPICard label="Ativos 30d" value={(stats?.activeUsers30d ?? 0).toString()} icon={Activity} />
        <KPICard label="Total Usuários" value={(stats?.totalUsers ?? 0).toString()} icon={Users} />
        <KPICard
          label="Conversão Trial"
          value={`${trialRate.toFixed(0)}%`}
          sub={`${trialConversion.converted}/${trialConversion.total}`}
          icon={UserCheck}
        />
        <KPICard
          label="Ativação"
          value={`${activationRate.toFixed(0)}%`}
          sub={`${activationData.activated}/${activationData.total}`}
          icon={Target}
        />
      </div>

      {/* Alerts + Opportunities */}
      {(alerts.length > 0 || upgradeOpportunities > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  <CheckCircle size={16} /> Tudo operando normalmente
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

          <Card className="border-border/40 rounded-2xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <ArrowUpRight size={16} style={{ color: WIIZE_GREEN }} />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {upgradeOpportunities > 0 && (
                <button
                  onClick={() => navigate("/admin/growth-intel")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#34A853]/5 border border-[#34A853]/20 hover:bg-[#34A853]/10 transition-colors text-left"
                >
                  <Zap size={16} style={{ color: WIIZE_GREEN }} className="shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{upgradeOpportunities} usuários Free</p>
                    <p className="text-xs text-muted-foreground">com uso alto — oportunidade de upgrade</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </button>
              )}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forecast Próximo Mês</p>
                {forecastScenarios.map((s) => (
                  <div key={s.label} className={cn("flex items-center justify-between px-3 py-2 rounded-lg", s.bg)}>
                    <span className={cn("text-xs font-semibold", s.color)}>{s.label}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(s.value)}</span>
                  </div>
                ))}
                <button onClick={() => navigate("/admin/forecast")} className="text-xs hover:underline flex items-center gap-1 pt-1" style={{ color: WIIZE_GREEN }}>
                  Ver projeção completa <ArrowRight size={12} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <TrendingUp size={16} style={{ color: WIIZE_GREEN }} />
                Evolução MRR
              </CardTitle>
              {/* Date filter */}
              <div className="flex items-center gap-1">
                {(["7d", "30d", "90d"] as DateFilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                      dateFilter === f ? "bg-[#34A853]/15 text-[#34A853]" : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {f}
                  </button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                        dateFilter === "custom" ? "bg-[#34A853]/15 text-[#34A853]" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <CalendarIcon size={12} /> Personalizado
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 space-y-3" align="end">
                    <p className="text-xs font-medium text-muted-foreground">Data inicial</p>
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={(d) => { setCustomStart(d); if (d && customEnd) setDateFilter("custom"); }}
                      className="p-2 pointer-events-auto"
                    />
                    <p className="text-xs font-medium text-muted-foreground">Data final</p>
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={(d) => { setCustomEnd(d); if (d && customStart) setDateFilter("custom"); }}
                      className="p-2 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Tabs defaultValue="total">
              <TabsList className="mb-3">
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="breakdown">Cartão vs PIX</TabsTrigger>
                <TabsTrigger value="sales">Vendas vs Cancel.</TabsTrigger>
              </TabsList>
              <TabsContent value="total">
                <div className="h-[280px]">
                  {mrrChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mrrChartData}>
                        <defs>
                          <linearGradient id="ceoMrrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={WIIZE_GREEN} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={WIIZE_GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} formatter={(v: number) => [formatCurrency(v), "MRR"]} />
                        <Area type="monotone" dataKey="total" stroke={WIIZE_GREEN} fill="url(#ceoMrrGrad)" strokeWidth={2} />
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
                        <Bar dataKey="stripe" name="Stripe" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="card" />
                        <Bar dataKey="asaasCard" name="Asaas Cartão" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="card" />
                        <Bar dataKey="pix" name="PIX" fill={WIIZE_GREEN} radius={[4, 4, 0, 0]} />
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

        {/* Distribution + Revenue */}
        <Card className="lg:col-span-2 border-border/40 rounded-2xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <BarChart3 size={16} style={{ color: WIIZE_GREEN }} />
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
                      formatter={(value: number, _name: string, props: any) => [
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
            {/* Revenue by provider with percentages */}
            <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
                {stripeMrrVal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      Stripe MRR
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">{pctStripe}%</span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(stripeMrrVal)}</span>
                  </div>
                )}
                {asaasCardMrrVal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      Asaas Cartão
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">{pctAsaasCard}%</span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(asaasCardMrrVal)}</span>
                  </div>
                )}
                {pixMrrVal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      PIX MRR
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{pctPix}%</span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(pixMrrVal)}</span>
                  </div>
                )}
                {otherMrrVal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      Outros
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500">{pctOther}%</span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(otherMrrVal)}</span>
                  </div>
                )}
              <div className="flex justify-between text-sm pt-1 border-t border-border/20">
                <span className="text-muted-foreground font-medium">Total MRR</span>
                <span className="font-bold" style={{ color: WIIZE_GREEN }}>{formatCurrency(totalMRR)}</span>
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
                <action.icon size={15} style={{ color: WIIZE_GREEN }} className="shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- KPI Card with Wiize green icons --
function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  status?: "healthy" | "warning" | "danger";
}) {
  return (
    <Card className="border-border/40 rounded-2xl hover:border-border/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#34A853]/10 flex items-center justify-center">
            <Icon size={18} style={{ color: WIIZE_GREEN }} />
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
