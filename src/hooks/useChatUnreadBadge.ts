import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ResponsibleFilter = "all" | "me" | string;

/**
 * Returns total unread chat messages respecting the user's saved
 * "responsible" filter from the Chat page (localStorage key
 * `wiize:chat:respFilter:{user.id}`).
 * - "all"  -> all conversations of the account
 * - "me"   -> conversations assigned to current user OR unassigned
 * - <uuid> -> conversations assigned to that specific user
 */
export function useChatUnreadBadge() {
  const { user, accountOwnerId } = useAuth();
  const [count, setCount] = useState(0);

  const getFilter = useCallback((): ResponsibleFilter => {
    if (!user) return "me";
    try {
      const saved = window.localStorage.getItem(`wiize:chat:respFilter:${user.id}`);
      return (saved as ResponsibleFilter) || "me";
    } catch {
      return "me";
    }
  }, [user]);

  const fetchCount = useCallback(async () => {
    if (!user || !accountOwnerId) {
      setCount(0);
      return;
    }
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("unread_count, responsible_user_id, is_archived")
      .eq("owner_user_id", accountOwnerId);
    if (error || !data) return;

    const filter = getFilter();
    const total = data.reduce((acc: number, c: any) => {
      if (c.is_archived) return acc;
      const u = Number(c.unread_count) || 0;
      if (u <= 0) return acc;
      if (filter === "all") return acc + u;
      if (filter === "me") {
        if (c.responsible_user_id === user.id || !c.responsible_user_id) return acc + u;
        return acc;
      }
      return c.responsible_user_id === filter ? acc + u : acc;
    }, 0);
    setCount(total);
  }, [user, accountOwnerId, getFilter]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Refresh when storage changes (filter saved on another tab/page)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!user) return;
      if (e.key === `wiize:chat:respFilter:${user.id}`) fetchCount();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [user, fetchCount]);

  // Realtime: refresh on any conversation change for this account
  useEffect(() => {
    if (!accountOwnerId) return;
    const channel = supabase
      .channel(`chat-unread-badge-${accountOwnerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations", filter: `owner_user_id=eq.${accountOwnerId}` },
        () => fetchCount()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountOwnerId, fetchCount]);

  // Poll as fallback every 30s
  useEffect(() => {
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  return count;
}
