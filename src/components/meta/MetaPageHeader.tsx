import { ReactNode } from "react";

interface MetaPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleBadge?: ReactNode;
}

export function MetaPageHeader({ title, description, actions, titleBadge }: MetaPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {titleBadge}
        </div>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
