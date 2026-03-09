import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivationProgress {
  id: string;
  user_id: string;
  step_prospect_clients_completed: boolean;
  step_first_campaign_completed: boolean;
  step_scheduled_campaign_completed: boolean;
  step_explore_ai_crm_completed: boolean;
  progress_percentage: number;
  activation_completed: boolean;
  first_activation_at: string | null;
  dismissed: boolean;
}

export function useActivationProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ActivationProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("user_activation_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching activation progress:", error);
    }

    if (!data) {
      // Create initial progress record
      const { data: newData } = await supabase
        .from("user_activation_progress")
        .insert({ user_id: user.id })
        .select()
        .single();
      setProgress(newData as any);
    } else {
      setProgress(data as any);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Listen for realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("activation-progress")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_activation_progress",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProgress(payload.new as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateStep = useCallback(
    async (stepField: string, completed: boolean) => {
      if (!user || !progress) return;

      const updates: any = { [stepField]: completed, updated_at: new Date().toISOString() };

      // Calculate progress
      const currentSteps = {
        step_prospect_clients_completed: progress.step_prospect_clients_completed,
        step_first_campaign_completed: progress.step_first_campaign_completed,
        step_scheduled_campaign_completed: progress.step_scheduled_campaign_completed,
        step_explore_ai_crm_completed: progress.step_explore_ai_crm_completed,
        ...{ [stepField]: completed },
      };

      const completedCount = Object.values(currentSteps).filter(Boolean).length;
      updates.progress_percentage = Math.round((completedCount / 4) * 100);

      if (completedCount >= 2 && !progress.activation_completed) {
        updates.activation_completed = true;
        updates.first_activation_at = new Date().toISOString();

        // Track activation event
        await supabase.from("trial_product_events").insert({
          user_id: user.id,
          event_name: "activation_completed",
          event_source: "activation_checklist",
          metadata: { completed_steps: completedCount },
        });
      }

      await supabase
        .from("user_activation_progress")
        .update(updates)
        .eq("user_id", user.id);

      // Track step completion
      await supabase.from("trial_product_events").insert({
        user_id: user.id,
        event_name: "activation_step_completed",
        event_source: "activation_checklist",
        metadata: { step: stepField },
      });
    },
    [user, progress]
  );

  const dismiss = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("user_activation_progress")
      .update({ dismissed: true })
      .eq("user_id", user.id);
  }, [user]);

  return { progress, loading, updateStep, dismiss, refetch: fetchProgress };
}

export function useTrackProductEvent() {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async (
      eventName: string,
      eventSource: string = "product",
      metadata: Record<string, any> = {}
    ) => {
      if (!user) return;

      try {
        await supabase.from("trial_product_events").insert({
          user_id: user.id,
          event_name: eventName,
          event_source: eventSource,
          metadata,
        });
      } catch (err) {
        console.error("Error tracking product event:", err);
      }
    },
    [user]
  );

  return { trackEvent };
}
