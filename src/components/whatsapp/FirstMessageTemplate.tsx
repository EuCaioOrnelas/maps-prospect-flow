import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

interface FirstMessageTemplateProps {
  value: string;
  onChange: (value: string) => void;
}

// Regras da primeira mensagem
const FIRST_MESSAGE_RULES = {
  maxLength: 150,
  forbiddenPatterns: [
    { pattern: /https?:\/\/[^\s]+/gi, label: "Links" },
    { pattern: /www\.[^\s]+/gi, label: "Links" },
    { pattern: /(clique|acesse|visite|confira|saiba mais|entre em contato)/gi, label: "CTAs" },
    { pattern: /(promoção|desconto|oferta|grátis|gratuito|brinde)/gi, label: "Ofertas" },
    { pattern: /(compre|comprar|adquira|contrate|assine)/gi, label: "Vendas diretas" },
    { pattern: /(\bltda\b|\bme\b|\beireli\b|\bs\.?a\.?\b)/gi, label: "Razão social" },
  ],
};

// Template sugerido
const SUGGESTED_TEMPLATE = `Olá {nome}! Tudo bem? 👋

Vi seu trabalho e achei muito interessante. Posso te fazer uma pergunta rápida?`;

export const FirstMessageTemplate = ({ value, onChange }: FirstMessageTemplateProps) => {
  const [touched, setTouched] = useState(false);

  const checkViolations = (text: string) => {
    const violations: string[] = [];
    
    for (const rule of FIRST_MESSAGE_RULES.forbiddenPatterns) {
      if (rule.pattern.test(text)) {
        if (!violations.includes(rule.label)) {
          violations.push(rule.label);
        }
      }
    }

    if (text.length > FIRST_MESSAGE_RULES.maxLength) {
      violations.push(`Excede ${FIRST_MESSAGE_RULES.maxLength} caracteres`);
    }

    return violations;
  };

  const violations = checkViolations(value);
  const isValid = violations.length === 0 && value.trim().length > 10;
  const charCount = value.length;
  const charRemaining = FIRST_MESSAGE_RULES.maxLength - charCount;

  const handleUseSuggested = () => {
    onChange(SUGGESTED_TEMPLATE);
    setTouched(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Primeira mensagem de validação
          </Label>
          <p className="text-xs text-muted-foreground">
            Esta mensagem será enviada primeiro para validar o interesse do contato.
            O objetivo é obter uma resposta, não vender.
          </p>
        </div>
        <Badge 
          variant={isValid ? "default" : violations.length > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {isValid ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" /> Válida</>
          ) : violations.length > 0 ? (
            <><XCircle className="h-3 w-3 mr-1" /> Inválida</>
          ) : (
            "Incompleta"
          )}
        </Badge>
      </div>

      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTouched(true);
          }}
          placeholder="Digite a primeira mensagem que será enviada aos contatos..."
          className={`min-h-[120px] resize-none ${
            touched && violations.length > 0 ? "border-destructive" : ""
          }`}
          maxLength={FIRST_MESSAGE_RULES.maxLength + 50} // Permite digitar um pouco mais para mostrar o erro
        />
        <div className="absolute bottom-2 right-2">
          <span className={`text-xs ${charRemaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {charRemaining >= 0 ? `${charRemaining} restantes` : `${Math.abs(charRemaining)} a mais`}
          </span>
        </div>
      </div>

      {/* Violações */}
      {touched && violations.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Mensagem não permitida
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {violations.map((v, i) => (
                  <li key={i}>• {v}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Regras */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <p className="text-xs font-medium mb-2">Regras da primeira mensagem:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Texto curto e neutro (máx. {FIRST_MESSAGE_RULES.maxLength} caracteres)
          </li>
          <li className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Sem links ou URLs
          </li>
          <li className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Sem CTAs (clique aqui, saiba mais, etc.)
          </li>
          <li className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Sem ofertas comerciais
          </li>
          <li className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Use {'{nome}'} para personalizar
          </li>
        </ul>
      </div>

      {/* Sugestão */}
      <button
        type="button"
        onClick={handleUseSuggested}
        className="w-full p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-left"
      >
        <p className="text-xs font-medium text-primary mb-1">💡 Usar modelo sugerido</p>
        <p className="text-xs text-muted-foreground whitespace-pre-line">
          {SUGGESTED_TEMPLATE}
        </p>
      </button>
    </div>
  );
};

// Helper para validar primeira mensagem
export const validateFirstMessage = (text: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const rule of FIRST_MESSAGE_RULES.forbiddenPatterns) {
    if (rule.pattern.test(text)) {
      if (!errors.includes(rule.label)) {
        errors.push(rule.label);
      }
    }
  }

  if (text.length > FIRST_MESSAGE_RULES.maxLength) {
    errors.push(`Excede ${FIRST_MESSAGE_RULES.maxLength} caracteres`);
  }

  if (text.trim().length < 10) {
    errors.push("Mensagem muito curta");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
