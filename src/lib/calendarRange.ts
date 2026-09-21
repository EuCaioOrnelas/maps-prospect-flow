/**
 * Estilo único para os calendários de intervalo (Meta e Forms).
 * Extremos em verde sólido, dias do meio em verde suave — sem "buracos"
 * nem quadrados sobrepostos entre as células.
 */
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const rangeCalendarClassNames = {
  months: "flex flex-col sm:flex-row gap-4 sm:gap-6",
  month: "space-y-4 w-[252px]",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-sm font-semibold text-popover-foreground",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell: "text-muted-foreground w-9 font-medium text-[0.75rem]",
  row: "flex w-full mt-1.5",
  cell: cn(
    "relative h-9 w-9 p-0 text-center text-sm",
    "focus-within:relative focus-within:z-20",
    "[&:has([aria-selected])]:bg-[hsl(var(--primary)/0.13)]",
    "[&:has(.day-range-start)]:rounded-l-full [&:has(.day-range-end)]:rounded-r-full",
    "first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full",
  ),
  day: cn(
    buttonVariants({ variant: "ghost" }),
    "h-9 w-9 rounded-full p-0 text-sm font-medium",
    "hover:bg-[hsl(var(--primary)/0.25)] hover:text-foreground aria-selected:opacity-100",
  ),
  day_range_middle: "!rounded-none !bg-transparent hover:!bg-[hsl(var(--primary)/0.28)]",
  day_range_start:
    "day-range-start !rounded-full !bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
  day_range_end:
    "day-range-end !rounded-full !bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
  // Dias entre o início e o fim ficam suaves; só as pontas recebem verde sólido.
  day_selected: "bg-transparent text-foreground hover:bg-[hsl(var(--primary)/0.28)] hover:text-foreground",
  day_today: "font-semibold ring-1 ring-inset ring-primary/40 aria-selected:ring-0",
  day_outside: "day-outside text-muted-foreground/45",
  day_disabled: "text-muted-foreground/40",
  day_hidden: "invisible",
} as const;
