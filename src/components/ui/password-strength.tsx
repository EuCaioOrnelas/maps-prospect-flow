import { useMemo } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { basicCriteria, getPasswordWarnings, isPasswordAcceptable, type PasswordContext } from "@/lib/passwordPolicy";

interface PasswordStrengthProps extends PasswordContext {
  password: string;
  /** Erro vindo do servidor (já traduzido), mostrado em destaque. */
  serverError?: string | null;
}

export const PasswordStrength = ({ password, email, name, serverError }: PasswordStrengthProps) => {
  const criteria = useMemo(() => basicCriteria(password), [password]);
  const warnings = useMemo(() => getPasswordWarnings(password, { email, name }), [password, email, name]);

  const strength = useMemo(() => {
    const metCount = criteria.filter((c) => c.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "" };
    if (metCount <= 2) return { level: 1, label: "Fraca", color: "bg-destructive" };
    if (metCount <= 3 || warnings.length > 0) return { level: 2, label: metCount <= 3 ? "Média" : "Previsível", color: "bg-warning" };
    if (metCount <= 4) return { level: 3, label: "Boa", color: "bg-info" };
    return { level: 4, label: "Forte", color: "bg-primary" };
  }, [criteria, warnings]);

  if (!password && !serverError) return null;

  return (
    <div className="space-y-3 mt-3" aria-live="polite">
      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-foreground">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-destructive" />
          <span>{serverError}</span>
        </div>
      )}
      {password && (
        <>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Força da senha</span>
              <span className={`font-medium ${
                strength.level === 1 ? "text-destructive" :
                strength.level === 2 ? "text-warning" :
                strength.level === 3 ? "text-info" :
                strength.level === 4 ? "text-primary" : ""
              }`}>{strength.label}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div key={level} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= strength.level ? strength.color : "bg-muted"}`} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {criteria.map((c, i) => (
              <div key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${c.met ? "text-primary" : "text-muted-foreground"}`}>
                {c.met ? <Check size={12} className="flex-shrink-0" /> : <X size={12} className="flex-shrink-0" />}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
          {warnings.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <AlertTriangle size={13} className="text-warning" /> Senha fácil de adivinhar
              </p>
              <ul className="space-y-0.5 pl-5 text-xs text-muted-foreground list-disc">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Aprovada: 4 de 5 critérios e sem padrões previsíveis. */
export const isPasswordStrong = (password: string, ctx: PasswordContext = {}): boolean =>
  isPasswordAcceptable(password, ctx);
