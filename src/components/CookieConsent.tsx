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
 * Páginas públicas (site de vendas, produtos, blog, legais, parceiros) e
 * páginas de acesso (login, cadastro, recuperação de senha). O aviso aparece
 * em todas elas, mesmo se o visitante já estiver logado — o que não acontece
 * é aparecer dentro do app autenticado.
 */
const PUBLIC_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/login$/,
  /^\/signup(\/|$)/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/terms$/,
  /^\/privacy$/,
  /^\/refund-policy$/,
  /^\/prospeccao$/,
  /^\/demonstracao$/,
  /^\/enterprise$/,
  /^\/blog(\/|$)/,
  /^\/produtos(\/|$)/,
  /^\/inteligencia$/,
  /^\/seguranca-faq$/,
  /^\/diretrizes-de-envio$/,
  /^\/ajuda(\/|$)/,
  /^\/tour-completo$/,
  /^\/tour-guiado$/,
  /^\/contato$/,
  /^\/descadastro$/,
  /^\/avaliacao(\/|$)/,
  /^\/thank-you$/,
  /^\/parceiros(\/|$)/,
  /^\/partners(\/|$)/,
  /^\/wiize-partners(\/|$)/,
  /^\/api$/,
  /^\/api\/login$/,
  /^\/404$/,
];

export const isPublicConsentPath = (pathname: string) =>
  PUBLIC_PATTERNS.some((r) => r.test(pathname));

export const CookieConsent = () => {
  const location = useLocation();
  const { user } = useAuth();
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
      /* o consentimento já ficou salvo no navegador */
    }
  };

  if (decided) return null;
  if (!isPublicConsentPath(location.pathname)) return null;

  return <CookiePanel privacyHref="/privacy" termsHref="/terms" onDecision={logConsent} />;
};
