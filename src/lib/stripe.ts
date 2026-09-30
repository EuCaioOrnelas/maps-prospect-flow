// Stripe.js publishable key - safe to be in frontend.
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SXrIWK8CM0R6xMMcr7LFQxiuUz5hDqC7fEFSatME2vxXAwmqVUfherSnxFg9U4zBbf8nQrZFrZnx5UilliI5vIU00VIcOBJ3l";

/**
 * Carregamento resiliente do Stripe.js.
 * `loadStripe` guarda a primeira tentativa para sempre: se o script falhar uma
 * vez (internet instável, bloqueador, CDN lenta), os campos do cartão nunca
 * mais funcionariam naquela aba. Aqui tentamos de novo com espera crescente e,
 * se ainda falhar, liberamos uma nova tentativa na próxima chamada.
 */
let current: Promise<Stripe | null> | null = null;

function injectFreshScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    document
      .querySelectorAll('script[src^="https://js.stripe.com/v3"]')
      .forEach((s) => s.remove());
    const s = document.createElement("script");
    s.src = `https://js.stripe.com/v3?retry=${Date.now()}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Stripe.js não carregou"));
    document.head.appendChild(s);
  });
}

async function loadWithRetry(): Promise<Stripe | null> {
  const delays = [0, 1000, 2500, 5000];
  let lastErr: unknown;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      if (i > 0 && !(window as any).Stripe) await injectFreshScript();
      const w = window as any;
      const stripe = w.Stripe ? (w.Stripe(STRIPE_PUBLISHABLE_KEY) as Stripe) : await loadStripe(STRIPE_PUBLISHABLE_KEY);
      if (stripe) return stripe;
    } catch (e) {
      lastErr = e;
    }
  }
  current = null; // permite nova tentativa depois
  throw lastErr ?? new Error("Stripe indisponível");
}

export function getStripe(forceNew = false): Promise<Stripe | null> {
  if (forceNew || !current) {
    current = loadWithRetry().catch((e) => {
      console.error("[stripe] falha ao carregar", e);
      return null;
    });
  }
  return current;
}

/** Mantido por compatibilidade: primeira instância compartilhada. */
export const stripePromise: Promise<Stripe | null> =
  typeof window === "undefined" ? Promise.resolve(null) : getStripe();
