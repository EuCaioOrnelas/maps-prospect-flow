// Reusable Stripe Elements card form — handles tokenization on submit.
// Parent passes onPaymentMethod(pmId) which is then sent to a backend edge function.

import { useState, useImperativeHandle, forwardRef, useEffect, useMemo, useRef } from "react";
import { useStripeReload } from "./ResilientElements";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type {
  StripeCardCvcElementChangeEvent,
  StripeCardExpiryElementChangeEvent,
  StripeCardNumberElementChangeEvent,
  StripeCardNumberElementOptions,
  StripeCardExpiryElementOptions,
  StripeCardCvcElementOptions,
} from "@stripe/stripe-js";
import { Label } from "@/components/ui/label";
import { Calendar, Lock, User, Hash, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface StripeCardFormHandle {
  /** Tokenize card → return paymentMethodId. Throws on invalid. */
  createPaymentMethod: (billingDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      postal_code?: string;
      line1?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }) => Promise<string>;
}

interface Props {
  /** Cardholder name shown on the animated card */
  cardHolder: string;
  onCardHolderChange: (v: string) => void;
  /** Notifies parent about card field state for animated card preview */
  onCardChange?: (data: {
    brand?: string;
    complete?: boolean;
    empty?: boolean;
  }) => void;
  onExpiryChange?: (data: { complete: boolean; empty: boolean }) => void;
  onCvcFocus?: () => void;
  onCvcBlur?: () => void;
  disabled?: boolean;
  /** "upper" (padrão) deixa tudo maiúsculo; "title" capitaliza cada palavra. */
  nameCase?: "upper" | "title";
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([\p{L}])/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

// O campo do Stripe roda dentro de um iframe e NÃO entende variáveis CSS
// (hsl(var(--x))). Convertemos o tema atual em cores reais.
function themeColor(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    const probe = document.createElement("span");
    probe.style.color = `hsl(var(${varName}))`;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color; // sempre "rgb(r, g, b)"
    probe.remove();
    return /^rgba?\(/.test(rgb) ? rgb : fallback;
  } catch {
    return fallback;
  }
}

function buildStyle(): StripeCardNumberElementOptions["style"] {
  const fg = themeColor("--foreground", "#0f172a");
  const primary = themeColor("--primary", "#16a34a");
  const danger = themeColor("--destructive", "#dc2626");
  return {
    base: { fontSize: "15px", color: fg, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', "::placeholder": { color: "transparent" }, iconColor: primary },
    invalid: { color: danger, iconColor: danger },
  };
}

const elementStyle: StripeCardNumberElementOptions["style"] = {
  base: {
    fontSize: "15px",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    "::placeholder": { color: "transparent" },
    iconColor: "#16a34a",
  },
  invalid: { color: "#dc2626", iconColor: "#dc2626" },
};

const cardNumberOptions: StripeCardNumberElementOptions = {
  placeholder: "",
  showIcon: true,
  style: elementStyle,
};

const cardExpiryOptions: StripeCardExpiryElementOptions = {
  placeholder: "",
  style: elementStyle,
};

const cardCvcOptions: StripeCardCvcElementOptions = {
  placeholder: "",
  style: elementStyle,
};

export const StripeCardForm = forwardRef<StripeCardFormHandle, Props>(
  ({ cardHolder, onCardHolderChange, onCardChange, onExpiryChange, onCvcFocus, onCvcBlur, disabled, nameCase = "title" }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<"number" | "expiry" | "cvc" | null>(null);
    const { reload, attempt } = useStripeReload();
    const [readyCount, setReadyCount] = useState(0);
    const [stuck, setStuck] = useState(false);
    const markReady = () => setReadyCount((c) => c + 1);
    const style = useMemo(() => buildStyle(), []);
    const numberOpts = useMemo(() => ({ ...cardNumberOptions, style }), [style]);
    const expiryOpts = useMemo(() => ({ ...cardExpiryOptions, style }), [style]);
    const cvcOpts = useMemo(() => ({ ...cardCvcOptions, style }), [style]);
    const autoReloads = useRef(0);

    // Vigia: se os 3 campos não ficarem prontos em 10s, recria os campos
    // sozinho (até 2 vezes) e depois mostra o botão para o cliente.
    useEffect(() => {
      setStuck(false);
      const t = window.setTimeout(() => {
        if (readyCount >= 3) return;
        if (autoReloads.current < 2) {
          autoReloads.current += 1;
          console.warn("[card] campos não ficaram prontos, recriando…");
          reload();
        } else setStuck(true);
      }, 10000);
      return () => window.clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt, readyCount >= 3]);

    // Proteção contra travas de clique: janelas (ofertas, avisos) às vezes
    // deixam a página inteira sem aceitar clique ao fechar. Se não houver
    // nenhuma janela aberta, devolvemos o clique à página.
    useEffect(() => {
      const fix = () => {
        const openModal = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
        if (openModal) return;
        [document.body, document.documentElement].forEach((el) => {
          if (el.style.pointerEvents === "none") el.style.pointerEvents = "";
        });
        document.querySelectorAll<HTMLElement>("[data-card-field]").forEach((el) => {
          let n: HTMLElement | null = el;
          while (n && n !== document.body) {
            if (n.hasAttribute("inert")) n.removeAttribute("inert");
            n = n.parentElement;
          }
        });
      };
      fix();
      const id = window.setInterval(fix, 1000);
      return () => window.clearInterval(id);
    }, []);

    // A caixa inteira aceita clique (não só a linha de texto do meio).
    const focusField = (kind: "number" | "expiry" | "cvc") => {
      const el =
        kind === "number" ? elements?.getElement(CardNumberElement) :
        kind === "expiry" ? elements?.getElement(CardExpiryElement) :
        elements?.getElement(CardCvcElement);
      el?.focus();
    };

    const handleFieldChange = (
      event: StripeCardNumberElementChangeEvent | StripeCardExpiryElementChangeEvent | StripeCardCvcElementChangeEvent,
    ) => {
      setError(event.error?.message || null);
    };

    useImperativeHandle(ref, () => ({
      createPaymentMethod: async (billingDetails) => {
        setError(null);
        if (!stripe || !elements) throw new Error("Stripe ainda está carregando, aguarde...");

        const cardEl = elements.getElement(CardNumberElement);
        if (!cardEl) throw new Error("Formulário de cartão não está pronto.");

        const { error: pmErr, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardEl,
          billing_details: { ...billingDetails, name: cardHolder || billingDetails.name },
        });

        if (pmErr) {
          setError(pmErr.message || "Cartão inválido");
          throw new Error(pmErr.message || "Cartão inválido");
        }
        if (!paymentMethod) throw new Error("Não foi possível processar o cartão.");
        return paymentMethod.id;
      },
    }));

    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="card-holder" className="text-xs font-medium flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground" /> Nome no cartão
          </Label>
          <Input
            id="card-holder"
            placeholder={nameCase === "title" ? "Nome impresso no cartão" : "NOME IMPRESSO NO CARTÃO"}
            value={cardHolder}
            onChange={(e) =>
              onCardHolderChange(
                nameCase === "title" ? toTitleCase(e.target.value) : e.target.value.toUpperCase(),
              )
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-muted-foreground" /> Número do cartão
          </Label>
          <div data-card-field="number" className="relative z-[1] pointer-events-auto" onMouseDown={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("iframe")) { e.preventDefault(); focusField("number"); } }}>
<CardNumberElement
            options={numberOpts}
            onReady={markReady}
            className={`pointer-events-auto min-h-11 w-full cursor-text rounded-[var(--radius-input)] border bg-background px-3 py-3 transition-colors ${
              focusedField === "number" ? "border-ring ring-1 ring-ring" : "border-input"
            }`}
            onChange={(event) => {
              handleFieldChange(event);
              onCardChange?.({ brand: event.brand, complete: event.complete, empty: event.empty });
            }}
            onFocus={() => setFocusedField("number")}
            onBlur={() => setFocusedField(null)}
          />
</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" /> Validade
            </Label>
            <div data-card-field="expiry" className="relative z-[1] pointer-events-auto" onMouseDown={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("iframe")) { e.preventDefault(); focusField("expiry"); } }}>
