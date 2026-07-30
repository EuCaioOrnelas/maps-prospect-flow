import { cn } from "@/lib/utils";

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-[3px] w-[calc(100%-24px)] mx-auto",
        "bg-[radial-gradient(ellipse_70%_100%_at_center,hsl(var(--sidebar-border))_0%,transparent_100%)]",
        "opacity-90",
        className
      )}
    />
  );
}

