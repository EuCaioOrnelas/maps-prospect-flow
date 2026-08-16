import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getChatPhoneKey } from "@/hooks/useChatCRMFilters";

interface Conv {
  contact_phone?: string | null;
}

/**
 * Returns the AI-generated commercial approach (revenue_leads.ai_approach_message)
 * for the open conversation's contact. Returns null when there is no message.
 */
export function useContactAIApproach(conversation: Conv | null | undefined) {
  const { accountOwnerId, user } = useAuth();
  const ownerId = accountOwnerId || user?.id || null;
  const [message, setMessage] = useState<string | null>(null);
  const [leadName, setLeadName] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setMessage(null);
    setLeadName(null);
    const phone = conversation?.contact_phone;
    if (!phone || !ownerId) return;
    const phoneKey = getChatPhoneKey(phone);
    if (!phoneKey) return;

    (async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("ai_approach_message, contact_name, company_name, phone")
        .eq("owner_user_id", ownerId)
        .not("ai_approach_message", "is", null)
        .ilike("phone", `%${phoneKey}`)
        .limit(1)
        .maybeSingle();
      if (cancel || error || !data) return;
      const msg = (data as any).ai_approach_message?.trim();
      if (!msg) return;
      setMessage(msg);
      setLeadName((data as any).contact_name || (data as any).company_name || null);
    })();

    return () => { cancel = true; };
  }, [conversation?.contact_phone, ownerId]);

  return { message, leadName };
}
