import { memo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeadEngagementScoreProps {
  score: number;
  max?: number;
  showLabel?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: "sm" | "md";
}

const getScoreTier = (score: number) => {
  if (score >= 750) return { color: "bg-emerald-500", text: "text-emerald-500", glow: "shadow-[0_0_12px_-2px_hsl(142_71%_45%/0.6)]", label: "Excelente" };
  if (score >= 500) return { color: "bg-blue-500", text: "text-blue-500", glow: "shadow-[0_0_12px_-2px_hsl(217_91%_60%/0.6)]", label: "Bom" };
  if (score >= 250) return { color: "bg-orange-500", text: "text-orange-500", glow: "shadow-[0_0_12px_-2px_hsl(25_95%_53%/0.6)]", label: "Médio" };
  return { color: "bg-red-500", text: "text-red-500", glow: "shadow-[0_0_12px_-2px_hsl(0_84%_60%/0.6)]", label: "Baixo" };
};

const LeadEngagementScoreComponent = ({
  score,
  max = 1000,
  showLabel = true,
  onClick,
  className,
  size = "sm",
}: LeadEngagementScoreProps) => {
  const safeScore = Math.max(0, Math.min(score, max));
  const pct = (safeScore / max) * 100;
  const tier = getScoreTier(safeScore);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              "group/score w-full",
              onClick && "cursor-pointer",
              className,
            )}
          >
            {showLabel && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
                  Score Inteligente
                </span>
                <span className={cn("text-[10px] font-medium opacity-70", tier.text)}>
                  {tier.label}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "relative flex-1 overflow-hidden rounded-full bg-muted/60",
                  size === "sm" ? "h-1.5" : "h-2",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    tier.color,
                    "group-hover/score:" + tier.glow,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums tracking-tight min-w-[28px] text-right",
                  tier.text,
                )}
              >
                {safeScore}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p className="font-medium mb-0.5">Score Inteligente: {safeScore}/{max}</p>
          <p className="text-muted-foreground">
            Calculado por respostas, interesse, atividade recente e engajamento.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const LeadEngagementScore = memo(LeadEngagementScoreComponent);
