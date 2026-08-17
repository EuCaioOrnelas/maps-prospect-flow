import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  CalendarDays,
  MapPin,
  ExternalLink,
  Users,
  Building2,
  User,
  StickyNote,
  Pencil,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Bot,
  Loader2,
  Mail,
  Phone,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {
  getEventType,
  getEventStatus,
  minutesBetween,
  formatDuration,
  isEventOverdue,
  OVERDUE_STYLES,
  type CalendarEvent,
} from "@/lib/calendarConfig";
import { formatTime, formatLongDate } from "@/lib/calendarViews";
import type { AccountMember } from "@/hooks/useAccountMembers";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  members: AccountMember[];
  saving?: boolean;
  /** Atualiza apenas o status do compromisso. */
  onStatusChange: (event: CalendarEvent, status: string) => Promise<void> | void;
  /** Abre o modal rápido de remarcação (data/hora). */
  onReschedule: (event: CalendarEvent) => void;
  /** Abre o formulário completo de edição. */
  onEdit: (event: CalendarEvent) => void;
}

const Row = ({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-2 text-sm text-muted-foreground">
    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

/**
 * Popup de leitura de um compromisso da agenda.
 * Mostra o resumo da reunião e ações rápidas (concluir, reagendar, perdida, editar).
 */
export function EventDetailsDialog({
  open,
  onOpenChange,
  event,
  members,
  saving,
  onStatusChange,
  onReschedule,
  onEdit,
}: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"completed" | "cancelled" | null>(null);

  if (!event) return null;

  const type = getEventType(event.event_type);
  const status = getEventStatus(event.status);
  const TypeIcon = type.icon;
  const duration = formatDuration(minutesBetween(event.starts_at, event.ends_at));
  const location = event.location || event.conference_url || "";
  const isLink = /^https?:\/\//i.test(location);
  const overdue = isEventOverdue(event);

  const participantIds: string[] = Array.isArray((event.metadata as any)?.participants)
    ? ((event.metadata as any).participants as string[])
    : [];
  const responsible = members.find((m) => m.user_id === event.assigned_user_id);
  const participants = members.filter((m) => participantIds.includes(m.user_id));

  const apply = async (next: string) => {
    setPending(next);
    try {
      await onStatusChange(event, next);
      onOpenChange(false);
    } finally {
      setPending(null);
    }
  };

  const busy = !!pending || !!saving;
  const isFinished = event.status === "completed" || event.status === "cancelled";

  const CONFIRM_COPY: Record<string, { title: string; description: string; action: string }> = {
    completed: {
      title: "Marcar como concluída?",
      description: "O compromisso será registrado como realizado e as ações rápidas serão encerradas.",
      action: "Marcar concluída",
    },
    cancelled: {
      title: "Marcar como perdida?",
      description: "O compromisso será encerrado como perdido e sairá da agenda ativa.",
      action: "Marcar perdida",
    },
  };

  return (
    <>
    <Dialog open={open && !confirm} onOpenChange={(v) => { if (!v && !confirm) onOpenChange(false); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", type.chip)}>
              <TypeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-left text-lg leading-tight break-words">
                {event.title}
              </DialogTitle>
              <DialogDescription className="text-left">
                {formatLongDate(new Date(event.starts_at))}
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-lg border-border bg-background transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Editar compromisso"
              onClick={() => {
                onOpenChange(false);
                onEdit(event);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("h-6 text-[11px]", type.chip)}>
              {type.label}
            </Badge>
            <Badge variant="outline" className={cn("h-6 text-[11px]", status.chip)}>
              {status.label}
            </Badge>
            {overdue && (
              <Badge variant="outline" className={cn("h-6 gap-1 text-[11px]", OVERDUE_STYLES.chip)}>
                <AlertTriangle className="h-3 w-3" /> Atrasado
              </Badge>
            )}
            {event.source === "sdr" && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px]">
                <Bot className="h-3 w-3" /> SDR Inteligente
              </Badge>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <Row icon={Clock}>
              <span className="tabular-nums text-foreground">
                {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
              </span>{" "}
              · {duration}
            </Row>
            {responsible && (
              <Row icon={User}>
                Responsável:{" "}
                <span className="text-foreground">{responsible.name || responsible.email}</span>
              </Row>
            )}
            {event.company_name && <Row icon={Building2}>{event.company_name}</Row>}
            {event.contact_name && <Row icon={User}>{event.contact_name}</Row>}
            {event.contact_email && <Row icon={Mail}>{event.contact_email}</Row>}
            {event.contact_phone && <Row icon={Phone}>{event.contact_phone}</Row>}
          </div>

          {participants.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="h-3.5 w-3.5" /> Participantes
              </p>
              <div className="flex flex-wrap gap-2">
                {participants.map((m) => {
                  const label = m.name || m.email || "Usuário";
                  return (
                    <span
                      key={m.user_id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 py-1 pl-1 pr-2.5 text-xs"
                    >
                      <Avatar className="h-6 w-6 rounded-md">
                        <AvatarImage src={m.avatar_url || undefined} alt={label} className="rounded-md object-cover" />
                        <AvatarFallback className="rounded-md text-[10px] font-semibold">
                          {label.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[140px] truncate">{label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {location && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5" /> Local ou link
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 break-all text-sm text-muted-foreground">{location}</p>
                {isLink && (
                  <Button asChild size="sm" className="group shrink-0 gap-1.5">
                    <a href={location} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      Acessar reunião
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {event.description && (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Pauta
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}

          {event.notes && (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <StickyNote className="h-3.5 w-3.5" /> Dados adicionais
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
            </div>
          )}

          {isFinished ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {event.status === "completed"
                ? "Compromisso concluído. Para reabrir, edite o compromisso e altere o status."
                : "Compromisso encerrado. Para reabrir, edite o compromisso e altere o status."}
            </div>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Ações rápidas</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm("completed")}
                  className="group justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/15">
                    {pending === "completed" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </span>
                  Concluída
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    onOpenChange(false);
                    onReschedule(event);
                  }}
                  className="group relative justify-start gap-2 overflow-hidden border-primary/30 bg-primary/5 text-primary transition-all hover:border-primary/50 hover:bg-primary/15 hover:shadow-sm hover:shadow-primary/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 transition-colors group-hover:bg-primary/25">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  Reagendar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm("cancelled")}
                  className="group relative justify-start gap-2 overflow-hidden border-destructive/30 bg-destructive/5 text-destructive transition-all hover:border-destructive/50 hover:bg-destructive/15 hover:shadow-sm hover:shadow-destructive/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/15 transition-colors group-hover:bg-destructive/25">
                    {pending === "cancelled" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>
                  Perdida
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm ? CONFIRM_COPY[confirm].title : ""}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm ? CONFIRM_COPY[confirm].description : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const action = confirm;
              setConfirm(null);
              if (!action) return;
              void apply(action);
            }}
          >
            {confirm ? CONFIRM_COPY[confirm].action : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
