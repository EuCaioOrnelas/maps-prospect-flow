import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
