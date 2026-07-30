import { cn } from "@/lib/utils";

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-[2px] w-[calc(100%-24px)] mx-auto rounded-full",
        "bg-foreground/35 dark:bg-foreground/25",
        className
      )}
    />
  );
}
