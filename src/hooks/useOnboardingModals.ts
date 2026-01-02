import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboardingModals() {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrialFeedback, setShowTrialFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    checkModals();
  }, [user, profile]);

  const checkModals = async () => {
    if (!user || !profile) return;
    
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

      // Calculate trial status
      const trialStartAt = (profile as any).trial_start_at || profile.created_at;
      const trialStart = new Date(trialStartAt);
      const now = new Date();
      const daysSinceTrialStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      const trialExpired = daysSinceTrialStart >= 30;
      const trialExpiringTomorrow = daysSinceTrialStart >= 29;
      const isFreePlan = profile.plan === 'free';

      // Show onboarding modal on first login (no onboarding record exists)
      if (!onboarding) {
        setShowOnboarding(true);
        setShowTrialFeedback(false);
      } 
      // Show trial feedback if trial expired/expiring and no feedback submitted
      else if (isFreePlan && (trialExpired || trialExpiringTomorrow) && !feedback) {
        setShowOnboarding(false);
        setShowTrialFeedback(true);
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
    loading
  };
}
