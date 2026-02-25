import { useState } from "react";
import { TrendingUp, BarChart3, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from "recharts";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const useTrendData = (days: number) => {
  const { user } = useAuth();
  const { data: settings } = useRevenueSettings();

  return useQuery({
    queryKey: ["revenue-trends", user?.id, days],
    queryFn: async () => {
      const since = subDays(new Date(), days);

      // Get snapshots for bucket evolution
      const { data: snapshots, error } = await supabase
        .from("revenue_score_snapshots")
        .select("snapshot_date, status_bucket, score_value")
        .gte("snapshot_date", since.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, { hot: number; veryHot: number; engaged: number; cold: number; totalScore: number; count: number }>();

      for (const s of (snapshots || []) as any[]) {
        const d = s.snapshot_date;
        if (!dateMap.has(d)) {
          dateMap.set(d, { hot: 0, veryHot: 0, engaged: 0, cold: 0, totalScore: 0, count: 0 });
        }
        const entry = dateMap.get(d)!;
        entry.count++;
        entry.totalScore += s.score_value;
        if (s.status_bucket === "VERY_HOT") entry.veryHot++;
        else if (s.status_bucket === "HOT") entry.hot++;
        else if (s.status_bucket === "ENGAGED") entry.engaged++;
        else entry.cold++;
      }

      const ticket = settings?.default_ticket_value || 3000;
      const rates = {
        COLD: settings?.default_close_rate_cold || 0.05,
        ENGAGED: settings?.default_close_rate_engaged || 0.15,
        HOT: settings?.default_close_rate_hot || 0.35,
        VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
      };

      const bucketEvolution = Array.from(dateMap.entries()).map(([date, d]) => ({
        date: format(new Date(date + "T12:00:00"), "dd/MM", { locale: ptBR }),
        rawDate: date,
        hot: d.hot + d.veryHot,
        veryHot: d.veryHot,
        engaged: d.engaged,
        cold: d.cold,
        total: d.count,
        avgScore: d.count > 0 ? Math.round(d.totalScore / d.count) : 0,
        receitaEsperada: Math.round(
          d.cold * ticket * rates.COLD +
          d.engaged * ticket * rates.ENGAGED +
          d.hot * ticket * rates.HOT +
          d.veryHot * ticket * rates.VERY_HOT
        ),
      }));

      return { bucketEvolution };
    },
    enabled: !!user,
  });
};

const RevenueTrends = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useTrendData(days);

  const chartData = data?.bucketEvolution || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={24} /> Análise de Tendência
          </h1>
          <p className="text-sm text-muted-foreground">
            Evolução de métricas-chave ao longo do tempo
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <BarChart3 size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum dado de snapshot disponível para o período.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Os snapshots são gerados diariamente pelo processador de receita.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Hot/VeryHot Evolution */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target size={16} className="text-orange-400" /> Evolução de Leads Quentes
              </CardTitle>
              <CardDescription>Quantidade de leads HOT + VERY_HOT por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="hot" stackId="1" name="Quentes" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="veryHot" stackId="1" name="Muito Quentes" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue evolution */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Receita Esperada por Dia
              </CardTitle>
              <CardDescription>Baseada nos snapshots diários × taxas de conversão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => [fmt(value), "Receita Esperada"]}
                    />
                    <Line type="monotone" dataKey="receitaEsperada" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Score Average */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 size={16} /> Score Médio por Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 1000]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="avgScore" name="Score Médio" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenueTrends;
