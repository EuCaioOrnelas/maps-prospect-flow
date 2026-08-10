import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarCheck, Bot, MessageSquare, Lightbulb } from "lucide-react";

/**
 * Versione a chave sempre que o conteúdo do aviso mudar.
 * Assim o usuário volta a ver o popup apenas quando houver novidade real.
 */
const BETA_NOTICE_KEY = "wiize:sdr_beta_notice";
const BETA_NOTICE_VERSION = "2";

export function hasSeenSdrBetaNotice(): boolean {
  try {
    return localStorage.getItem(BETA_NOTICE_KEY) === BETA_NOTICE_VERSION;
  } catch {
    return true;
  }
}

export function markSdrBetaNoticeSeen() {
  try {
    localStorage.setItem(BETA_NOTICE_KEY, BETA_NOTICE_VERSION);
  } catch {
    /* storage indisponível */
  }
}

const highlights = [
  {
    icon: Bot,
    title: "Conduz a conversa sozinho",
    text: "O agente responde no WhatsApp, entende o contexto de cada mensagem, qualifica o lead e trabalha as objeções sem você precisar acompanhar em tempo real.",
  },
  {
    icon: CalendarCheck,
    title: "Objetivo: fechar e marcar reuniões",
    text: "A missão do SDR é levar o lead até o agendamento. Quando o interesse é confirmado, ele consulta a sua disponibilidade, sugere horários e registra a reunião na Agenda automaticamente.",
  },
  {
    icon: MessageSquare,
    title: "Você entra só quando importa",
    text: "Follow-ups, lembretes e atualização do estágio no CRM acontecem em segundo plano. Você recebe a reunião pronta na agenda.",
  },
];

export function SDRBetaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const close = useCallback(() => {
    markSdrBetaNoticeSeen();
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl rounded-panel max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <span className="h-10 w-10 sm:h-11 sm:w-11 rounded-sm bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="text-primary" size={18} />
          </span>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            SDR Inteligente
            <span className="px-2 py-0.5 rounded-xs bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wide">
              Beta
            </span>
          </DialogTitle>
          <DialogDescription className="text-left pt-1 text-xs sm:text-sm">
            Seu vendedor de IA que negocia no WhatsApp com um objetivo claro: transformar conversas
            em reuniões agendadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="flex items-start gap-2.5 sm:gap-3 rounded-card border border-border/60 bg-muted/30 p-2.5 sm:p-3"
            >
              <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xs bg-primary/10 flex items-center justify-center flex-shrink-0">
                <h.icon size={14} className="text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{h.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{h.text}</p>
              </div>
            </div>
          ))}

          <div className="rounded-card border border-primary/25 bg-primary/5 p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lightbulb size={14} className="text-primary" />
              O que esperar da versão beta
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Algumas funcionalidades ainda estão em teste e a IA pode cometer erros leves de
              interpretação ou de tom durante as conversas. Recomendamos acompanhar os primeiros
              atendimentos e ajustar as instruções do agente conforme necessário.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tem alguma sugestão de melhoria? Envie pela página <strong>Sugestões</strong>, no menu
              lateral. Cada feedback ajuda a evoluir o SDR mais rápido. Obrigado pela compreensão e
              por testar com a gente!
            </p>
          </div>
        </div>

        <DialogFooter className="mt-3 sm:mt-4">
          <Button onClick={close} className="w-full sm:w-auto text-sm">
            Entendi, começar a usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
