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

const withAvatarCacheBust = (url?: string | null, updatedAt?: string | null) => {
  if (!url) return null;
  if (url.includes("?v=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(updatedAt || "avatar")}`;
};

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
      .select("id, name, email, avatar_url, created_at, updated_at")
      .eq("id", owner)
      .maybeSingle();

    // 3) buscar membros
    const { data: rawMembers } = await supabase
      .from("account_members")
      .select("*")
      .eq("owner_user_id", owner)
      .order("created_at", { ascending: true });

    // 3.1) buscar perfis reais dos membros (foto/nome/e-mail atualizados do Perfil)
    const memberIds = (rawMembers || []).map((m: any) => m.user_id).filter(Boolean);
    let profileById: Record<string, { name: string | null; email: string | null; avatar_url: string | null; updated_at: string | null }> = {};
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, updated_at")
        .in("id", memberIds);
      profileById = Object.fromEntries(
        (memberProfiles || []).map((p: any) => [
          p.id,
          { name: p.name || null, email: p.email || null, avatar_url: p.avatar_url || null, updated_at: p.updated_at || null },
        ])
      );
    }

    const list: AccountMember[] = [];

    if (ownerProfile) {
      list.push({
        id: `owner-${owner}`,
        owner_user_id: owner,
        user_id: owner,
        name: (ownerProfile as any).name,
        email: (ownerProfile as any).email,
        avatar_url: withAvatarCacheBust((ownerProfile as any).avatar_url, (ownerProfile as any).updated_at),
        role: "owner",
        status: "active",
        must_change_password: false,
        created_at: (ownerProfile as any).created_at,
        last_login_at: null,
      });
    }

    for (const m of (rawMembers || []) as any[]) {
      const memberProfile = profileById[m.user_id];
      list.push({
        id: m.id,
        owner_user_id: m.owner_user_id,
        user_id: m.user_id,
        name: memberProfile?.name || m.name,
        email: memberProfile?.email || m.email,
        avatar_url: withAvatarCacheBust(memberProfile?.avatar_url, memberProfile?.updated_at),
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
