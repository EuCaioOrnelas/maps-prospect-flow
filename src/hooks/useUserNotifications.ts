import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

const db = supabase as any;

/**
 * Avisos individuais do sininho (vencimentos de tarefas/projetos e novas
 * mensagens nas tarefas). Cada pessoa só vê os próprios avisos (regra do banco).
 */
export function useUserNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount,setUnreadCount]=useState(0);
  const [limit,setLimit]=useState(50);
  const digestDoneRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db
      .from("user_notifications")
      .select("id, kind, title, body, link, metadata, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) setItems((data || []) as UserNotification[]);
    const {count}=await db.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null);
    setUnreadCount(count ?? 0);
  }, [user,limit]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try { await db.rpc('updates_sync_me'); } catch { /* Retry on the next open. */ }
      // Gera o resumo de vencimentos do dia uma vez por sessão/dia (o banco evita duplicar).
      const today = new Date().toISOString().slice(0, 10);
      if (digestDoneRef.current !== `${user.id}:${today}`) {
        digestDoneRef.current = `${user.id}:${today}`;
        try { await db.rpc("project_due_digest_me"); } catch { /* módulo ainda não ativado */ }
      }
      if (!cancelled) load();
    })();

    const channel = supabase
      .channel(`user-notifications-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read_at: n.read_at || now } : n)));
    await db.from("user_notifications").update({ read_at: now }).eq("id", id).is("read_at", null);
    load();
  }, [load]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at || now })));
    await db.from("user_notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    load();
  }, [user,load]);

  return { items, unreadCount, markRead, markAllRead, reload: load,loadMore:()=>setLimit(v=>v+50),hasMore:items.length===limit };
}
