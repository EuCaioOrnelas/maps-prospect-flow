import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Radar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RadarLead } from "@/hooks/useDashboardKPIs";

interface OpportunityRadarProps {
  radarLeads: RadarLead[];
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    "Pronto p/ venda": "bg-primary/10 text-primary",
    "Alto valor": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    "Engajado": "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    "Baixo engajamento": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    "Frio": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", config[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

export function OpportunityRadar({ radarLeads }: OpportunityRadarProps) {
  const navigate = useNavigate();

  if (radarLeads.length === 0) {
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
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-6 pb-2">Lead</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Segmento</th>
                <th className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Score IA</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Potencial</th>
                <th className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">Status</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-6 pb-2">Crescimento 7d</th>
              </tr>
            </thead>
            <tbody>
              {radarLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/crm')}
                >
                  <td className="px-6 py-3 font-medium text-foreground">{lead.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.segment || "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-12 h-7 rounded-lg text-xs font-bold",
                      lead.score >= 601 && "bg-primary/15 text-primary",
                      lead.score >= 401 && lead.score < 601 && "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
                      lead.score < 401 && "bg-muted text-muted-foreground",
                    )}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-foreground">
                    R$ {fmt(lead.potential)}
                  </td>
                  <td className="px-3 py-3 text-center"><StatusBadge status={lead.status} /></td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-xs font-semibold text-primary">+{lead.scoreGrowth7d}pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
