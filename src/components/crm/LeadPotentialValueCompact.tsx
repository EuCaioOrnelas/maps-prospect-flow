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
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1",
        className
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        Valor
      </span>
      <span className="text-[12px] leading-none font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export const LeadPotentialValueCompact = memo(LeadPotentialValueCompactComponent);
