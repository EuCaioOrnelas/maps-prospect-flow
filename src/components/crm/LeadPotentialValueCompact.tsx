import { memo } from "react";
import { cn } from "@/lib/utils";

interface LeadPotentialValueCompactProps {
  value: number;
  className?: string;
}

const LeadPotentialValueCompactComponent = ({ value, className }: LeadPotentialValueCompactProps) => {
  if (!value || value <= 0) return null;

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-1",
        className
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/70">
        Em negociação
      </span>
      <span className="text-[11px] leading-none font-bold tabular-nums text-emerald-950 dark:text-emerald-200">
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export const LeadPotentialValueCompact = memo(LeadPotentialValueCompactComponent);
