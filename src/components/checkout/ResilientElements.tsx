// Provedor dos campos de cartão que se recupera sozinho.
// Se o Stripe não carregar ou os campos não ficarem prontos, recria tudo
// com uma nova instância — sem o cliente precisar recarregar a página.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe, stripePromise } from "@/lib/stripe";

const ReloadCtx = createContext<{ reload: () => void; attempt: number }>({ reload: () => {}, attempt: 0 });
export const useStripeReload = () => useContext(ReloadCtx);

export function ResilientElements({ children, options }: { children: ReactNode; options?: StripeElementsOptions }) {
  const [state, setState] = useState({ attempt: 0, promise: stripePromise });
  const reload = useCallback(() => {
    setState((s) => ({ attempt: s.attempt + 1, promise: getStripe(true) }));
  }, []);
  return (
    <ReloadCtx.Provider value={{ reload, attempt: state.attempt }}>
      <Elements key={state.attempt} stripe={state.promise} options={options as any}>
        {children}
      </Elements>
    </ReloadCtx.Provider>
  );
}
