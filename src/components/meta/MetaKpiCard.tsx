import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetaKpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  spark?: number[];
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "emerald" | "violet" | "amber" | "rose";
  empty?: boolean;
  /** Texto opcional exibido em tooltip ao passar sobre o ícone */
  tooltip?: string;
}

const accentMap: Record<NonNullable<MetaKpiCardProps["accent"]>, string> = {
  primary: "hsl(var(--primary))",
  emerald: "hsl(158 72% 38%)",
  violet: "hsl(262 60% 60%)",
  amber: "hsl(38 92% 50%)",
  rose: "hsl(346 77% 60%)",
};

export function MetaKpiCard({ label, value, delta, spark, hint, icon, accent = "primary", empty = false, tooltip }: MetaKpiCardProps) {
  const color = accentMap[accent];
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const hasSpark = sparkData.length > 1 && sparkData.some((d) => d.v > 0);
  const positive = (delta ?? 0) > 0.05;
  const negative = (delta ?? 0) < -0.05;
  const neutral = !positive && !negative;
  const sparkId = `spark-${label.replace(/[^a-z0-9]/gi, "")}`;

  // Tendência da própria sparkline (último vs primeiro valor não-zero)
  const sparkTrendUp = (() => {
    if (!hasSpark) return null;
    const firstNonZero = sparkData.find((d) => d.v > 0)?.v ?? 0;
    const last = sparkData[sparkData.length - 1]?.v ?? 0;
    if (firstNonZero === 0) return null;
    return last >= firstNonZero;
  })();

  const sparkColor = sparkTrendUp === null ? color : sparkTrendUp ? color : "hsl(346 77% 60%)";

  const iconEl = icon && (
    <div
      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
      style={{ backgroundColor: `${color}14`, color }}
    >
      {icon}
    </div>
  );

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-5 border-border/60 rounded-xl",
        "shadow-[0_1px_2px_0_hsl(var(--foreground)/0.04),0_1px_3px_0_hsl(var(--foreground)/0.04)]",
        "transition-all duration-200 ease-out",
        "hover:shadow-[0_2px_4px_-1px_hsl(var(--foreground)/0.06),0_4px_8px_-2px_hsl(var(--foreground)/0.06)]",
        "hover:border-border hover:-translate-y-[1px]"
      )}
    >
      {/* Header: icon + label */}
      <div className="flex items-center gap-2.5 min-h-[32px]">
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

      {/* Value */}
      <p
        className={cn(
          "mt-3 tabular-nums truncate leading-none",
          empty
            ? "text-sm text-muted-foreground/70 font-normal italic"
            : "text-[26px] font-bold text-foreground tracking-tight"
        )}
      >
        {empty ? "Sem dados para análise" : value}
      </p>

      {/* Footer: delta + sparkline */}
      <div className="flex items-end justify-between mt-4 gap-2 min-h-[32px]">
        <div className="flex items-center gap-1.5 text-xs">
          {delta !== undefined && !empty ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums px-1.5 py-0.5 rounded-md text-[11px]",
                positive && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                negative && "text-rose-600 dark:text-rose-400 bg-rose-500/10",
                neutral && "text-muted-foreground bg-muted/60"
              )}
            >
              {positive ? <ArrowUpRight size={12} strokeWidth={2.5} /> : negative ? <ArrowDownRight size={12} strokeWidth={2.5} /> : <Minus size={12} strokeWidth={2.5} />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          ) : !empty ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground/60 text-[11px]">
              <Minus size={12} /> sem comparação
            </span>
          ) : null}
          {hint && <span className="text-muted-foreground/70 truncate text-[11px]">{hint}</span>}
        </div>
        {hasSpark && !empty && (
          <div className="h-9 w-24 shrink-0 -mb-1 -mr-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="natural"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.75}
                  fill={`url(#${sparkId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
