import { EventCard } from "../EventCard";
import { CalendarX2 } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { groupByDay, formatLongDate } from "@/lib/calendarViews";

interface Props {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  responsibleName: (userId: string) => string | null;
}

/** Lista cronológica simples, otimizada para telas pequenas. */
export function ListView({ events, onSelect, responsibleName }: Props) {
  const groups = groupByDay(events);

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX2 className="h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium text-foreground">Nada por aqui ainda</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 divide-y divide-border/60">
      {groups.map((group) => (
        <div key={group.key} className="p-3 space-y-2">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {formatLongDate(group.date)}
          </p>
          {group.events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onClick={onSelect}
              responsibleName={responsibleName(ev.assigned_user_id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
