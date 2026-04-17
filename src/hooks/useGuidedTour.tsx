import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface GuidedTourContextValue {
  isActive: boolean;
  step: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
  finish: () => void;
}

const TOTAL_STEPS = 12;
const LS_KEY = "wiize_tour_completed_v2";

const GuidedTourContext = createContext<GuidedTourContextValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-start on first dashboard visit only
  useEffect(() => {
    if (!user) return;
    if (location.pathname !== "/dashboard") return;
    const completedLocal = localStorage.getItem(LS_KEY);
    if (completedLocal) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("tour_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.tour_completed_at) {
        setTimeout(() => {
          setStep(0);
          setIsActive(true);
        }, 700);
      } else {
        localStorage.setItem(LS_KEY, "1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  // Lock body scroll while tour is active
  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  const start = useCallback(() => {
    setStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback((s: number) => {
    setStep(Math.max(0, Math.min(s, TOTAL_STEPS - 1)));
  }, []);

  const persistCompletion = useCallback(async () => {
    localStorage.setItem(LS_KEY, "1");
    if (!user) return;
    try {
      await supabase
        .from("user_onboarding")
        .update({ tour_completed_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } catch (e) {
      console.error("[tour] persist error", e);
    }
  }, [user]);

  const finish = useCallback(() => {
    setIsActive(false);
    persistCompletion();
  }, [persistCompletion]);

  return (
    <GuidedTourContext.Provider
      value={{ isActive, step, totalSteps: TOTAL_STEPS, start, next, prev, goTo, finish }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
  return ctx;
}

export async function resetGuidedTour(userId: string) {
  localStorage.removeItem(LS_KEY);
  await supabase
    .from("user_onboarding")
    .update({ tour_completed_at: null })
    .eq("user_id", userId);
}
