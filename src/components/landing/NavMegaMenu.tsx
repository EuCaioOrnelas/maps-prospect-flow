import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuColumn } from "./navMenuData";

interface NavMegaMenuProps {
  columns: MenuColumn[];
  sideColumns?: MenuColumn[];
  onNavigate?: () => void;
}

function MenuLink({ item, onNavigate, compact }: { item: MenuColumn["items"][number]; onNavigate?: () => void; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="group relative block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      {/* Linha superior com degradê verde da Wiize (aparece no hover) */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 right-3 top-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary via-primary/70 to-emerald-300 transition-transform duration-300 group-hover:scale-x-100"
      />
      <span className="flex items-start gap-2.5">
        {Icon && (
          <Icon
            size={compact ? 15 : 17}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          />
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {item.label}
            <ArrowRight
              size={13}
              className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            />
          </span>
          {item.description && (
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
              {item.description}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

export const NavMegaMenu = ({ columns, sideColumns, onNavigate }: NavMegaMenuProps) => {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-[1fr_1fr_minmax(0,0.9fr)]">
      {columns.map((col) => (
        <div key={col.title}>
          <p className="mb-3 border-b border-border pb-2 text-[13px] font-semibold text-foreground/70">
            {col.title}
          </p>
          <div className="space-y-1">
            {col.items.map((item) => (
              <MenuLink key={item.label + item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}

      {sideColumns && sideColumns.length > 0 && (
        <div className={cn("rounded-xl bg-muted/40 p-4 space-y-5")}>
          {sideColumns.map((col) => (
            <div key={col.title}>
              <p className="mb-1.5 px-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                {col.title}
              </p>
              <div className="space-y-0.5">
                {col.items.map((item) => (
                  <MenuLink key={item.label + item.to} item={item} onNavigate={onNavigate} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
