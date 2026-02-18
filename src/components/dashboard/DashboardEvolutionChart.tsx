import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyBreakdown } from "@/hooks/useMainDashboard";

interface DashboardEvolutionChartProps {
  monthlyData: MonthlyBreakdown[];
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatMonthLabel(month: string) {
  // month comes as "YY/MM" e.g. "25/01"
  const parts = month.split('/');
  if (parts.length === 2) {
    return MONTH_NAMES[parts[1]] || parts[1];
  }
  return month;
}

export function DashboardEvolutionChart({ monthlyData }: DashboardEvolutionChartProps) {
  // Use last 3 months
  const last3 = monthlyData.slice(-3);

  // Calculate average growth
  let avgGrowth = 0;
  let growthLabel = '';
  if (last3.length >= 2) {
    const growths: number[] = [];
    for (let i = 1; i < last3.length; i++) {
      const prev = last3[i - 1].leads;
      const curr = last3[i].leads;
      if (prev > 0) {
        growths.push(((curr - prev) / prev) * 100);
      }
    }
    if (growths.length > 0) {
      avgGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
      if (avgGrowth > 0) {
        growthLabel = `Crescimento médio de +${avgGrowth.toFixed(0)}% nos últimos ${last3.length} meses`;
      } else {
        growthLabel = `Tendência de geração consistente nos últimos 90 dias`;
      }
    }
  }

  const chartData = last3.map(d => ({
    ...d,
    monthLabel: formatMonthLabel(d.month),
  }));

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50 flex flex-col">
        <CardContent className="py-5 px-5 flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <BarChart3 size={24} className="text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/60">Dados insuficientes para evolução</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 flex flex-col">
      <CardContent className="py-5 px-5 space-y-3 flex-1 flex flex-col">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Evolução de Performance</p>
              <p className="text-[10px] text-muted-foreground/60">Últimos 3 meses</p>
            </div>
          </div>
          {growthLabel && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
              <TrendingUp size={10} />
              {growthLabel}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-48 flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    leads: 'Leads Prospectados',
                    conversations: 'Conversas Iniciadas',
                    opportunities: 'Oportunidades Estimadas',
                  };
                  return [fmtInt(value), labels[name] || name];
                }}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    leads: 'Leads',
                    conversations: 'Conversas',
                    opportunities: 'Oportunidades',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="conversations" fill="hsl(210, 60%, 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="opportunities" fill="hsl(158, 60%, 42%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strategic line */}
        <p className="text-[10px] text-muted-foreground/50 text-center italic">
          Com o ritmo atual, você deve manter ou superar esse volume no próximo mês.
        </p>
      </CardContent>
    </Card>
  );
}
