import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card padrão dos blocos do canvas de Fluxos.
 * Visual: cartão claro, ícone branco sobre fundo sólido colorido,
 * título em negrito, subtítulo discreto e menu à direita.
 */
export function NodeShell({
  icon: Icon,
  iconImg,
  accent = "bg-primary",
  title,
  subtitle,
  placeholder,
  width = "w-60",
  children,
  className,
}: {
  icon?: any;
  iconImg?: string;
  accent?: string;
  title: string;
  subtitle?: string | null;
  placeholder?: string;
  width?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-border/70 rounded-2xl shadow-[0_6px_20px_-12px_hsl(var(--foreground)/0.35)] relative",
        width,
        className,
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", accent)}>
          {iconImg ? (
            <img src={iconImg} alt="" className="w-[18px] h-[18px] object-contain" />
          ) : Icon ? (
            <Icon size={17} className="text-white" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{title}</p>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">{subtitle}</p>
          ) : placeholder ? (
            <p className="text-[11px] text-muted-foreground/60 italic leading-tight mt-0.5">{placeholder}</p>
          ) : null}
        </div>
        <MoreVertical size={15} className="text-muted-foreground/50 shrink-0" />
      </div>
      {children}
    </div>
  );
}
