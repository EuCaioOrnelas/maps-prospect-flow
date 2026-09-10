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
  ga4_id: string | null;
  google_ads_id: string | null;
  meta_pixel_id: string | null;
  enabled: boolean;
};

const injected = new Set<string>();

function injectScript(key: string, src: string) {
  if (injected.has(key) || document.querySelector(`script[data-tag="${key}"]`)) return;
  injected.add(key);
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.dataset.tag = key;
  document.head.appendChild(s);
}

function loadGtm(id: string) {
  if (injected.has("gtm")) return;
  injected.add("gtm");
  ensureDataLayer();
  window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
  injectScript("gtm-src", `https://www.googletagmanager.com/gtm.js?id=${id}`);
}

function loadGtag(id: string) {
  ensureDataLayer();
  injectScript("gtag", `https://www.googletagmanager.com/gtag/js?id=${id}`);
  window.gtag?.("js", new Date());
  window.gtag?.("config", id);
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
    b.head.appendChild(t);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", id);
  window.fbq?.("track", "PageView");
}

function applyTags(cfg: TrackingSettings, prefs: ConsentPrefs) {
  if (!cfg.enabled) return;
  if (cfg.gtm_id && (prefs.analytics || prefs.marketing)) loadGtm(cfg.gtm_id);
  if (cfg.ga4_id && prefs.analytics) loadGtag(cfg.ga4_id);
  if (cfg.google_ads_id && prefs.marketing) loadGtag(cfg.google_ads_id);
  if (cfg.meta_pixel_id && prefs.marketing) loadMetaPixel(cfg.meta_pixel_id);
}

/**
 * Carrega GTM / GA4 / Google Ads / Meta Pixel conforme as tags cadastradas no
 * admin e o consentimento do visitante. Sem consentimento, nada é carregado.
 */
export const TrackingTags = () => {
  const [cfg, setCfg] = useState<TrackingSettings | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("tracking_settings")
        .select("gtm_id, ga4_id, google_ads_id, meta_pixel_id, enabled")
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
