import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_APPOINTMENT_SETTINGS,
  type AppointmentEmailSettings,
} from "@/lib/appointmentEmailTemplate";

export type AppointmentSettingsState = Required<
  Pick<
    AppointmentEmailSettings,
    | "enabled"
    | "logo_url"
    | "header_color"
    | "button_color"
    | "sender_name"
    | "sender_local_part"
    | "email_title"
    | "email_body"
    | "cta_label"
    | "notify_client"
  >
>;

const BASE: AppointmentSettingsState = { ...DEFAULT_APPOINTMENT_SETTINGS };

export const useAppointmentEmailSettings = () => {
  const { user, accountOwnerId } = useAuth();
  const [settings, setSettings] = useState<AppointmentSettingsState>(BASE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!accountOwnerId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("crm_appointment_email_settings" as any)
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();
    if (error) console.error("[useAppointmentEmailSettings]", error);
    if (data) {
      const row = data as any;
      setSettings({
        ...BASE,
        ...row,
        // nunca deixar o corpo vazio: cai no template padrão da Wiize
        email_body: row.email_body?.trim() ? row.email_body : BASE.email_body,
      });
    }
    setIsLoading(false);
  }, [accountOwnerId]);

  useEffect(() => {
    if (accountOwnerId) fetchSettings();
  }, [accountOwnerId, fetchSettings]);

  const save = useCallback(
    async (patch: Partial<AppointmentSettingsState>) => {
      if (!accountOwnerId) throw new Error("not_authenticated");
      setIsSaving(true);
      try {
        const next = { ...settings, ...patch };
        const { error } = await supabase.from("crm_appointment_email_settings" as any).upsert(
          {
            owner_user_id: accountOwnerId,
            enabled: next.enabled,
            logo_url: next.logo_url,
            header_color: next.header_color,
            button_color: next.button_color,
            sender_name: next.sender_name,
            sender_local_part: next.sender_local_part,
            email_title: next.email_title,
            email_body: next.email_body,
            cta_label: next.cta_label,
            notify_client: next.notify_client,
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
      const path = `${user.id}/agenda-logo-${Date.now()}.${ext}`;
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
