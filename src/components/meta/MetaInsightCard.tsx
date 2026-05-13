import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type InsightTone = "positive" | "neutral" | "warning" | "tip";

interface MetaInsightCardProps {
  tone?: InsightTone;
  title: string;
  description: string;
}

const iconMap = {
  positive: TrendingUp,
  neutral: Sparkles,
  warning: AlertTriangle,
  tip: Lightbulb,
};

const toneClasses: Record<InsightTone, string> = {
  positive: "text-emerald-500 bg-emerald-500/10",
  neutral: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
  tip: "text-violet-500 bg-violet-500/10",
};

export function MetaInsightCard({ tone = "neutral", title, description }: MetaInsightCardProps) {
  const Icon = iconMap[tone];
  return (
    <Card className="p-4 border-border/60 hover:border-border transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", toneClasses[tone])}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}
