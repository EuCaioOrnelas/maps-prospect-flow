import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PencilLine, ExternalLink } from "lucide-react";
import {
  EVENT_TYPES,
  EVENT_STATUSES,
  combineDateTime,
  minutesBetween,
  pad,
  type CalendarEvent,
} from "@/lib/calendarConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  saving?: boolean;
  onSave: (input: {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    status: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
  }) => Promise<void> | void;
  /** Abre o formulário completo do compromisso. */
  onOpenFull?: (event: CalendarEvent) => void;
}

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Modal enxuto para editar e salvar os detalhes de uma reunião
 * direto do card/hover da agenda, sem abrir o formulário completo.
 */
export function QuickEditDialog({ open, onOpenChange, event, saving, onSave, onOpenFull }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("meeting");
  const [status, setStatus] = useState("scheduled");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (!event || !open) return;
    setTitle(event.title || "");
    setDescription(event.description || "");
    setLocation(event.location || "");
    setType(event.event_type || "meeting");
    setStatus(event.status || "scheduled");
    setDate(toDateInput(event.starts_at));
    setStartTime(toTime(event.starts_at));
    setDuration(Math.max(15, minutesBetween(event.starts_at, event.ends_at)));
  }, [event, open]);

  if (!event) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !date || !startTime) return;
    const starts = combineDateTime(date, startTime);
    const ends = new Date(starts.getTime() + duration * 60_000);
    await onSave({
      id: event.id,
      title: title.trim(),
      description: description.trim() || null,
      event_type: type,
      status,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      location: location.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-primary" />
            Editar compromisso
          </DialogTitle>
          <DialogDescription>
            Ajuste rapidamente os detalhes principais e salve na agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qe-title">Título</Label>
            <Input id="qe-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qe-date">Data</Label>
              <Input id="qe-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qe-time">Início</Label>
              <Input
                id="qe-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-location">Local ou link</Label>
            <Input
              id="qe-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Google Meet, endereço, telefone..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-desc">Descrição</Label>
            <Textarea
              id="qe-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onOpenFull ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                onOpenFull(event);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir detalhes completos
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
