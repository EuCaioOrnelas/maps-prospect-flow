import { useMemo, useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "Mínimo de 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Uma letra maiúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Uma letra minúscula", test: (v) => /[a-z]/.test(v) },
  { label: "Um número", test: (v) => /\d/.test(v) },
  { label: "Um caractere especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const isStrongPassword = (v: string) => PASSWORD_RULES.every((r) => r.test(v));

interface Props {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Exibe a lista de requisitos e a barra de força. */
  showStrength?: boolean;
  required?: boolean;
  rightSlot?: React.ReactNode;
}

/** Campo de senha com mostrar/ocultar e recomendações de segurança. */
export function PasswordField({
  id = "password",
  label = "Senha",
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  showStrength = false,
  required = true,
  rightSlot,
}: Props) {
  const [visible, setVisible] = useState(false);

  const passed = useMemo(() => PASSWORD_RULES.filter((r) => r.test(value)).length, [value]);
  const ratio = passed / PASSWORD_RULES.length;
  const strengthLabel = ratio === 1 ? "Forte" : ratio >= 0.6 ? "Média" : "Fraca";
  const strengthColor = ratio === 1 ? "bg-primary" : ratio >= 0.6 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {rightSlot}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && (
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-300", strengthColor)}
                style={{ width: `${Math.max(ratio * 100, value ? 8 : 0)}%` }}
              />
            </div>
            {value && (
              <span className="text-[11px] font-medium text-muted-foreground">{strengthLabel}</span>
            )}
          </div>
          <ul className="grid gap-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(value);
              return (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] transition-colors",
                    ok ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {ok ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2} />}
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PasswordField;
