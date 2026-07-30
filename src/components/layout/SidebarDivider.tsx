import { cn } from "@/lib/utils";

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-2 w-[calc(100%-24px)] mx-auto overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2 bg-sidebar-foreground/25 [clip-path:polygon(0_47%,12%_42%,32%_31%,50%_25%,68%_31%,88%_42%,100%_47%,100%_53%,88%_58%,68%_69%,50%_75%,32%_69%,12%_58%,0_53%)] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
    </div>
  );
}


