import { useMemberAvailability, WEEK_DAYS, STATUS_LABEL, type AvailabilityStatus } from "@/hooks/useMemberAvailability";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  /** Se omitido, usa o próprio usuário logado */
  userId?: string;
  title?: string;
}

export function MemberAvailabilityCard({ userId, title = "Disponibilidade" }: Props) {
  const { loading, saving, availability, save } = useMemberAvailability(userId);

  if (loading || !availability) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Carregando disponibilidade…
      </Card>
    );
  }

  const toggleDay = (d: number) => {
    const set = new Set(availability.work_days);
    if (set.has(d)) set.delete(d); else set.add(d);
    save({ work_days: Array.from(set).sort() });
  };

  return (
    <Card className="w-full min-w-0 max-w-full space-y-4 overflow-hidden rounded-lg p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold">{title}</h3>
          <p className="break-words text-xs text-muted-foreground">
            Define quando este colaborador pode receber novos atendimentos por distribuição automática.
          </p>
        </div>
        <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <StatusDot status={availability.status} />
          <Select
            value={availability.status}
            onValueChange={(v) => save({ status: v as AvailabilityStatus })}
          >
            <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-32 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["online", "away", "offline"] as AvailabilityStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dias de trabalho</Label>
        <div className="grid min-w-0 grid-cols-3 gap-1.5 min-[420px]:grid-cols-4 sm:flex sm:flex-wrap">
          {WEEK_DAYS.map((d) => {
            const active = availability.work_days.includes(d.value);
            return (
              <Button
                key={d.value}
                size="sm"
                type="button"
                variant={active ? "default" : "outline"}
                className="h-8 min-w-0 px-2 text-xs sm:px-3"
                onClick={() => toggleDay(d.value)}
                disabled={saving}
              >
                {d.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Início</Label>
          <Input
            type="time"
            value={availability.work_start.slice(0, 5)}
            onChange={(e) => save({ work_start: e.target.value })}
            disabled={saving}
            className="h-9 text-sm"
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Fim</Label>
          <Input
            type="time"
            value={availability.work_end.slice(0, 5)}
            onChange={(e) => save({ work_end: e.target.value })}
            disabled={saving}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="break-words text-[10px] text-muted-foreground">
        Fora do horário ou com status diferente de Online, este colaborador é ignorado pela distribuição automática.
      </p>
    </Card>
  );
}

function StatusDot({ status }: { status: AvailabilityStatus }) {
  const color =
    status === "online" ? "bg-emerald-500"
    : status === "away" ? "bg-amber-500"
    : "bg-muted-foreground";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}
