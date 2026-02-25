import { Link } from "react-router-dom";
import { Smartphone, Wifi, WifiOff, Flame, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useWhatsAppNumbers } from "@/hooks/useWhatsAppNumbers";
import { useRevenueNumberStats, useRevenueSettings } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const RevenueNumbers = () => {
  const { numbers, loading } = useWhatsAppNumbers();
  const { data: numberStats } = useRevenueNumberStats();
  const { data: settings } = useRevenueSettings();

  const ticket = settings?.default_ticket_value || 3000;
  const hotRate = settings?.default_close_rate_hot || 0.35;
  const veryHotRate = settings?.default_close_rate_very_hot || 0.55;

  // Chart data
  const chartData = numbers
    .filter((n) => numberStats?.[n.id])
    .map((n) => {
      const s = numberStats![n.id];
      return {
        name: n.name?.substring(0, 12) || n.phone_number || "Nº",
        Engajados: s.hot,
        Quentes: s.veryHot,
        "Em Risco": s.atRisk,
        Total: s.total,
      };
    });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Heatmap por Número</h1>
        <p className="text-sm text-muted-foreground">
          Desempenho de cada instância de WhatsApp no módulo de receita
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : numbers.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center space-y-3">
            <Smartphone className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-muted-foreground">
              Nenhum número conectado.
            </p>
            <Button asChild variant="default" size="sm">
              <Link to="/revenue/settings?tab=numbers">Conectar nas Configurações</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparison chart */}
          {chartData.length > 1 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Comparativo entre Números</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Engajados" fill="#f97316" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Quentes" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Em Risco" fill="#6b7280" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Number cards with heatmap */}
          <div className="grid gap-4 md:grid-cols-2">
            {numbers.map((num) => {
              const s = numberStats?.[num.id];
              const receitaEsperada = s ? (s.hot * ticket * hotRate + s.veryHot * ticket * veryHotRate) : 0;

              return (
                <Card key={num.id} className="bg-card border-border/50">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", num.is_connected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                          {num.is_connected ? <Wifi size={18} /> : <WifiOff size={18} />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{num.name}</p>
                          <p className="text-xs text-muted-foreground">{num.phone_number || num.instance_name || "Sem número"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", num.is_connected ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive")}>
                        {num.is_connected ? "Conectado" : "Desconectado"}
                      </Badge>
                    </div>

                    {s ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-secondary/30 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground"><Users size={10} className="inline" /> Total</p>
                            <p className="text-lg font-bold text-foreground">{s.total}</p>
                          </div>
                          <div className="bg-orange-500/10 rounded-lg p-2">
                            <p className="text-[10px] text-orange-400">💬 Engajados</p>
                            <p className="text-lg font-bold text-orange-400">{s.hot}</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-2">
                            <p className="text-[10px] text-red-400">🔥 Quentes</p>
                            <p className="text-lg font-bold text-red-400">{s.veryHot}</p>
                          </div>
                          <div className="bg-destructive/10 rounded-lg p-2">
                            <p className="text-[10px] text-destructive">⚠️ Risco</p>
                            <p className="text-lg font-bold text-destructive">{s.atRisk}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Score médio</span>
                          <span className="font-medium text-foreground">{s.avgScore} pts</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Receita esperada</span>
                          <span className="font-medium text-primary">{fmt(receitaEsperada)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">Sem dados de leads neste número</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Disparos hoje: {num.daily_sent_count}</span>
                      <Link to={`/revenue/leads?number=${num.id}`} className="text-primary hover:underline">
                        Ver leads →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueNumbers;
