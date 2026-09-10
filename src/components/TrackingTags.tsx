import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ConsentPrefs,
  ensureDataLayer,
  getConsent,
  hasConsentDecision,
  onConsentChange,
} from "@/lib/consent";

type TrackingSettings = {
  gtm_id: string | null;
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
  // Pixel do Meta: somente com consentimento de marketing.
  if (cfg.meta_pixel_id && prefs.marketing) loadMetaPixel(cfg.meta_pixel_id);
}

/**
 * Carrega apenas Google Tag Manager e Pixel do Meta, conforme cadastrado no
 * admin e o consentimento do visitante. Sem consentimento, nada é carregado.
 */
export const TrackingTags = () => {
  const [cfg, setCfg] = useState<TrackingSettings | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("tracking_settings")
        .select("gtm_id, meta_pixel_id, enabled")
        .maybeSingle();
      if (active && data) setCfg(data as TrackingSettings);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    if (hasConsentDecision()) applyTags(cfg, getConsent());
    return onConsentChange((prefs) => applyTags(cfg, prefs));
  }, [cfg]);

  return null;
};
