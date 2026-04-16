import { BarChart3, TrendingUp, Users, DollarSign, Activity, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminKPIs() {
  const { data, loading } = useAdminDashboard();

  const kpis = [
    { label: "MRR Total", value: data ? `R$ ${data.mrr.toLocaleString("pt-BR")}` : "—", icon: DollarSign, color: "text-emerald-500", change: data?.mrrGrowth },
    { label: "Assinantes Ativos", value: data?.activeSubscribers ?? "—", icon: Users, color: "text-blue-500" },
    { label: "Churn Mensal", value: data ? `${data.churnRate.toFixed(1)}%` : "—", icon: TrendingUp, color: data && data.churnRate > 8 ? "text-red-500" : data && data.churnRate > 5 ? "text-yellow-500" : "text-emerald-500" },
    { label: "Ticket Médio", value: data ? `R$ ${data.avgTicket.toLocaleString("pt-BR")}` : "—", icon: Target, color: "text-violet-500" },
    { label: "LTV Estimado", value: data ? `R$ ${data.ltv.toLocaleString("pt-BR")}` : "—", icon: BarChart3, color: "text-amber-500" },
    { label: "Novos 30d", value: data?.newUsers30d ?? "—", icon: Activity, color: "text-cyan-500" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">KPIs Executivos</h1>
        <p className="text-sm text-muted-foreground mt-1">Indicadores-chave de performance do negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/40 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                    {kpi.change !== undefined && (
                      <p className={`text-xs mt-1 ${kpi.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {kpi.change >= 0 ? "+" : ""}{kpi.change.toFixed(1)}% vs mês anterior
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
                    <kpi.icon size={18} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Evolução de KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mrr">
            <TabsList className="mb-4">
              <TabsTrigger value="mrr">MRR</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="churn">Churn</TabsTrigger>
            </TabsList>
            <TabsContent value="mrr">
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Dados históricos de MRR serão exibidos aqui
              </div>
            </TabsContent>
            <TabsContent value="users">
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Dados históricos de usuários serão exibidos aqui
              </div>
            </TabsContent>
            <TabsContent value="churn">
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Dados históricos de churn serão exibidos aqui
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
