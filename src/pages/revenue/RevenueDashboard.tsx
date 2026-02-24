import { Link } from "react-router-dom";
import {
  Users,
  Flame,
  AlertTriangle,
  Activity,
  DollarSign,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRevenueDashboardStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Engajado",
  HOT: "Quente",
  VERY_HOT: "Muito Quente",
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

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const RevenueDashboard = () => {
  const { data: stats, isLoading } = useRevenueDashboardStats();
  const { data: settings } = useRevenueSettings();

  const ticket = settings?.default_ticket_value || 3000;
  const closeRates = {
    COLD: settings?.default_close_rate_cold || 0.05,
    ENGAGED: settings?.default_close_rate_engaged || 0.15,
    HOT: settings?.default_close_rate_hot || 0.35,
    VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
  };

  const receitaPotencial = stats
    ? (stats.bucketCounts.HOT + stats.bucketCounts.VERY_HOT) * ticket
    : 0;

  const receitaEsperada = stats
    ? Object.entries(stats.bucketCounts).reduce(
        (sum, [bucket, count]) =>
          sum + count * ticket * (closeRates[bucket as keyof typeof closeRates] || 0),
        0
      )
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Painel de Receita
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o engajamento dos seus leads e a projeção de faturamento em tempo real
          </p>
        </div>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity size={16} />
                <span className="text-xs font-medium">Ativos (7 dias)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    <p className="text-xs">Leads que tiveram qualquer interação (enviaram ou receberam mensagem) nos últimos 7 dias.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.active7d || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <Flame size={16} />
                <span className="text-xs font-medium">Quentes + Muito Quentes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.hotCount || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Score acima de 350 pts</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle size={16} />
                <span className="text-xs font-medium">Em Risco</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    <p className="text-xs">Leads que estão esfriando ou em risco de perda por inatividade prolongada.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.atRiskCount || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <DollarSign size={16} />
                <span className="text-xs font-medium">Receita Esperada</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px]">
                    <p className="text-xs">Soma de (leads × ticket médio × taxa de conversão) de cada nível. Ajuste as taxas em Configurações.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(receitaEsperada)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bucket Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Distribuição por Nível de Engajamento</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p className="text-xs">Cada lead recebe um score de 0 a 1000 baseado nas suas interações. O nível é calculado automaticamente:</p>
                <ul className="text-xs mt-1 space-y-0.5">
                  <li>• <strong>Frio:</strong> 0–149 pts</li>
                  <li>• <strong>Engajado:</strong> 150–349 pts</li>
                  <li>• <strong>Quente:</strong> 350–649 pts</li>
                  <li>• <strong>Muito Quente:</strong> 650–1000 pts</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {(["COLD", "ENGAGED", "HOT", "VERY_HOT"] as const).map((bucket) => (
              <div
                key={bucket}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  bucketColors[bucket]
                )}
              >
                <p className="text-xs font-medium opacity-80">{bucketLabels[bucket]}</p>
                <p className="text-xl font-bold mt-1">
                  {stats?.bucketCounts[bucket] || 0}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receita Potencial */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Potencial (Quentes + Muito Quentes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{fmt(receitaPotencial)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Se todos os leads quentes fecharem — ticket médio de {fmt(ticket)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads Rastreados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {stats?.totalLeads || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Leads que interagiram via WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Oportunidades */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Principais Oportunidades
            </CardTitle>
            <Link
              to="/revenue/leads"
              className="text-xs text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.topOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lead registrado ainda. Os leads aparecerão aqui conforme as mensagens de WhatsApp forem processadas.
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.topOpportunities.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/revenue/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {lead.score_total}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {lead.name || lead.phone_e164}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone_e164}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", bucketColors[lead.status_bucket])}
                    >
                      {bucketLabels[lead.status_bucket]}
                    </Badge>
                    {lead.risk_state !== "OK" && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", riskBadge[lead.risk_state])}
                      >
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
