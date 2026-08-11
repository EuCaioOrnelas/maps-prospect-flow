import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_RENEWAL_SETTINGS,
  type RenewalSettings,
} from "@/lib/renewalEmailTemplate";

export const useRenewalSettings = () => {
  const { user, accountOwnerId } = useAuth();
  const [settings, setSettings] = useState<RenewalSettings>(DEFAULT_RENEWAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!accountOwnerId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("crm_renewal_settings")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();
    if (error) console.error("[useRenewalSettings]", error);
    if (data) setSettings({ ...DEFAULT_RENEWAL_SETTINGS, ...(data as unknown as RenewalSettings) });
    setIsLoading(false);
  }, [accountOwnerId]);

  useEffect(() => {
    if (accountOwnerId) fetchSettings();
  }, [accountOwnerId, fetchSettings]);

  const save = useCallback(
    async (patch: Partial<RenewalSettings>) => {
      if (!accountOwnerId) throw new Error("not_authenticated");
      setIsSaving(true);
      try {
        const next = { ...settings, ...patch };
        const { error } = await supabase.from("crm_renewal_settings").upsert(
          {
            owner_user_id: accountOwnerId,
            enabled: next.enabled,
            logo_url: next.logo_url,
            header_color: next.header_color,
            button_color: next.button_color,
            sender_name: next.sender_name,
            sender_local_part: next.sender_local_part,
            email_title: next.email_title,
            email_intro: next.email_intro,
            cta_label: next.cta_label,
            notice_days_4_6_months: next.notice_days_4_6_months,
            contact_name: next.contact_name,
            contact_email: next.contact_email,
            contact_phone: next.contact_phone,
          },
          { onConflict: "owner_user_id" }
        );
        if (error) throw error;
        setSettings(next);
        return next;
      } finally {
        setIsSaving(false);
      }
    },
    [accountOwnerId, settings]
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!user) throw new Error("not_authenticated");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/renewal-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    },
    [user]
  );

  return { settings, setSettings, isLoading, isSaving, save, uploadLogo, refetch: fetchSettings };
};
