import { Link } from "react-router-dom";
import {
  Flame,
  AlertTriangle,
  Activity,
  DollarSign,
  Target,
  Gauge,
  Zap,
  Info,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const performanceColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-destructive";
};

/* ── Hover KPI Card ── */
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  accent?: string;
  highlight?: boolean;
}

const KPICard = ({ icon, label, value, description, accent = "text-muted-foreground", highlight = false }: KPICardProps) => (
  <HoverCard openDelay={200} closeDelay={100}>
    <HoverCardTrigger asChild>
      <Card className={cn(
        "bg-card border-border/50 cursor-default transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        highlight && "ring-1 ring-primary/20"
      )}>
        <CardContent className="pt-5 pb-4">
          <div className={cn("flex items-center gap-2 mb-2", accent)}>
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <p className={cn("text-2xl font-bold", highlight ? accent : "text-foreground")}>{value}</p>
        </CardContent>
      </Card>
    </HoverCardTrigger>
    <HoverCardContent side="bottom" className="w-72 text-sm">
      <div className="flex items-start gap-2">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </HoverCardContent>
  </HoverCard>
);

/* ── Bucket Bar ── */
const BucketBar = ({ bucket, count, total }: { bucket: string; count: number; total: number }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap: Record<string, string> = {
    COLD: "bg-blue-500",
    ENGAGED: "bg-yellow-500",
    HOT: "bg-orange-500",
    VERY_HOT: "bg-red-500",
  };
  const textColorMap: Record<string, string> = {
    COLD: "text-blue-400",
    ENGAGED: "text-yellow-400",
    HOT: "text-orange-400",
    VERY_HOT: "text-red-400",
  };

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-3 cursor-default group">
          <span className={cn("text-xs font-medium w-16 text-right", textColorMap[bucket])}>
            {bucketLabels[bucket]}
          </span>
          <div className="flex-1 h-6 bg-secondary/30 rounded-md overflow-hidden">
            <div
              className={cn("h-full rounded-md transition-all duration-500", colorMap[bucket])}
              style={{ width: `${Math.max(pct, 2)}%`, opacity: 0.7 }}
            />
          </div>
          <span className="text-sm font-bold text-foreground w-8">{count}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-64 text-sm">
        <p className="font-medium text-foreground mb-1">{bucketLabels[bucket]}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{bucketDescriptions[bucket]}</p>
        <p className="text-xs text-muted-foreground/60 mt-2">{pct.toFixed(1)}% do total de leads</p>
      </HoverCardContent>
    </HoverCard>
  );
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

  const totalLeads = stats
    ? Object.values(stats.bucketCounts).reduce((a, b) => a + b, 0)
    : 0;

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
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Receita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada da operação comercial — passe o mouse nos cards para detalhes
        </p>
      </div>

      {/* ═══ TIER 1: Hero KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<DollarSign size={18} />}
          label="Receita Esperada"
          value={fmt(receitaEsperada)}
          accent="text-primary"
          highlight
          description="Projeção de receita baseada na quantidade de leads em cada nível, multiplicada pelo ticket médio e taxa de conversão configurada."
        />
        <KPICard
          icon={<Flame size={18} />}
          label="Engajados + Quentes"
          value={stats?.hotCount || 0}
          accent="text-orange-400"
          highlight
          description="Total de leads nos níveis 'Engajado' e 'Quente' — são as oportunidades com maior probabilidade de fechamento."
        />
        <KPICard
          icon={<Activity size={18} />}
          label="Ativos (7d)"
          value={stats?.active7d || 0}
          description="Leads que tiveram pelo menos uma interação nos últimos 7 dias. Indica o tamanho ativo do seu pipeline."
        />
        <KPICard
          icon={<AlertTriangle size={18} />}
          label="Em Risco"
          value={stats?.atRiskCount || 0}
          accent="text-destructive"
          description="Leads que pararam de interagir e estão esfriando. Precisam de atenção imediata para não perder a oportunidade."
        />
      </div>

      {/* ═══ TIER 2: Alertas (condicional) ═══ */}
      <AlertsPanel />

      {/* ═══ TIER 2: Performance + Distribuição ═══ */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Performance Score - mais compacto */}
        <Card className="bg-card border-border/50 lg:col-span-2">
          <CardContent className="pt-5 pb-4">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center justify-between cursor-default mb-4">
                  <div className="flex items-center gap-2">
                    <Gauge size={16} className={performanceColor(perfScore?.performanceScore || 0)} />
                    <span className="text-sm font-semibold text-foreground">Performance</span>
                  </div>
                  <p className={cn("text-3xl font-bold", performanceColor(perfScore?.performanceScore || 0))}>
                    {perfScore?.performanceScore || 0}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-80">
                <p className="text-xs text-muted-foreground">Índice composto: tempo de resposta (30%), leads quentes respondidos (40%), taxa de ignorados (20%) e consistência (10%).</p>
              </HoverCardContent>
            </HoverCard>
            <Progress value={perfScore?.performanceScore || 0} className="h-2 mb-4" />
            <div className="space-y-2.5">
              {[
                { label: "Tempo médio resposta", value: `${perfScore?.avgResponseTimeMinutes || 0} min` },
                { label: "Quentes respondidos", value: `${perfScore?.hotResponseRate || 0}%` },
                { label: "Taxa de ignorados", value: `${perfScore?.ignoredRate || 0}%` },
                { label: "Consistência", value: `${perfScore?.consistencyRate || 0}%` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por nível - barra horizontal */}
        <Card className="bg-card border-border/50 lg:col-span-3">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Distribuição por Nível</span>
              <span className="text-xs text-muted-foreground">{totalLeads} leads</span>
            </div>
            <div className="space-y-3">
              {(["VERY_HOT", "HOT", "ENGAGED", "COLD"] as const).map((bucket) => (
                <BucketBar
                  key={bucket}
                  bucket={bucket}
                  count={stats?.bucketCounts[bucket] || 0}
                  total={totalLeads}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ TIER 3: Gargalos ═══ */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Gargalos (7 dias)
        </p>
        <BottleneckCards />
      </div>

      {/* ═══ TIER 3: Maturidade ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <MaturityGauge />

        {/* Intent Distribution */}
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

      {/* ═══ TIER 4: Top Oportunidades ═══ */}
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
            <Link to="/revenue/leads" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.topOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lead registrado ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDashboard;
