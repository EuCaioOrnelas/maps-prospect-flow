import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  financialImpact: number;
  financialChange: number;
  leadsProspected: number;
  totalResponses: number;
  hotLeads: number;
  activeConversations: number;
  cumulativeByMonth: { month: string; total: number }[];
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function DashboardHero({
  financialImpact,
  financialChange,
  leadsProspected,
  totalResponses,
  hotLeads,
  activeConversations,
  cumulativeByMonth,
}: DashboardHeroProps) {
  const navigate = useNavigate();
  const hasChange = financialChange !== 0;

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.03] rounded-2xl">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left content */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary tracking-wide uppercase">
              Cockpit de Crescimento
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
              Seu comercial gerou{" "}
              <span className="text-primary">
                R$ {fmt(financialImpact)}
              </span>{" "}
              em oportunidades
            </h2>
            {hasChange && (
              <div className="flex items-center gap-1.5">
                {financialChange > 0 ? (
                  <TrendingUp size={14} className="text-primary" />
                ) : (
                  <TrendingDown size={14} className="text-destructive" />
                )}
                <span className={cn(
                  "text-sm font-semibold",
                  financialChange > 0 ? "text-primary" : "text-destructive"
                )}>
                  {financialChange > 0 ? '+' : ''}{financialChange.toFixed(0)}% vs período anterior
                </span>
              </div>
            )}
          </div>

          {/* Mini stats */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{fmt(leadsProspected)}</strong> leads qualificados</span>
            <span><strong className="text-foreground">{activeConversations}</strong> conversas ativas</span>
            <span><strong className="text-foreground">{hotLeads}</strong> oportunidades quentes</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              onClick={() => navigate('/opportunities')}
              variant="outline"
              className="gap-2 text-sm border-border/50 hover:bg-muted/50"
            >
              Ver Oportunidades
              <ArrowRight size={14} />
            </Button>
            <Button
              onClick={() => navigate('/whatsapp-campaign')}
              className="gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Rocket size={14} />
              Iniciar Campanha
            </Button>
          </div>
        </div>

        {/* Right mini chart */}
        {cumulativeByMonth.length > 1 && (
          <div className="w-full lg:w-[280px] h-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeByMonth} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [fmt(value), 'Leads acumulados']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#heroGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
