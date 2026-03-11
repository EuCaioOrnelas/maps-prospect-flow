import { useEffect, useRef } from "react";
import { useUserScoreTracking } from "./useUserScoreTracking";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Automatically tracks page-level score events.
 * Place in page components to auto-fire relevant events.
 */
export function useAutoScoreTracking(pageName: string) {
  const { trackScoreEvent } = useUserScoreTracking();
  const { user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (!user?.id || tracked.current) return;
    tracked.current = true;

    // Daily login - fire on any page load (rate-limited by score-processor)
    trackScoreEvent("daily_login");
    trackScoreEvent("weekly_login");

    // Page-specific events
    switch (pageName) {
      case "dashboard":
      case "main_dashboard":
        trackScoreEvent("dashboard_viewed");
        break;
      case "upgrade":
      case "upgrade_promo":
        trackScoreEvent("visited_pricing_page");
        // Track multiple visits to upgrade page
        const visitCount = parseInt(sessionStorage.getItem("upgrade_page_visits") || "0") + 1;
        sessionStorage.setItem("upgrade_page_visits", String(visitCount));
        if (visitCount >= 3) {
          trackScoreEvent("upgrade_page_viewed_multiple", { visit_count: visitCount });
        }
        break;
      case "checkout_success":
        trackScoreEvent("checkout_completed");
        trackScoreEvent("subscription_started");
        break;
      case "checkout_failed":
        trackScoreEvent("checkout_failed");
        break;
      case "profile":
        trackScoreEvent("profile_viewed");
        break;
      case "agents":
      case "crm":
      case "warming":
      case "reports":
      case "whatsapp":
      case "revenue":
      case "consultoria":
      case "warming_reports":
      case "whatsapp_reports":
      case "agent_reports":
        trackScoreEvent("feature_page_viewed", { page: pageName });
        break;
    }
  }, [user?.id, pageName, trackScoreEvent]);

  return { trackScoreEvent };
}
