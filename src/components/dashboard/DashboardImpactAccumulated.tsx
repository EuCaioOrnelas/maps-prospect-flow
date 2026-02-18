import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Briefcase } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface DashboardImpactAccumulatedProps {
  allTimeLeads: number;
  cumulativeByMonth: { month: string; total: number }[];
  monthlyLeads: number;
  activeDays: number;
  periodDays: number;
}

const CPL_BENCHMARK = 46.17;
const SDR_PER_DAY = 80;

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export function DashboardImpactAccumulated({
  allTimeLeads,
  cumulativeByMonth,
  monthlyLeads,
  activeDays,
  periodDays,
}: DashboardImpactAccumulatedProps) {
  const financialImpact = allTimeLeads * CPL_BENCHMARK;
  const daysSaved = Math.round(allTimeLeads / SDR_PER_DAY);
  const monthsActive = cumulativeByMonth.length || 1;
  const avgMonthlyLeads = allTimeLeads / monthsActive;
  const projectedAnnualSavings = avgMonthlyLeads * 12 * CPL_BENCHMARK;

  return (
    <div className="space-y-4">
      {/* Hero Impact Card - compact */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-background to-background overflow-hidden">
        <CardContent className="py-6 px-6 flex flex-col items-center text-center space-y-1.5">
          <p className="text-[10px] font-semibold text-emerald-400/80 tracking-[0.2em] uppercase">
            Impacto gerado com a Wiize
          </p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight leading-none">
            R$ {fmt(financialImpact)}
          </p>
          <p className="text-[11px] text-muted-foreground/70 max-w-sm leading-relaxed">
            Valor estimado que você evitou pagar gerando{' '}
            <span className="font-medium text-foreground/80">{fmtInt(allTimeLeads)} leads</span>{' '}
            sem depender de tráfego pago ou SDR interno.
          </p>
        </CardContent>
      </Card>

      {/* Secondary: Operational + Projection - horizontal layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Capacidade operacional gerada
              </p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {daysSaved} {daysSaved === 1 ? 'dia' : 'dias'}
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                de trabalho de um SDR
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <CalendarClock size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Mantendo esse ritmo
              </p>
              <p className="text-2xl font-bold text-amber-400 leading-tight">
                R$ {fmt(projectedAnnualSavings)}
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                em custo evitado por ano
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Growth Chart */}
      {cumulativeByMonth.length > 1 && (
        <Card className="border-border/50">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-semibold text-foreground">Crescimento Acumulado</p>
              <p className="text-[10px] text-muted-foreground/50 italic">
                Seu ativo de prospecção continua crescendo.
              </p>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [fmtInt(value) + ' leads', 'Total acumulado']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(158, 72%, 38%)"
                    strokeWidth={2}
                    fill="url(#cumulativeGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
