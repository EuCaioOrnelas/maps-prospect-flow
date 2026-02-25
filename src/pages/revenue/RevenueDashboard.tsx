import { Link } from "react-router-dom";
import {
  Flame,
  AlertTriangle,
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
  ThermometerSnowflake,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  useRevenueBottlenecks,
} from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { MaturityGauge } from "@/components/revenue/MaturityGauge";
import { AlertsPanel } from "@/components/revenue/AlertsPanel";
import { motion } from "framer-motion";

/* ── Constants ── */
const bucketLabels: Record<string, string> = { COLD: "Frio", ENGAGED: "Morno", HOT: "Engajado", VERY_HOT: "Quente" };
const bucketDesc: Record<string, string> = {
  COLD: "Leads com pouca interação. Precisam de reativação.",
  ENGAGED: "Demonstraram interesse inicial. Respondendo mensagens.",
  HOT: "Alto engajamento e sinais claros de interesse.",
  VERY_HOT: "Prontos para conversão. Prioridade máxima.",
};
const riskLabels: Record<string, string> = { OK: "Saudável", COOLING: "Esfriando", AT_RISK: "Em Risco" };
const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-yellow-500/10 text-yellow-400",
  AT_RISK: "bg-destructive/10 text-destructive",
};
const intentLabels: Record<string, string> = {
  INTENT_PRICE: "Preço", INTENT_BUY_NOW: "Compra", INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento", INTENT_PROPOSAL: "Proposta", INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção", INTENT_NEGATIVE: "Negativo",
};
const intentColors: Record<string, string> = {
  INTENT_PRICE: "#f59e0b", INTENT_BUY_NOW: "#ef4444", INTENT_AVAILABILITY: "#3b82f6",
  INTENT_PAYMENT: "#8b5cf6", INTENT_PROPOSAL: "#10b981", INTENT_URGENT: "#f97316",
  INTENT_OBJECTION: "#eab308", INTENT_NEGATIVE: "#6b7280",
};

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const perfTag = (s: number) => {
  if (s >= 80) return { text: "Excelente", color: "text-primary", bg: "bg-primary/10 border-primary/20" };
  if (s >= 60) return { text: "Boa", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  if (s >= 40) return { text: "Atenção", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
  return { text: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" };
};

/* ── Fade wrapper ── */
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay, ease: "easeOut" }} className={className}>
    {children}
  </motion.div>
);

/* ── Hero KPI ── */
const HeroKPI = ({ icon, label, value, sub, tip, accent = "text-foreground", trend, trendUp }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; tip: string;
  accent?: string; trend?: string; trendUp?: boolean;
}) => (
  <HoverCard openDelay={120} closeDelay={80}>
    <HoverCardTrigger asChild>
      <div className="dashboard-card-hero rounded-xl p-4 cursor-default transition-all duration-200">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
            accent === "text-primary" ? "bg-primary/10" : accent === "text-destructive" ? "bg-destructive/10" :
            accent === "text-orange-400" ? "bg-orange-500/10" : "bg-blue-500/10"
          )}>{icon}</div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</span>
        </div>
        <p className={cn("text-[28px] lg:text-[32px] font-semibold tracking-tight leading-none", accent)}>
          <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {value}
          </motion.span>
        </p>
        {trend && (
          <div className={cn("flex items-center gap-1 mt-1.5", trendUp ? "text-primary" : "text-destructive")}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span className="text-[10px] font-medium">{trend}</span>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-2 leading-relaxed">{sub}</p>
      </div>
    </HoverCardTrigger>
    <HoverCardContent side="bottom" className="w-72 text-xs">
      <div className="flex items-start gap-2">
        <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">{tip}</p>
      </div>
    </HoverCardContent>
  </HoverCard>
);

/* ── Performance Card (8 col) ── */
const PerformanceCard = ({ perfScore }: { perfScore: any }) => {
  const tag = perfTag(perfScore?.performanceScore || 0);
  const bars = [
    { label: "Responsividade", value: Math.min(100, Math.max(0, 100 - (perfScore?.avgResponseTimeMinutes || 0) * 2)), icon: Clock },
    { label: "Aproveitamento HOT", value: perfScore?.hotResponseRate || 0, icon: Flame },
    { label: "Consistência", value: perfScore?.consistencyRate || 0, icon: Activity },
    { label: "Redução de Risco", value: Math.max(0, 100 - (perfScore?.ignoredRate || 0)), icon: Shield },
  ];

  return (
    <div className="dashboard-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={15} className="text-blue-400" />
          <span className="text-sm font-semibold text-foreground">Performance Comercial</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] border font-semibold", tag.bg, tag.color)}>{tag.text}</Badge>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          className={cn("text-4xl font-bold tabular-nums", tag.color)}>
          {perfScore?.performanceScore || 0}<span className="text-sm font-normal text-muted-foreground">/100</span>
        </motion.p>
        <div className="flex-1">
          <Progress value={perfScore?.performanceScore || 0} className="h-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <bar.icon size={10} className="text-muted-foreground/50" />{bar.label}
              </span>
              <span className="font-semibold text-foreground tabular-nums">{bar.value}%</span>
            </div>
            <div className="h-[6px] bg-secondary/30 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${bar.value}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-blue-500/50" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/50 mt-3">Reflete eficiência operacional e aproveitamento de leads.</p>
    </div>
  );
};

