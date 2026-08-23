import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pause, Play, Repeat2 } from "lucide-react";

type Props = { prospectId: string; email?: string };

const STEP_LABELS = [
  "Relembrete",
  "Dor / problema",
  "Oportunidade financeira",
  "Prova / credibilidade",
  "Custo da inação",
  "Última tentativa",
];

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  cancelled: "Encerrado",
  stopped: "Pausado",
  completed: "Concluído",
};

const REASON_LABEL: Record<string, string> = {
  replied: "contato respondeu",
  unsubscribed: "contato descadastrado",
  do_not_contact: "marcado como não contatar",
  converted_or_dropped: "lead convertido ou descartado",
  manual_stop: "parado manualmente",
  manual_takeover: "conversa assumida por um humano",
  sequence_completed: "ciclo de 30 dias concluído",
  campanha_concorrente_ativa: "campanha concorrente ativa",
  fora_do_horario_comercial: "fora do horário comercial",
  envio_recente: "envio recente",
  ai_generation_failed: "falha ao gerar a mensagem",
  resend_failed: "falha no envio",
  duplicate_step: "etapa já enviada",
};

const ACTION_LABEL: Record<string, string> = {
  enrolled: "Sequência iniciada",
  sent: "Follow-up enviado",
  deferred: "Adiado",
  cancelled: "Encerrado",
  completed: "Concluído",
  resumed: "Retomado",
  skipped: "Ignorado",
  error: "Erro",
};

const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export function FollowupPanel({ prospectId, email }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("followup-engine", {
      body: { action: "status", prospect_id: prospectId },
    });
    setLoading(false);
    if (error || (data as any)?.error) return;
    setEnrollment((data as any)?.enrollment ?? null);
    setEvents((data as any)?.events ?? []);
  }, [prospectId]);

  useEffect(() => { load(); }, [load]);

  const call = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("followup-engine", { body });
    setBusy(false);
    const message = error?.message || (data as any)?.error;
    if (message) { toast({ title: "Não foi possível concluir", description: String(message), variant: "destructive" }); return; }
    toast({ title: success });
    load();
  };

  const status = enrollment?.status as string | undefined;
  const step = Number(enrollment?.current_step ?? 0);
  const maxSteps = Number(enrollment?.max_steps ?? 6);
  const nextLabel = STEP_LABELS[Math.min(step, STEP_LABELS.length - 1)];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Repeat2 size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Follow-up automático</span>
          {status && (
            <Badge variant={status === "active" ? "default" : "secondary"}>{STATUS_LABEL[status] ?? status}</Badge>
          )}
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>

      {!enrollment && !loading && (
        <p className="text-xs text-muted-foreground">
          Nenhuma sequência ativa. O ciclo de 30 dias começa sozinho assim que a primeira abordagem é enviada para este contato.
        </p>
      )}

      {enrollment && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Etapa <strong className="text-foreground">{step}</strong> de {maxSteps} · aderência{" "}
            <strong className="text-foreground">{enrollment.fit_level}</strong>
            {status === "active" && (
              <> · próxima ({nextLabel}) em <strong className="text-foreground">{fmt(enrollment.next_run_at)}</strong></>
            )}
          </p>
          {status !== "active" && enrollment.end_reason && (
            <p>Encerrado: {REASON_LABEL[enrollment.end_reason] ?? enrollment.end_reason}</p>
          )}
          {!!events.length && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-muted/40 p-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2">
                  <span className="text-foreground/80">
                    {ACTION_LABEL[e.action] ?? e.action}
                    {e.step ? ` · etapa ${e.step}` : ""}
                    {e.reason ? ` — ${REASON_LABEL[e.reason] ?? e.reason}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">{fmt(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {enrollment && status === "active" && (
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => call({ action: "stop", enrollment_id: enrollment.id }, "Sequência pausada")}>
            <Pause size={14} className="mr-1" /> Parar
          </Button>
        )}
        {enrollment && status !== "active" && step < maxSteps && (
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => call({ action: "start", enrollment_id: enrollment.id }, "Sequência retomada")}>
            <Play size={14} className="mr-1" /> Retomar
          </Button>
        )}
        {!enrollment && email && (
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => call({ action: "enroll", email, prospect_id: prospectId }, "Sequência iniciada")}>
            <Play size={14} className="mr-1" /> Iniciar follow-up
          </Button>
        )}
      </div>
    </div>
  );
}
