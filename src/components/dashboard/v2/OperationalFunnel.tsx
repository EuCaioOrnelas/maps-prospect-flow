import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OperationalFunnelProps {
  funnel: { stage: string; value: number }[];
}

const HINTS: Record<string, string> = {
  Captados: "Total de leads que entraram no CRM no período. É a base (100%) do funil.",
  Analisados: "Leads que passaram pela análise da IA e receberam classificação de oportunidade.",
  Enviados: "Leads que receberam a primeira mensagem (WhatsApp + Meta API).",
  Respondeu: "Leads que responderam ao primeiro contato.",
  Oportunidades: "Leads classificados como alto potencial (alto/muito_alto).",
};

const fmtN = (n: number) => n.toLocaleString("pt-BR");

export function OperationalFunnel({ funnel }: OperationalFunnelProps) {
  const empty = !funnel.length || funnel.every((s) => s.value === 0);

  return (
    <Card className="border-border/40 rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          Funil Operacional
        </CardTitle>
        <p className="text-xs text-muted-foreground/60">Captados → Oportunidades (dados reais do CRM)</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center pb-4">
        {empty ? (
          <p className="text-sm text-muted-foreground/60 text-center">Sem dados para exibir o funil</p>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="flex flex-col items-center gap-2.5">
              {(() => {
                const base = funnel[0]?.value || 1;
                const nonZero = funnel.filter((s) => s.value > 0).map((s) => s.value);
                const minVal = nonZero.length ? Math.min(...nonZero) : 1;
                const MIN_PCT = 16;
                const range = Math.max(base - minVal, 1);
                return funnel.map((s) => {
                  const convPct = (s.value / base) * 100;
                  let widthPct: number;
                  if (s.value <= 0) widthPct = MIN_PCT;
                  else if (s.value >= base) widthPct = 100;
                  else widthPct = MIN_PCT + ((s.value - minVal) / range) * (100 - MIN_PCT);
                  const isCompact = widthPct < 28;
                  const numClass = isCompact ? "text-sm" : "text-base";
                  const pctClass = isCompact ? "text-[10px]" : "text-[11px]";
                  const padClass = isCompact ? "px-2.5" : "px-4";
                  const hint = HINTS[s.stage] ?? `Total de ${s.stage.toLowerCase()} no período.`;
                  return (
                    <div key={s.stage} className="w-full flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-xs font-semibold text-foreground">{s.stage}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground/70 hover:text-foreground transition-colors"
                              aria-label={`Como é calculado: ${s.stage}`}
                            >
                              <Info size={11} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                            {hint}
                            <span className="block mt-1 text-muted-foreground">
                              % calculada sobre <b>Captados</b> ({fmtN(base)}).
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div
                        className={`h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center gap-1.5 transition-all ring-1 ring-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.06)] whitespace-nowrap ${padClass}`}
                        style={{ width: `${widthPct}%` }}
                      >
                        <span className={`${numClass} font-medium text-white tabular-nums leading-none`}>
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
