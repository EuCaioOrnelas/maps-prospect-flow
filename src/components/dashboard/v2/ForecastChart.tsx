import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForecastChartProps {
  leadsProspected: number;
  totalResponses: number;
  messagesSent: number;
  averageTicket: number;
  opportunitySales: number;
  scoreSales: number;
  scoreBuckets: { label: string; count: number; estimatedSales: number; revenue: number }[];
}

function fmt(n: number) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 10_000) return `${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ForecastChart({
  leadsProspected,
  totalResponses,
  messagesSent,
  averageTicket,
  opportunitySales,
  scoreSales,
  scoreBuckets,
}: ForecastChartProps) {
  const totalSales = opportunitySales + scoreSales;

  const conservative = Math.round(totalSales * 0.5 * averageTicket);
  const realistic = Math.round(totalSales * averageTicket);
  const aggressive = Math.round(totalSales * 1.5 * averageTicket);

  const scenarios = [
    { name: 'Conservador', value: conservative, color: 'hsl(var(--muted-foreground) / 0.45)' },
    { name: 'Realista', value: realistic, color: 'hsl(var(--primary))' },
    { name: 'Agressivo', value: aggressive, color: 'hsl(158, 64%, 28%)' },
  ];

  const hasData = totalSales > 0;

  return (
    <Card className="border-border/40 rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Forecast Próximos 30 Dias
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1.5 p-3">
                <p className="font-semibold">Como calculamos o forecast:</p>
                <p><strong>Oportunidades:</strong> {opportunitySales} venda(s) estimada(s) (1% de {leadsProspected} leads)</p>
                <p><strong>Score:</strong> {scoreSales} venda(s) estimada(s) por engajamento</p>
                {scoreBuckets.filter(b => b.count > 0).map(b => (
                  <p key={b.label} className="pl-2 text-muted-foreground">• {b.count} {b.label}: ~{b.estimatedSales} vendas</p>
                ))}
                <p><strong>Ticket médio:</strong> R$ {fmt(averageTicket)}</p>
                <p className="pt-1"><strong>Conservador:</strong> 50% do realista</p>
                <p><strong>Realista:</strong> {totalSales} vendas × R$ {fmt(averageTicket)}</p>
                <p><strong>Agressivo:</strong> 150% do realista</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-xs text-muted-foreground/60">Baseado em score + leads ativos + ticket médio</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pb-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground/60 text-center py-8 flex-1 flex items-center justify-center">
            Dados insuficientes para previsão. Prospecte leads ou engaje contatos para gerar forecast.
          </p>
        ) : (
          <div className="flex flex-col flex-1 gap-3">
            {/* Scenario cards */}
            <div className="grid grid-cols-3 gap-2">
              {scenarios.map((s) => (
                <div key={s.name} className="text-center p-2.5 rounded-xl bg-muted/30 border border-border/20">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{s.name}</p>
                  <p className="text-base font-bold text-foreground mt-0.5">R$ {fmt(s.value)}</p>
                </div>
              ))}
            </div>

            {/* Chart - fills remaining space */}
            <div className="flex-1 min-h-[140px]">
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
