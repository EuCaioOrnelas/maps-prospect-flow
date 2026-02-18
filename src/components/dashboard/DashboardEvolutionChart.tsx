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
  const last3 = monthlyData.slice(-3);

  // Calculate average growth & stats
  let avgGrowth = 0;
  let growthLabel = '';
  const totalLeads = last3.reduce((s, d) => s + d.leads, 0);
  const avgMonthly = last3.length > 0 ? Math.round(totalLeads / last3.length) : 0;

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
        growthLabel = `+${avgGrowth.toFixed(0)}% crescimento médio`;
      } else {
        growthLabel = `Geração consistente`;
      }
    }
  }

  // Variation vs previous period
  const lastMonth = last3[last3.length - 1];
  const prevMonth = last3.length >= 2 ? last3[last3.length - 2] : null;
  const variation = prevMonth && prevMonth.leads > 0
    ? ((lastMonth.leads - prevMonth.leads) / prevMonth.leads * 100)
    : null;

  const chartData = last3.map(d => ({
    ...d,
    monthLabel: formatMonthLabel(d.month),
  }));

  if (chartData.length === 0) {
    return (
      <Card className="border-border/30 flex flex-col">
        <CardContent className="py-8 px-6 flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <BarChart3 size={24} className="text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">Dados insuficientes para evolução</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 flex flex-col">
      <CardContent className="py-6 px-6 space-y-4 flex-1 flex flex-col">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Evolução de Performance</p>
              <p className="text-[10px] text-muted-foreground/50">Últimos 3 meses</p>
            </div>
          </div>
          {growthLabel && (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp size={10} />
              {growthLabel}
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="h-48 flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
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
                tickFormatter={(value: number) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
                  return value.toString();
                }}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
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
              <Bar dataKey="conversations" fill="hsl(210, 55%, 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="opportunities" fill="hsl(270, 50%, 55%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Technical footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 pt-1">
          <span>Média mensal: {fmtInt(avgMonthly)} leads</span>
          {variation !== null && (
            <span>
              Variação vs mês anterior: {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
