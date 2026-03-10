import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePagePopupDismiss(popupKey: string) {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("user_dismissed_popups")
        .select("id")
        .eq("user_id", user.id)
        .eq("popup_key", popupKey)
        .maybeSingle();

      if (!data) {
        setShowPopup(true);
      }
      setLoading(false);
    };

    check();
  }, [user, popupKey]);

  // Countdown timer
  useEffect(() => {
    if (!showPopup) return;

    if (countdown <= 0) {
      setCanClose(true);
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showPopup, countdown]);

  const dismiss = useCallback(async () => {
    if (!user || !canClose) return;

    setShowPopup(false);
    await supabase.from("user_dismissed_popups").insert({
      user_id: user.id,
      popup_key: popupKey,
    });
  }, [user, popupKey, canClose]);

  return { showPopup, loading, dismiss, canClose, countdown };
}