/* ── Vertical Funnel (4 col) ── */
const VerticalFunnel = ({ bucketCounts, totalLeads }: { bucketCounts: Record<string, number>; totalLeads: number }) => {
  const order = ["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const;
  const dotColor: Record<string, string> = { COLD: "bg-blue-500", ENGAGED: "bg-yellow-500", HOT: "bg-orange-500", VERY_HOT: "bg-red-500" };
  const barColor: Record<string, string> = { COLD: "bg-blue-500/60", ENGAGED: "bg-yellow-500/60", HOT: "bg-orange-500/60", VERY_HOT: "bg-red-500/60" };

  return (
    <div className="dashboard-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Funil de Leads</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">{totalLeads} leads</span>
      </div>
      <div className="space-y-3">
        {order.map((bucket, idx) => {
          const count = bucketCounts[bucket] || 0;
          const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
          const nextCount = idx < order.length - 1 ? bucketCounts[order[idx + 1]] || 0 : null;
          const progression = nextCount !== null && count > 0 ? Math.round((nextCount / count) * 100) : null;

          return (
            <div key={bucket}>
              <HoverCard openDelay={120}>
                <HoverCardTrigger asChild>
                  <div className="cursor-default">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full", dotColor[bucket])} />
                        <span className="text-[11px] font-medium text-muted-foreground">{bucketLabels[bucket]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground tabular-nums">{count}</span>
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-[5px] bg-secondary/20 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", barColor[bucket])} />
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="right" className="w-52 text-xs">
                  <p className="font-medium text-foreground mb-1">{bucketLabels[bucket]}</p>
                  <p className="text-muted-foreground">{bucketDesc[bucket]}</p>
                </HoverCardContent>
              </HoverCard>
              {progression !== null && progression > 0 && (
                <div className="flex justify-center my-0.5">
                  <span className="text-[9px] text-primary/50 font-medium">↓ {progression}% progridem</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Compact Bottleneck Cards ── */
const CompactBottlenecks = ({ bottlenecks }: { bottlenecks: any }) => {
  if (!bottlenecks) return null;
  const cards = [
    { icon: Flame, label: "Quentes Ignorados", value: `${bottlenecks.hotIgnoredPct}%`, critical: bottlenecks.hotIgnoredPct > 30, color: "text-orange-400", bg: "bg-orange-500/10" },
    { icon: Clock, label: "Acima do SLA", value: `${bottlenecks.aboveSLAPct}%`, critical: bottlenecks.aboveSLAPct > 40, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: AlertTriangle, label: "Tempo Resp.", value: `${bottlenecks.avgFirstResponseMin}min`, critical: bottlenecks.avgFirstResponseMin > 30, color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: ThermometerSnowflake, label: "Esfriando", value: String(bottlenecks.cooledLeads), critical: bottlenecks.cooledLeads > 5, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { icon: AlertTriangle, label: "Objeções", value: String(bottlenecks.objectionLeads), critical: bottlenecks.objectionLeads > 3, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="dashboard-card rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn("w-5 h-5 rounded flex items-center justify-center", c.bg)}>
              <c.icon size={11} className={c.color} />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground truncate">{c.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className={cn("text-lg font-bold tabular-nums", c.critical ? "text-destructive" : "text-foreground")}>{c.value}</p>
            {c.critical && <Badge variant="outline" className="text-[8px] border-destructive/20 text-destructive px-1 py-0">Crítico</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Money Loss Compact ── */
const MoneyLoss = ({ bottlenecks, ticket }: { bottlenecks: any; ticket: number }) => {
  if (!bottlenecks) return null;
  const items = [
    { icon: Flame, label: "Leads quentes ignorados", detail: `${bottlenecks.hotIgnoredPct}% dos leads quentes`, show: bottlenecks.hotIgnoredPct > 0, color: "text-orange-400" },
    { icon: ThermometerSnowflake, label: "Leads esfriando", detail: `${bottlenecks.cooledLeads} perdendo temperatura`, show: bottlenecks.cooledLeads > 0, color: "text-cyan-400" },
    { icon: Clock, label: "SLA acima do ideal", detail: `${bottlenecks.aboveSLAPct}% acima do limite`, show: bottlenecks.aboveSLAPct > 0, color: "text-yellow-400" },
    { icon: AlertTriangle, label: "Objeções detectadas", detail: `${bottlenecks.objectionLeads} nos últimos 7 dias`, show: bottlenecks.objectionLeads > 0, color: "text-red-400" },
  ].filter((i) => i.show);

  if (items.length === 0) return null;

  return (
    <div className="dashboard-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-destructive" />
        <span className="text-sm font-semibold text-foreground">Onde Você Está Perdendo Dinheiro</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/10 border border-border/20">
            <item.icon size={14} className={cn("shrink-0 mt-0.5", item.color)} />
            <div>
              <p className="text-[11px] font-medium text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Critical Opportunities ── */
const CriticalOpps = ({ leads }: { leads: any[] }) => {
  const critical = leads.filter(
    (l) => (l.status_bucket === "VERY_HOT" && l.risk_state !== "OK") || (l.status_bucket === "HOT" && l.risk_state === "AT_RISK")
  ).slice(0, 5);
  if (critical.length === 0) return null;

  return (
    <div className="dashboard-card rounded-xl p-5 border-destructive/15">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center">
          <Flame size={13} className="text-destructive" />
        </div>
        <span className="text-sm font-semibold text-destructive">Ação Imediata</span>
        <Badge variant="outline" className="text-[9px] border-destructive/20 text-destructive ml-auto">{critical.length}</Badge>
      </div>
      <div className="space-y-0.5">
        {critical.map((lead) => (
          <Link key={lead.id} to={`/revenue/leads/${lead.id}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-destructive/5 transition-colors group">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={12} className="text-destructive/50" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{lead.name || lead.phone_e164}</p>
                <p className="text-[10px] text-muted-foreground">Score: {lead.score_total} • {lead.recommendedAction}</p>
              </div>
            </div>
            <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-destructive transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

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
    ? Object.entries(stats.bucketCounts).reduce((sum, [b, c]) => sum + c * ticket * (closeRates[b as keyof typeof closeRates] || 0), 0) : 0;

  const receitaEmRisco = stats
    ? (stats.allLeads || []).filter((l) => l.risk_state !== "OK")
        .reduce((sum, l) => sum + ticket * (closeRates[l.status_bucket as keyof typeof closeRates] || 0), 0) : 0;

  const totalLeads = stats ? Object.values(stats.bucketCounts).reduce((a, b) => a + b, 0) : 0;
  const veryHotCount = stats?.bucketCounts.VERY_HOT || 0;
  const riskPct = receitaEsperada > 0 ? Math.round((receitaEmRisco / receitaEsperada) * 100) : 0;
  const isEmpty = totalLeads === 0;

  const criticalCount = stats?.topOpportunities.filter(
    (l) => (l.status_bucket === "VERY_HOT" || l.status_bucket === "HOT") && l.risk_state !== "OK"
  ).length || 0;

  const intentData = Object.entries(intentDist || {})
    .map(([key, count]) => ({ name: intentLabels[key] || key, value: count, key }))
    .sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <div className="px-5 py-4 space-y-3 max-w-[1400px] mx-auto">
        <Skeleton className="h-7 w-52" />
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-48 rounded-xl col-span-2" /><Skeleton className="h-48 rounded-xl" /></div>
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-5 max-w-[1400px] mx-auto">
      {/* ═══ HEADER ═══ */}
      <FadeIn>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel de Receita</h1>
            {criticalCount > 0 ? (
              <p className="text-[12px] text-destructive font-medium mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {criticalCount} oportunidade{criticalCount > 1 ? "s" : ""} precisa{criticalCount > 1 ? "m" : ""} de ação hoje
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground mt-1">Visão consolidada da operação comercial</p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Empty notice */}
      {isEmpty && (
        <FadeIn delay={0.1}>
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/15 bg-primary/5">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-foreground">Nenhum lead registrado</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Dados de receita e performance aparecerão quando as conversas começarem.</p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ L1: HERO KPIs (4 col) ═══ */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroKPI icon={<DollarSign size={15} className="text-primary" />} label="Receita Esperada" value={fmt(receitaEsperada)}
            accent="text-primary" sub="Estimativa baseada no comportamento dos leads nos últimos 7 dias."
            tip="Projeção = leads por nível × ticket médio × taxa de conversão configurada." />
          <HeroKPI icon={<AlertTriangle size={15} className="text-destructive" />} label="Receita em Risco" value={fmt(receitaEmRisco)}
            accent="text-destructive" trend={riskPct > 0 ? `${riskPct}% da receita total` : undefined} trendUp={false}
            sub="Oportunidades com alta probabilidade de perda."
            tip="Soma da receita potencial dos leads esfriando ou em risco." />
          <HeroKPI icon={<Flame size={15} className="text-orange-400" />} label="Leads Muito Quentes" value={veryHotCount}
            accent="text-orange-400" sub="Prontos para conversão imediata."
            tip="Leads no nível 'Muito Quente' — maior probabilidade de fechamento." />
          <HeroKPI icon={<Gauge size={15} className="text-blue-400" />} label="Performance" value={`${perfScore?.performanceScore || 0}/100`}
            accent={perfTag(perfScore?.performanceScore || 0).color}
            trend={perfTag(perfScore?.performanceScore || 0).text} trendUp={(perfScore?.performanceScore || 0) >= 60}
            sub="Reflete eficiência operacional da equipe."
            tip="Índice composto: resposta (30%), HOT respondidos (40%), ignorados (20%), consistência (10%)." />
        </div>
      </FadeIn>

      {/* ═══ L2: ALERTAS ═══ */}
      <FadeIn delay={0.1}><AlertsPanel /></FadeIn>

      {/* ═══ L2.5: CRITICAL OPPS ═══ */}
      {stats?.topOpportunities && (
        <FadeIn delay={0.12}><CriticalOpps leads={stats.topOpportunities} /></FadeIn>
      )}

      {/* ═══ L3: PERFORMANCE (8col) + FUNIL (4col) ═══ */}
      <FadeIn delay={0.15}>
        <div className="grid lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            <PerformanceCard perfScore={perfScore} />
          </div>
          <div className="lg:col-span-4">
            <VerticalFunnel bucketCounts={stats?.bucketCounts || {}} totalLeads={totalLeads} />
          </div>
        </div>
      </FadeIn>

      {/* ═══ L4: GARGALOS (5 compact) ═══ */}
      <FadeIn delay={0.2}>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2">Gargalos · 7 dias</p>
          <CompactBottlenecks bottlenecks={bottlenecks} />
        </div>
      </FadeIn>

      {/* ═══ L5: MATURIDADE (6col) + PERDAS (6col) ═══ */}
      <FadeIn delay={0.25}>
        <div className="grid lg:grid-cols-2 gap-3">
          <MaturityGauge />
          <MoneyLoss bottlenecks={bottlenecks} ticket={ticket} />
        </div>
      </FadeIn>

      {/* ═══ L6: INTENÇÃO (conditional) ═══ */}
      {intentData.length > 0 && (
        <FadeIn delay={0.3}>
          <div className="dashboard-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Sinais de Intenção (7d)</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentData} layout="vertical" margin={{ left: 75, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={70} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {intentData.map((e) => <Cell key={e.key} fill={intentColors[e.key] || "#6b7280"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ L7: TOP 10 OPORTUNIDADES (dense table) ═══ */}
      <FadeIn delay={0.35}>
        <div className="dashboard-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Top 10 Oportunidades</span>
            </div>
            <Link to="/revenue/leads" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/15">
            <span className="col-span-1">#</span>
            <span className="col-span-4">Lead</span>
            <span className="col-span-2 text-right">Score</span>
            <span className="col-span-2 text-center">Nível</span>
            <span className="col-span-3">Ação</span>
          </div>
          {/* Rows */}
          <div>
            {stats?.topOpportunities.map((lead, idx) => (
              <Link key={lead.id} to={`/revenue/leads/${lead.id}`}
                className="grid grid-cols-12 gap-2 px-5 py-2 items-center hover:bg-secondary/20 transition-colors group border-b border-border/10 last:border-b-0">
                <span className="col-span-1 text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors tabular-nums">{idx + 1}</span>
                <div className="col-span-4">
                  <p className="text-[12px] font-medium text-foreground truncate">{lead.name || lead.phone_e164}</p>
                </div>
                <span className="col-span-2 text-right text-[12px] font-bold text-foreground tabular-nums">{lead.score_total}</span>
                <div className="col-span-2 flex justify-center">
                  <Badge variant="outline" className={cn("text-[9px]", {
                    "border-blue-500/20 text-blue-400": lead.status_bucket === "COLD",
                    "border-yellow-500/20 text-yellow-400": lead.status_bucket === "ENGAGED",
                    "border-orange-500/20 text-orange-400": lead.status_bucket === "HOT",
                    "border-red-500/20 text-red-400": lead.status_bucket === "VERY_HOT",
                  })}>{bucketLabels[lead.status_bucket]}</Badge>
                </div>
                <div className="col-span-3 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground truncate">{lead.recommendedAction}</span>
                  {lead.risk_state !== "OK" && (
                    <Badge variant="outline" className={cn("text-[8px] ml-1", riskBadge[lead.risk_state])}>{riskLabels[lead.risk_state]}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default RevenueDashboard;
