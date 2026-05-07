import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Rastreia globalmente as páginas visitadas pelo usuário autenticado.
 * - Envia evento de score `page_visited` (limitado a 30/dia pela score_rules).
 * - Grava histórico em `user_events` (event_name = 'page_visited') para
 *   aparecer no histórico do lead/usuário.
 *
 * Ignora rotas públicas (landing, login, signup, etc).
 */
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/contato",
  "/ajuda",
  "/enterprise",
  "/parceiros",
  "/parceiro",
];

function isTrackable(pathname: string) {
  // Ignora rotas exatamente públicas
  if (pathname === "/") return false;
  return !PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/")),
  );
}

export const PageVisitTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (!user?.id) return;
    const path = location.pathname;
    if (!isTrackable(path)) return;
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    // 1) histórico (user_events)
    supabase
      .from("user_events")
      .insert({
        user_id: user.id,
        event_name: "page_visited" as any,
        event_data: { path, search: location.search, referrer: document.referrer || null },
      } as any)
      .then(({ error }) => {
        if (error) console.debug("[PageVisitTracker] user_events:", error.message);
      });

    // 2) score (rate-limited no backend)
    supabase.functions
      .invoke("score-processor", {
        body: {
          action: "track_event",
          user_id: user.id,
          event_name: "page_visited",
          metadata: { path },
          source: "frontend",
        },
      })
      .catch((err) => console.debug("[PageVisitTracker] score:", err));
  }, [location.pathname, location.search, user?.id]);

  return null;
};
