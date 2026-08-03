import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { EventChip } from "../EventChip";
import { DAY_START_HOUR, DAY_END_HOUR, pad, type CalendarEvent } from "@/lib/calendarConfig";
import { addDays, startOfWeek, isSameDay, WEEKDAY_SHORT, eventsOfDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  onMove: (event: CalendarEvent, newDate: Date, hour?: number) => void;
  responsibleName: (userId: string) => string | null;
}

/** Visualização semanal em grade de horários. */
export function WeekView({ date, events, onSelect, onCreateAt, onMove, responsibleName }: Props) {
  const days = useMemo(() => {
    const first = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i));
  }, [date]);
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i),
    [],
  );
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const today = new Date();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/40">
            <div className="px-2 py-2.5 text-[11px] text-muted-foreground">Hora</div>
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(9, 0, 0, 0);
                    onCreateAt(d);
                  }}
                  className={cn(
                    "px-2 py-2 text-center transition-colors hover:bg-muted/60",
                    isToday && "bg-primary/10",
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {WEEKDAY_SHORT[day.getDay()]}
                  </p>
                  <p className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                    {day.getDate()}
                  </p>
                </button>
              );
            })}
          </div>

          {hours.map((hour) => (
            <div key={hour} className="grid h-[52px] grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border/50 last:border-b-0">
              <div className="px-2 py-1.5 text-[11px] tabular-nums text-muted-foreground">
                {pad(hour)}:00
              </div>
              {days.map((day) => {
                const key = `${day.toISOString()}-${hour}`;
                const slotEvents = eventsOfDay(events, day).filter(
                  (e) => new Date(e.starts_at).getHours() === hour,
                );
                return (
                  <div
                    key={key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoverSlot(key);
                    }}
                    onDragLeave={() => setHoverSlot((prev) => (prev === key ? null : prev))}
                    onDrop={() => {
                      if (dragging) onMove(dragging, day, hour);
                      setDragging(null);
                      setHoverSlot(null);
                    }}
                    onDoubleClick={() => {
                      const d = new Date(day);
                      d.setHours(hour, 0, 0, 0);
                      onCreateAt(d);
                    }}
                    className={cn(
                      "relative h-full min-w-0 overflow-hidden border-l border-border/50 p-1 transition-colors",
                      hoverSlot === key && "bg-primary/10",
                    )}
                  >
                    {slotEvents.slice(0, 1).map((ev) => (
                      <EventChip
                        key={ev.id}
                        event={ev}
                        variant="compact"
                        onClick={onSelect}
                        onDragStart={setDragging}
                        onDragEnd={() => setDragging(null)}
                        responsibleName={responsibleName(ev.assigned_user_id)}
                      />
                    ))}
                    {slotEvents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onSelect(slotEvents[1])}
                        className="mt-0.5 w-full truncate rounded text-left text-[10px] font-medium text-primary hover:underline"
                      >
                        +{slotEvents.length - 1} compromisso{slotEvents.length > 2 ? "s" : ""}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
