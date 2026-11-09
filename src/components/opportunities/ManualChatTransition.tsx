import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCircle2, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-new.png";

export type ManualChatStage = "connection" | "opening" | "conversation" | "draft" | "ready";

type TransitionState = { active: boolean; stage: ManualChatStage };

type ManualChatTransitionContextValue = {
  start: () => void;
  advance: (stage: Exclude<ManualChatStage, "ready">) => void;
  complete: () => void;
  cancel: () => void;
};

const ManualChatTransitionContext = createContext<ManualChatTransitionContextValue | null>(null);

const stageContent: Record<ManualChatStage, { title: string; detail: string; progress: number; position: number }> = {
  connection: {
    title: "Verificando seu número de atendimento",
    detail: "Preparando uma conexão segura com o Chat.",
    progress: 20,
    position: 0,
  },
  opening: {
    title: "Abrindo o Chat Wiize",
    detail: "Levando você diretamente para o contato.",
    progress: 42,
    position: 1,
  },
  conversation: {
    title: "Localizando a conversa",
    detail: "Reunindo o contato sem duplicar o histórico.",
    progress: 66,
    position: 1,
  },
  draft: {
    title: "Carregando mensagem no rascunho",
    detail: "Sua abordagem está sendo colocada no campo de texto.",
    progress: 88,
    position: 2,
  },
  ready: {
    title: "Mensagem pronta para revisar",
    detail: "O rascunho está no Chat. O envio continua manual.",
    progress: 100,
    position: 3,
  },
};

const steps = ["Conexão", "Conversa", "Rascunho"];

export function useManualChatTransition() {
  const context = useContext(ManualChatTransitionContext);
  if (!context) throw new Error("useManualChatTransition deve ser usado dentro de ManualChatTransitionProvider");
  return context;
}

export function ManualChatTransitionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransitionState>({ active: false, stage: "connection" });
  const activeRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearCloseTimer();
    activeRef.current = true;
    setState({ active: true, stage: "connection" });
  }, [clearCloseTimer]);

  const advance = useCallback((stage: Exclude<ManualChatStage, "ready">) => {
    clearCloseTimer();
    activeRef.current = true;
    setState({ active: true, stage });
  }, [clearCloseTimer]);

  const cancel = useCallback(() => {
    clearCloseTimer();
    activeRef.current = false;
    setState(prev => ({ ...prev, active: false }));
  }, [clearCloseTimer]);

  const complete = useCallback(() => {
    if (!activeRef.current) return;
    clearCloseTimer();
    setState({ active: true, stage: "ready" });
    closeTimerRef.current = setTimeout(() => {
      activeRef.current = false;
      setState(prev => ({ ...prev, active: false }));
      closeTimerRef.current = null;
    }, 450);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const value = useMemo(() => ({ start, advance, complete, cancel }), [start, advance, complete, cancel]);
  const content = stageContent[state.stage];
  const isReady = state.stage === "ready";

  return (
    <ManualChatTransitionContext.Provider value={value}>
      {children}
      {state.active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background px-5 py-8 animate-in fade-in duration-200"
          role="status"
          aria-live="polite"
          aria-busy={!isReady}
          data-testid="manual-chat-transition"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/[0.035]" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-primary/[0.025]" />

          <div className="relative w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-8 flex items-center gap-3">
              <img src={logoIcon} alt="Wiize" className="size-10 rounded-xl" />
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">Wiize</p>
                <p className="text-xs text-muted-foreground">Gestão de oportunidades para o Chat</p>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
              {isReady ? <CheckCircle2 className="size-4" /> : <MessageSquareText className="size-4" />}
              <span>{isReady ? "Tudo pronto" : "Preparando sua abordagem"}</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              {isReady ? "Sua mensagem está pronta." : "Vamos deixar tudo pronto para você."}
            </h2>
            <p className="mt-3 max-w-[440px] text-sm leading-6 text-muted-foreground">
              A conversa será aberta com a abordagem no rascunho. Você revisa o conteúdo e decide quando enviar.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isReady ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                )}>
                  {isReady ? <Check className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5 text-foreground">{content.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{content.detail}</p>
                </div>
              </div>

              <Progress
                value={content.progress}
                className={cn(
                  "mt-6 h-2 bg-muted [&>div]:ease-out",
                  isReady ? "[&>div]:duration-300" : "[&>div]:duration-700",
                )}
                aria-label="Progresso da abertura da abordagem"
                aria-valuenow={content.progress}
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{isReady ? "Concluído" : "Aguarde só um instante"}</span>
                <span className="tabular-nums">{content.progress}%</span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border pt-5">
                {steps.map((step, index) => {
                  const done = content.position > index;
                  const current = content.position === index && !isReady;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <span className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        done || isReady
                          ? "border-primary bg-primary text-primary-foreground"
                          : current
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                      )}>
                        {done || isReady ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className={cn(
                        "truncate text-[11px]",
                        done || current || isReady ? "font-medium text-foreground" : "text-muted-foreground",
                      )}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>Nenhuma mensagem será enviada automaticamente.</span>
            </div>
          </div>
        </div>
      )}
    </ManualChatTransitionContext.Provider>
  );
}
