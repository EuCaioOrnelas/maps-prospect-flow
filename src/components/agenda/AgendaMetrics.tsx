import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CalendarCheck, CalendarClock, CalendarRange, CheckCircle2, XCircle, Bot } from "lucide-react";
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

/** Métricas operacionais da Agenda, no mesmo padrão dos cards do SDR Inteligente. */
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
    const bySdr = events.filter((e) => e.source === "sdr").length;

    return [
      {
        label: "Reuniões hoje",
        value: notCancelled.filter((e) => inRange(e.starts_at, today[0], today[1])).length,
        hint: "Compromissos ativos de hoje",
        icon: CalendarCheck,
      },
      {
        label: "Amanhã",
        value: notCancelled.filter((e) => inRange(e.starts_at, tomorrow[0], tomorrow[1])).length,
        hint: "Preparação para o próximo dia",
        icon: CalendarClock,
      },
      {
        label: "Nesta semana",
        value: notCancelled.filter((e) => inRange(e.starts_at, week[0], week[1])).length,
        hint: "Volume semanal da operação",
        icon: CalendarRange,
      },
      {
        label: "Concluídas",
        value: completed,
        hint: `Comparecimento de ${attendance}%`,
        icon: CheckCircle2,
      },
      {
        label: "Canceladas",
        value: cancelled,
        hint: `${noShow} sem comparecimento`,
        icon: XCircle,
      },
      {
        label: "Geradas pelo SDR",
        value: bySdr,
        hint: "Agendadas automaticamente pela IA",
        icon: Bot,
      },
    ];
  }, [events]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((m) => (
        <Card
          key={m.label}
          className={cn(
            "p-4 border-border/70 transition-colors hover:border-primary/30",
            loading && "animate-pulse",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground truncate">{m.label}</p>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <m.icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{m.value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{m.hint}</p>
        </Card>
      ))}
    </div>
  );
}
