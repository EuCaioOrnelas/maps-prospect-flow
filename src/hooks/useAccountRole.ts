import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AccountRole } from "@/lib/accountPermissions";

interface AccountInfo {
  role: AccountRole;
  ownerUserId: string;
  mustChangePassword: boolean;
}

/**
 * Hook que retorna o cargo do usuário logado dentro da sua conta Wiize.
 * Lê de `profiles.account_role` / `profiles.parent_owner_id`.
 */
export function useAccountRole() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<AccountInfo | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setInfo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, account_role, parent_owner_id, must_change_password")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) {
      setInfo({ role: "owner", ownerUserId: user.id, mustChangePassword: false });
    } else {
      setInfo({
        role: ((data as any).account_role || "owner") as AccountRole,
        ownerUserId: ((data as any).parent_owner_id as string) || user.id,
        mustChangePassword: !!(data as any).must_change_password,
      });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load, profile?.id]);

  return {
    loading,
    role: info?.role ?? null,
    ownerUserId: info?.ownerUserId ?? null,
    mustChangePassword: info?.mustChangePassword ?? false,
    refresh: load,
  };
}
