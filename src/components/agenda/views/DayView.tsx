import { useMemo } from "react";
import { EventCard } from "../EventCard";
import { DAY_START_HOUR, DAY_END_HOUR, pad, type CalendarEvent } from "@/lib/calendarConfig";
import { eventsOfDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  responsibleName: (userId: string) => string | null;
}

/** Visualização diária com faixa de horários. */
export function DayView({ date, events, onSelect, onCreateAt, responsibleName }: Props) {
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i),
    [],
  );
  const dayEvents = eventsOfDay(events, date);
  const now = new Date();

  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
      {hours.map((hour) => {
        const slotEvents = dayEvents.filter((e) => new Date(e.starts_at).getHours() === hour);
        const isCurrent =
          now.getHours() === hour &&
          now.toDateString() === date.toDateString();
        return (
          <div
            key={hour}
            className={cn(
              "grid grid-cols-[56px_1fr] gap-3 px-3 py-2 transition-colors hover:bg-muted/40",
              isCurrent && "bg-primary/5",
            )}
          >
            <button
              type="button"
              onClick={() => {
                const d = new Date(date);
                d.setHours(hour, 0, 0, 0);
                onCreateAt(d);
              }}
              className="text-left text-xs text-muted-foreground pt-1 hover:text-primary transition-colors"
            >
              {pad(hour)}:00
            </button>
            <div className="space-y-1.5 min-h-[36px]">
              {slotEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
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
