import { memo } from "react";
import { cn } from "@/lib/utils";

interface LeadPotentialValueCompactProps {
  value: number;
  className?: string;
}

const LeadPotentialValueCompactComponent = ({ value, className }: LeadPotentialValueCompactProps) => {
  if (!value || value <= 0) return null;

  return (
    <div className={cn("flex items-baseline justify-between gap-2", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Valor potencial
      </span>
      <span className="text-[20px] leading-none font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export const LeadPotentialValueCompact = memo(LeadPotentialValueCompactComponent);
