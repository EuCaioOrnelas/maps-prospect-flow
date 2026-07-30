import { Link } from "react-router-dom";
import { LucideIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarNavItemProps {
  title: string;
  icon: LucideIcon;
  url?: string;
  onClick?: () => void;
  isActive?: boolean;
  isExpanded: boolean;
  highlight?: boolean;
  badge?: React.ReactNode;
  tooltip?: React.ReactNode;
  hasSubmenu?: boolean;
  isSubmenuOpen?: boolean;
  className?: string;
  iconClassName?: string;
}

export const SidebarNavItem = ({
  title,
  icon: Icon,
  url,
  onClick,
  isActive = false,
  isExpanded,
  highlight = false,
  badge,
  tooltip,
  hasSubmenu = false,
  isSubmenuOpen = false,
  className,
  iconClassName,
}: SidebarNavItemProps) => {
  const baseClasses = cn(
    "relative flex items-center rounded-hover transition-[background-color,color,width,padding] duration-300 ease-out overflow-hidden",
    "w-10 h-10 justify-center",
    isExpanded && "w-full px-2.5 justify-start gap-3"
  );

  const stateClasses = cn(
    isActive
      ? "bg-primary/10 text-primary font-medium"
      : highlight
      ? "text-primary hover:text-primary hover:bg-primary/10"
      : "text-sidebar-foreground/60 hover:text-primary hover:bg-primary/[0.07]"
  );

  const content = (
    <>
      {/* Indicador ativo — anima suavemente ao abrir/fechar o sidebar */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 inset-y-0 w-[3px] rounded-l-hover bg-primary",
          "transition-[opacity,transform] duration-300 ease-out origin-left",
          isActive && isExpanded
            ? "opacity-100 scale-x-100"
            : "opacity-0 scale-x-0"
        )}
      />
      <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
        <Icon size={20} className={iconClassName} />
        {badge}
      </div>

      {isExpanded && (
        <>
          <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 text-left">
            {title}
          </span>
          {hasSubmenu && (
            <ChevronDown
              size={16}
              className={cn(
                "shrink-0 transition-transform duration-300",
                isSubmenuOpen && "rotate-180"
              )}
            />
          )}
        </>
      )}
    </>
  );

  const itemElement = url && !onClick ? (
    <Link
      to={url}
      className={cn(baseClasses, stateClasses, className)}
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className={cn(baseClasses, stateClasses, className)}
    >
      {content}
    </button>
  );

  // Only show tooltip when collapsed and tooltip content exists
  if (!isExpanded && tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {itemElement}
          </TooltipTrigger>
          <TooltipContent side="right">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return itemElement;
};
