import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setMeasurementId, trackPageView } from "@/lib/analytics";
import {
  ConsentPrefs,
  ensureDataLayer,
  getConsent,
  hasConsentDecision,
  onConsentChange,
} from "@/lib/consent";

type TrackingSettings = {
  gtm_id: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  enabled: boolean;
};

const injected = new Set<string>();

function loadGtm(id: string) {
  if (injected.has("gtm") || document.querySelector('script[data-tag="gtm"]')) return;
  injected.add("gtm");
  ensureDataLayer();
  window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  s.dataset.tag = "gtm";
  document.head.appendChild(s);
}

function loadGa4(id: string) {
  if (injected.has("ga4") || document.querySelector('script[data-tag="ga4"]')) return;
  injected.add("ga4");
  // window.gtag já existe (consent.ts) e empilha `arguments` no dataLayer,
  // que é exatamente o formato que o gtag.js espera.
  ensureDataLayer();
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.dataset.tag = "ga4";
  document.head.appendChild(s);
  window.gtag!("js", new Date());
  // O page_view é enviado pela própria aplicação (SPA), evitando duplicidade.
  window.gtag!("config", id, {
    send_page_view: false,
    ...(import.meta.env.DEV ? { debug_mode: true } : {}),
  });
  setMeasurementId(id);
  // Primeira visualização: a tag só existe agora, então enviamos aqui.
  trackPageView(window.location.pathname + window.location.search);
}

function loadMetaPixel(id: string) {
  if (injected.has("fbq")) return;
  injected.add("fbq");
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    t.dataset.tag = "fbq";
    b.head.appendChild(t);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", id);
  window.fbq?.("track", "PageView");
}

function applyTags(cfg: TrackingSettings, prefs: ConsentPrefs) {
  if (!cfg.enabled) return;
  // Google Tag Manager: carrega com analíticos OU marketing; o próprio GTM
  // respeita o Consent Mode enviado em src/lib/consent.ts.
  if (cfg.gtm_id && (prefs.analytics || prefs.marketing)) loadGtm(cfg.gtm_id);
  // Google Analytics 4 (código G-XXXX), quando não se usa o Tag Manager.
  if (cfg.ga4_id && prefs.analytics) loadGa4(cfg.ga4_id);
  // Pixel do Meta: somente com consentimento de marketing.
  if (cfg.meta_pixel_id && prefs.marketing) loadMetaPixel(cfg.meta_pixel_id);
}

const isPlaceholder = (v: string | null) =>
  !v || !v.trim() || v.trim().startsWith("@secret:");

/**
 * Carrega Google Analytics 4, Google Tag Manager e Pixel do Meta conforme o
 * cadastro no admin e o consentimento do visitante. Sem consentimento de
 * analíticos, nada é carregado (LGPD).
 */
export const TrackingTags = () => {
  const [cfg, setCfg] = useState<TrackingSettings | null>(null);
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // Fonte única: edge function pública (tabela + secret como reserva).
      try {
        const { data, error } = await supabase.functions.invoke("tracking-config");
        if (!error && data && active) {
          setCfg(data as TrackingSettings);
          return;
        }
      } catch {
        /* cai no plano B abaixo */
      }
      const { data } = await supabase
        .from("tracking_settings")
        .select("gtm_id, ga4_id, meta_pixel_id, enabled")
        .maybeSingle();
      if (!active || !data) return;
      const row = data as TrackingSettings;
      setCfg({
        ...row,
        gtm_id: isPlaceholder(row.gtm_id) ? null : row.gtm_id,
        ga4_id: isPlaceholder(row.ga4_id) ? null : row.ga4_id,
        meta_pixel_id: isPlaceholder(row.meta_pixel_id) ? null : row.meta_pixel_id,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    if (hasConsentDecision()) applyTags(cfg, getConsent());
    return onConsentChange((prefs) => {
      applyTags(cfg, prefs);
      // Primeira visualização logo após o visitante aceitar os cookies.
      if (prefs.analytics || prefs.marketing) {
        lastPath.current = window.location.pathname + window.location.search;
        trackPageView(lastPath.current);
      }
    });
  }, [cfg]);

  // Página vista a cada navegação interna (SPA não dispara sozinho).
  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    trackPageView(path);
  }, [location.pathname, location.search]);

  return null;
};