<CardExpiryElement
              options={expiryOpts}
            onReady={markReady}
              className={`pointer-events-auto min-h-11 w-full cursor-text rounded-[var(--radius-input)] border bg-background px-3 py-3 transition-colors ${
                focusedField === "expiry" ? "border-ring ring-1 ring-ring" : "border-input"
              }`}
              onChange={(event) => {
                handleFieldChange(event);
                onExpiryChange?.({ complete: event.complete, empty: event.empty });
              }}
              onFocus={() => setFocusedField("expiry")}
              onBlur={() => setFocusedField(null)}
            />
</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" /> CVV
            </Label>
            <div data-card-field="cvc" className="relative z-[1] pointer-events-auto" onMouseDown={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("iframe")) { e.preventDefault(); focusField("cvc"); } }}>
<CardCvcElement
              options={cvcOpts}
            onReady={markReady}
              className={`pointer-events-auto min-h-11 w-full cursor-text rounded-[var(--radius-input)] border bg-background px-3 py-3 transition-colors ${
                focusedField === "cvc" ? "border-ring ring-1 ring-ring" : "border-input"
              }`}
              onChange={handleFieldChange}
              onFocus={() => {
                setFocusedField("cvc");
                onCvcFocus?.();
              }}
              onBlur={() => {
                setFocusedField(null);
                onCvcBlur?.();
              }}
            />
</div>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {stuck && (
          <button
            type="button"
            onClick={() => { autoReloads.current = 0; reload(); }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Os campos do cartão não carregaram — toque para recarregar
          </button>
        )}
      </div>
    );
  },
);

StripeCardForm.displayName = "StripeCardForm";
