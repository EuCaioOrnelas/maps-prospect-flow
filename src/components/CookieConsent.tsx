import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CookiePanel } from "@/components/ui/cookie-banner-1";
import { supabase } from "@/integrations/supabase/client";
import {
  CONSENT_VERSION,
  ConsentPrefs,
  getAnonId,
  hasConsentDecision,
  initConsentMode,
} from "@/lib/consent";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Banner de cookies: aparece em todas as páginas públicas (sem login) e na
 * página de login. Não aparece para usuários autenticados dentro do app.
 */
export const CookieConsent = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [decided, setDecided] = useState(hasConsentDecision());

  useEffect(() => {
    initConsentMode();
  }, []);

  const logConsent = async (prefs: ConsentPrefs) => {
    setDecided(true);
    try {
      await supabase.from("cookie_consents").insert({
        user_id: user?.id ?? null,
        anon_id: getAnonId(),
        necessary: true,
        functional: prefs.functional,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        policy_version: CONSENT_VERSION,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      } as any);
    } catch {
      /* consentimento já está salvo localmente */
    }
  };

  if (decided) return null;
  if (loading) return null;
  // Só em páginas públicas / login
  if (user && location.pathname !== "/login") return null;

  return <CookiePanel privacyHref="/privacy" termsHref="/terms" onDecision={logConsent} />;
};
