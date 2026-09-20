// Reusable Stripe Elements card form — handles tokenization on submit.
// Parent passes onPaymentMethod(pmId) which is then sent to a backend edge function.

import { useState, useImperativeHandle, forwardRef } from "react";
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
} from "@stripe/stripe-js";
import { Label } from "@/components/ui/label";
import { CreditCard, Calendar, Lock, User, Hash } from "lucide-react";
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

const elementOptions: StripeCardNumberElementOptions = {
  placeholder: "",
  showIcon: true,
  style: {
    base: {
      fontSize: "15px",
      color: "hsl(var(--foreground))",
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      "::placeholder": { color: "transparent" },
      iconColor: "hsl(var(--primary))",
    },
    invalid: { color: "hsl(var(--destructive))", iconColor: "hsl(var(--destructive))" },
  },
};

export const StripeCardForm = forwardRef<StripeCardFormHandle, Props>(
  ({ cardHolder, onCardHolderChange, onCardChange, onExpiryChange, onCvcFocus, onCvcBlur, disabled, nameCase = "title" }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<"number" | "expiry" | "cvc" | null>(null);

    const focusElement = (field: "number" | "expiry" | "cvc") => {
      if (disabled || !elements) return;
      const element = field === "number"
        ? elements.getElement(CardNumberElement)
        : field === "expiry"
          ? elements.getElement(CardExpiryElement)
          : elements.getElement(CardCvcElement);
      element?.focus();
    };

    const handleFieldChange = (
      event: StripeCardNumberElementChangeEvent | StripeCardExpiryElementChangeEvent | StripeCardCvcElementChangeEvent,
    ) => {
      setError(event.error?.message || null);
    };

    const sharedOptions = { ...elementOptions, disabled: !!disabled };

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
          <div
            className={`flex min-h-11 w-full cursor-text items-center rounded-[var(--radius-input)] border bg-background px-3 py-2 transition-colors ${
              focusedField === "number" ? "border-ring ring-1 ring-ring" : "border-input"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={() => focusElement("number")}
          >
            <CardNumberElement
              options={sharedOptions}
              className="w-full py-0.5"
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
            <div
              className={`flex min-h-11 w-full cursor-text items-center rounded-[var(--radius-input)] border bg-background px-3 py-2 transition-colors ${
                focusedField === "expiry" ? "border-ring ring-1 ring-ring" : "border-input"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => focusElement("expiry")}
            >
              <CardExpiryElement
                options={sharedOptions}
                className="w-full py-0.5"
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
            <div
              className={`flex min-h-11 w-full cursor-text items-center rounded-[var(--radius-input)] border bg-background px-3 py-2 transition-colors ${
                focusedField === "cvc" ? "border-ring ring-1 ring-ring" : "border-input"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => focusElement("cvc")}
            >
              <CardCvcElement
                options={sharedOptions}
                className="w-full py-0.5"
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
      </div>
    );
  },
);

StripeCardForm.displayName = "StripeCardForm";
