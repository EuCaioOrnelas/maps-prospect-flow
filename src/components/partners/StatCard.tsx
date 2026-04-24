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

export function StatCard({ label, value, hint, icon: Icon, accent = "primary", highlight, className }: Props) {
  const a = accents[accent];
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/60 bg-card transition-all hover:shadow-lg hover:-translate-y-0.5",
      highlight && "ring-1 ring-primary/30 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.45)]",
      className,
    )}>
      <div className={cn("pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-70 bg-gradient-to-br to-transparent", a.glow)} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tracking-tight mt-1.5 truncate">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
          </div>
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1", a.iconBg, a.ring)}>
            <Icon size={16} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
