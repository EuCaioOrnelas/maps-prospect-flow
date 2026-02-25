import { Link } from "react-router-dom";
import {
  Flame,
  AlertTriangle,
  Activity,
  DollarSign,
  Gauge,
  Zap,
  Info,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  MessageSquare,
  ThermometerSnowflake,
  Wifi,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  useRevenueDashboardStats,
  useRevenueSettings,
  useRevenueIntentDistribution,
  useRevenuePerformanceScore,
  useRevenueOpportunityIndex,
  useRevenueBottlenecks,
} from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { BottleneckCards } from "@/components/revenue/BottleneckCards";
import { MaturityGauge } from "@/components/revenue/MaturityGauge";
import { AlertsPanel } from "@/components/revenue/AlertsPanel";
import { motion } from "framer-motion";

/* ── Labels & Maps ── */
const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Morno",
  HOT: "Engajado",
  VERY_HOT: "Quente",
};

const bucketDescriptions: Record<string, string> = {
  COLD: "Leads com pouca ou nenhuma interação recente. Precisam de reativação.",
  ENGAGED: "Leads que demonstraram interesse inicial. Estão respondendo mensagens.",
  HOT: "Leads com alto engajamento e sinais claros de interesse comercial.",
  VERY_HOT: "Leads prontos para conversão. Prioridade máxima de atendimento.",
};

const riskLabels: Record<string, string> = {
  OK: "Saudável",
  COOLING: "Esfriando",
  AT_RISK: "Em Risco",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-yellow-500/10 text-yellow-400",
  AT_RISK: "bg-destructive/10 text-destructive",
};

const intentLabels: Record<string, string> = {
  INTENT_PRICE: "Preço",
  INTENT_BUY_NOW: "Compra",
  INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento",
  INTENT_PROPOSAL: "Proposta",
  INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção",
  INTENT_NEGATIVE: "Negativo",
};

