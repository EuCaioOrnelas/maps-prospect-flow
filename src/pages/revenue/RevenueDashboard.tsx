import { Link } from "react-router-dom";
import {
  Flame,
  AlertTriangle,
  DollarSign,
  Info,
  Target,
  Gauge,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  useRevenueDashboardStats,
  useRevenueSettings,
  useRevenueIntentDistribution,
  useRevenuePerformanceScore,
  useRevenueAtRisk,
  useRevenueTrend7d,
  useRevenueFunnelProgression,
} from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { BottleneckCards } from "@/components/revenue/BottleneckCards";
import { MaturityGauge } from "@/components/revenue/MaturityGauge";
import { AlertsPanel } from "@/components/revenue/AlertsPanel";
import { ActionRequiredToday } from "@/components/revenue/ActionRequiredToday";
import { MoneyLossSection } from "@/components/revenue/MoneyLossSection";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const bucketLabels: Record<string, string> = {
  COLD: "Frio", ENGAGED: "Morno", HOT: "Engajado", VERY_HOT: "Quente",
};

const bucketColors: Record<string, string> = {
  COLD: "bg-muted/50 text-muted-foreground border-border/40",
  ENGAGED: "bg-muted/50 text-foreground border-border/40",
  HOT: "bg-primary/8 text-primary border-primary/20",
  VERY_HOT: "bg-primary/15 text-primary border-primary/30",
};

const riskLabels: Record<string, string> = {
  OK: "Saudável", COOLING: "Esfriando", AT_RISK: "Em Risco",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-muted text-muted-foreground",
  AT_RISK: "bg-destructive/10 text-destructive",
};

const intentLabels: Record<string, string> = {
  INTENT_PRICE: "Preço", INTENT_BUY_NOW: "Compra", INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento", INTENT_PROPOSAL: "Proposta", INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção", INTENT_NEGATIVE: "Negativo",
};

const intentBarColors: Record<string, string> = {
  INTENT_PRICE: "#f59e0b", INTENT_BUY_NOW: "#ef4444", INTENT_AVAILABILITY: "#3b82f6",
  INTENT_PAYMENT: "#8b5cf6", INTENT_PROPOSAL: "#10b981", INTENT_URGENT: "#f97316",
  INTENT_OBJECTION: "#eab308", INTENT_NEGATIVE: "#6b7280",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const TrendArrow = ({ value }: { value: number | null }) => {
  if (value === null || value === 0) return null;
  const isUp = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", isUp ? "text-primary" : "text-destructive")}>
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(value)}%
    </span>
  );
};

const EmptyMetric = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground/60 italic">{text}</p>
);

const performanceDiagnostic = (score: number, hasData: boolean) => {
  if (!hasData) return null;
  if (score < 40) return { text: "Baixa eficiência operacional detectada.", color: "text-destructive" };
  if (score <= 70) return { text: "Operação estável, com pontos de melhoria.", color: "text-muted-foreground" };
  return { text: "Operação saudável.", color: "text-primary" };
};

