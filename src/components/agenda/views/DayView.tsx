import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { EventChip } from "../EventChip";
import { DAY_START_HOUR, DAY_END_HOUR, pad, type CalendarEvent } from "@/lib/calendarConfig";
import { eventsOfDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onQuickEdit?: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  onMove: (event: CalendarEvent, newDate: Date, hour?: number) => void;
  responsibleName: (userId: string) => string | null;
}

/** Visualização diária com faixa de horários. */
export function DayView({ date, events, onSelect, onQuickEdit, onCreateAt, onMove, responsibleName }: Props) {
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i),
    [],
  );
  const dayEvents = eventsOfDay(events, date);
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const now = new Date();

  return (
    <Card className="overflow-hidden">
      {hours.map((hour) => {
        const slotEvents = dayEvents.filter((e) => new Date(e.starts_at).getHours() === hour);
        const isCurrent = now.getHours() === hour && now.toDateString() === date.toDateString();
        return (
          <div
            key={hour}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverHour(hour);
            }}
            onDragLeave={() => setHoverHour((prev) => (prev === hour ? null : prev))}
            onDrop={() => {
              if (dragging) onMove(dragging, date, hour);
              setDragging(null);
              setHoverHour(null);
            }}
            className={cn(
              "grid grid-cols-[64px_1fr] gap-3 border-b border-border/50 px-3 py-2 transition-colors last:border-b-0",
              isCurrent && "bg-primary/5",
              hoverHour === hour && "bg-primary/10",
            )}
          >
            <button
              type="button"
              onClick={() => {
                const d = new Date(date);
                d.setHours(hour, 0, 0, 0);
                onCreateAt(d);
              }}
              className="pt-1 text-left text-xs tabular-nums text-muted-foreground transition-colors hover:text-primary"
            >
              {pad(hour)}:00
            </button>
            <div className="min-h-[40px] space-y-1.5">
              {slotEvents.map((ev) => (
                <EventChip
                  key={ev.id}
                  event={ev}
                  variant="detailed"
                  onClick={onSelect}
                onQuickEdit={onQuickEdit}
                  onDragStart={setDragging}
                  onDragEnd={() => setDragging(null)}
                  responsibleName={responsibleName(ev.assigned_user_id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
