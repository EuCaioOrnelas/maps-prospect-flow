import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "emerald" | "amber" | "violet" | "rose" | "blue";
  highlight?: boolean;
  className?: string;
}

const accents: Record<string, { ring: string; iconBg: string; glow: string }> = {
  primary: { ring: "ring-primary/20", iconBg: "bg-primary/10 text-primary", glow: "from-primary/15" },
  emerald: { ring: "ring-emerald-500/20", iconBg: "bg-emerald-500/10 text-emerald-600", glow: "from-emerald-500/15" },
  amber: { ring: "ring-amber-500/20", iconBg: "bg-amber-500/10 text-amber-600", glow: "from-amber-500/15" },
  violet: { ring: "ring-violet-500/20", iconBg: "bg-violet-500/10 text-violet-600", glow: "from-violet-500/15" },
  rose: { ring: "ring-rose-500/20", iconBg: "bg-rose-500/10 text-rose-600", glow: "from-rose-500/15" },
  blue: { ring: "ring-blue-500/20", iconBg: "bg-blue-500/10 text-blue-600", glow: "from-blue-500/15" },
};

/**
 * Adaptive font sizing for values: shrinks gracefully so values like
 * "R$ 1.234.567,89" don't overflow narrow cards. Uses CSS clamp + char-based heuristic.
 */
function valueSizeClass(value: string | number): string {
  const len = String(value ?? "").length;
  if (len <= 8) return "text-2xl";
  if (len <= 11) return "text-xl";
  if (len <= 14) return "text-lg";
  if (len <= 18) return "text-base";
  return "text-sm";
}

export function StatCard({ label, value, hint, icon: Icon, accent = "primary", highlight, className }: Props) {
  const a = accents[accent];
  const valueClass = valueSizeClass(value);
  return (
    <Card className={cn(
      "relative overflow-hidden border border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 hover:shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.15)]",
      className,
    )}>
      {/* soft accent glow blob */}
      <div className={cn("pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-50 bg-gradient-to-br to-transparent", a.glow)} />
      {/* highlighted: soft background glow only, no border ring */}
      {highlight && (
        <>
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full blur-3xl opacity-60 bg-gradient-to-tr from-primary/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
        </>
      )}
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</div>
            <div
              className={cn(
                "font-bold tracking-tight mt-1.5 tabular-nums leading-tight break-words",
                valueClass,
              )}
              title={String(value)}
            >
              {value}
            </div>
            {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
          </div>
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1", a.iconBg, a.ring)}>
            <Icon size={16} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
