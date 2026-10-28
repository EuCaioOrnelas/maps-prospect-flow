import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LeadNoteAuthor, LeadNoteMessage } from "@/hooks/useLeadNotes";
import type { AccountMember } from "@/hooks/useAccountMembers";

const db = supabase as any;

/**
 * Conversa da equipe dentro de uma tarefa. Mesmo formato do chat interno do
 * contato no CRM, para reaproveitar a mesma tela. Novas mensagens avisam no
 * sininho o responsável da tarefa e quem já participou (feito pelo banco).
 */
export function useTaskComments(taskId: string | null | undefined, members: AccountMember[] = []) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LeadNoteMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const authors = useMemo(() => {
    const map: Record<string, LeadNoteAuthor> = {};
    members.forEach((m) => { map[m.user_id] = { name: m.name, email: m.email, avatar_url: m.avatar_url }; });
    return map;
  }, [members]);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data } = await db
      .from("project_task_comments")
      .select("id, task_id, user_id, content, reply_to_id, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .limit(500);
    setNotes(((data || []) as any[]).map((r) => ({ ...r, lead_id: r.task_id })));
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) { setNotes([]); return; }
    load();
    const channel = supabase
      .channel(`task-comments-${taskId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_task_comments", filter: `task_id=eq.${taskId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, load]);

  // Ao abrir a conversa, o aviso desta tarefa no sininho é marcado como lido.
  useEffect(() => {
    if (!taskId || !user) return;
    db.from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("kind", "task_comment")
      .is("read_at", null)
      .eq("metadata->>task_id", taskId)
      .then(() => undefined);
  }, [taskId, user, notes.length]);

  const send = useCallback(async (content: string, replyToId?: string | null) => {
    const text = content.trim();
    if (!taskId || !text || !user) return null;
    setSending(true);
    try {
      const { data, error } = await db
        .from("project_task_comments")
        .insert({ task_id: taskId, user_id: user.id, content: text, reply_to_id: replyToId || null })
        .select("id, task_id, user_id, content, reply_to_id, created_at")
        .single();
      if (error) throw new Error(error.message?.includes("row-level") ? "Você não tem acesso a esta tarefa." : "Não foi possível enviar a mensagem.");
      const note = { ...data, lead_id: data.task_id } as LeadNoteMessage;
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
      return note;
    } finally {
      setSending(false);
    }
  }, [taskId, user]);

  const remove = useCallback(async (noteId: string) => {
    const { error } = await db.from("project_task_comments").delete().eq("id", noteId);
    if (error) throw new Error("Não foi possível remover a mensagem.");
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  return { notes, authors, loading, sending, currentUserId: user?.id || null, send, remove, reload: load };
}
