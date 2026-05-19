import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getContactLimit } from "@/lib/planAccess";

/**
 * Lê o número de contatos no CRM do usuário e compara contra o limite do plano
 * + add-ons (extra_contacts_packs * 1000).
 */
export function useContactLimit() {
  const { user, profile } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const baseLimit = getContactLimit(profile as any);
  const extraPacks = (profile as any)?.extra_contacts_packs || 0;
  const extraContacts = extraPacks * 1000;
  // Se o limite base for Infinity, adicionar add-on não faz sentido (já ilimitado).
  const limit = Number.isFinite(baseLimit) ? baseLimit + extraContacts : baseLimit;

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { count: c } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setCount(c || 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAtLimit = Number.isFinite(limit) && count >= limit;
  const isNearLimit = Number.isFinite(limit) && count >= limit * 0.9;
  const hasLimit = Number.isFinite(limit);

  return {
    count,
    limit,
    baseLimit,
    extraContacts,
    extraPacks,
    hasLimit,
    isAtLimit,
    isNearLimit,
    loading,
    refresh,
  };
}
