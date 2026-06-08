import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";

export function useOnboardingModals() {
  const { user, profile, isTrialExpired, trialDaysRemaining } = useAuth();
  const { trackScoreEvent } = useUserScoreTracking();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrialFeedback, setShowTrialFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    checkModals();
  }, [user, profile, isTrialExpired, trialDaysRemaining]);

  const checkModals = async () => {
    if (!user || !profile) return;

    // Sub usuários (criados pelo owner) compartilham a conta do dono.
    // Não devem ver onboarding nem feedback de trial.
    if ((profile as any).parent_owner_id) {
      setShowOnboarding(false);
      setShowTrialFeedback(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check if user has completed onboarding
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if user has submitted trial feedback
      const { data: feedback } = await supabase
        .from('trial_feedback')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Use trial status from AuthContext (already calculated on each login)
      const trialExpiringTomorrow = trialDaysRemaining <= 1 && trialDaysRemaining > 0;
      const isFreePlan = profile.plan === 'free';

      // Show onboarding modal on first login (no onboarding record exists)
      if (!onboarding) {
        setShowOnboarding(true);
        setShowTrialFeedback(false);
        trackScoreEvent("onboarding_modal_shown");
      } 
      // Show trial feedback if trial expired/expiring and no feedback submitted
      else if (isFreePlan && (isTrialExpired || trialExpiringTomorrow) && !feedback) {
        setShowOnboarding(false);
        setShowTrialFeedback(true);
        trackScoreEvent("trial_feedback_modal_shown", { trial_expired: isTrialExpired, days_remaining: trialDaysRemaining });
      } else {
        setShowOnboarding(false);
        setShowTrialFeedback(false);
      }
    } catch (error) {
      console.error('Error checking modals:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
    // After onboarding, check if trial feedback should show
    checkModals();
  };

  const closeTrialFeedback = () => {
    setShowTrialFeedback(false);
  };

  return {
    showOnboarding,
    showTrialFeedback,
    closeOnboarding,
    closeTrialFeedback,
    loading,
    isTrialExpired,
    trialDaysRemaining
  };
}
