import { BarChart3, TrendingUp, Users, DollarSign, Activity, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminKPIs() {
  const { loading, totalMRR, totalSubscribers, churnRate, averageTicket, stats } = useAdminDashboard();

  const ltv = churnRate > 0 ? averageTicket / (churnRate / 100) : 0;

  const kpis = [
    { label: "MRR Total", value: `R$ ${totalMRR.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Assinantes Ativos", value: totalSubscribers, icon: Users, color: "text-blue-500" },
    { label: "Churn Mensal", value: `${churnRate.toFixed(1)}%`, icon: TrendingUp, color: churnRate > 8 ? "text-red-500" : churnRate > 5 ? "text-amber-500" : "text-emerald-500" },
    { label: "Ticket Médio", value: `R$ ${averageTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, icon: Target, color: "text-violet-500" },
    { label: "LTV Estimado", value: `R$ ${ltv.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, icon: BarChart3, color: "text-amber-500" },
    { label: "Usuários Ativos 7d", value: stats?.activeUsers7d ?? "—", icon: Activity, color: "text-cyan-500" },
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
        <CardContent className="p-6">
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
