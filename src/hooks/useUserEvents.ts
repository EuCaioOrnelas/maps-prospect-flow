import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EventName = 
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'trial_feedback_submitted'
  | 'trial_converted'
  | 'trial_not_converted';

export function useUserEvents() {
  const { user } = useAuth();

  const trackEvent = async (eventName: EventName, eventData: Record<string, any> = {}) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_events')
        .insert({
          user_id: user.id,
          event_name: eventName,
          event_data: eventData
        });

      if (error) {
        console.error('Error tracking event:', error);
      }
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  };

  return { trackEvent };
}
