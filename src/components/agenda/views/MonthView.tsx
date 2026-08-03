import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { EventChip } from "../EventChip";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { buildMonthGrid, isSameDay, WEEKDAY_SHORT, eventsOfDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  onMove: (event: CalendarEvent, newDate: Date) => void;
  responsibleName: (userId: string) => string | null;
}

/** Calendário mensal, com arrastar e soltar entre dias. */
export function MonthView({ date, events, onSelect, onCreateAt, onMove, responsibleName }: Props) {
  const grid = useMemo(() => buildMonthGrid(date), [date]);
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const today = new Date();

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, index) => {
          const dayEvents = eventsOfDay(events, day);
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const isToday = isSameDay(day, today);
          const key = day.toISOString();
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverDay(key);
              }}
              onDragLeave={() => setHoverDay((prev) => (prev === key ? null : prev))}
              onDrop={() => {
                if (dragging) onMove(dragging, day);
                setDragging(null);
                setHoverDay(null);
              }}
              onDoubleClick={() => {
                const d = new Date(day);
                d.setHours(9, 0, 0, 0);
                onCreateAt(d);
              }}
              className={cn(
                "min-h-[118px] border-b border-r border-border/60 p-1.5 transition-colors",
                index % 7 === 6 && "border-r-0",
                !isCurrentMonth && "bg-muted/20",
                hoverDay === key && "bg-primary/10",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
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
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} compromissos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
