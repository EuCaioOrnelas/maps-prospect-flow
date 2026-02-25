import { Link } from "react-router-dom";
import {
  Flame,
  AlertTriangle,
  Activity,
  DollarSign,
  Info,
  Target,
  Gauge,
  BarChart3,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  useRevenueDashboardStats,
  useRevenueSettings,
  useRevenueIntentDistribution,
  useRevenuePerformanceScore,
  useRevenueOpportunityIndex,
} from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { BottleneckCards } from "@/components/revenue/BottleneckCards";
import { MaturityGauge } from "@/components/revenue/MaturityGauge";
import { AlertsPanel } from "@/components/revenue/AlertsPanel";

const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Morno",
  HOT: "Engajado",
  VERY_HOT: "Quente",
};

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskLabels: Record<string, string> = {
  OK: "Saudável",
  COOLING: "Esfriando",
  AT_RISK: "Em Risco",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-warning/10 text-warning",
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

const performanceColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-destructive";
};

const RevenueDashboard = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();
  const { data: intentDist } = useRevenueIntentDistribution();
  const { data: perfScore } = useRevenuePerformanceScore();
  const { data: oppIndex } = useRevenueOpportunityIndex();

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

  // Intent chart data
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
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Receita</h1>
        <p className="text-sm text-muted-foreground">
          Inteligência comercial em tempo real — acompanhe engajamento, oportunidades e performance
        </p>
      </div>

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
              <Activity size={16} />
              <span className="text-xs font-medium">Ativos (7d)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.active7d || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
              <Flame size={16} className="text-primary" />
              <span className="text-xs font-medium">Engajados + Quentes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.hotCount || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
              <AlertTriangle size={16} className="text-destructive/70" />
              <span className="text-xs font-medium">Em Risco</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.atRiskCount || 0}</p>
          </CardContent>
        </Card>

        {/* Highlighted: Receita Esperada */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <DollarSign size={16} />
              <span className="text-xs font-semibold">Receita Esperada</span>
            </div>
            <p className="text-2xl font-bold text-primary">{fmt(receitaEsperada)}</p>
          </CardContent>
        </Card>

        {/* Highlighted: Performance */}
        <Card className={cn(
          "border",
          (perfScore?.performanceScore || 0) >= 60
            ? "bg-primary/5 border-primary/20"
            : "bg-destructive/5 border-destructive/20"
        )}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={16} className={performanceColor(perfScore?.performanceScore || 0)} />
              <span className="text-xs font-semibold text-muted-foreground">Performance</span>
            </div>
            <p className={cn("text-2xl font-bold", performanceColor(perfScore?.performanceScore || 0))}>
              {perfScore?.performanceScore || 0}/100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <AlertsPanel />

      {/* Bottleneck Map */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Gargalos Detectados (7 dias)
        </h2>
        <BottleneckCards />
      </div>

      {/* Performance Score Details + Maturity Index */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Performance Score */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Índice de Performance Comercial</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">Métrica composta baseada em: tempo de resposta (30%), leads quentes respondidos (40%), leads ignorados (20%) e consistência (10%).</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tempo médio resposta</span>
              <span className="font-medium text-foreground">{perfScore?.avgResponseTimeMinutes || 0} min</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Leads quentes respondidos</span>
              <span className="font-medium text-foreground">{perfScore?.hotResponseRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Taxa de ignorados</span>
              <span className="font-medium text-foreground">{perfScore?.ignoredRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Consistência de atividade</span>
              <span className="font-medium text-foreground">{perfScore?.consistencyRate || 0}%</span>
            </div>
            <Progress value={perfScore?.performanceScore || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        {/* Maturity Index */}
        <MaturityGauge />
      </div>

      {/* Bucket Distribution */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Distribuição por Nível</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {(["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const).map((bucket) => (
              <div key={bucket} className={cn("rounded-lg border p-3 text-center", bucketColors[bucket])}>
                <p className="text-xs font-medium opacity-80">{bucketLabels[bucket]}</p>
                <p className="text-xl font-bold mt-1">{stats?.bucketCounts[bucket] || 0}</p>
              </div>
            ))}
          </div>
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

      {/* Top 10 Oportunidades Hoje */}
      <Card className="bg-primary/[0.03] border-primary/15">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <CardTitle className="text-base font-semibold">Top 10 Oportunidades Hoje</CardTitle>
            </div>
            <Link to="/revenue/leads" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          <CardDescription>
            Ranking baseado em score × peso + risco + recência de atividade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.topOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lead registrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.topOpportunities.map((lead, idx) => (
                <Link
                  key={lead.id}
                  to={`/revenue/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {lead.name || lead.phone_e164}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Score: {lead.score_total} • {lead.recommendedAction}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDashboard;
