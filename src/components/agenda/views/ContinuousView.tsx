import { Fragment } from "react";
import { CalendarX2 } from "lucide-react";
import { EventCard } from "../EventCard";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { groupByDay, formatLongDate, relativeDayLabel, isSameDay } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  responsibleName: (userId: string) => string | null;
}

/** Modo padrão: fluxo contínuo de dias, ideal para uso diário e mobile. */
export function ContinuousView({ events, onSelect, responsibleName }: Props) {
  const groups = groupByDay(events);
  const today = new Date();

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX2 className="h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium text-foreground">Nenhum compromisso no período</p>
        <p className="text-xs text-muted-foreground">
          Crie um compromisso ou deixe o SDR Inteligente agendar por você.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const relative = relativeDayLabel(group.date);
        const isToday = isSameDay(group.date, today);
        return (
          <Fragment key={group.key}>
            <section className="space-y-2">
              <header className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-background/95">
                <div className="flex items-baseline gap-2">
                  <h3
                    className={cn(
                      "text-sm font-semibold capitalize",
                      isToday ? "text-primary" : "text-foreground",
                    )}
                  >
                    {relative ?? formatLongDate(group.date)}
                  </h3>
                  {relative && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {formatLongDate(group.date)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {group.events.length} {group.events.length === 1 ? "compromisso" : "compromissos"}
                  </span>
                </div>
              </header>
              <div className="space-y-2">
                {group.events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onClick={onSelect}
                    responsibleName={responsibleName(ev.assigned_user_id)}
                  />
                ))}
              </div>
            </section>
          </Fragment>
        );
      })}
    </div>
  );
}
