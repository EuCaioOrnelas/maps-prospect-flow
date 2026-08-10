import { Bot, Pause, Play, Clock, UserCheck, BellOff, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSDRContactStatus } from "@/hooks/useSDRContactStatus";

type Props = {
  phone: string | null | undefined;
  accountOwnerId: string | null | undefined;
  className?: string;
  compact?: boolean;
};

/**
 * Mostra se o SDR Inteligente está atendendo este contato — e permite pausar/retomar.
 */
export function SDRStatusBanner({ phone, accountOwnerId, className, compact }: Props) {
  const { status, saving, setPaused } = useSDRContactStatus(phone, accountOwnerId);
  if (!status) return null;

  const nextLabel = status.nextAt
    ? format(new Date(status.nextAt), "dd/MM 'às' HH:mm", { locale: ptBR })
    : null;

  const config = (() => {
    switch (status.state) {
      case "no_agent":
        return { icon: Bot, tone: "muted" as const, text: "Nenhum SDR IA ativo para este contato" };
      case "paused":
        return { icon: Pause, tone: "danger" as const, text: `SDR IA pausado neste contato${status.agentName ? ` (${status.agentName})` : ""}` };
      case "queued":
        return { icon: Clock, tone: "warning" as const, text: `SDR IA aguardando horário de atendimento${nextLabel ? ` — responde em ${nextLabel}` : ""}` };
      case "handoff":
        return { icon: UserCheck, tone: "warning" as const, text: "SDR IA transferiu este contato para um vendedor humano" };
      case "opted_out":
        return { icon: BellOff, tone: "danger" as const, text: "Contato pediu para não receber mensagens — SDR IA desativado" };
      case "closed":
        return { icon: CheckCircle2, tone: "muted" as const, text: "SDR IA encerrou o atendimento deste contato" };
      default:
        return { icon: Bot, tone: "success" as const, text: `SDR IA atendendo este contato${status.agentName ? ` (${status.agentName})` : ""}` };
    }
  })();

  const Icon = config.icon;
  const canToggle = status.state !== "no_agent" && status.state !== "opted_out";
  const isPaused = status.state === "paused";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 sm:gap-3 border-y shrink-0 transition-colors",
        compact ? "px-3 py-2 rounded-xl border" : "px-4 sm:px-6 py-2.5",
        config.tone === "success" && "bg-primary/10 border-primary/20",
        config.tone === "warning" && "bg-amber-500/10 border-amber-500/20",
        config.tone === "danger" && "bg-destructive/10 border-destructive/20",
        config.tone === "muted" && "bg-muted/50 border-border",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={cn(
            "w-4 h-4 shrink-0",
            config.tone === "success" && "text-primary",
            config.tone === "warning" && "text-amber-600 dark:text-amber-400",
            config.tone === "danger" && "text-destructive",
            config.tone === "muted" && "text-muted-foreground",
          )}
        />
        <span className="text-xs font-medium truncate">{config.text}</span>
      </div>
      {canToggle && (
        <Button
          size="sm"
          variant={isPaused ? "default" : "destructive"}
          className="h-7 text-xs shrink-0 gap-1.5"
          disabled={saving}
          onClick={() => setPaused(!isPaused)}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5" /> Retomar
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" /> Pausar
            </>
          )}
        </Button>
      )}
    </div>
  );
}
