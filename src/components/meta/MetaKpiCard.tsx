import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MetricSlot, isMetricEmpty } from "@/components/ui/metric-empty";

interface MetaKpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  /** Mantido por compatibilidade — não é mais renderizado */
  spark?: number[];
  hint?: string;
  icon?: ReactNode;
  /** Mantido por compatibilidade — todos os ícones usam o verde primário */
  accent?: "primary" | "emerald" | "violet" | "amber" | "rose";
  empty?: boolean;
  /** Frase curta explicando quando o indicador será preenchido */
  emptyHint?: string;
  tooltip?: string;
  /** Enquanto true, mostra skeleton em vez de zero. */
  loading?: boolean;
}

export function MetaKpiCard({ label, value, delta, hint, icon, empty = false, emptyHint, tooltip, loading = false }: MetaKpiCardProps) {
  const isEmpty = empty || isMetricEmpty(value);
  const positive = (delta ?? 0) > 0.05;
  const negative = (delta ?? 0) < -0.05;
  const neutral = !positive && !negative;

  // Deltas reais: capamos a exibição em ±300% para evitar números absurdos vindos
  // de bases muito pequenas (ex.: 1 → 50 = +4900%).
  const displayDelta = delta !== undefined ? Math.max(-300, Math.min(300, delta)) : undefined;
  const capped = delta !== undefined && Math.abs(delta) > 300;

  const iconEl = icon && (
    <div className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
      isEmpty || loading ? "bg-muted/40 text-muted-foreground/40" : "bg-primary/10 text-primary"
    )}>
      {icon}
    </div>
  );


  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-5 border-border/40 rounded-2xl bg-card",
        "transition-all duration-300",
        "hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.04]"
      )}
    >
      <div className="flex items-center gap-2.5 min-h-[36px]">
        {iconEl && (
          tooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" tabIndex={-1} className="outline-none">
                    {iconEl}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : iconEl
        )}
        <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold truncate">
          {label}
        </p>
      </div>

      <MetricSlot cacheKey={`meta:${label}`} loading={loading} empty={isEmpty} hint={emptyHint} className="mt-3 min-h-[44px]">
        <p className="tabular-nums truncate leading-none text-[26px] font-bold text-foreground tracking-tight">
          {value}
        </p>
      </MetricSlot>

      <div className="flex items-center mt-4 gap-2 min-h-[24px]">
        {loading ? null : displayDelta !== undefined && !isEmpty ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold tabular-nums px-1.5 py-0.5 rounded-md text-[11px]",
              positive && "text-primary bg-primary/10",
              negative && "text-rose-600 dark:text-rose-400 bg-rose-500/10",
              neutral && "text-muted-foreground bg-muted/60"
            )}
          >
            {positive ? <ArrowUpRight size={12} strokeWidth={2.5} /> : negative ? <ArrowDownRight size={12} strokeWidth={2.5} /> : <Minus size={12} strokeWidth={2.5} />}
            {capped ? (displayDelta > 0 ? "+300%+" : "-300%+") : `${Math.abs(displayDelta).toFixed(1)}%`}
          </span>
        ) : !isEmpty ? (
          <span className="inline-flex items-center gap-0.5 text-muted-foreground/60 text-[11px]">
            <Minus size={12} /> sem comparação
          </span>
        ) : null}
        {hint && !isEmpty && <span className="text-muted-foreground/70 truncate text-[11px]">{hint}</span>}
      </div>

    </Card>
  );
}
