import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CalendarCheck, CalendarClock, CalendarRange, CheckCircle2, XCircle, Percent, Bot, Timer } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

interface Props {
  events: CalendarEvent[];
  loading?: boolean;
}

const inRange = (iso: string, from: Date, to: Date) => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

/** Métricas operacionais da Agenda (duas linhas, padrão dos cards da Wiize). */
export function AgendaMetrics({ events, loading }: Props) {
  const metrics = useMemo(() => {
    const now = new Date();
    const today = [startOfDay(now), endOfDay(now)] as const;
    const tomorrow = [startOfDay(addDays(now, 1)), endOfDay(addDays(now, 1))] as const;
    const week = [startOfWeek(now), endOfWeek(now)] as const;

    const notCancelled = events.filter((e) => e.status !== "cancelled");
    const completed = events.filter((e) => e.status === "completed").length;
    const cancelled = events.filter((e) => e.status === "cancelled").length;
    const noShow = events.filter((e) => e.status === "no_show").length;
    const finished = completed + noShow;
    const attendance = finished ? Math.round((completed / finished) * 100) : 0;
    const bySdr = events.filter((e) => e.source === "sdr");

    const leadTimes = bySdr
      .map((e) => new Date(e.starts_at).getTime() - new Date(e.created_at).getTime())
      .filter((ms) => ms > 0);
    const avgLeadHours = leadTimes.length
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length / 3_600_000)
      : 0;

    return [
      {
        label: "Reuniões hoje",
        value: notCancelled.filter((e) => inRange(e.starts_at, today[0], today[1])).length,
        icon: CalendarCheck,
      },
      {
        label: "Amanhã",
        value: notCancelled.filter((e) => inRange(e.starts_at, tomorrow[0], tomorrow[1])).length,
        icon: CalendarClock,
      },
      {
        label: "Nesta semana",
        value: notCancelled.filter((e) => inRange(e.starts_at, week[0], week[1])).length,
        icon: CalendarRange,
      },
      { label: "Concluídas", value: completed, icon: CheckCircle2 },
      { label: "Canceladas", value: cancelled, icon: XCircle },
      { label: "Comparecimento", value: `${attendance}%`, icon: Percent },
      { label: "Geradas pelo SDR", value: bySdr.length, icon: Bot },
      {
        label: "Tempo médio até a reunião",
        value: avgLeadHours ? `${avgLeadHours}h` : "—",
        icon: Timer,
      },
    ];
  }, [events]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <Card
          key={m.label}
          className={cn(
            "p-3 lg:p-4 border-border/70 transition-colors hover:border-primary/30",
            loading && "animate-pulse",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] lg:text-xs text-muted-foreground truncate">{m.label}</p>
              <p className="text-xl lg:text-2xl font-bold text-foreground mt-1 tabular-nums">
                {m.value}
              </p>
            </div>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <m.icon className="h-4 w-4" />
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
