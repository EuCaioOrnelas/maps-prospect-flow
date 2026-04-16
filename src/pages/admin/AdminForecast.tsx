import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminForecast() {
  const { loading, totalMRR } = useAdminDashboard();

  const scenarios = [
    { label: "Pessimista", multiplier: 0.85, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Realista", multiplier: 1.05, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Otimista", multiplier: 1.2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
        <p className="text-sm text-muted-foreground mt-1">Projeções de receita e crescimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map(s => (
          <Card key={s.label} className={`border-border/40 ${s.bg}`}>
            <CardContent className="p-5">
              {loading ? <Skeleton className="h-16 w-full" /> : (
                <>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${s.color}`}>{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    R$ {(totalMRR * s.multiplier).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MRR previsto próximo mês</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Projeção 12 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
            Gráfico de projeção com cenários será exibido aqui
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
