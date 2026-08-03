import { useMemo } from "react";
import { EventCard } from "../EventCard";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { addDays, startOfWeek, isSameDay, WEEKDAY_SHORT, eventsOfDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  responsibleName: (userId: string) => string | null;
}

/** Visualização semanal com uma coluna por dia. */
export function WeekView({ date, events, onSelect, onCreateAt, responsibleName }: Props) {
  const days = useMemo(() => {
    const first = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i));
  }, [date]);
  const today = new Date();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = eventsOfDay(events, day);
        const isToday = isSameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "rounded-xl border border-border/70 overflow-hidden flex flex-col",
              isToday && "border-primary/40",
            )}
          >
            <button
              type="button"
              onClick={() => {
                const d = new Date(day);
                d.setHours(9, 0, 0, 0);
                onCreateAt(d);
              }}
              className={cn(
                "px-2 py-2 text-left transition-colors hover:bg-muted/50",
                isToday ? "bg-primary/10" : "bg-muted/30",
              )}
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_SHORT[day.getDay()]}
              </p>
              <p className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                {day.getDate()}
              </p>
            </button>
            <div className="p-1.5 space-y-1.5 min-h-[120px]">
              {dayEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  compact
                  onClick={onSelect}
                  responsibleName={responsibleName(ev.assigned_user_id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
