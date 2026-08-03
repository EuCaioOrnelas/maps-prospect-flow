import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  StickyNote,
  Trash2,
  Loader2,
  Bell,
  Briefcase,
  Users,
  Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadPicker, type PickedLead } from "./LeadPicker";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPES,
  EVENT_STATUSES,
  DURATION_OPTIONS,
  REMINDER_OPTIONS,
  toLocalInput,
  toTimeInput,
  combineDateTime,
  addMinutes,
  minutesBetween,
  pad,
  type CalendarEvent,
} from "@/lib/calendarConfig";
import type { AccountMember } from "@/hooks/useAccountMembers";
import type { CalendarEventInput } from "@/hooks/useCalendarEvents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaultDate?: Date | null;
  members: AccountMember[];
  currentUserId: string;
  canChooseResponsible: boolean;
  saving: boolean;
  onSave: (input: CalendarEventInput & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface FormState {
  title: string;
  description: string;
  event_type: string;
  status: string;
  assigned_user_id: string;
  date: string;
  startTime: string;
  duration: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  notes: string;
  reminder: string;
  category: "comercial" | "interna";
  participants: string[];
  lead_id: string | null;
}

const CATEGORIES = [
  {
    value: "comercial" as const,
    label: "Reunião comercial",
    hint: "Com lead, cliente ou prospect",
    icon: Briefcase,
  },
  {
    value: "interna" as const,
    label: "Reunião interna",
    hint: "Somente com a equipe",
    icon: Users,
  },
];

const nextSlot = (base: Date) => {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30)), 0, 0);
  return d;
};

const buildInitialState = (
  event: CalendarEvent | null,
  defaultDate: Date | null | undefined,
  currentUserId: string,
): FormState => {
  if (event) {
    return {
      title: event.title,
      description: event.description ?? "",
      event_type: event.event_type,
      status: event.status,
      assigned_user_id: event.assigned_user_id,
      date: toLocalInput(event.starts_at),
      startTime: toTimeInput(event.starts_at),
      duration: minutesBetween(event.starts_at, event.ends_at) || 30,
      company_name: event.company_name ?? "",
      contact_name: event.contact_name ?? "",
      contact_email: event.contact_email ?? "",
      contact_phone: event.contact_phone ?? "",
      location: event.location ?? "",
      notes: event.notes ?? "",
      reminder: Array.isArray(event.reminders) && event.reminders.length
        ? String(event.reminders[0])
        : "none",
      category:
        ((event.metadata as any)?.category === "interna" ? "interna" : "comercial") as
          | "comercial"
          | "interna",
      participants: Array.isArray((event.metadata as any)?.participants)
        ? ((event.metadata as any).participants as string[])
        : [],
      lead_id: event.lead_id ?? null,
    };
  }
  const base = nextSlot(defaultDate ? new Date(defaultDate) : new Date());
  if (defaultDate && defaultDate.getHours() === 0 && defaultDate.getMinutes() === 0) {
    base.setHours(9, 0, 0, 0);
  }
  return {
    title: "",
    description: "",
    event_type: "meeting",
    status: "scheduled",
    assigned_user_id: currentUserId,
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    startTime: `${pad(base.getHours())}:${pad(base.getMinutes())}`,
    duration: 30,
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    location: "",
    notes: "",
    reminder: "15",
    category: "comercial",
    participants: [],
    lead_id: null,
  };
};