const RevenueDashboard = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();
  const { data: intentDist } = useRevenueIntentDistribution();
  const { data: perfScore } = useRevenuePerformanceScore();
  const { data: atRisk } = useRevenueAtRisk();
  const { data: trends } = useRevenueTrend7d();
  const { data: funnel } = useRevenueFunnelProgression();

  const ticket = settings?.default_ticket_value || 3000;
  const closeRates = {
    COLD: settings?.default_close_rate_cold || 0.05,
    ENGAGED: settings?.default_close_rate_engaged || 0.15,
    HOT: settings?.default_close_rate_hot || 0.35,
    VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
  };

  // Only consider leads with real interactions (score > 0) for metrics
  const interactedLeads = stats?.allLeads?.filter((l) => l.score_total > 0) || [];
  const hasLeads = interactedLeads.length > 0;

  // Receita esperada only from leads with actual engagement
  const interactedBucketCounts = {
    COLD: interactedLeads.filter((l) => l.status_bucket === "COLD").length,
    ENGAGED: interactedLeads.filter((l) => l.status_bucket === "ENGAGED").length,
    HOT: interactedLeads.filter((l) => l.status_bucket === "HOT").length,
    VERY_HOT: interactedLeads.filter((l) => l.status_bucket === "VERY_HOT").length,
  };

  const receitaEsperada = Object.entries(interactedBucketCounts).reduce(
    (sum, [bucket, count]) => sum + count * ticket * (closeRates[bucket as keyof typeof closeRates] || 0), 0
  );

  const hotAndVeryHot = interactedBucketCounts.HOT + interactedBucketCounts.VERY_HOT;

  const intentData = Object.entries(intentDist || {})
    .map(([key, count]) => ({ name: intentLabels[key] || key, value: count, key }))
    .sort((a, b) => b.value - a.value);

  const diagnostic = performanceDiagnostic(perfScore?.performanceScore || 0, perfScore?.hasData || false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Centro de Decisão Comercial</h1>
        <p className="text-sm text-muted-foreground">
          Priorize ações, identifique riscos e controle sua operação em tempo real
        </p>
      </div>

      {/* KPIs — Nova ordem: Risco → Receita → Hot → Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Receita em Risco */}
        <Card className={cn(
          "border",
          (atRisk?.value || 0) > 0
            ? "bg-destructive/[0.04] border-destructive/20"
            : "bg-card border-border/40"
        )}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className={(atRisk?.value || 0) > 0 ? "text-destructive" : "text-muted-foreground/70"} />
              <span className="text-xs font-semibold text-muted-foreground">Receita em Risco</span>
            </div>
            {!atRisk?.hasData ? (
              <EmptyMetric text="Aguardando dados" />
            ) : atRisk.value > 0 ? (
              <>
                <p className="text-2xl font-bold text-destructive">{fmt(atRisk.value)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {atRisk.count} de {atRisk.hotTotal} leads quentes em risco
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-foreground">{fmt(0)}</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Receita Esperada */}
        <Card className={cn("border", hasLeads ? "bg-primary/5 border-primary/20" : "bg-card border-border/40")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className={hasLeads ? "text-primary" : "text-muted-foreground/70"} />
              <span className="text-xs font-semibold text-muted-foreground">Receita Esperada</span>
              {trends?.hasSufficientData && <TrendArrow value={trends.revenueExpectedDelta} />}
            </div>
            {!hasLeads ? (
              <EmptyMetric text="Aguardando atividade real" />
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{fmt(receitaEsperada)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Baseado em {hotAndVeryHot} lead{hotAndVeryHot !== 1 ? "s" : ""} quente{hotAndVeryHot !== 1 ? "s" : ""} × {fmt(ticket)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Leads Muito Quentes */}
        <Card className="bg-card border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className={hotAndVeryHot > 0 ? "text-primary" : "text-muted-foreground/70"} />
              <span className="text-xs font-medium text-muted-foreground">Engajados + Quentes</span>
              {trends?.hasSufficientData && <TrendArrow value={trends.hotLeadsDelta} />}
            </div>
            {!hasLeads ? (
              <EmptyMetric text="Sem leads registrados" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{hotAndVeryHot}</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Performance / Diagnóstico */}
        <Card className={cn(
          "border",
          !perfScore?.hasData ? "bg-card border-border/40" :
          perfScore.performanceScore >= 60 ? "bg-card border-border/40" : "bg-destructive/[0.03] border-destructive/15"
        )}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={16} className="text-muted-foreground/70" />
              <span className="text-xs font-medium text-muted-foreground">Performance</span>
            </div>
            {!perfScore?.hasData ? (
              <EmptyMetric text="Dados insuficientes" />
            ) : (
              <>
                <p className={cn("text-2xl font-bold",
                  perfScore.performanceScore >= 60 ? "text-foreground" : "text-destructive"
                )}>
                  {perfScore.performanceScore}/100
                </p>
                {diagnostic && (
                  <p className={cn("text-[10px] mt-0.5", diagnostic.color)}>{diagnostic.text}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🔥 Ação Necessária Hoje */}
      <ActionRequiredToday />

      {/* Alerts */}
      <AlertsPanel />

      {/* Onde Você Está Perdendo Dinheiro */}
      <MoneyLossSection />

      {/* Gargalos */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Gargalos Detectados (7 dias)
        </h2>
        <BottleneckCards />
      </div>

      {/* Diagnóstico da Operação + Maturidade */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Diagnóstico da Operação Comercial</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">Métrica composta: tempo de resposta (30%), leads quentes respondidos (40%), leads ignorados (20%) e consistência (10%).</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {diagnostic && (
              <p className={cn("text-xs font-medium mt-1", diagnostic.color)}>{diagnostic.text}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {!perfScore?.hasData ? (
              <EmptyMetric text="Aguardando atividade real para gerar diagnóstico." />
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tempo médio resposta</span>
                  <span className="font-medium text-foreground">{perfScore.avgResponseTimeMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Leads quentes respondidos</span>
                  <span className="font-medium text-foreground">{perfScore.hotResponseRate}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Taxa de ignorados</span>
                  <span className="font-medium text-foreground">{perfScore.ignoredRate}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Consistência de atividade</span>
                  <span className="font-medium text-foreground">{perfScore.consistencyRate}%</span>
                </div>
                <Progress value={perfScore.consistencyRate} className="h-2 mt-2" />
              </>
            )}
          </CardContent>
        </Card>

        <MaturityGauge />
      </div>

      {/* Distribuição por Nível + Progressão do Funil */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Distribuição por Nível</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasLeads ? (
            <EmptyMetric text="Ranking será gerado conforme surgirem leads." />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {(["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const).map((bucket) => {
                  const count = stats?.bucketCounts[bucket] || 0;
                  return (
                    <div key={bucket} className={cn("rounded-lg border p-3 text-center", bucketColors[bucket])}>
                      <p className="text-xs font-medium opacity-80">{bucketLabels[bucket]}</p>
                      <p className="text-xl font-bold mt-1">{count}</p>
                    </div>
                  );
                })}
              </div>

              {/* Funnel Progression */}
              {funnel?.hasSufficientData && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Taxa de Progressão Real
                  </p>
                  <div className="flex gap-6">
                    {funnel.coldToEngagedRate !== null && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Frio → Morno:</span>{" "}
                        <span className="font-bold text-foreground">{funnel.coldToEngagedRate}%</span>
                      </div>
                    )}
                    {funnel.engagedToHotRate !== null && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Morno → Quente:</span>{" "}
                        <span className="font-bold text-foreground">{funnel.engagedToHotRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Intent Distribution */}
      {intentData.length > 0 && (
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target size={16} />
              <CardTitle className="text-base font-semibold">Sinais de Intenção (7 dias)</CardTitle>
            </div>
            <CardDescription>Distribuição de intenções detectadas nas mensagens dos leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={75} />
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

      {/* Top 10 Oportunidades */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <CardTitle className="text-base font-semibold">Top 10 Oportunidades</CardTitle>
            </div>
            <Link to="/revenue/leads" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          <CardDescription>Ranking por prioridade real: score × risco × recência</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasLeads ? (
            <div className="py-8 text-center">
              <EmptyMetric text="Ranking será gerado automaticamente conforme surgirem oportunidades." />
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.topOpportunities.map((lead, idx) => {
                const timeSince = formatDistanceToNow(new Date(lead.last_activity_at), {
                  addSuffix: false, locale: ptBR,
                });

                return (
                  <Link
                    key={lead.id}
                    to={`/revenue/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {lead.phone_e164}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Score: {lead.score_total} • {lead.recommendedAction}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock size={9} /> {timeSince}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", bucketColors[lead.status_bucket])}>
                        {bucketLabels[lead.status_bucket]}
                      </Badge>
                      {lead.risk_state !== "OK" && (
                        <Badge variant="outline" className={cn("text-[10px]", riskBadge[lead.risk_state])}>
                          {riskLabels[lead.risk_state]}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDashboard;
