// Reusable Stripe Elements card form — uses unified CardElement (Stripe native layout).

import { useState, useImperativeHandle, forwardRef } from "react";
import {
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import { Label } from "@/components/ui/label";
import { Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface StripeCardFormHandle {
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
  cardHolder: string;
  onCardHolderChange: (v: string) => void;
  onCardChange?: (data: {
    last4Digits?: string;
    brand?: string;
    complete?: boolean;
  }) => void;
  onCvcFocus?: () => void;
  onCvcBlur?: () => void;
  disabled?: boolean;
}

const elementOptions: StripeCardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: "15px",
      color: "hsl(var(--foreground))",
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      "::placeholder": { color: "hsl(var(--muted-foreground) / 0.4)" },
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

        const cardEl = elements.getElement(CardElement);
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
          <Label className="text-xs font-medium">Dados do cartão</Label>
          <div
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 items-center transition-colors focus-within:border-primary"
            onFocus={onCvcFocus}
            onBlur={onCvcBlur}
          >
            <CardElement
              options={elementOptions}
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

        {error && <p className="text-xs text-destructive">{error}</p>}

        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Pagamento processado com segurança via Stripe (PCI-DSS).
        </p>
      </div>
    );
  },
);

StripeCardForm.displayName = "StripeCardForm";
