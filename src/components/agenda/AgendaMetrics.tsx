import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CalendarCheck, CalendarClock, CalendarRange, CheckCircle2, XCircle, Bot } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "@/lib/calendarViews";
import { cn } from "@/lib/utils";
import { MetricEmpty } from "@/components/ui/metric-empty";

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
        emptyHint: "Aparece ao agendar a primeira reunião de hoje.",
        icon: CalendarCheck,
      },
      {
        label: "Amanhã",
        value: notCancelled.filter((e) => inRange(e.starts_at, tomorrow[0], tomorrow[1])).length,
        hint: "Preparação para o próximo dia",
        emptyHint: "Preenchido quando houver compromisso para amanhã.",
        icon: CalendarClock,
      },
      {
        label: "Nesta semana",
        value: notCancelled.filter((e) => inRange(e.starts_at, week[0], week[1])).length,
        hint: "Volume semanal da operação",
        emptyHint: "Disponível após agendar reuniões nesta semana.",
        icon: CalendarRange,
      },
      {
        label: "Concluídas",
        value: completed,
        hint: `Comparecimento de ${attendance}%`,
        emptyHint: "Será atualizado quando reuniões forem realizadas.",
        icon: CheckCircle2,
      },
      {
        label: "Canceladas",
        value: cancelled,
        hint: `${noShow} sem comparecimento`,
        emptyHint: "Nenhum cancelamento registrado até agora.",
        icon: XCircle,
      },
      {
        label: "Geradas pelo SDR",
        value: bySdr,
        hint: "Agendadas automaticamente pela IA",
        emptyHint: "Preenchido quando o SDR agendar por você.",
        icon: Bot,
      },
    ];
  }, [events]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => {
        const empty = m.value === 0;
        return (
          <Card
            key={m.label}
            className={cn("p-5 rounded-2xl border-border/70", loading && "animate-pulse")}
          >
            <span
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                empty ? "bg-muted/50" : "bg-primary/10"
              )}
            >
              <m.icon className={empty ? "text-muted-foreground/40" : "text-primary"} size={20} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
              {m.label}
            </p>
            {empty ? (
              <MetricEmpty hint={m.emptyHint} className="mt-2 min-h-[46px]" />
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{m.hint}</p>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

