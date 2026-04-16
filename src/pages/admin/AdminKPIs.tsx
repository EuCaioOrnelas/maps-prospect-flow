import { useMemo } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend,
} from "recharts";

const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

export default function AdminKPIs() {
  const { loading, totalMRR, totalSubscribers, churnRate, averageTicket, stats, stripeMRR, pixMRR } = useAdminDashboard();

  const ltv = churnRate > 0 ? averageTicket / (churnRate / 100) : 0;

  const mrrHistory = useMemo(() => {
    const stripeData = stripeMRR?.monthlyMRR || [];
    const pixData = pixMRR?.pixMonthlyMRR || [];

    const months = new Map<string, { stripe: number; pix: number; total: number }>();
    stripeData.forEach(d => {
      const existing = months.get(d.month) || { stripe: 0, pix: 0, total: 0 };
      existing.stripe = d.mrr;
      existing.total = existing.stripe + existing.pix;
      months.set(d.month, existing);
    });
    pixData.forEach(d => {
      const existing = months.get(d.month) || { stripe: 0, pix: 0, total: 0 };
      existing.pix = d.mrr;
      existing.total = existing.stripe + existing.pix;
      months.set(d.month, existing);
    });

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return {
          label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          ...data,
        };
      });
  }, [stripeMRR, pixMRR]);

  const salesHistory = useMemo(() => {
    return (stripeMRR?.monthlySales || []).slice(-12).map(d => {
      const [y, m] = d.month.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        label: date.toLocaleDateString("pt-BR", { month: "short" }),
        newSales: d.newSales,
        cancellations: d.cancellations,
        net: d.newSales - d.cancellations,
      };
    });
  }, [stripeMRR]);

  const kpis = [
    { label: "MRR Total", value: formatCurrency(totalMRR), sub: "Receita recorrente mensal" },
    { label: "Assinantes", value: totalSubscribers.toString(), sub: "Ativos no momento" },
    { label: "Churn", value: `${churnRate.toFixed(1)}%`, sub: churnRate > 8 ? "⚠️ Acima do ideal" : "✅ Saudável" },
    { label: "Ticket Médio", value: formatCurrency(averageTicket), sub: "Receita / assinante" },
    { label: "LTV", value: formatCurrency(ltv), sub: "Lifetime value estimado" },
    { label: "Ativos 7d", value: (stats?.activeUsers7d ?? 0).toString(), sub: "Logaram nos últimos 7 dias" },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">KPIs Executivos</h1>
        <p className="text-sm text-muted-foreground mt-1">Indicadores-chave de performance do negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-border/40 bg-card/80">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MRR Evolution Chart */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Evolução de MRR (Stripe + PIX)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mrr">
            <TabsList className="mb-4">
              <TabsTrigger value="mrr">MRR Total</TabsTrigger>
              <TabsTrigger value="breakdown">Stripe vs PIX</TabsTrigger>
              <TabsTrigger value="sales">Vendas vs Cancelamentos</TabsTrigger>
            </TabsList>
            <TabsContent value="mrr">
              <div className="h-[350px]">
                {mrrHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mrrHistory}>
                      <defs>
                        <linearGradient id="kpiMrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(158,72%,38%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(158,72%,38%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} formatter={(v: number) => [formatCurrency(v), "MRR"]} />
                      <Area type="monotone" dataKey="total" stroke="hsl(158,72%,38%)" fill="url(#kpiMrrGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando dados...</div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="breakdown">
              <div className="h-[350px]">
                {mrrHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mrrHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} />
                      <Bar dataKey="stripe" name="Stripe" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pix" name="PIX" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando dados...</div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="sales">
              <div className="h-[350px]">
                {salesHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }} />
                      <Bar dataKey="newSales" name="Novos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancellations" name="Cancelamentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados de vendas</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
