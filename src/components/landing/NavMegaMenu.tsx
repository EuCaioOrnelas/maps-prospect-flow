import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { MenuColumn, MenuItem } from "./navMenuData";
import { cn } from "@/lib/utils";

interface NavMegaMenuProps {
  columns: MenuColumn[];
  onNavigate?: () => void;
  /** 1 = avanço (esquerda → direita), -1 = regresso */
  direction?: 1 | -1;
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
            className="mt-0.5 shrink-0 text-primary"
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

function MenuColumnBlock({ col, onNavigate }: { col: MenuColumn; onNavigate?: () => void }) {
  return (
    <div className="group/col">
      <div className="relative mb-3 pb-2">
        {/* Linha base */}
        <span className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        {/* Degradê verde — cresce quando qualquer item da coluna está em hover */}
        <span
          className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/40 transition-transform duration-300 ease-out group-hover/col:scale-x-100"
          aria-hidden="true"
        />
        <p className="text-[13px] font-semibold text-primary">
          {col.title}
        </p>
      </div>
      <div className="space-y-1">
        {col.items.map((item) => (
          <MenuLink key={item.label + item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export const NavMegaMenu = ({ columns, onNavigate, direction = 1 }: NavMegaMenuProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2",
        columns.length >= 4 && "lg:grid-cols-4",
        "animate-in fade-in duration-300 ease-out",
        direction === 1 ? "slide-in-from-right-8" : "slide-in-from-left-8"
      )}
    >
      {columns.map((col) => (
        <MenuColumnBlock key={col.title} col={col} onNavigate={onNavigate} />
      ))}
    </div>
  );
};
