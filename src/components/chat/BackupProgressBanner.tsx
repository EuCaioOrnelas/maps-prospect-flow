import { CheckCircle2, Loader2, X, AlertTriangle, Users } from "lucide-react";
import { useChatBackupState } from "@/hooks/useChatBackup";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface Props {
  className?: string;
  /** Auto-dismiss banner X ms after done. Default 6000. */
  autoDismissMs?: number;
}

export function BackupProgressBanner({ className, autoDismissMs = 6000 }: Props) {
  const { state, dismiss } = useChatBackupState();

  useEffect(() => {
    if (state?.status === "done" && autoDismissMs > 0) {
      const t = setTimeout(() => dismiss(), autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [state?.status, autoDismissMs, dismiss]);

  if (!state) return null;

  const pct = state.total > 0 ? Math.min(100, Math.round((state.current / state.total) * 100)) : 100;
  const isError = state.status === "error";
  const isDone = state.status === "done";

  return (
    <div
      className={`rounded-xl border p-3.5 flex items-start gap-3 ${
        isError
          ? "border-destructive/40 bg-destructive/5"
          : isDone
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-primary/30 bg-primary/5"
      } ${className ?? ""}`}
    >
      <div className="shrink-0 mt-0.5">
        {isError ? (
          <AlertTriangle size={18} className="text-destructive" />
        ) : isDone ? (
          <CheckCircle2 size={18} className="text-emerald-600" />
        ) : (
          <Loader2 size={18} className="text-primary animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">
            {isError
              ? "Falha ao importar contatos do CRM"
              : isDone
                ? "Contatos importados com sucesso"
                : "Importando contatos do CRM para o chat…"}
          </p>
          {state.connectionLabel && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
              {state.connectionLabel}
            </span>
          )}
        </div>
        {!isError && (
          <>
            <Progress value={pct} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Users size={11} />
              {state.current}/{state.total} contatos
              {!isDone && state.total > 0 && (
                <span className="opacity-60">· conversas antigas continuam disponíveis com opção de salvar</span>
              )}
            </p>
          </>
        )}
        {isError && state.error && (
          <p className="text-[11px] text-destructive">{state.error}</p>
        )}
      </div>
      {(isDone || isError) && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss}>
          <X size={12} />
        </Button>
      )}
    </div>
  );
}
