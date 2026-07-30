import { cn } from "@/lib/utils";

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 8"
      preserveAspectRatio="none"
      className={cn(
        "block h-2 w-[calc(100%-24px)] mx-auto text-foreground/35 dark:text-foreground/25",
        className
      )}
    >
      <path
        fill="currentColor"
        d="M0 4 C28 3.9 52 3.55 76 2.8 C94 2.25 108 2 120 2 C132 2 146 2.25 164 2.8 C188 3.55 212 3.9 240 4 C212 4.1 188 4.45 164 5.2 C146 5.75 132 6 120 6 C108 6 94 5.75 76 5.2 C52 4.45 28 4.1 0 4 Z"
      />
    </svg>
  );
}


