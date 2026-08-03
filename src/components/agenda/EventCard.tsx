import { memo } from "react";
import { cn } from "@/lib/utils";
import { Building2, User, Clock, Bot } from "lucide-react";
import {
  getEventType,
  getEventStatus,
  minutesBetween,
  formatDuration,
  type CalendarEvent,
} from "@/lib/calendarConfig";
import { formatTime } from "@/lib/calendarViews";

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
  responsibleName?: string | null;
  draggable?: boolean;
  onDragStart?: (event: CalendarEvent) => void;
}

/** Card reutilizado por todas as visualizações da Agenda. */
export const EventCard = memo(function EventCard({
  event,
  onClick,
  compact,
  responsibleName,
  draggable,
  onDragStart,
}: EventCardProps) {
  const type = getEventType(event.event_type);
  const status = getEventStatus(event.status);
  const Icon = type.icon;
  const duration = formatDuration(minutesBetween(event.starts_at, event.ends_at));
  const cancelled = event.status === "cancelled";

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={() => onDragStart?.(event)}
      onClick={() => onClick?.(event)}
      className={cn(
        "w-full text-left rounded-lg border border-border/70 border-l-[3px] transition-all duration-200",
        "hover:shadow-sm hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        type.bar,
        cancelled && "opacity-55",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("shrink-0 text-foreground/70", compact ? "h-3.5 w-3.5 mt-0.5" : "h-4 w-4 mt-0.5")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium text-foreground truncate",
                compact ? "text-[11px]" : "text-sm",
                cancelled && "line-through",
              )}
            >
              {event.title}
            </span>
            {event.source === "sdr" && (
              <Bot className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Criado pelo SDR" />
            )}
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground",
              compact ? "text-[10px]" : "text-xs mt-0.5",
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
            </span>
            {!compact && <span>· {duration}</span>}
            {!compact && event.company_name && (
              <span className="inline-flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3" />
                {event.company_name}
              </span>
            )}
            {!compact && responsibleName && (
              <span className="inline-flex items-center gap-1 truncate">
                <User className="h-3 w-3" />
                {responsibleName}
              </span>
            )}
          </div>
        </div>

        {!compact && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              status.chip,
            )}
          >
            {status.label}
          </span>
        )}
      </div>
    </button>
  );
});
