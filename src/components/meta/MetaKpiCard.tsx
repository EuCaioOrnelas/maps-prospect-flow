import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
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
}

const accentMap: Record<NonNullable<MetaKpiCardProps["accent"]>, string> = {
  primary: "hsl(var(--primary))",
  emerald: "hsl(158 72% 38%)",
  violet: "hsl(262 60% 60%)",
  amber: "hsl(38 92% 50%)",
  rose: "hsl(346 77% 60%)",
};

export function MetaKpiCard({ label, value, delta, spark, hint, icon, accent = "primary", empty = false }: MetaKpiCardProps) {
  const color = accentMap[accent];
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const hasSpark = sparkData.length > 1 && sparkData.some((d) => d.v > 0);
  const positive = (delta ?? 0) > 0.05;
  const negative = (delta ?? 0) < -0.05;
  const neutral = !positive && !negative;
  const sparkId = `spark-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <Card className="relative overflow-hidden p-4 border-border/60 hover:border-border transition-colors">
      {/* Header: icon + label aligned */}
      <div className="flex items-center gap-2">
        {icon && (
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
      </div>

      {/* Value */}
      <p className={cn(
        "mt-2 tabular-nums truncate",
        empty ? "text-sm text-muted-foreground/70 font-normal italic" : "text-2xl font-semibold text-foreground"
      )}>
        {empty ? "Sem dados para análise" : value}
      </p>

      {/* Footer: delta + sparkline */}
      <div className="flex items-center justify-between mt-3 gap-2 min-h-[28px]">
        <div className="flex items-center gap-1.5 text-xs">
          {delta !== undefined && !empty ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                positive && "text-emerald-500",
                negative && "text-rose-500",
                neutral && "text-muted-foreground"
              )}
            >
              {positive ? <ArrowUpRight size={12} /> : negative ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          ) : !empty ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
              <Minus size={12} /> sem comparação
            </span>
          ) : null}
          {hint && <span className="text-muted-foreground truncate">{hint}</span>}
        </div>
        {hasSpark && !empty && (
          <div className="h-8 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${sparkId})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
