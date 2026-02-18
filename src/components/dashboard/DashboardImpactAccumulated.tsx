import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CalendarClock, Briefcase } from "lucide-react";
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
const SDR_PER_MONTH = SDR_PER_DAY * 22;

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
      {/* Section Title */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Impacto Acumulado</h2>
          <p className="text-xs text-muted-foreground">O valor que você já construiu com a Wiize</p>
        </div>
      </div>

      {/* Main Impact Block */}
      <Card className="glass border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/5 overflow-hidden">
        <CardContent className="py-10 px-6 flex flex-col items-center text-center space-y-3">
          <p className="text-sm font-medium text-emerald-400 tracking-wide uppercase">
            💰 Impacto gerado com a Wiize
          </p>
          <p className="text-5xl sm:text-6xl font-extrabold text-emerald-400 tracking-tight">
            R$ {fmt(financialImpact)}
          </p>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Valor estimado que você evitou pagar gerando{' '}
            <span className="font-semibold text-foreground">{fmtInt(allTimeLeads)} leads</span>{' '}
            sem depender de tráfego pago ou SDR interno.
          </p>
        </CardContent>
      </Card>

      {/* Secondary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Operational Capacity */}
        <Card className="glass border-primary/10">
          <CardContent className="py-8 px-6 flex flex-col items-center text-center space-y-2">
            <Briefcase size={22} className="text-primary mb-1" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Capacidade operacional gerada
            </p>
            <p className="text-3xl font-bold text-foreground">
              {daysSaved} {daysSaved === 1 ? 'dia' : 'dias'}
            </p>
            <p className="text-sm text-muted-foreground">
              de trabalho de um SDR
            </p>
            <p className="text-[10px] text-muted-foreground/50 pt-1">
              Baseado em média conservadora de produtividade de SDR.
            </p>
          </CardContent>
        </Card>

        {/* Annual Projection */}
        <Card className="glass border-amber-500/10">
          <CardContent className="py-8 px-6 flex flex-col items-center text-center space-y-2">
            <CalendarClock size={22} className="text-amber-400 mb-1" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mantendo esse ritmo
            </p>
            <p className="text-3xl font-bold text-amber-400">
              R$ {fmt(projectedAnnualSavings)}
            </p>
            <p className="text-sm text-muted-foreground max-w-[220px]">
              em custo evitado por ano
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Growth Chart */}
      {cumulativeByMonth.length > 1 && (
        <Card className="glass">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-semibold text-foreground">Crescimento Acumulado</p>
              <p className="text-[10px] text-muted-foreground italic">
                Seu ativo de prospecção continua crescendo.
              </p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(158, 72%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 18%, 7%)',
                      border: '1px solid hsl(220, 14%, 16%)',
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
