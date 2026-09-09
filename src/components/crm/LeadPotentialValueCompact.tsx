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
        "w-full flex items-center justify-between gap-2 rounded-hover bg-primary/10 border border-primary/20 px-2.5 py-1.5",
        className
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/80">
        Em negociação
      </span>
      <span className="text-[11px] leading-none font-bold tabular-nums text-primary">
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export const LeadPotentialValueCompact = memo(LeadPotentialValueCompactComponent);
