// Camada única de eventos de marketing.
// Envia para o GA4 (gtag) e também para o dataLayer (lido pelo GTM, quando usado).
// Só dispara quando o visitante aceitou cookies de analíticos ou marketing.
import { ensureDataLayer, getConsent, hasConsentDecision } from "@/lib/consent";

export type TrackParams = Record<string, string | number | boolean | null | undefined>;

/** ID do GA4 em uso nesta sessão (definido por TrackingTags ao carregar a tag). */
let measurementId: string | null = null;

export function setMeasurementId(id: string | null) {
  measurementId = id;
}

export function getMeasurementId() {
  return measurementId;
}

/** Em desenvolvimento, marca os eventos para aparecerem no DebugView do GA4. */
const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

function allowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasConsentDecision()) return false;
  const prefs = getConsent();
  return prefs.analytics || prefs.marketing;
}

/** Envia um evento para o GA4 e para o dataLayer. */
export function trackEvent(event: string, params: TrackParams = {}) {
  if (!allowed()) return;
  try {
    ensureDataLayer();
    const payload: TrackParams = {
      ...params,
      page_path: params.page_path ?? window.location.pathname,
      page_location: params.page_location ?? window.location.href,
      ...(isDev ? { debug_mode: true } : {}),
    };
    // GA4 (gtag.js) — só funciona depois que a tag foi carregada.
    if (measurementId) window.gtag?.("event", event, payload);
    // GTM — continua recebendo o mesmo evento pelo dataLayer.
    window.dataLayer!.push({ event, ...payload });
  } catch {
    /* rastreamento nunca pode quebrar a página */
  }
}

let lastView = { path: "", at: 0, sentToGa: false };

/** Visualização de página em navegação interna (SPA). Evita duplicidade. */
export function trackPageView(path: string, title?: string) {
  if (!allowed()) return;
  const now = Date.now();
  const gaReady = Boolean(measurementId);
  // Repete a mesma página apenas quando a visualização anterior ainda não
  // chegou ao Google Analytics (a tag ainda não tinha carregado).
  const repeated = lastView.path === path && now - lastView.at < 2000;
  if (repeated && (lastView.sentToGa || !gaReady)) return;
  lastView = { path, at: now, sentToGa: gaReady };
  try {
    ensureDataLayer();
    const params = {
      page_path: path,
      page_title: title ?? document.title,
      page_location: window.location.href,
      ...(isDev ? { debug_mode: true } : {}),
    };
    if (gaReady) window.gtag?.("event", "page_view", params);
    if (!repeated) window.dataLayer!.push({ event: "page_view", ...params });
  } catch {
    /* noop */
  }
}

/** Evita enviar o mesmo evento duas vezes (recarga de página, re-render). */
const oncePerBrowser = (key: string) => {
  try {
    const k = `wz_evt_${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
};


/* ------------------------------------------------------------------ */
/* Eventos do funil — nomes no padrão GA4                              */
/* ------------------------------------------------------------------ */

export const trackFreeTrialClick = (location: string) =>
  trackEvent("click_free_trial", { button_location: location, origem: location });

export const trackDemoClick = (location: string) =>
  trackEvent("click_demo", { button_location: location, origem: location });

export const trackPlanClick = (plan: string, price?: string) =>
  trackEvent("select_plan", { plano: plan, preco: price ?? "", item_name: plan });

export const trackCheckoutView = (method: string, plan?: string) =>
  trackEvent("view_checkout", { metodo: method, plano: plan ?? "" });

export const trackCheckoutStart = (method: string, plan?: string) =>
  trackEvent("begin_checkout", { metodo: method, plano: plan ?? "", currency: "BRL" });

export const trackSignupStart = (location: string) =>
  trackEvent("sign_up_start", { button_location: location, origem: location });

/** Cadastro concluído (conta realmente criada). */
export const trackSignupComplete = (method = "email") =>
  trackEvent("sign_up", { method });

/** Teste grátis realmente iniciado (conta criada com cartão aprovado). */
export const trackTrialStarted = (plan?: string, id?: string) => {
  if (id && !oncePerBrowser(`trial_${id}`)) return;
  trackEvent("trial_started", { plano: plan ?? "", item_name: plan ?? "" });
};

/** Compra confirmada — usar apenas com pagamento realmente aprovado. */
export const trackPurchase = (
  plan?: string,
  value?: number,
  method?: string,
  transactionId?: string,
) => {
  if (transactionId && !oncePerBrowser(`purchase_${transactionId}`)) return;
  trackEvent("purchase", {
    transaction_id: transactionId ?? "",
    plano: plan ?? "",
    item_name: plan ?? "",
    value: value ?? 0,
    currency: "BRL",
    metodo: method ?? "",
  });
};

/** Clique em criar conta na landing do Wiize API. */
export const trackApiSignupClick = (location: string) =>
  trackEvent("click_api_signup", { button_location: location, origem: location });


/** Envio do formulário de contato Enterprise. */
export const trackEnterpriseRequest = (company?: string) =>
  trackEvent("generate_lead", { empresa: company ?? "", tipo: "enterprise" });
