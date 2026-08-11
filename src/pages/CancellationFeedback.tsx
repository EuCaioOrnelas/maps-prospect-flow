import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CheckCircle, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const REASONS = [
  "Não entendi como usar",
  "Não tive tempo para implementar",
  "Não vi resultado",
  "Custo / investimento",
  "Tive problemas técnicos",
  "Não era o que eu esperava",
  "Outro",
];

const USAGE_LEVELS = [
  "Nem comecei",
  "Comecei, mas parei",
  "Usei por um tempo",
];

export default function CancellationFeedback() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [usageLevel, setUsageLevel] = useState("");
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const canAdvance = step === 1 ? !!reason : step === 2 ? !!usageLevel : true;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await supabase.from("cancellation_feedback").insert({
        user_id: user?.id || "00000000-0000-0000-0000-000000000000",
        email: user?.email || null,
        cancellation_reason: reason,
        usage_level: usageLevel || null,
        additional_comments: comments || null,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-[18px] bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Obrigado pelo seu feedback</h1>
          <p className="text-muted-foreground">
            Suas respostas nos ajudam a melhorar a Wiize para todos. Desejamos sucesso na sua jornada!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-center">
        <Logo />
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-2 px-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              s <= step ? "bg-primary w-12" : "bg-muted w-8"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">Pergunta 1 de 3</p>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Qual foi o principal motivo do cancelamento?
                  </h2>
                </div>
                <RadioGroup value={reason} onValueChange={setReason} className="space-y-3">
                  {REASONS.map((r) => (
                    <Label
                      key={r}
                      htmlFor={r}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        reason === r
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <RadioGroupItem value={r} id={r} />
                      <span className="text-sm text-foreground">{r}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">Pergunta 2 de 3</p>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Você chegou a usar a plataforma?
                  </h2>
                </div>
                <RadioGroup value={usageLevel} onValueChange={setUsageLevel} className="space-y-3">
                  {USAGE_LEVELS.map((u) => (
                    <Label
                      key={u}
                      htmlFor={u}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        usageLevel === u
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <RadioGroupItem value={u} id={u} />
                      <span className="text-sm text-foreground">{u}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">Pergunta 3 de 3 (opcional)</p>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Se quiser, pode explicar melhor
                  </h2>
                  <p className="text-sm text-muted-foreground">Esta etapa é opcional. Pode enviar sem preencher.</p>
                </div>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Conte-nos mais sobre sua experiência..."
                  className="min-h-[120px] resize-none bg-background border-border"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{comments.length}/500</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 gap-4">
            {step > 1 ? (
              <Button variant="ghost" onClick={back} className="gap-1">
                <ChevronLeft size={16} />
                Voltar
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={next}
              disabled={!canAdvance || loading}
              className="gap-2 min-w-[140px]"
            >
              {loading ? (
                "Enviando..."
              ) : step < 3 ? (
                <>
                  Próximo
                  <ArrowRight size={16} />
                </>
              ) : (
                "Enviar feedback"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
