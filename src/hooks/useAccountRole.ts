import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AccountRole } from "@/lib/accountPermissions";

interface AccountInfo {
  role: AccountRole;
  ownerUserId: string;
  mustChangePassword: boolean;
}

const cacheKey = (userId: string) => `wiize:accountRole:${userId}`;

const readCache = (userId: string): AccountInfo | null => {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.role || !parsed?.ownerUserId) return null;
    return parsed as AccountInfo;
  } catch {
    return null;
  }
};

const writeCache = (userId: string, info: AccountInfo) => {
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(info));
  } catch {
    /* ignore */
  }
};

/**
 * Hook que retorna o cargo do usuário logado dentro da sua conta Wiize.
 * Lê de `profiles.account_role` / `profiles.parent_owner_id`.
 *
 * IMPORTANTE: usa cache em sessionStorage para evitar flicker no sidebar
 * quando o componente remonta entre páginas (sub-usuários viam itens do owner
 * por alguns segundos antes do role resolver).
 */
export function useAccountRole() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<AccountInfo | null>(() => {
    if (typeof window === "undefined") return null;
    // seed inicial pelo userId vindo do localStorage do supabase auth, se houver
    try {
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("wiize:accountRole:"));
      if (keys.length === 1) {
        const raw = sessionStorage.getItem(keys[0]);
        if (raw) return JSON.parse(raw) as AccountInfo;
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const load = useCallback(async () => {
    if (!user?.id) {
      setInfo(null);
      setLoading(false);
      return;
    }
    // Se já temos cache do mesmo user, não mostramos loading (evita flicker)
    const cached = readCache(user.id);
    if (cached) {
      setInfo(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, account_role, parent_owner_id, must_change_password")
      .eq("id", user.id)
      .maybeSingle();
    let next: AccountInfo;
    if (error || !data) {
      next = { role: "owner", ownerUserId: user.id, mustChangePassword: false };
    } else {
      next = {
        role: ((data as any).account_role || "owner") as AccountRole,
        ownerUserId: ((data as any).parent_owner_id as string) || user.id,
        mustChangePassword: !!(data as any).must_change_password,
      };
    }
    setInfo(next);
    writeCache(user.id, next);
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
