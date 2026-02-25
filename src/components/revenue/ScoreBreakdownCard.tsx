import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScoreBreakdownCardProps {
  scoreIntent: number;
  scoreEngagement: number;
  scoreUrgency: number;
  scoreRisk: number;
  scoreTotal: number;
}

const dimensions = [
  { key: "intent", label: "Intenção", weight: "35%", color: "bg-orange-500", icon: "🎯" },
  { key: "engagement", label: "Engajamento", weight: "30%", color: "bg-blue-500", icon: "💬" },
  { key: "urgency", label: "Urgência", weight: "20%", color: "bg-yellow-500", icon: "⚡" },
  { key: "risk", label: "Risco", weight: "15%", color: "bg-red-500", icon: "⚠️" },
];

export const ScoreBreakdownCard = ({
  scoreIntent,
  scoreEngagement,
  scoreUrgency,
  scoreRisk,
  scoreTotal,
}: ScoreBreakdownCardProps) => {
  const scores = {
    intent: scoreIntent,
    engagement: scoreEngagement,
    urgency: scoreUrgency,
    risk: scoreRisk,
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Score Multidimensional</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-4xl font-bold text-primary">{scoreTotal}</p>
          <p className="text-xs text-muted-foreground">de 1000</p>
        </div>

        {dimensions.map((dim) => {
          const value = scores[dim.key as keyof typeof scores];
          const maxForDim = 1000; // Each dimension can contribute up to ~350 pts (intent) based on weights
          const pct = Math.min(100, (value / 350) * 100); // Normalize for visual

          return (
            <div key={dim.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span>{dim.icon}</span>
                  {dim.label}
                  <span className="text-[10px] text-muted-foreground/60">({dim.weight})</span>
                </span>
                <span className={cn("font-bold", dim.key === "risk" ? "text-destructive" : "text-foreground")}>
                  {dim.key === "risk" ? `-${value}` : value}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", dim.color)}
                  style={{ width: `${Math.min(100, Math.abs(pct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
