import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ForecastChartProps {
  leadsProspected: number;
  totalResponses: number;
  messagesSent: number;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function ForecastChart({ leadsProspected, totalResponses, messagesSent }: ForecastChartProps) {
  // Derive forecast from actual metrics
  const avgTicket = 2500;
  const conversionRate = totalResponses > 0 ? Math.min(totalResponses / Math.max(messagesSent, 1), 0.25) : 0.05;
  
  const conservative = Math.round(totalResponses * 0.15 * avgTicket);
  const realistic = Math.round(totalResponses * 0.30 * avgTicket);
  const aggressive = Math.round(totalResponses * 0.50 * avgTicket);

  const scenarios = [
    { name: 'Conservador', value: conservative, color: 'hsl(var(--muted-foreground))' },
    { name: 'Realista', value: realistic, color: 'hsl(var(--primary))' },
    { name: 'Agressivo', value: aggressive, color: 'hsl(160, 60%, 50%)' },
  ];

  const hasData = totalResponses > 0;

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Forecast Próximos 30 Dias
        </CardTitle>
        <p className="text-xs text-muted-foreground/60">Baseado em score + leads ativos + histórico</p>
      </CardHeader>
      <CardContent className="pb-5">
        {!hasData ? (
          <p className="text-sm text-muted-foreground/60 text-center py-8">
            Dados insuficientes para previsão
          </p>
        ) : (
          <div className="space-y-5">
            {/* Scenario cards */}
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map((s) => (
                <div key={s.name} className="text-center p-3 rounded-xl bg-muted/30 border border-border/20">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.name}</p>
                  <p className="text-lg font-bold text-foreground mt-1">R$ {fmt(s.value)}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarios} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [`R$ ${fmt(value)}`, 'Previsão']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                    {scenarios.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
