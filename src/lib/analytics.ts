// Eventos de marketing enviados ao Google (GTM e/ou GA4) via dataLayer.
// Só dispara quando o visitante aceitou cookies de analíticos ou marketing.
import { ensureDataLayer, getConsent, hasConsentDecision } from "@/lib/consent";

export type TrackParams = Record<string, string | number | boolean | null | undefined>;

function allowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasConsentDecision()) return false;
  const prefs = getConsent();
  return prefs.analytics || prefs.marketing;
}

/** Envia um evento para o dataLayer (lido pelo GTM e pelo GA4). */
export function trackEvent(event: string, params: TrackParams = {}) {
  if (!allowed()) return;
  try {
    ensureDataLayer();
    window.dataLayer!.push({ event, ...params });
  } catch {
    /* rastreamento nunca pode quebrar a página */
  }
}

/** Visualização de página em navegação interna (SPA). */
export function trackPageView(path: string, title?: string) {
  trackEvent("page_view", { page_path: path, page_title: title ?? document.title });
}

export const trackFreeTrialClick = (location: string) =>
  trackEvent("clique_teste_gratis", { origem: location });

export const trackDemoClick = (location: string) =>
  trackEvent("clique_demonstracao", { origem: location });

export const trackPlanClick = (plan: string, price?: string) =>
  trackEvent("clique_plano", { plano: plan, preco: price ?? "" });

export const trackCheckoutView = (method: string, plan?: string) =>
  trackEvent("checkout_visualizado", { metodo: method, plano: plan ?? "" });

export const trackCheckoutStart = (method: string, plan?: string) =>
  trackEvent("begin_checkout", { metodo: method, plano: plan ?? "" });

export const trackSignupStart = (location: string) =>
  trackEvent("inicio_cadastro", { origem: location });

export const trackTrialStarted = (plan?: string) =>
  trackEvent("trial_iniciado", { plano: plan ?? "" });

export const trackPurchase = (plan?: string, value?: number, method?: string) =>
  trackEvent("purchase", { plano: plan ?? "", value: value ?? 0, currency: "BRL", metodo: method ?? "" });
