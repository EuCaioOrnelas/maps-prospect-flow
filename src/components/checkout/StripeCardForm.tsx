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
import type { StripeCardNumberElementOptions } from "@stripe/stripe-js";
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
    last4Digits?: string;
    brand?: string;
    complete?: boolean;
  }) => void;
  onCvcFocus?: () => void;
  onCvcBlur?: () => void;
  disabled?: boolean;
}

const elementOptions: StripeCardNumberElementOptions = {
  placeholder: "",
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
  ({ cardHolder, onCardHolderChange, onCardChange, onCvcFocus, onCvcBlur, disabled }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);

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
            placeholder="NOME IMPRESSO NO CARTÃO"
            value={cardHolder}
            onChange={(e) => onCardHolderChange(e.target.value.toUpperCase())}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-muted-foreground" /> Número do cartão
          </Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center">
            <CardNumberElement
              options={{ ...elementOptions, showIcon: false }}
              className="w-full"
              onChange={(e) =>
                onCardChange?.({
                  brand: e.brand,
                  complete: e.complete,
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" /> Validade
            </Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center">
              <CardExpiryElement options={elementOptions} className="w-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" /> CVV
            </Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center">
              <CardCvcElement
                options={elementOptions}
                className="w-full"
                onFocus={onCvcFocus}
                onBlur={onCvcBlur}
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
