import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Users,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useCalendarEvents, type CalendarEventInput } from "@/hooks/useCalendarEvents";
import { AgendaMetrics } from "@/components/agenda/AgendaMetrics";
import { EventDialog } from "@/components/agenda/EventDialog";
import { ContinuousView } from "@/components/agenda/views/ContinuousView";
import { DayView } from "@/components/agenda/views/DayView";
import { WeekView } from "@/components/agenda/views/WeekView";
import { MonthView } from "@/components/agenda/views/MonthView";
import { ListView } from "@/components/agenda/views/ListView";
import { EVENT_TYPES, type CalendarEvent } from "@/lib/calendarConfig";
import {
  addDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  formatLongDate,
  formatMonth,
} from "@/lib/calendarViews";
import { cn } from "@/lib/utils";

type ViewMode = "continuous" | "day" | "week" | "month" | "list";

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "continuous", label: "Contínua" },
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "list", label: "Lista" },
];

export default function Agenda() {
  const { profile, user } = useAuth();
  const { members } = useAccountMembers();

  const [view, setView] = useState<ViewMode>("continuous");
  const [cursor, setCursor] = useState(() => new Date());
  const [userFilter, setUserFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const range = useMemo(() => {
    switch (view) {
      case "day":
        return { from: startOfDay(cursor), to: endOfDay(cursor) };
      case "week":
        return { from: startOfWeek(cursor), to: endOfWeek(cursor) };
      case "month":
        return { from: startOfWeek(startOfMonth(cursor)), to: endOfWeek(endOfMonth(cursor)) };
      default:
        // contínua e lista: janela ampla a partir de hoje
        return { from: startOfDay(new Date()), to: endOfDay(addDays(new Date(), 120)) };
    }
  }, [view, cursor]);

  const {
    events,
    loading,
    canSeeEveryone,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    userFilter,
  });

  const visibleEvents = useMemo(
    () => (typeFilter === "all" ? events : events.filter((e) => e.event_type === typeFilter)),
    [events, typeFilter],
  );

  const responsibleName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.name || member?.email || null;
  };

  const openNew = (date?: Date | null) => {
    setEditing(null);
    setDefaultDate(date ?? null);
    setDialogOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setDefaultDate(null);
    setDialogOpen(true);
  };

  const handleSave = async (input: CalendarEventInput & { id?: string }) => {
    const { id, ...rest } = input;
    if (id) {
      await updateEvent.mutateAsync({ id, ...rest });
      toast.success("Compromisso atualizado.");
    } else {
      await createEvent.mutateAsync(rest);
      toast.success("Compromisso criado.");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEvent.mutateAsync(id);
    toast.success("Compromisso excluído.");
  };

  const handleMove = async (event: CalendarEvent, newDate: Date) => {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    const duration = end.getTime() - start.getTime();
    const nextStart = new Date(newDate);
    nextStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
    if (nextStart.getTime() === start.getTime()) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        starts_at: nextStart.toISOString(),
        ends_at: new Date(nextStart.getTime() + duration).toISOString(),
      });
      toast.success("Compromisso remarcado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remarcar.");
    }
  };

  const step = (direction: number) => {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setCursor(next);
  };

  const periodLabel = useMemo(() => {
    if (view === "day") return formatLongDate(cursor);
    if (view === "week") {
      const from = startOfWeek(cursor);
      const to = addDays(from, 6);
      return `${from.getDate()}/${from.getMonth() + 1} a ${to.getDate()}/${to.getMonth() + 1}`;
    }
    if (view === "month") return formatMonth(cursor);
    return "Próximos compromissos";
  }, [view, cursor]);

  const showNavigation = view === "day" || view === "week" || view === "month";
  const saving = createEvent.isPending || updateEvent.isPending;

  return (
    <div className="min-h-screen bg-background relative">
      <SEO
        title="Agenda comercial | Wiize"
        description="Organize reuniões, demonstrações e ligações da sua operação comercial em uma agenda integrada ao CRM e ao SDR Inteligente."
      />
      <BackgroundGlow />
      <AppSidebar profile={profile} />

      <main className="lg:pl-[72px] min-h-screen">
        <div className="lg:hidden">
          <AppHeader profile={profile} />
        </div>

        <div className="container mx-auto px-4 py-4 lg:py-6 space-y-5">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                  Reuniões, demonstrações e ligações da sua operação comercial
                </p>
              </div>
            </div>
            <Button onClick={() => openNew()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo compromisso
            </Button>
          </div>

          <AgendaMetrics events={visibleEvents} loading={loading} />

          {/* Controles */}
          <Card className="p-3 border-border/70">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-full lg:w-auto">
                <TabsList className="w-full lg:w-auto grid grid-cols-5 lg:flex">
                  {VIEWS.map((v) => (
                    <TabsTrigger key={v.value} value={v.value} className="text-xs lg:text-sm">
                      {v.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
                {showNavigation && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Período anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
                      Hoje
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Próximo período">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {canSeeEveryone && (
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-[170px]">
                      <Users className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toda a equipe</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.name || m.email || "Usuário"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground capitalize">{periodLabel}</p>
          </Card>

          {/* Conteúdo */}
          <div className={cn("relative", loading && "opacity-60")}>
            {loading && (
              <div className="absolute inset-x-0 top-0 flex justify-center py-4 z-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {view === "continuous" && (
              <ContinuousView
                events={visibleEvents}
                onSelect={openEdit}
                responsibleName={responsibleName}
              />
            )}
            {view === "day" && (
              <DayView
                date={cursor}
                events={visibleEvents}
                onSelect={openEdit}
                onCreateAt={openNew}
                responsibleName={responsibleName}
              />
            )}
            {view === "week" && (
              <WeekView
                date={cursor}
                events={visibleEvents}
                onSelect={openEdit}
                onCreateAt={openNew}
                responsibleName={responsibleName}
              />
            )}
            {view === "month" && (
              <MonthView
                date={cursor}
                events={visibleEvents}
                onSelect={openEdit}
                onCreateAt={openNew}
                onMove={handleMove}
              />
            )}
            {view === "list" && (
              <ListView
                events={visibleEvents}
                onSelect={openEdit}
                responsibleName={responsibleName}
              />
            )}
          </div>
        </div>
      </main>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={defaultDate}
        members={members}
        currentUserId={user?.id || ""}
        canChooseResponsible={canSeeEveryone}
        saving={saving}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
