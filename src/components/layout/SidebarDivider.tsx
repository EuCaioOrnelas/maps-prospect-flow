import { cn } from "@/lib/utils";

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-[4px] w-[calc(100%-24px)] mx-auto rounded-full",
        "bg-[linear-gradient(to_right,transparent_0%,hsl(var(--sidebar-border))_20%,hsl(var(--sidebar-border))_80%,transparent_100%)]",
        "opacity-90",
        className
      )}
    />
  );
}


