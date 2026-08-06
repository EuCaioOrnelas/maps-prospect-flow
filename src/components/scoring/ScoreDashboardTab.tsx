import { useEffect, useState } from "react";
import { MetricSlot, isMetricEmpty } from "@/components/ui/metric-empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, TrendingDown, Target, AlertTriangle, Zap, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardData {
  total_users: number;
  avg_score: number;
  median_score: number;
  by_band: Record<string, number>;
  high_score: number;
  at_risk: number;
  ready_upgrade: number;
  trends: { rising: number; stable: number; falling: number };
  top_positive_events: { name: string; count: number }[];
  top_negative_events: { name: string; count: number }[];
}

const BAND_COLORS: Record<string, string> = {
  "Frio": "hsl(0, 72%, 51%)",
  "Baixo engajamento": "hsl(45, 93%, 47%)",
  "Engajado": "hsl(200, 98%, 39%)",
  "Alto valor": "hsl(158, 72%, 38%)",
  "Pronto para upgrade": "hsl(262, 83%, 58%)",
};

export const ScoreDashboardTab = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("score-processor", {
        body: { action: "get_dashboard" },
      });
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Erro ao carregar dashboard.</p>;

  const bandData = Object.entries(data.by_band).map(([name, value]) => ({
    name,
    value,
    color: BAND_COLORS[name] || "hsl(var(--muted))",
  }));

  const kpis = [
    { label: "Total com Score", value: data.total_users, icon: Users, color: "text-primary", emptyHint: "Preenchido quando usuários receberem pontuação." },
    { label: "Score Médio", value: data.avg_score.toFixed(1), icon: BarChart3, color: "text-blue-400", emptyHint: "Calculado após os primeiros scores." },
    { label: "Score Mediano", value: data.median_score.toFixed(1), icon: Target, color: "text-yellow-400", emptyHint: "Exige volume mínimo de usuários pontuados." },
    { label: "Alto Valor", value: data.high_score, icon: TrendingUp, color: "text-emerald-400", emptyHint: "Aparece quando alguém atingir score alto." },
    { label: "Em Risco", value: data.at_risk, icon: AlertTriangle, color: "text-destructive", emptyHint: "Nenhum usuário em risco no momento." },
    { label: "Prontos p/ Upgrade", value: data.ready_upgrade, icon: Zap, color: "text-purple-400", emptyHint: "Disponível conforme o uso evoluir." },
    { label: "Em Alta", value: data.trends.rising, icon: TrendingUp, color: "text-emerald-400", emptyHint: "Requer histórico de scores para comparar." },
    { label: "Em Queda", value: data.trends.falling, icon: TrendingDown, color: "text-destructive", emptyHint: "Requer histórico de scores para comparar." },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-5 w-5 ${isMetricEmpty(kpi.value) ? "text-muted-foreground/40" : kpi.color}`} />
                <div className="min-w-0">
                  {isMetricEmpty(kpi.value) && (
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  )}
                  <MetricSlot
                    empty={isMetricEmpty(kpi.value)}
                    hint={kpi.emptyHint}
                    size="sm"
                    className={isMetricEmpty(kpi.value) ? "mt-0.5 min-h-[40px]" : "min-h-[40px]"}
                  >
                    <>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </>
                  </MetricSlot>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Band */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Distribuição por Faixa</CardTitle></CardHeader>
          <CardContent>
            {bandData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={bandData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {bandData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Top Eventos Positivos</CardTitle></CardHeader>
          <CardContent>
            {(data.top_positive_events?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.top_positive_events} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum evento registrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Negative Events */}
      {(data.top_negative_events?.length || 0) > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Top Eventos Negativos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.top_negative_events} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={180} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