/** Criação e edição de compromissos da Agenda. */
export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  members,
  currentUserId,
  canChooseResponsible,
  saving,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(event, defaultDate, currentUserId),
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) setForm(buildInitialState(event, defaultDate, currentUserId));
  }, [open, event, defaultDate, currentUserId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const applyLead = (lead: PickedLead) => {
    setForm((prev) => ({
      ...prev,
      lead_id: lead.id,
      company_name: prev.company_name || lead.company_name || "",
      contact_name: prev.contact_name || lead.contact_name || "",
      contact_email: prev.contact_email || lead.email || "",
      contact_phone: prev.contact_phone || lead.phone || "",
      title: prev.title || `Reunião comercial · ${lead.company_name || lead.contact_name || "Lead"}`,
    }));
  };

  const endLabel = useMemo(() => {
    if (!form.date || !form.startTime) return "";
    const end = addMinutes(combineDateTime(form.date, form.startTime), form.duration);
    return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }, [form.date, form.startTime, form.duration]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Informe um título para o compromisso.");
      return;
    }
    if (!form.date || !form.startTime) {
      toast.error("Informe a data e o horário inicial.");
      return;
    }
    const starts = combineDateTime(form.date, form.startTime);
    const ends = addMinutes(starts, form.duration);

    try {
      await onSave({
        id: event?.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type,
        status: form.status,
        source: event?.source ?? "manual",
        assigned_user_id: form.assigned_user_id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        company_name: form.company_name.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        reminders: form.reminder === "none" ? [] : [Number(form.reminder)],
        lead_id: form.category === "comercial" ? form.lead_id : null,
        metadata: {
          ...(((event?.metadata as Record<string, unknown>) || {})),
          category: form.category,
          participants: form.participants,
        },
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Atualize as informações do compromisso."
              : "Preencha os dados do compromisso comercial."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Reunião de apresentação"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Responsável
              </Label>
              <Select
                value={form.assigned_user_id}
                onValueChange={(v) => set("assigned_user_id", v)}
                disabled={!canChooseResponsible}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.name || m.email || "Usuário"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Data
              </Label>
              <Input
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-time" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Início
              </Label>
              <Input
                id="ev-time"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Select value={String(form.duration)} onValueChange={(v) => set("duration", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} minutos</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {endLabel && (
                <p className="text-[11px] text-muted-foreground">Termina às {endLabel}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria do compromisso</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const active = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set("category", c.value)}
                    className={cn(
                      "relative rounded-xl border p-4 text-center transition-all hover:-translate-y-0.5",
                      active
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {active && (
                      <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
                    )}
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <c.icon className="h-5 w-5 text-primary" />
                    </span>
                    <p className="mt-2 text-sm font-semibold">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {form.category === "comercial" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Lead vinculado
              </Label>
              <LeadPicker onSelect={applyLead} />
              <p className="text-[11px] text-muted-foreground">
                Preenche empresa, contato, e-mail e telefone automaticamente.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Participantes
            </Label>
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
              {members.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum usuário disponível.</p>
              )}
              {members.map((m) => {
                const checked = form.participants.includes(m.user_id);
                return (
                  <label
                    key={m.user_id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        set(
                          "participants",
                          checked
                            ? form.participants.filter((id) => id !== m.user_id)
                            : [...form.participants, m.user_id],
                        )
                      }
                    />
                    <span className="truncate">{m.name || m.email || "Usuário"}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {form.category === "comercial" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-company" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Empresa
                </Label>
                <Input
                  id="ev-company"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-contact" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Contato
                </Label>
                <Input
                  id="ev-contact"
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                  placeholder="Nome do lead"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail
                </Label>
                <Input
                  id="ev-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </Label>
                <Input
                  id="ev-phone"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  placeholder="(11) 90000-0000"
                />
              </div>
            </div>
          )}


          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-local" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Local ou link
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ev-local"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Online, endereço ou link da chamada"
                />
                {locationUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Abrir link"
                    onClick={() => window.open(locationUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Lembrete
              </Label>
              <Select value={form.reminder} onValueChange={(v) => set("reminder", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lembrete</SelectItem>
                  {REMINDER_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Enviado por e-mail e como aviso dentro da ferramenta.
              </p>
            </div>
          </div>


          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea
              id="ev-desc"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Pauta do encontro"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-notes" className="flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Observações
            </Label>
            <Textarea
              id="ev-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Informações coletadas na conversa"
            />
          </div>

          {event && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {event && onDelete ? (
            <Button variant="ghost" onClick={handleDelete} disabled={deleting || saving}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-2">Excluir</span>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {event ? "Salvar alterações" : "Criar compromisso"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
