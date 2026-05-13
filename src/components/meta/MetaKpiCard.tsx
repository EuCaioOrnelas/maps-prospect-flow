import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface MetaKpiCardProps {
  label: string;
  value: string | number;
  delta?: number; // % change vs previous period
  spark?: number[];
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "emerald" | "violet" | "amber" | "rose";
}

const accentMap: Record<NonNullable<MetaKpiCardProps["accent"]>, string> = {
  primary: "hsl(var(--primary))",
  emerald: "hsl(158 72% 38%)",
  violet: "hsl(262 60% 60%)",
  amber: "hsl(38 92% 50%)",
  rose: "hsl(346 77% 60%)",
};

export function MetaKpiCard({ label, value, delta, spark, hint, icon, accent = "primary" }: MetaKpiCardProps) {
  const color = accentMap[accent];
  const data = (spark ?? []).map((v, i) => ({ i, v }));
  const positive = (delta ?? 0) > 0;
  const negative = (delta ?? 0) < 0;

  return (
    <Card className="relative overflow-hidden p-4 border-border/60 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums truncate">{value}</p>
        </div>
        {icon && (
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                positive && "text-emerald-500",
                negative && "text-rose-500",
                !positive && !negative && "text-muted-foreground"
              )}
            >
              {positive ? <ArrowUpRight size={12} /> : negative ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground truncate">{hint}</span>}
        </div>
        {data.length > 1 && (
          <div className="h-8 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${label})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
