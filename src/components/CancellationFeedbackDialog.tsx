import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const REASONS = [
  { value: "expensive", label: "Custo / investimento alto" },
  { value: "not_using", label: "Não estava usando" },
  { value: "no_results", label: "Não vi resultado" },
  { value: "bug", label: "Problemas técnicos" },
  { value: "competitor", label: "Migrei para outro produto" },
  { value: "missing_feature", label: "Falta recurso que preciso" },
  { value: "no_time", label: "Não tive tempo de implementar" },
  { value: "other", label: "Outro motivo" },
];

const RETURN_OPTIONS = [
  { value: "yes", label: "Sim, pretendo voltar" },
  { value: "maybe", label: "Talvez no futuro" },
  { value: "no", label: "Não pretendo voltar" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userId?: string;
  email?: string;
  provider?: string;
}

export function CancellationFeedbackDialog({ open, onOpenChange, onConfirm, userId, email, provider }: Props) {
  const [reason, setReason] = useState("");
  const [intendsToReturn, setIntendsToReturn] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmitAndCancel = async () => {
    setSaving(true);
    try {
      await supabase.from("cancellation_feedback").insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        email: email || null,
        cancellation_reason: reason,
        intends_to_return: intendsToReturn || null,
        details: details || null,
        provider: provider || null,
      } as any);
    } catch (err) {
      console.error("Error saving feedback:", err);
    } finally {
      setSaving(false);
      onConfirm();
      onOpenChange(false);
    }
  };

  const canProceed = step === 1 ? !!reason : step === 2 ? !!intendsToReturn : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 1 ? "Por que está cancelando?" : step === 2 ? "Pretende voltar?" : "Confirmar cancelamento"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1
              ? "Nos ajude a melhorar — selecione o principal motivo."
              : step === 2
              ? "Sua opinião é importante para nós."
              : "Descreva brevemente (opcional) e confirme."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full transition-all",
                s <= step ? "bg-primary flex-1" : "bg-muted flex-[0.6]"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REASONS.map((r) => (
              <Label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                  reason === r.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                {r.label}
              </Label>
            ))}
          </RadioGroup>
        )}

        {step === 2 && (
          <RadioGroup value={intendsToReturn} onValueChange={setIntendsToReturn} className="space-y-2">
            {RETURN_OPTIONS.map((r) => (
              <Label
                key={r.value}
                htmlFor={`return-${r.value}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                  intendsToReturn === r.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <RadioGroupItem value={r.value} id={`return-${r.value}`} />
                {r.label}
              </Label>
            ))}
          </RadioGroup>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 50))}
              placeholder="Ex: Precisava de integração X..."
              maxLength={50}
            />
            <p className="text-[10px] text-muted-foreground text-right">{details.length}/50</p>

            <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Ao confirmar:</strong></p>
              <p>• A renovação automática será cancelada</p>
              <p>• O plano continua ativo até o fim do período</p>
              <p>• Não haverá novas cobranças</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Manter assinatura
            </Button>
          )}
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed}>
              Próximo
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleSubmitAndCancel}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirmar cancelamento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
