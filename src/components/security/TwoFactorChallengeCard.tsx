import type { FormEvent } from "react";
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

interface TwoFactorChallengeCardProps {
  code: string;
  recovery: boolean;
  submitting: boolean;
  error: string | null;
  onCodeChange: (value: string) => void;
  onRecoveryChange: (value: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onExit: () => void;
  exitLabel: "Voltar" | "Sair";
}

export function TwoFactorChallengeCard({
  code,
  recovery,
  submitting,
  error,
  onCodeChange,
  onRecoveryChange,
  onSubmit,
  onExit,
  exitLabel,
}: TwoFactorChallengeCardProps) {
  const toggleRecovery = () => {
    onRecoveryChange(!recovery);
    onCodeChange("");
  };

  return (
    <div className="rounded-panel border border-border/80 bg-card p-6 shadow-card sm:p-8">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-card border border-primary/15 bg-primary/10 text-primary">
        <ShieldCheck className="h-7 w-7" strokeWidth={1.8} />
      </div>

      <h1 className="text-center font-display text-2xl font-bold text-card-foreground">
        Verificação em duas etapas
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        {recovery
          ? "Informe um dos seus códigos de recuperação."
          : "Digite o código de 6 dígitos do seu aplicativo autenticador."}
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor={recovery ? "mfa-recovery-code" : "mfa-code"} className="text-sm font-medium">
            {recovery ? "Código de recuperação" : "Código"}
          </Label>

          {recovery ? (
            <Input
              id="mfa-recovery-code"
              autoFocus
              autoComplete="one-time-code"
              value={code}
              maxLength={20}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder="XXXX-XXXX"
              className="h-12 bg-background"
            />
          ) : (
            <InputOTP
              id="mfa-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={onCodeChange}
              containerClassName="w-full justify-center"
              aria-label="Código de verificação com 6 dígitos"
            >
              <InputOTPGroup className="w-full justify-between gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 min-w-0 flex-1 rounded-input border border-input bg-background text-lg font-semibold first:rounded-input first:border last:rounded-input"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}

          <div className="min-h-5" aria-live="polite">
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting || code.trim().length < 6}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </Button>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <Button type="button" variant="ghost" size="sm" className="gap-2 px-2 text-xs sm:text-sm" onClick={toggleRecovery}>
            <KeyRound />
            {recovery ? "Usar aplicativo" : "Usar código de recuperação"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-muted-foreground" onClick={onExit}>
            {exitLabel === "Sair" && <LogOut />}
            {exitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}