import { useMemo, useState } from "react";
import { getEventType, type CalendarEvent } from "@/lib/calendarConfig";
import { buildMonthGrid, isSameDay, WEEKDAY_SHORT, eventsOfDay, formatTime } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  /** Move o compromisso para outro dia mantendo o horário (drag and drop). */
  onMove: (event: CalendarEvent, newDate: Date) => void;
}

/** Calendário mensal tradicional, com arrastar e soltar entre dias. */
export function MonthView({ date, events, onSelect, onCreateAt, onMove }: Props) {
  const grid = useMemo(() => buildMonthGrid(date), [date]);
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const today = new Date();

  return (
    <div className="rounded-xl border border-border/70 overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/30">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] uppercase tracking-wide text-muted-foreground text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day) => {
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
                "min-h-[104px] border-t border-r border-border/60 p-1.5 space-y-1 transition-colors",
                !isCurrentMonth && "bg-muted/20",
                hoverDay === key && "bg-primary/10",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 3).map((ev) => {
                const type = getEventType(ev.event_type);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    draggable
                    onDragStart={() => setDragging(ev)}
                    onClick={() => onSelect(ev)}
                    className={cn(
                      "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] transition-colors hover:bg-muted",
                      ev.status === "cancelled" && "opacity-50 line-through",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", type.dot)} />
                    <span className="text-muted-foreground tabular-nums">{formatTime(ev.starts_at)}</span>
                    <span className="truncate text-foreground">{ev.title}</span>
                  </button>
                );
              })}
              {dayEvents.length > 3 && (
                <p className="px-1 text-[10px] text-muted-foreground">
                  +{dayEvents.length - 3} compromissos
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
