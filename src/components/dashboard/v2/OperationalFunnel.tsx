import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OperationalFunnelProps {
  leadsProspected: number;
  messagesSent: number;
  totalResponses: number;
}

interface FunnelStep {
  label: string;
  value: number;
  tooltip: string;
}

export function OperationalFunnel({ leadsProspected, messagesSent, totalResponses }: OperationalFunnelProps) {
  const qualifiedRate = 0.34;
  const meetingRate = 0.30;
  const dealRate = 0.42;

  const qualified = Math.round(leadsProspected * qualifiedRate);
  const meetings = Math.round(totalResponses * meetingRate);
  const deals = Math.round(meetings * dealRate);

  const steps: FunnelStep[] = [
    { label: "Leads Captados", value: leadsProspected, tooltip: "Total de leads encontrados pela plataforma" },
    { label: "Qualificados IA", value: qualified, tooltip: "Leads que passaram pelo score de qualificação" },
    { label: "Mensagens Enviadas", value: messagesSent, tooltip: "Mensagens enviadas via campanhas" },
    { label: "Responderam", value: totalResponses, tooltip: "Leads que responderam às mensagens" },
    { label: "Reuniões Sugeridas", value: meetings, tooltip: "Estimativa de reuniões com base na taxa de resposta" },
    { label: "Negociações Ativas", value: deals, tooltip: "Estimativa de negociações com potencial de fechamento" },
  ];

  const maxVal = Math.max(...steps.map(s => s.value), 1);

  if (leadsProspected === 0 && messagesSent === 0) {
    return (
      <Card className="border-border/40 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            Funil Operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground/60">Sem dados para exibir o funil</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          Funil Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-6">
        <TooltipProvider>
          {steps.map((step, i) => {
            const widthPct = Math.max((step.value / maxVal) * 100, 6);
            const convRate = i > 0 && steps[i - 1].value > 0
              ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
              : null;

            return (
              <div key={step.label}>
                {i > 0 && convRate && (
                  <div className="flex justify-center py-0.5">
                    <span className="text-[9px] text-muted-foreground/40 font-medium">
                      ↓ {convRate}%
                    </span>
                  </div>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-help">
                      <span className="text-xs text-muted-foreground w-[140px] text-right shrink-0 truncate">
                        {step.label}
                      </span>
                      <div className="flex-1 relative">
                        <div
                          className={cn(
                            "h-8 rounded-lg flex items-center px-3 transition-all duration-500 group-hover:shadow-sm",
                            i === 0 ? "bg-primary/20" : "bg-primary/[0.08]",
                            "group-hover:bg-primary/25"
                          )}
                          style={{ width: `${widthPct}%`, minWidth: '50px' }}
                        >
                          <span className="text-xs font-bold text-foreground">
                            {step.value.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">{step.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </TooltipProvider>
        <p className="text-[9px] text-muted-foreground/35 text-right pt-2">
          *Reuniões e negociações são estimativas baseadas em médias de mercado
        </p>
      </CardContent>
    </Card>
  );
}
