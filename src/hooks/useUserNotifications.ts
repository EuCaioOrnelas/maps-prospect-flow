import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

  const load = useCallback(async () => {
    if (!user) return;
    try { await db.rpc('project_due_digest_me'); } catch { /* Existing notifications remain available during a transient failure. */ }
    const { data, error } = await db
      .from("user_notifications")
      .select("id, kind, title, body, link, metadata, read_at, created_at")
      .eq("user_id", user.id)
      .is("cleared_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) setItems((data || []) as UserNotification[]);
    const {count}=await db.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null).is('cleared_at',null);
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
      // O carregamento atualiza o resumo sem duplicar os avisos do dia.
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

  /**
   * Uma novidade lida ou apagada no sino também fica registrada como vista no
   * histórico das novidades. Sem isso, o popup automático voltava a aparecer.
   */
  const dismissUpdatePopup = useCallback(async (notification: UserNotification) => {
    if (notification.kind !== 'wiize_update') return;
    const announcementId = notification.metadata?.announcement_id;
    if (typeof announcementId !== 'string') return;
    const presentation = crypto.randomUUID();
    try {
      await db.rpc('updates_record_event', { _id: announcementId, _event: 'view', _presentation: presentation, _automatic: false });
      await db.rpc('updates_record_event', { _id: announcementId, _event: 'dismiss', _presentation: presentation });
    } catch { /* O aviso continua lido/apagado mesmo se o histórico falhar. */ }
  }, []);

  const syncUpdates = useCallback(async (notifications: UserNotification[]) => {
    for (const notification of notifications) {
      if (notification.kind === 'wiize_update') await dismissUpdatePopup(notification);
    }
  }, [dismissUpdatePopup]);

  const reportFailure = useCallback((error: unknown) => {
    if (!error) return;
    toast.error('Não foi possível salvar a alteração do aviso. Tente novamente.');
  }, []);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    const target = items.find((n) => n.id === id);
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read_at: n.read_at || now } : n)));
    setUnreadCount((count) => Math.max(0, count - (target && !target.read_at ? 1 : 0)));
    const { error } = await db.from("user_notifications").update({ read_at: now }).eq("id", id).is("read_at", null);
    reportFailure(error);
    if (target) await dismissUpdatePopup(target);
    load();
  }, [items, dismissUpdatePopup, reportFailure, load]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const pending = items.filter((n) => !n.read_at);
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);
    const { error } = await db.from("user_notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    reportFailure(error);
    await syncUpdates(pending);
    load();
  }, [user, items, syncUpdates, reportFailure, load]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const removed = items;
    setItems([]); setUnreadCount(0);
    const { error } = await db.from("user_notifications").update({ cleared_at: now, read_at: now }).eq("user_id", user.id).is("cleared_at", null);
    reportFailure(error);
    await syncUpdates(removed);
    load();
  }, [user, items, syncUpdates, reportFailure, load]);

  const clearOne = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    const target = items.find((n) => n.id === id);
    setItems((l) => l.filter((n) => n.id !== id));
    setUnreadCount((count) => Math.max(0, count - (target && !target.read_at ? 1 : 0)));
    const { error } = await db.from("user_notifications").update({ cleared_at: now, read_at: now }).eq("id", id);
    reportFailure(error);
    if (target) await dismissUpdatePopup(target);
    load();
  }, [items, dismissUpdatePopup, reportFailure, load]);

  return { items, unreadCount, markRead, markAllRead, clearAll, clearOne, reload: load,loadMore:()=>setLimit(v=>v+50),hasMore:items.length===limit };
}
