import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to track user score events from the frontend.
 * Sends events to the score-processor edge function.
 */
export function useUserScoreTracking() {
  const { user } = useAuth();

  const trackScoreEvent = useCallback(
    async (eventName: string, metadata?: Record<string, any>) => {
      if (!user?.id) return;

      try {
        await supabase.functions.invoke("score-processor", {
          body: {
            action: "track_event",
            user_id: user.id,
            event_name: eventName,
            metadata: metadata || {},
            source: "frontend",
          },
        });
      } catch (err) {
        console.debug("Score tracking error:", err);
      }
    },
    [user?.id]
  );

  return { trackScoreEvent };
}
