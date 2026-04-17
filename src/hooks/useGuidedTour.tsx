import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GuidedTourContextValue {
  isActive: boolean;
  step: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
  finish: () => void;
  skip: () => void;
}

const TOTAL_STEPS = 6;
const LS_KEY = "wiize_tour_completed_v1";

const GuidedTourContext = createContext<GuidedTourContextValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-start on first dashboard visit
  useEffect(() => {
    if (!user) return;
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
        // Slight delay to let the dashboard render
        setTimeout(() => {
          setStep(0);
          setIsActive(true);
        }, 600);
      } else {
        localStorage.setItem(LS_KEY, "1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        .upsert(
          { user_id: user.id, tour_completed_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    } catch (e) {
      console.error("[tour] persist error", e);
    }
  }, [user]);

  const finish = useCallback(() => {
    setIsActive(false);
    persistCompletion();
  }, [persistCompletion]);

  const skip = useCallback(() => {
    setIsActive(false);
    persistCompletion();
  }, [persistCompletion]);

  return (
    <GuidedTourContext.Provider
      value={{ isActive, step, totalSteps: TOTAL_STEPS, start, next, prev, goTo, finish, skip }}
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
    .upsert({ user_id: userId, tour_completed_at: null }, { onConflict: "user_id" });
}
