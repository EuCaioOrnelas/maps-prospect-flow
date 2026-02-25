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
  TrendingDown,
  Clock,
  ArrowRight,
  ThermometerSnowflake,
  Activity,
  ChevronRight,
  Bell,
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
  useRevenueMaturityIndex,
} from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
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
  if (s >= 80) return { text: "Excelente", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (s >= 60) return { text: "Bom", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
  if (s >= 40) return { text: "Atenção", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  return { text: "Crítico", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
};

const maturityLabel = (s: number) => {
  if (s >= 81) return { text: "Excelente", color: "text-emerald-400" };
  if (s >= 61) return { text: "Avançado", color: "text-blue-400" };
  if (s >= 31) return { text: "Estruturando", color: "text-amber-400" };
  return { text: "Inicial", color: "text-red-400" };
};

/* ── Fade wrapper ── */
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay, ease: "easeOut" }} className={className}>
    {children}
  </motion.div>
);

/* ── Empty state helper ── */
const EmptyHint = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-secondary/10 border border-border/20">
    <Info size={12} className="text-muted-foreground/50 shrink-0" />
    <p className="text-[11px] text-muted-foreground">{text}</p>
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
  const { data: maturity } = useRevenueMaturityIndex();

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
  const hasPerf = perfScore?.hasData;

  const criticalCount = stats?.topOpportunities.filter(
    (l) => (l.status_bucket === "VERY_HOT" || l.status_bucket === "HOT") && l.risk_state !== "OK"
  ).length || 0;

  const intentData = Object.entries(intentDist || {})
    .map(([key, count]) => ({ name: intentLabels[key] || key, value: count, key }))
    .sort((a, b) => b.value - a.value);

  /* Loading */
  if (isLoading) {
    return (
      <div className="revenue-bg px-5 py-4 space-y-3 max-w-[1440px] mx-auto">
        <Skeleton className="h-7 w-52" />
        <div className="grid grid-cols-12 gap-3">
          <Skeleton className="h-32 rounded-xl col-span-4" />
          <Skeleton className="h-32 rounded-xl col-span-3" />
          <Skeleton className="h-32 rounded-xl col-span-2" />
          <Skeleton className="h-32 rounded-xl col-span-3" />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Skeleton className="h-52 rounded-xl col-span-8" />
          <Skeleton className="h-52 rounded-xl col-span-4" />
        </div>
      </div>
    );
  }

  /* ── Derived bottleneck cards ── */
  const bottleneckCards = bottlenecks ? [
    { icon: Flame, label: "Quentes Ignorados", value: `${bottlenecks.hotIgnoredPct}%`, critical: bottlenecks.hotIgnoredPct > 30, color: "text-amber-400", bg: "bg-amber-500/10", show: true },
    { icon: Clock, label: "Acima do SLA", value: `${bottlenecks.aboveSLAPct}%`, critical: bottlenecks.aboveSLAPct > 40, color: "text-yellow-400", bg: "bg-yellow-500/10", show: true },
    { icon: AlertTriangle, label: "Tempo Resp.", value: `${bottlenecks.avgFirstResponseMin}min`, critical: bottlenecks.avgFirstResponseMin > 30, color: "text-blue-400", bg: "bg-blue-500/10", show: true },
    { icon: ThermometerSnowflake, label: "Esfriando", value: String(bottlenecks.cooledLeads), critical: bottlenecks.cooledLeads > 5, color: "text-cyan-400", bg: "bg-cyan-500/10", show: true },
    { icon: AlertTriangle, label: "Objeções", value: String(bottlenecks.objectionLeads), critical: bottlenecks.objectionLeads > 3, color: "text-red-400", bg: "bg-red-500/10", show: true },
  ] : [];

  /* ── Critical leads ── */
  const criticalLeads = (stats?.topOpportunities || []).filter(
    (l) => (l.status_bucket === "VERY_HOT" && l.risk_state !== "OK") || (l.status_bucket === "HOT" && l.risk_state === "AT_RISK")
  ).slice(0, 5);

  /* ── Money loss items ── */
  const moneyLossItems = bottlenecks ? [
    { icon: Flame, label: "Leads quentes ignorados", detail: `${bottlenecks.hotIgnoredPct}% dos leads quentes`, show: bottlenecks.hotIgnoredPct > 0, color: "text-amber-400" },
    { icon: ThermometerSnowflake, label: "Leads esfriando", detail: `${bottlenecks.cooledLeads} perdendo temperatura`, show: bottlenecks.cooledLeads > 0, color: "text-cyan-400" },
    { icon: Clock, label: "SLA acima do ideal", detail: `${bottlenecks.aboveSLAPct}% acima do limite`, show: bottlenecks.aboveSLAPct > 0, color: "text-yellow-400" },
    { icon: AlertTriangle, label: "Objeções detectadas", detail: `${bottlenecks.objectionLeads} nos últimos 7 dias`, show: bottlenecks.objectionLeads > 0, color: "text-red-400" },
  ].filter((i) => i.show) : [];

  /* ── Funnel data ── */
  const funnelOrder = ["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const;
  const dotColor: Record<string, string> = { COLD: "bg-blue-500", ENGAGED: "bg-amber-500", HOT: "bg-orange-500", VERY_HOT: "bg-red-500" };
  const barFill: Record<string, string> = { COLD: "bg-blue-500/60", ENGAGED: "bg-amber-500/60", HOT: "bg-orange-500/60", VERY_HOT: "bg-red-500/60" };

  /* ── Performance bars ── */
  const perfBars = hasPerf ? [
    { label: "Responsividade", value: Math.min(100, Math.max(0, 100 - (perfScore?.avgResponseTimeMinutes || 0) * 2)), icon: Clock },
    { label: "Aproveitamento HOT", value: perfScore?.hotResponseRate || 0, icon: Flame },
    { label: "Consistência", value: perfScore?.consistencyRate || 0, icon: Activity },
    { label: "Redução de Risco", value: Math.max(0, 100 - (perfScore?.ignoredRate || 0)), icon: Shield },
  ] : [];
  const pTag = perfTag(perfScore?.performanceScore || 0);

  /* ── Maturity ── */
  const mLabel = maturity ? maturityLabel(maturity.total) : null;
  const mDimensions = maturity ? [
    { name: "Responsividade", value: maturity.responsiveness, weight: "30%" },
    { name: "Aproveitamento HOT", value: maturity.hotUtilization, weight: "30%" },
    { name: "Consistência (7d)", value: maturity.consistency, weight: "20%" },
    { name: "Redução de Risco", value: maturity.riskReduction, weight: "20%" },
  ] : [];

  return (
    <div className="revenue-bg px-5 py-4 max-w-[1440px] mx-auto" style={{ gap: 0 }}>
      {/* ═══ HEADER ═══ */}
      <FadeIn>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel de Receita</h1>
            {criticalCount > 0 ? (
              <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {criticalCount} oportunidade{criticalCount > 1 ? "s" : ""} precisa{criticalCount > 1 ? "m" : ""} de ação hoje
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground mt-1">Visão consolidada da operação comercial</p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Empty banner */}
      {isEmpty && (
        <FadeIn delay={0.05}>
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/15 bg-primary/5 mb-5">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-foreground">Nenhum lead registrado</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Dados de receita e performance aparecerão quando as conversas começarem.</p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ L1: HERO KPIs – 4+3+2+3 grid ═══ */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 mb-6">
          {/* Receita Esperada – dominant (4 col) */}
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <div className={cn(
                "rv-card rv-card-hero rounded-xl p-5 cursor-default lg:col-span-4",
                !isEmpty && "rv-glow-green"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                    <DollarSign size={16} className="text-emerald-400" />
                  </div>
                  <span className="rv-label">Receita Esperada</span>
                </div>
                {isEmpty ? (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Receita será calculada quando houver leads classificados.</p>
                ) : (
                  <>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                      className="text-[36px] font-semibold text-emerald-400 tracking-tight leading-none">
                      {fmt(receitaEsperada)}
                    </motion.p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2.5">Calculada com base no ticket médio e probabilidade real por nível.</p>
                  </>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" className="w-72 text-xs">
              <div className="flex items-start gap-2"><Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Projeção = leads por nível × ticket médio × taxa de conversão configurada.</p>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Receita em Risco (3 col) */}
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <div className={cn(
                "rv-card rounded-xl p-4 cursor-default lg:col-span-3",
                receitaEmRisco > 0 && "rv-glow-red"
              )}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
                    <AlertTriangle size={14} className="text-red-400" />
                  </div>
                  <span className="rv-label">Receita em Risco</span>
                </div>
                {isEmpty ? (
                  <p className="text-[11px] text-muted-foreground">Sem leads para análise de risco.</p>
                ) : receitaEmRisco === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Nenhuma oportunidade crítica detectada.</p>
                ) : (
                  <>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-[28px] font-semibold text-red-400 tracking-tight leading-none">{fmt(receitaEmRisco)}</motion.p>
                    <div className="flex items-center gap-1 mt-1.5 text-red-400/80">
                      <TrendingDown size={11} />
                      <span className="text-[10px] font-medium">{riskPct}% da receita total</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">Baseado em leads com risco ativo.</p>
                  </>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" className="w-64 text-xs">
              <div className="flex items-start gap-2"><Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Soma da receita potencial dos leads esfriando ou em risco.</p>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Leads Muito Quentes (2 col) */}
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <div className="rv-card rounded-xl p-4 cursor-default lg:col-span-2">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10">
                    <Flame size={14} className="text-amber-400" />
                  </div>
                  <span className="rv-label">Muito Quentes</span>
                </div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[28px] font-semibold text-amber-400 tracking-tight leading-none">{veryHotCount}</motion.p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">Prontos para conversão.</p>
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" className="w-56 text-xs">
              <p className="text-muted-foreground">Leads com maior probabilidade de fechamento.</p>
            </HoverCardContent>
          </HoverCard>

          {/* Performance Score (3 col) */}
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <div className="rv-card rounded-xl p-4 cursor-default lg:col-span-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10">
                    <Gauge size={14} className="text-blue-400" />
                  </div>
                  <span className="rv-label">Performance</span>
                </div>
                {!hasPerf ? (
                  <p className="text-[11px] text-muted-foreground">Calculada após atividade mínima.</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={cn("text-[28px] font-semibold tracking-tight leading-none", pTag.color)}>
                        {perfScore!.performanceScore}
                      </motion.span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] border font-semibold mt-1.5", pTag.bg, pTag.color)}>{pTag.text}</Badge>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">Eficiência operacional e aproveitamento.</p>
                  </>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" className="w-72 text-xs">
              <p className="text-muted-foreground">Índice composto: resposta (30%), HOT respondidos (40%), ignorados (20%), consistência (10%).</p>
            </HoverCardContent>
          </HoverCard>
        </div>
      </FadeIn>

      {/* ═══ L2: ALERTAS ═══ */}
      <FadeIn delay={0.08}><div className="mb-5"><AlertsPanel /></div></FadeIn>

      {/* ═══ L2.5: CRITICAL OPPS ═══ */}
      {criticalLeads.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="rv-card rounded-xl p-4 mb-5 rv-border-red">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
                <Flame size={13} className="text-red-400" />
              </div>
              <span className="text-sm font-semibold text-red-400">Ação Imediata</span>
              <Badge variant="outline" className="text-[9px] border-red-500/20 text-red-400 ml-auto">{criticalLeads.length}</Badge>
            </div>
            <div className="space-y-0.5">
              {criticalLeads.map((lead) => (
                <Link key={lead.id} to={`/revenue/leads/${lead.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-red-500/5 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={12} className="text-red-400/50" />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{lead.name || lead.phone_e164}</p>
                      <p className="text-[10px] text-muted-foreground">Score: {lead.score_total} • {lead.recommendedAction}</p>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-red-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ L3: PERFORMANCE (8 col) + FUNIL (4 col) ═══ */}
      <FadeIn delay={0.12}>
        <div className="grid lg:grid-cols-12 gap-3 mb-5">
          {/* Performance Comercial (8 col) */}
          <div className="rv-card rounded-xl p-5 lg:col-span-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge size={15} className="text-blue-400" />
                <span className="text-sm font-semibold text-foreground">Performance Comercial</span>
              </div>
              {hasPerf && <Badge variant="outline" className={cn("text-[10px] border font-semibold", pTag.bg, pTag.color)}>{pTag.text}</Badge>}
            </div>
            {!hasPerf ? (
              <EmptyHint text="Performance será calculada após atividade mínima de leads." />
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                    className={cn("text-4xl font-bold tabular-nums", pTag.color)}>
                    {perfScore!.performanceScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
                  </motion.p>
                  <div className="flex-1">
                    <div className="h-[10px] bg-secondary/20 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${perfScore!.performanceScore}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", {
                          "bg-emerald-500/70": perfScore!.performanceScore >= 80,
                          "bg-blue-500/70": perfScore!.performanceScore >= 60 && perfScore!.performanceScore < 80,
                          "bg-amber-500/70": perfScore!.performanceScore >= 40 && perfScore!.performanceScore < 60,
                          "bg-red-500/70": perfScore!.performanceScore < 40,
                        })} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {perfBars.map((bar) => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <bar.icon size={10} className="text-muted-foreground/50" />{bar.label}
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">{bar.value}%</span>
                      </div>
                      <div className="h-[6px] bg-secondary/20 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${bar.value}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full bg-blue-500/50" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-3">Calculado com base em SLA e aproveitamento real.</p>
              </>
            )}
          </div>

          {/* Funil de Leads (4 col) */}
          <div className="rv-card rounded-xl p-5 lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Funil de Leads</span>
              </div>
              {totalLeads > 0 && <span className="text-[10px] text-muted-foreground tabular-nums">{totalLeads} leads</span>}
            </div>
            {isEmpty ? (
              <EmptyHint text="Classificação automática será exibida após interação dos leads." />
            ) : (
              <div className="space-y-3">
                {funnelOrder.map((bucket, idx) => {
                  const count = stats?.bucketCounts[bucket] || 0;
                  const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  const nextCount = idx < funnelOrder.length - 1 ? (stats?.bucketCounts[funnelOrder[idx + 1]] || 0) : null;
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
                                {totalLeads > 0 && <span className="text-[10px] text-muted-foreground/50 tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>}
                              </div>
                            </div>
                            <div className="h-[5px] bg-secondary/20 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pct, totalLeads > 0 ? 2 : 0)}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={cn("h-full rounded-full", barFill[bucket])} />
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
            )}
          </div>
        </div>
      </FadeIn>

      {/* ═══ L4: GARGALOS (5 compact cards) ═══ */}
      {bottleneckCards.length > 0 && (
        <FadeIn delay={0.16}>
          <div className="mb-5">
            <p className="rv-label mb-2">Gargalos · 7 dias</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {bottleneckCards.map((c) => (
                <div key={c.label} className="rv-card rounded-lg px-3 py-2.5" style={{ minHeight: 80 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center", c.bg)}>
                      <c.icon size={11} className={c.color} />
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground truncate">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-lg font-bold tabular-nums", c.critical ? "text-red-400" : "text-foreground")}>{c.value}</p>
                    {c.critical && <Badge variant="outline" className="text-[8px] border-red-500/20 text-red-400 px-1 py-0">Crítico</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ L5: MATURIDADE (6 col) + PERDAS (6 col) ═══ */}
      <FadeIn delay={0.2}>
        <div className="grid lg:grid-cols-2 gap-3 mb-5">
          {/* Maturidade */}
          <div className="rv-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Índice de Maturidade Comercial</span>
            </div>
            {!maturity || maturity.total === 0 ? (
              <EmptyHint text="Índice será calculado após período mínimo de operação." />
            ) : (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-center">
                    <p className={cn("text-[28px] font-bold", mLabel!.color)}>{maturity.total}</p>
                    <p className={cn("text-[10px] font-semibold mt-0.5", mLabel!.color)}>{mLabel!.text}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-[8px] bg-secondary/20 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${maturity.total}%` }}
                        transition={{ duration: 0.6 }}
                        className={cn("h-full rounded-full", {
                          "bg-emerald-500/70": maturity.total >= 81,
                          "bg-blue-500/70": maturity.total >= 61 && maturity.total < 81,
                          "bg-amber-500/70": maturity.total >= 31 && maturity.total < 61,
                          "bg-red-500/70": maturity.total < 31,
                        })} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {mDimensions.map((dim) => (
                    <div key={dim.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{dim.name}</span>
                        <span className="font-medium text-foreground tabular-nums">{dim.value}%</span>
                      </div>
                      <div className="h-[4px] bg-secondary/20 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${dim.value}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full bg-primary/40" />
                      </div>
                      <p className="text-[9px] text-muted-foreground/40">Peso: {dim.weight}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Perdas financeiras */}
          {moneyLossItems.length > 0 ? (
            <div className="rv-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-red-400" />
                <span className="text-sm font-semibold text-foreground">Onde Você Está Perdendo Dinheiro</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moneyLossItems.map((item) => (
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
          ) : !isEmpty ? (
            <div className="rv-card rounded-xl p-5 flex items-center justify-center">
              <p className="text-[11px] text-muted-foreground">Nenhum gargalo financeiro detectado no momento.</p>
            </div>
          ) : null}
        </div>
      </FadeIn>

      {/* ═══ L6: INTENÇÃO (conditional) ═══ */}
      {intentData.length > 0 && (
        <FadeIn delay={0.24}>
          <div className="rv-card rounded-xl p-5 mb-5">
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

      {/* ═══ L7: TOP 10 OPORTUNIDADES ═══ */}
      {(stats?.topOpportunities.length || 0) > 0 && (
        <FadeIn delay={0.28}>
          <div className="rv-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Top 10 Oportunidades</span>
              </div>
              <Link to="/revenue/leads" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>
            <div className="grid grid-cols-12 gap-2 px-5 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/10">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Lead</span>
              <span className="col-span-2 text-right">Score</span>
              <span className="col-span-2 text-center">Nível</span>
              <span className="col-span-3">Ação</span>
            </div>
            <div>
              {stats!.topOpportunities.map((lead, idx) => (
                <Link key={lead.id} to={`/revenue/leads/${lead.id}`}
                  className="grid grid-cols-12 gap-2 px-5 py-2 items-center hover:bg-secondary/15 transition-colors group border-b border-border/5 last:border-b-0">
                  <span className="col-span-1 text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors tabular-nums">{idx + 1}</span>
                  <div className="col-span-4">
                    <p className="text-[12px] font-medium text-foreground truncate">{lead.name || lead.phone_e164}</p>
                  </div>
                  <span className="col-span-2 text-right text-[12px] font-bold text-foreground tabular-nums">{lead.score_total}</span>
                  <div className="col-span-2 flex justify-center">
                    <Badge variant="outline" className={cn("text-[9px]", {
                      "border-blue-500/20 text-blue-400": lead.status_bucket === "COLD",
                      "border-amber-500/20 text-amber-400": lead.status_bucket === "ENGAGED",
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
      )}
    </div>
  );
};

export default RevenueDashboard;
