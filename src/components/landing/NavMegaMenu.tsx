import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuColumn, MenuItem } from "./navMenuData";

interface NavMegaMenuProps {
  columns: MenuColumn[];
  sideColumns?: MenuColumn[];
  onNavigate?: () => void;
  /** Quando true, links usam hover "glass" (sem fundo/cor alterada, apenas fonte e seta) */
  glass?: boolean;
}

function MenuLink({ item, onNavigate, compact }: { item: MenuItem; onNavigate?: () => void; compact?: boolean }) {
  const Icon = item.icon;
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (item.to.startsWith("/#")) {
      e.preventDefault();
      onNavigate?.();
      navigate(item.to);
      const id = item.to.slice(2);
      const start = Date.now();
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (Date.now() - start < 4000) requestAnimationFrame(tryScroll);
      };
      tryScroll();
      return;
    }
    onNavigate?.();
  };

  return (
    <Link
      to={item.to}
      onClick={handleClick}
      className="group relative block rounded-lg px-3 py-2.5"
    >
      <span className="flex items-start gap-2.5">
        {Icon && (
          <Icon
            size={compact ? 15 : 17}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-medium text-foreground transition-[font-weight] duration-150 group-hover:font-bold">
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

export const NavMegaMenu = ({ columns, sideColumns, onNavigate, glass }: NavMegaMenuProps) => {
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
        <div
          className={cn(
            "rounded-xl p-4 space-y-5",
            glass ? "bg-background/40" : "bg-muted/40"
          )}
        >
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
