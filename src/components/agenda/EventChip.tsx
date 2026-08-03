import { useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Building2, User, Bot, PencilLine } from "lucide-react";
import {
  getEventType,
  getEventStatus,
  minutesBetween,
  formatDuration,
  type CalendarEvent,
} from "@/lib/calendarConfig";
import { formatTime } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

export type EventChipVariant = "compact" | "default" | "detailed";

interface Props {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onQuickEdit?: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  responsibleName?: string | null;
  variant?: EventChipVariant;
}

/**
 * Chip de compromisso usado nas grades (mês, semana, dia).
 * Mostra um card detalhado no hover, sem depender de cliques.
 */
export function EventChip({
  event,
  onClick,
  onQuickEdit,
  onDragStart,
  onDragEnd,
  responsibleName,
  variant = "default",
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const type = getEventType(event.event_type);
  const status = getEventStatus(event.status);
  const Icon = type.icon;
  const duration = formatDuration(minutesBetween(event.starts_at, event.ends_at));
  const cancelled = event.status === "cancelled";


  const details = (
    <Card className="p-3 shadow-xl border-border">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight">{event.title}</h4>
          <span className={cn("h-3 w-3 rounded-full shrink-0 mt-0.5", type.dot)} />
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">
            {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
          </span>
          <span className="text-[10px]">({duration})</span>
        </div>
        {event.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{event.company_name}</span>
          </div>
        )}
        {responsibleName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{responsibleName}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Badge variant="outline" className={cn("text-[10px] h-5", type.chip)}>
            {type.label}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] h-5", status.chip)}>
            {status.label}
          </Badge>
          {event.source === "sdr" && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1">
              <Bot className="h-3 w-3" />
              SDR
            </Badge>
          )}
        </div>
        {onQuickEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setHovered(false);
              onQuickEdit(event);
            }}
          >
            <PencilLine className="h-3 w-3 mr-1.5" />
            Editar detalhes
          </Button>
        )}
      </div>
    </Card>
  );


  if (variant === "detailed") {
    return (
      <div
        draggable={!!onDragStart}
        onDragStart={() => onDragStart?.(event)}
        onDragEnd={onDragEnd}
        onClick={() => onClick(event)}
        className={cn(
          "cursor-pointer rounded-lg border border-l-[3px] border-border/70 p-3 transition-all duration-200",
          type.bar,
          "hover:shadow-md hover:-translate-y-[1px]",
          cancelled && "opacity-55",
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium truncate", cancelled && "line-through")}>
              {event.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
              </span>
              <span>· {duration}</span>
              {event.company_name && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Building2 className="h-3 w-3" />
                  {event.company_name}
                </span>
              )}
              {responsibleName && (
                <span className="inline-flex items-center gap-1 truncate">
                  <User className="h-3 w-3" />
                  {responsibleName}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] h-5", status.chip)}>
              {status.label}
            </Badge>
            {onQuickEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Editar compromisso"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickEdit(event);
                }}
              >
                <PencilLine className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(event)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(event)}
      onMouseEnter={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAnchor({ x: Math.min(rect.left, window.innerWidth - 280), y: rect.bottom + 6 });
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className="w-full min-w-0 cursor-pointer"
    >
      <div
        className={cn(
          "flex h-[22px] w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-l-[3px] px-1.5 text-[11px] font-medium transition-all duration-200",
          type.bar,
          "border-y-border/50 border-r-border/50",
          cancelled && "opacity-55",
          hovered && "shadow-sm ring-1 ring-ring/20",
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", type.dot)} />
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatTime(event.starts_at)}
        </span>
        <span className={cn("truncate text-foreground", cancelled && "line-through")}>
          {event.title}
        </span>
        {event.source === "sdr" && <Bot className="ml-auto h-3 w-3 shrink-0 text-primary" />}
      </div>
      {hovered && anchor &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] w-64 animate-in fade-in duration-150"
            style={{ left: anchor.x, top: anchor.y }}
          >
            {details}
          </div>,
          document.body,
        )}
    </div>
  );
}
