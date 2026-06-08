import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AccountRole } from "@/lib/accountPermissions";
import { buildSeatInfo } from "@/lib/accountPermissions";

export interface AccountMember {
  id: string;
  owner_user_id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: AccountRole;
  status: "active" | "inactive";
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

/**
 * Lista todos os membros da conta (owner + sub usuários).
 * O Owner é montado a partir do profile do dono e prependado à lista.
 */
export function useAccountMembers() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // 1) descobrir o owner da conta
    const { data: rpcData } = await supabase.rpc("get_account_owner", { _uid: user.id });
    const owner = (rpcData as string) || user.id;
    setOwnerUserId(owner);

    // 2) buscar perfil do owner
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .eq("id", owner)
      .maybeSingle();

    // 3) buscar membros
    const { data: rawMembers } = await supabase
      .from("account_members")
      .select("*")
      .eq("owner_user_id", owner)
      .order("created_at", { ascending: true });

    const list: AccountMember[] = [];

    if (ownerProfile) {
      list.push({
        id: `owner-${owner}`,
        owner_user_id: owner,
        user_id: owner,
        name: (ownerProfile as any).name,
        email: (ownerProfile as any).email,
        role: "owner",
        status: "active",
        must_change_password: false,
        created_at: (ownerProfile as any).created_at,
        last_login_at: null,
      });
    }

    for (const m of (rawMembers || []) as any[]) {
      list.push({
        id: m.id,
        owner_user_id: m.owner_user_id,
        user_id: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        must_change_password: !!m.must_change_password,
        created_at: m.created_at,
        last_login_at: m.last_login_at,
      });
    }

    setMembers(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const seat = buildSeatInfo(profile?.plan, members.length);

  return { loading, members, ownerUserId, seat, refresh: load };
}
