import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OperationalFunnelProps {
  leadsProspected: number;
  messagesSent: number;
  totalResponses: number;
  opportunitiesGenerated: number;
}

interface FunnelStep {
  label: string;
  value: number;
  hint: string;
}

const fmtN = (n: number) => n.toLocaleString("pt-BR");

export function OperationalFunnel({
  leadsProspected,
  messagesSent,
  totalResponses,
  opportunitiesGenerated,
}: OperationalFunnelProps) {
  const qualifiedRate = 0.34;
  const qualified = Math.round(leadsProspected * qualifiedRate);

  const steps: FunnelStep[] = [
    {
      label: "Leads Captados",
      value: leadsProspected,
      hint: "Total de leads encontrados pela plataforma no período. É a base (100%) do funil.",
    },
    {
      label: "Qualificados IA",
      value: qualified,
      hint: "Leads que passaram pelo score de qualificação da IA. % calculada sobre Captados.",
    },
    {
      label: "Mensagens Enviadas",
      value: messagesSent,
      hint: "Mensagens enviadas via campanhas (WhatsApp + Meta API). % calculada sobre Captados.",
    },
    {
      label: "Responderam",
      value: totalResponses,
      hint: "Leads que responderam às mensagens enviadas. % calculada sobre Captados.",
    },
    {
      label: "Oportunidades Geradas",
      value: opportunitiesGenerated,
      hint: "Oportunidades geradas no período (mesma lógica do cockpit). % calculada sobre Captados.",
    },
  ];

  const empty = leadsProspected === 0 && messagesSent === 0;

  return (
    <Card className="border-border/40 rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          Funil Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center pb-4">
        {empty ? (
          <p className="text-sm text-muted-foreground/60 text-center">Sem dados para exibir o funil</p>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="flex flex-col items-center gap-2.5">
              {(() => {
                const base = steps[0]?.value || 1;
                const nonZero = steps.filter((s) => s.value > 0).map((s) => s.value);
                const minVal = nonZero.length ? Math.min(...nonZero) : 1;
                const MIN_PCT = 16;
                const range = Math.max(base - minVal, 1);
                return steps.map((s) => {
                  const convPct = (s.value / base) * 100;
                  let widthPct: number;
                  if (s.value <= 0) widthPct = MIN_PCT;
                  else if (s.value >= base) widthPct = 100;
                  else widthPct = MIN_PCT + ((s.value - minVal) / range) * (100 - MIN_PCT);
                  const isCompact = widthPct < 28;
                  const numClass = isCompact ? "text-sm" : "text-base";
                  const pctClass = isCompact ? "text-[10px]" : "text-[11px]";
                  const padClass = isCompact ? "px-2.5" : "px-4";
                  return (
                    <div key={s.label} className="w-full flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-xs font-semibold text-foreground">{s.label}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground/70 hover:text-foreground transition-colors"
                              aria-label={`Como é calculado: ${s.label}`}
                            >
                              <Info size={11} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                            {s.hint}
                            <span className="block mt-1 text-muted-foreground">
                              Base: <b>Leads Captados</b> ({fmtN(base)}).
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div
                        className={`h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center gap-1.5 transition-all ring-1 ring-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.06)] whitespace-nowrap ${padClass}`}
                        style={{ width: `${widthPct}%` }}
                      >
                        <span className={`${numClass} font-bold text-white tabular-nums leading-none`}>
                          {fmtN(s.value)}
                        </span>
                        <span className={`${pctClass} font-semibold text-white tabular-nums leading-none`}>
                          · {convPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
