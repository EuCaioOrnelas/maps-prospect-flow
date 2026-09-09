import { memo } from "react";
import { cn } from "@/lib/utils";

interface LeadEngagementScoreProps {
  score: number;
  max?: number;
  showLabel?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: "sm" | "md";
}

const getScoreTier = (score: number) => {
  const base = { color: "bg-primary", text: "text-primary", glow: "shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]" };
  if (score >= 75) return { ...base, label: "Excelente" };
  if (score >= 50) return { ...base, label: "Bom" };
  if (score >= 25) return { ...base, label: "Médio" };
  return { ...base, label: "Baixo" };
};

const LeadEngagementScoreComponent = ({
  score,
  max = 100,
  showLabel = true,
  onClick,
  className,
  size = "sm",
}: LeadEngagementScoreProps) => {
  const safeScore = Math.max(0, Math.min(score, max));
  const pct = (safeScore / max) * 100;
  const tier = getScoreTier(safeScore);

  return (
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
            Oportunidade
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
            "text-xs font-semibold tabular-nums tracking-tight min-w-[36px] text-right",
            tier.text,
          )}
        >
          {safeScore}
        </span>
      </div>
    </div>
  );
};

export const LeadEngagementScore = memo(LeadEngagementScoreComponent);
