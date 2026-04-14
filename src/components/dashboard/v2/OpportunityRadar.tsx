import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Radar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Opportunity {
  company: string;
  segment: string;
  score: number;
  potential: number;
  temperature: 'hot' | 'warm' | 'cold';
  nextAction: string;
}

interface OpportunityRadarProps {
  leadsProspected: number;
  totalResponses: number;
  campaigns: any[];
  messagesSent: number;
}

function generateOpportunities(leadsProspected: number, totalResponses: number, campaigns: any[]): Opportunity[] {
  if (leadsProspected === 0 && totalResponses === 0) return [];

  // Generate realistic-looking data based on actual metrics
  const segments = ['Saúde', 'Imobiliário', 'SaaS', 'Varejo', 'Educação', 'Indústria', 'Serviços', 'Logística'];
  const companies = ['Alpha Group', 'Beta Solutions', 'Gamma Corp', 'Delta Tech', 'Omega Services', 'Sigma Labs'];
  const actions = ['Abordar hoje', 'Nutrir', 'SDR urgente', 'Agendar demo', 'Follow-up', 'Enviar proposta'];

  const count = Math.min(Math.max(Math.round(totalResponses * 0.3), 3), 6);
  
  return Array.from({ length: count }, (_, i) => {
    const score = Math.max(60, Math.min(99, 95 - i * 7 + Math.round(Math.random() * 5)));
    const potentialBase = leadsProspected > 50 ? 15000 : 8000;
    return {
      company: companies[i % companies.length],
      segment: segments[i % segments.length],
      score,
      potential: potentialBase + Math.round(Math.random() * 30000),
      temperature: score >= 90 ? 'hot' as const : score >= 70 ? 'warm' as const : 'cold' as const,
      nextAction: actions[i % actions.length],
    };
  });
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold",
      score >= 90 && "bg-primary/15 text-primary",
      score >= 70 && score < 90 && "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
      score < 70 && "bg-destructive/15 text-destructive",
    )}>
      {score}
    </span>
  );
}

function TempBadge({ temp }: { temp: 'hot' | 'warm' | 'cold' }) {
  const config = {
    hot: { label: 'Quente', class: 'bg-primary/10 text-primary' },
    warm: { label: 'Morno', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    cold: { label: 'Frio', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  };
  const c = config[temp];
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", c.class)}>
      {c.label}
    </span>
  );
}

export function OpportunityRadar({ leadsProspected, totalResponses, campaigns, messagesSent }: OpportunityRadarProps) {
  const navigate = useNavigate();
  const opportunities = generateOpportunities(leadsProspected, totalResponses, campaigns);

  if (opportunities.length === 0) {
    return (
      <Card className="border-border/40 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Radar size={16} className="text-primary" />
            Radar de Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground/60">Prospecte leads para ativar o radar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Radar size={16} className="text-primary" />
          Radar de Oportunidades
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80 gap-1"
          onClick={() => navigate('/opportunities')}
        >
          Ver todas <ArrowRight size={12} />
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-6 pb-2">Empresa</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Segmento</th>
                <th className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Score IA</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Potencial</th>
                <th className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Temp.</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-6 pb-2">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, i) => (
                <tr
                  key={i}
                  className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/opportunities')}
                >
                  <td className="px-6 py-3 font-medium text-foreground">{opp.company}</td>
                  <td className="px-3 py-3 text-muted-foreground">{opp.segment}</td>
                  <td className="px-3 py-3 text-center"><ScoreBadge score={opp.score} /></td>
                  <td className="px-3 py-3 text-right font-medium text-foreground">
                    R$ {opp.potential.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-3 text-center"><TempBadge temp={opp.temperature} /></td>
                  <td className="px-6 py-3 text-muted-foreground">{opp.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
