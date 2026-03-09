import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tracks product events for the trial automation system.
 * Records user actions into trial_product_events for scoring & triggers.
 */
export function useTrialEventTracking() {
  const { user, profile } = useAuth();
  const trackedRef = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(
    async (eventName: string, metadata?: Record<string, any>) => {
      if (!user?.id) return;
      // Only track free trial users
      if (profile?.plan && profile.plan !== "free") return;

      try {
        await supabase.from("trial_product_events").insert({
          user_id: user.id,
          event_name: eventName,
          event_source: "frontend",
          metadata: metadata || {},
        });
      } catch (err) {
        // Silent fail - tracking should never break the app
        console.debug("Trial tracking error:", err);
      }
    },
    [user?.id, profile?.plan]
  );

  const trackOnce = useCallback(
    (eventName: string, metadata?: Record<string, any>) => {
      const key = `${eventName}_${user?.id}`;
      if (trackedRef.current.has(key)) return;
      trackedRef.current.add(key);
      trackEvent(eventName, metadata);
    },
    [trackEvent, user?.id]
  );

  // Auto-track login on mount (once per session)
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (profile.plan !== "free") return;

    // Track session start
    trackOnce("user_login");
  }, [user?.id, profile, trackOnce]);

  return { trackEvent, trackOnce };
}
