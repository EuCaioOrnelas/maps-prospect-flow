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
        "w-full flex items-center justify-between gap-2 rounded-full bg-emerald-200 dark:bg-emerald-300 px-3 py-1.5",
        className
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black">
        Valor
      </span>
      <span className="text-[13px] leading-none font-bold tabular-nums text-emerald-900">
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export const LeadPotentialValueCompact = memo(LeadPotentialValueCompactComponent);
