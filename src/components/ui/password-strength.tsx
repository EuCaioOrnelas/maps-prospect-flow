import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const criteria: PasswordCriteria[] = useMemo(() => [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Letra minúscula", met: /[a-z]/.test(password) },
    { label: "Número", met: /[0-9]/.test(password) },
    { label: "Caractere especial (!@#$%)", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = criteria.filter(c => c.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "" };
    if (metCount <= 2) return { level: 1, label: "Fraca", color: "bg-destructive" };
    if (metCount <= 3) return { level: 2, label: "Média", color: "bg-warning" };
    if (metCount <= 4) return { level: 3, label: "Boa", color: "bg-info" };
    return { level: 4, label: "Forte", color: "bg-primary" };
  }, [criteria]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Força da senha</span>
          <span className={`font-medium ${
            strength.level === 1 ? 'text-destructive' :
            strength.level === 2 ? 'text-warning' :
            strength.level === 3 ? 'text-info' :
            strength.level === 4 ? 'text-primary' : ''
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength.level ? strength.color : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Criteria List */}
      <div className="grid grid-cols-2 gap-1.5">
        {criteria.map((criterion, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              criterion.met ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {criterion.met ? (
              <Check size={12} className="flex-shrink-0" />
            ) : (
              <X size={12} className="flex-shrink-0" />
            )}
            <span>{criterion.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const isPasswordStrong = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};