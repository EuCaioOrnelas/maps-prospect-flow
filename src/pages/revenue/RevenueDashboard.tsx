import { Link } from "react-router-dom";
import {
  Users,
  Flame,
  AlertTriangle,
  TrendingUp,
  Activity,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueDashboardStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-warning/10 text-warning",
  AT_RISK: "bg-destructive/10 text-destructive",
};

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
            Wiize Revenue
          </h1>
          <p className="text-sm text-muted-foreground">
            Inteligência comportamental de engajamento
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
          BETA ADMIN
        </Badge>
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
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity size={16} />
                <span className="text-xs font-medium">Ativos (7d)</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.active7d || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <Flame size={16} />
                <span className="text-xs font-medium">HOT + VERY HOT</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.hotCount || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle size={16} />
                <span className="text-xs font-medium">Em Risco</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.atRiskCount || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <DollarSign size={16} />
                <span className="text-xs font-medium">Receita Esperada</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }).format(receitaEsperada)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bucket Distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Distribuição por Bucket</CardTitle>
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
                <p className="text-xs font-medium opacity-80">{bucket.replace("_", " ")}</p>
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
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Potencial (HOT+VERY_HOT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(receitaPotencial)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ticket médio: R$ {ticket.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {stats?.totalLeads || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os leads rastreados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Oportunidades */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Top Oportunidades
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
                      {lead.status_bucket.replace("_", " ")}
                    </Badge>
                    {lead.risk_state !== "OK" && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", riskBadge[lead.risk_state])}
                      >
                        {lead.risk_state}
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
