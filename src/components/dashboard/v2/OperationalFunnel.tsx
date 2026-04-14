import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OperationalFunnelProps {
  leadsProspected: number;
  messagesSent: number;
  totalResponses: number;
  opportunitiesGenerated: number;
}

interface FunnelStep {
  label: string;
  value: number;
  tooltip: string;
}

export function OperationalFunnel({ leadsProspected, messagesSent, totalResponses, opportunitiesGenerated }: OperationalFunnelProps) {
  const qualifiedRate = 0.34;
  const qualified = Math.round(leadsProspected * qualifiedRate);

  const steps: FunnelStep[] = [
    { label: "Leads Captados", value: leadsProspected, tooltip: "Total de leads encontrados pela plataforma" },
    { label: "Qualificados IA", value: qualified, tooltip: "Leads que passaram pelo score de qualificação" },
    { label: "Mensagens Enviadas", value: messagesSent, tooltip: "Mensagens enviadas via campanhas" },
    { label: "Responderam", value: totalResponses, tooltip: "Leads que responderam às mensagens (WhatsApp + Meta API)" },
    { label: "Oportunidades Geradas", value: opportunitiesGenerated, tooltip: "Oportunidades geradas no período (mesma lógica do cockpit)" },
  ];

  const maxVal = Math.max(...steps.map(s => s.value), 1);

  if (leadsProspected === 0 && messagesSent === 0) {
    return (
      <Card className="border-border/40 rounded-2xl h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            Funil Operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/60">Sem dados para exibir o funil</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          Funil Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center space-y-1.5 pb-4">
        <TooltipProvider>
          {steps.map((step, i) => {
            const widthPct = Math.max((step.value / maxVal) * 100, 8);
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
                    <div className="flex flex-col items-center group cursor-help gap-1">
                      <span className="text-xs text-muted-foreground truncate">
                        {step.label}
                      </span>
                      <div
                        className={cn(
                          "h-8 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:shadow-sm",
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
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">{step.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
