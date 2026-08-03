import { Card } from "@/components/ui/card";
import { EventChip } from "../EventChip";
import { CalendarX2 } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { groupByDay, formatLongDate, relativeDayLabel } from "@/lib/calendarViews";

interface Props {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onQuickEdit?: (event: CalendarEvent) => void;
  responsibleName: (userId: string) => string | null;
}

/** Lista cronológica agrupada por dia. */
export function ListView({ events, onSelect, onQuickEdit, responsibleName }: Props) {
  const groups = groupByDay(events);

  if (!groups.length) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX2 className="h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium text-foreground">Nada por aqui ainda</p>
        <p className="text-xs text-muted-foreground">Crie um compromisso para começar</p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border/60">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2 p-4">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold capitalize text-foreground">
              {relativeDayLabel(group.date)}
            </p>
            <p className="text-xs capitalize text-muted-foreground">{formatLongDate(group.date)}</p>
          </div>
          <div className="space-y-2">
            {group.events.map((ev) => (
              <EventChip
                key={ev.id}
                event={ev}
                variant="detailed"
                onClick={onSelect}
                onQuickEdit={onQuickEdit}
                responsibleName={responsibleName(ev.assigned_user_id)}
              />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