const intentBarColors: Record<string, string> = {
  INTENT_PRICE: "#f59e0b",
  INTENT_BUY_NOW: "#ef4444",
  INTENT_AVAILABILITY: "#3b82f6",
  INTENT_PAYMENT: "#8b5cf6",
  INTENT_PROPOSAL: "#10b981",
  INTENT_URGENT: "#f97316",
  INTENT_OBJECTION: "#eab308",
  INTENT_NEGATIVE: "#6b7280",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const performanceTag = (score: number) => {
  if (score >= 80) return { text: "Excelente", color: "text-primary", bg: "bg-primary/10 border-primary/20" };
  if (score >= 60) return { text: "Boa", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  if (score >= 40) return { text: "Atenção", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
  return { text: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" };
};

/* ── Animated Number ── */
const AnimatedValue = ({ children }: { children: React.ReactNode }) => (
  <motion.span
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {children}
  </motion.span>
);

/* ── Hero KPI Card ── */
interface HeroKPIProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  tooltip: string;
  accent?: string;
  trend?: string;
  trendUp?: boolean;
}

const HeroKPI = ({ icon, label, value, subtitle, tooltip, accent = "text-foreground", trend, trendUp }: HeroKPIProps) => (
  <HoverCard openDelay={150} closeDelay={100}>
    <HoverCardTrigger asChild>
      <Card className="bg-card border-border/50 cursor-default transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("p-1.5 rounded-md bg-secondary/50", accent === "text-primary" && "bg-primary/10", accent === "text-destructive" && "bg-destructive/10", accent === "text-orange-400" && "bg-orange-500/10")}>
              {icon}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className={cn("text-2xl lg:text-3xl font-bold tracking-tight", accent)}>
                <AnimatedValue>{value}</AnimatedValue>
              </p>
              {trend && (
                <div className={cn("flex items-center gap-1 mt-1", trendUp ? "text-primary" : "text-destructive")}>
                  {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span className="text-[11px] font-medium">{trend}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">{subtitle}</p>
        </CardContent>
      </Card>
    </HoverCardTrigger>
    <HoverCardContent side="bottom" className="w-72 text-sm">
      <div className="flex items-start gap-2">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed text-xs">{tooltip}</p>
      </div>
    </HoverCardContent>
  </HoverCard>
);

/* ── Funnel Step ── */
const FunnelStep = ({ bucket, count, total, nextCount }: { bucket: string; count: number; total: number; nextCount?: number }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const progressionRate = nextCount !== undefined && count > 0 ? Math.round((nextCount / count) * 100) : null;
  const colorMap: Record<string, string> = {
    COLD: "bg-blue-500/70",
    ENGAGED: "bg-yellow-500/70",
    HOT: "bg-orange-500/70",
    VERY_HOT: "bg-red-500/70",
  };
  const dotColor: Record<string, string> = {
    COLD: "bg-blue-500",
    ENGAGED: "bg-yellow-500",
    HOT: "bg-orange-500",
    VERY_HOT: "bg-red-500",
  };

  return (
    <div className="flex-1">
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div className="cursor-default group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={cn("w-2 h-2 rounded-full", dotColor[bucket])} />
              <span className="text-[11px] font-medium text-muted-foreground">{bucketLabels[bucket]}</span>
            </div>
            <p className="text-xl font-bold text-foreground mb-1">{count}</p>
            <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 3)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn("h-full rounded-full", colorMap[bucket])}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{pct.toFixed(0)}%</p>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="bottom" className="w-56 text-xs">
          <p className="font-medium text-foreground mb-1">{bucketLabels[bucket]}</p>
          <p className="text-muted-foreground leading-relaxed">{bucketDescriptions[bucket]}</p>
          {progressionRate !== null && progressionRate > 0 && (
            <p className="text-primary mt-2 font-medium">{progressionRate}% progridem para o próximo nível</p>
          )}
        </HoverCardContent>
      </HoverCard>
      {progressionRate !== null && progressionRate > 0 && (
        <div className="flex items-center justify-end mt-1 pr-1">
          <span className="text-[9px] text-primary/60 font-medium">{progressionRate}% →</span>
        </div>
      )}
    </div>
  );
};

/* ── Performance Executive Card ── */
const PerformanceExecutiveCard = ({ perfScore }: { perfScore: any }) => {
  const tag = performanceTag(perfScore?.performanceScore || 0);
  const bars = [
    { label: "Responsividade", value: Math.min(100, Math.max(0, 100 - (perfScore?.avgResponseTimeMinutes || 0) * 2)), icon: Clock },
    { label: "Aproveitamento HOT", value: perfScore?.hotResponseRate || 0, icon: Flame },
    { label: "Consistência", value: perfScore?.consistencyRate || 0, icon: Activity },
    { label: "Redução de Risco", value: Math.max(0, 100 - (perfScore?.ignoredRate || 0)), icon: Shield },
  ];

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Card className="bg-card border-border/50 cursor-default">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-foreground">Performance Comercial</span>
              </div>
              <Badge variant="outline" className={cn("text-[10px] border font-semibold", tag.bg, tag.color)}>
                {tag.text}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <p className={cn("text-4xl font-bold", tag.color)}>
                <AnimatedValue>{perfScore?.performanceScore || 0}</AnimatedValue>
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </p>
              <div className="flex-1">
                <Progress value={perfScore?.performanceScore || 0} className="h-2.5" />
              </div>
            </div>

            <div className="space-y-3">
              {bars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <bar.icon size={11} className="text-muted-foreground/60" />
                      {bar.label}
                    </span>
                    <span className="font-semibold text-foreground">{bar.value}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.value}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary/60"
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground/60 mt-4">Reflete a eficiência operacional da equipe.</p>
          </CardContent>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-80">
        <p className="text-xs text-muted-foreground">Índice composto: tempo de resposta (30%), leads quentes respondidos (40%), taxa de ignorados (20%) e consistência (10%).</p>
      </HoverCardContent>
    </HoverCard>
  );
};

/* ── Critical Opportunities Block ── */
const CriticalOpportunities = ({ leads, ticket }: { leads: any[]; ticket: number }) => {
  const critical = leads.filter(
    (l) =>
      (l.status_bucket === "VERY_HOT" && l.risk_state !== "OK") ||
      (l.status_bucket === "HOT" && l.risk_state === "AT_RISK")
  ).slice(0, 5);

  if (critical.length === 0) return null;

  return (
    <Card className="bg-card border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-destructive/10">
            <Flame size={14} className="text-destructive" />
          </div>
          <CardTitle className="text-sm font-semibold text-destructive">Precisam de Ação Imediata</CardTitle>
          <Badge variant="outline" className="text-[10px] border-destructive/20 text-destructive">
            {critical.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {critical.map((lead) => (
          <Link
            key={lead.id}
            to={`/revenue/leads/${lead.id}`}
            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-destructive/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={14} className="text-destructive/60" />
              <div>
                <p className="text-sm font-medium text-foreground">{lead.name || lead.phone_e164}</p>
                <p className="text-[10px] text-muted-foreground">
                  Score: {lead.score_total} • {lead.recommendedAction}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400">
                {bucketLabels[lead.status_bucket]}
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-destructive transition-colors" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

/* ── Money Loss Section ── */
const MoneyLossSection = ({ bottlenecks, ticket }: { bottlenecks: any; ticket: number }) => {
  if (!bottlenecks) return null;

  const items = [
    {
      icon: Flame,
      label: "Leads quentes ignorados",
      detail: `${bottlenecks.hotIgnoredPct}% dos leads quentes`,
      iconColor: "text-orange-400",
    },
    {
      icon: ThermometerSnowflake,
      label: "Leads esfriando",
      detail: `${bottlenecks.cooledLeads} leads perdendo temperatura`,
      iconColor: "text-cyan-400",
    },
    {
      icon: Clock,
      label: "SLA acima do ideal",
      detail: `${bottlenecks.aboveSLAPct}% acima do limite`,
      iconColor: "text-yellow-400",
    },
    {
      icon: AlertTriangle,
      label: "Objeções detectadas",
      detail: `${bottlenecks.objectionLeads} nos últimos 7 dias`,
      iconColor: "text-red-400",
    },
  ].filter((item) => {
    if (item.label === "Leads quentes ignorados") return bottlenecks.hotIgnoredPct > 0;
    if (item.label === "Leads esfriando") return bottlenecks.cooledLeads > 0;
    if (item.label === "SLA acima do ideal") return bottlenecks.aboveSLAPct > 0;
    if (item.label === "Objeções detectadas") return bottlenecks.objectionLeads > 0;
    return true;
  });

  if (items.length === 0) return null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-destructive" />
          <CardTitle className="text-sm font-semibold">Onde Você Está Perdendo Dinheiro</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
              <item.icon size={16} className={cn("shrink-0 mt-0.5", item.iconColor)} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Empty State ── */
const EmptyDashboard = () => (
  <div className="p-6 max-w-2xl mx-auto mt-12">
    <Card className="bg-card border-border/50">
      <CardContent className="pt-10 pb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Target size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Seu Painel de Receita</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Quando suas conversas começarem, você verá:
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left mb-8">
          {[
            { icon: Target, text: "Leads classificados automaticamente" },
            { icon: DollarSign, text: "Receita potencial identificada" },
            { icon: AlertTriangle, text: "Alertas de risco em tempo real" },
            { icon: Zap, text: "Prioridades diárias de ação" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2 p-2">
              <item.icon size={14} className="text-primary shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground">{item.text}</span>
            </div>
          ))}
        </div>
        <Link to="/revenue/numbers">
          <Button className="gap-2">
            <Wifi size={16} />
            Conectar número
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
);

/* ════════════════════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════════════════════ */
const RevenueDashboard = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();
  const { data: intentDist } = useRevenueIntentDistribution();
  const { data: perfScore } = useRevenuePerformanceScore();
  const { data: bottlenecks } = useRevenueBottlenecks();

  const ticket = settings?.default_ticket_value || 3000;
  const closeRates = {
    COLD: settings?.default_close_rate_cold || 0.05,
    ENGAGED: settings?.default_close_rate_engaged || 0.15,
    HOT: settings?.default_close_rate_hot || 0.35,
    VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
  };

  const receitaEsperada = stats
    ? Object.entries(stats.bucketCounts).reduce(
        (sum, [bucket, count]) =>
          sum + count * ticket * (closeRates[bucket as keyof typeof closeRates] || 0),
        0
      )
    : 0;

  const receitaEmRisco = stats
    ? (stats.allLeads || [])
        .filter((l) => l.risk_state !== "OK")
        .reduce((sum, l) => {
          const rate = closeRates[l.status_bucket as keyof typeof closeRates] || 0;
          return sum + ticket * rate;
        }, 0)
    : 0;

  const totalLeads = stats
    ? Object.values(stats.bucketCounts).reduce((a, b) => a + b, 0)
    : 0;

  const veryHotCount = stats?.bucketCounts.VERY_HOT || 0;
  const riskPct = receitaEsperada > 0 ? Math.round((receitaEmRisco / receitaEsperada) * 100) : 0;

  // Dynamic subtitle
  const criticalCount = stats?.topOpportunities.filter(
    (l) => (l.status_bucket === "VERY_HOT" || l.status_bucket === "HOT") && l.risk_state !== "OK"
  ).length || 0;

  const intentData = Object.entries(intentDist || {})
    .map(([key, count]) => ({
      name: intentLabels[key] || key,
      value: count,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Empty state
  if (totalLeads === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Receita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada da operação comercial
        </p>
        {criticalCount > 0 && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-destructive font-medium mt-2 flex items-center gap-1.5"
          >
            <AlertTriangle size={14} />
            Você tem {criticalCount} oportunidade{criticalCount > 1 ? "s" : ""} crítica{criticalCount > 1 ? "s" : ""} que precisa{criticalCount > 1 ? "m" : ""} de ação hoje.
          </motion.p>
        )}
      </div>

      {/* ═══ 1. HERO KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKPI
          icon={<DollarSign size={16} className="text-primary" />}
          label="Receita Esperada"
          value={fmt(receitaEsperada)}
          accent="text-primary"
          subtitle="Baseado no comportamento atual dos leads."
          tooltip="Projeção de receita baseada na quantidade de leads em cada nível, multiplicada pelo ticket médio e taxa de conversão configurada."
        />
        <HeroKPI
          icon={<AlertTriangle size={16} className="text-destructive" />}
          label="Receita em Risco"
          value={fmt(receitaEmRisco)}
          accent="text-destructive"
          subtitle={riskPct > 0 ? `${riskPct}% da receita esperada.` : "Oportunidades que podem ser perdidas sem ação."}
          tooltip="Soma da receita potencial dos leads que estão esfriando ou em risco. Cada lead é calculado com ticket médio × taxa de conversão do nível."
        />
        <HeroKPI
          icon={<Flame size={16} className="text-orange-400" />}
          label="Leads Muito Quentes"
          value={veryHotCount}
          accent="text-orange-400"
          subtitle="Prontos para conversão imediata."
          tooltip="Leads no nível 'Muito Quente' — prioridade máxima com maior probabilidade de fechamento."
        />
        <HeroKPI
          icon={<Gauge size={16} className="text-blue-400" />}
          label="Performance"
          value={`${perfScore?.performanceScore || 0}/100`}
          accent={performanceTag(perfScore?.performanceScore || 0).color}
          trend={performanceTag(perfScore?.performanceScore || 0).text}
          trendUp={(perfScore?.performanceScore || 0) >= 60}
          subtitle="Reflete eficiência operacional da equipe."
          tooltip="Índice composto: tempo de resposta (30%), leads quentes respondidos (40%), taxa de ignorados (20%) e consistência (10%)."
        />
      </div>

      {/* ═══ 2. ALERTAS PRIORITÁRIOS ═══ */}
      <AlertsPanel />

      {/* ═══ 3. OPORTUNIDADES CRÍTICAS ═══ */}
      {stats?.topOpportunities && (
        <CriticalOpportunities leads={stats.topOpportunities} ticket={ticket} />
      )}

      {/* ═══ 4. PERFORMANCE + DISTRIBUIÇÃO ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <PerformanceExecutiveCard perfScore={perfScore} />

        {/* Funnel Distribution */}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-5 pb-4">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center justify-between mb-5 cursor-default">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Funil de Leads</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{totalLeads} leads</span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-64 text-xs">
                <p className="text-muted-foreground">Distribuição dos leads por nível de engajamento com taxas de progressão entre cada etapa.</p>
              </HoverCardContent>
            </HoverCard>
            <div className="flex gap-3">
              {(["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const).map((bucket, idx, arr) => (
                <FunnelStep
                  key={bucket}
                  bucket={bucket}
                  count={stats?.bucketCounts[bucket] || 0}
                  total={totalLeads}
                  nextCount={idx < arr.length - 1 ? stats?.bucketCounts[arr[idx + 1]] || 0 : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ 5. GARGALOS ═══ */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Gargalos (7 dias)
        </p>
        <BottleneckCards />
      </div>

      {/* ═══ 6. ONDE VOCÊ ESTÁ PERDENDO DINHEIRO ═══ */}
      <MoneyLossSection bottlenecks={bottlenecks} ticket={ticket} />

      {/* ═══ 7. MATURIDADE + SINAIS DE INTENÇÃO ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <MaturityGauge />

        {intentData.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 pb-4">
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-2 mb-4 cursor-default">
                    <Target size={16} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Sinais de Intenção (7d)</span>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <p className="text-xs text-muted-foreground">Intenções detectadas automaticamente nas mensagens dos leads, como perguntas sobre preço, disponibilidade ou pedidos de proposta.</p>
                </HoverCardContent>
              </HoverCard>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentData} layout="vertical" margin={{ left: 75, right: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={70} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {intentData.map((entry) => (
                        <Cell key={entry.key} fill={intentBarColors[entry.key] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ 8. TOP 10 OPORTUNIDADES ═══ */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 cursor-default">
                  <Zap size={16} className="text-primary" />
                  <CardTitle className="text-sm font-semibold">Top 10 Oportunidades</CardTitle>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-72">
                <p className="text-xs text-muted-foreground">Leads com maior potencial de conversão baseado no score ponderado, risco e recência de atividade.</p>
              </HoverCardContent>
            </HoverCard>
            <Link to="/revenue/leads" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stats?.topOpportunities.map((lead, idx) => (
              <Link
                key={lead.id}
                to={`/revenue/leads/${lead.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {lead.name || lead.phone_e164}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Score: {lead.score_total} • {lead.recommendedAction}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", {
                    "border-blue-500/20 text-blue-400": lead.status_bucket === "COLD",
                    "border-yellow-500/20 text-yellow-400": lead.status_bucket === "ENGAGED",
                    "border-orange-500/20 text-orange-400": lead.status_bucket === "HOT",
                    "border-red-500/20 text-red-400": lead.status_bucket === "VERY_HOT",
                  })}>
                    {bucketLabels[lead.status_bucket]}
                  </Badge>
                  {lead.risk_state !== "OK" && (
                    <Badge variant="outline" className={cn("text-[10px]", riskBadge[lead.risk_state])}>
                      {riskLabels[lead.risk_state]}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDashboard;
