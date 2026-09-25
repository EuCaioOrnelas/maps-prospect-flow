// Overlay de avaliação em tela cheia exibido logo após o envio do chamado.
// Ocupa todo o painel do atendimento e envia automaticamente quando as duas
// respostas obrigatórias (satisfação + indicação) estão preenchidas.
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { EmojiRating, EMOJI_RATING_OPTIONS } from "./EmojiRating";

interface SupportRatingOverlayProps {
  score: number | null;
  recommend: number | null;
  onScoreChange: (v: number) => void;
  onRecommendChange: (v: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  wasEscalated: boolean;
  ticketNumber?: string | null;
}

export function SupportRatingOverlay({
  score,
  recommend,
  onScoreChange,
  onRecommendChange,
  onSubmit,
  submitting,
  wasEscalated,
  ticketNumber,
}: SupportRatingOverlayProps) {
  const sentRef = useRef(false);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Envio automático assim que as duas respostas obrigatórias forem dadas.
  // A marcação de "enviado" só acontece quando o envio dispara de fato; se o
  // usuário trocar a nota antes, o timer é reiniciado e o envio não se perde.
  useEffect(() => {
    if (sentRef.current || submitting) return;
    if (score === null || recommend === null) return;
    const t = setTimeout(() => {
      if (sentRef.current) return;
      sentRef.current = true;
      onSubmitRef.current();
    }, 700);
    return () => clearTimeout(t);
  }, [score, recommend, submitting]);

  const complete = score !== null && recommend !== null;
  const selected = EMOJI_RATING_OPTIONS.find((o) => o.value === score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col bg-background"
    >
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Chamado enviado
            </div>
            <h2 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
              Falta só 1 passo
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {wasEscalated
                ? "Seu chamado já está registrado e o time humano responderá por e-mail. Para concluir, avalie o atendimento que você teve aqui até agora."
                : "Para concluir o atendimento, avalie como foi a sua experiência. Leva menos de 10 segundos."}
            </p>
            {ticketNumber && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <span className="text-[11px] text-muted-foreground">Protocolo</span>
                <span className="font-mono text-xs font-semibold text-primary">{ticketNumber}</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-sm font-medium text-foreground">
                1. Como você avalia este atendimento?
              </p>
              <EmojiRating value={score} onChange={onScoreChange} size="lg" />
              {selected && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Você marcou <span className="font-medium text-foreground">{selected.label}</span>. Obrigado! 🙏
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-sm font-medium text-foreground">
                2. De 0 a 10, qual a chance de indicar a Wiize para um amigo?
              </p>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onRecommendChange(n)}
                    className={`h-10 rounded-md border text-xs font-medium transition-all ${
                      recommend === n
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>Nada provável</span>
                <span>Muito provável</span>
              </div>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sua avaliação vai direto para a liderança da Wiize.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-background px-5 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-xs text-muted-foreground">
          {submitting || complete ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Registrando sua avaliação…
            </>
          ) : (
            <>Responda os 2 itens acima para finalizar — o envio é automático.</>
          )}
        </div>
      </div>
    </motion.div>
  );
}
