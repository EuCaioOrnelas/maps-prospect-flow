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

export function MetaInsightCard({ tone = "neutral", title, description }: MetaInsightCardProps) {
  const Icon = iconMap[tone];
  return (
    <Card className="p-4 border-border/40 hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.04] transition-all duration-300 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
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
