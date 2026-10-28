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
  return useTeamComments("task", taskId, members);
}

/** Chat interno do projeto inteiro (mesma tela do chat do CRM). */
export function useProjectComments(projectId: string | null | undefined, members: AccountMember[] = []) {
  return useTeamComments("project", projectId, members);
}

function useTeamComments(scope: "task" | "project", taskId: string | null | undefined, members: AccountMember[]) {
  const table = scope === "task" ? "project_task_comments" : "project_comments";
  const fk = scope === "task" ? "task_id" : "project_id";
  const kind = scope === "task" ? "task_comment" : "project_comment";
  const metaKey = scope === "task" ? "metadata->>task_id" : "metadata->>project_id";
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
      .from(table)
      .select(`id, ${fk}, user_id, content, reply_to_id, created_at`)
      .eq(fk, taskId)
      .order("created_at", { ascending: true })
      .limit(500);
    setNotes(((data || []) as any[]).map((r) => ({ ...r, lead_id: r[fk] })));
    setLoading(false);
  }, [taskId, table, fk]);

  useEffect(() => {
    if (!taskId) { setNotes([]); return; }
    load();
    const channel = supabase
      .channel(`${scope}-comments-${taskId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `${fk}=eq.${taskId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, load, table, fk, scope]);

  // Ao abrir a conversa, o aviso desta tarefa no sininho é marcado como lido.
  useEffect(() => {
    if (!taskId || !user) return;
    db.from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("kind", kind)
      .is("read_at", null)
      .eq(metaKey, taskId)
      .then(() => undefined);
  }, [taskId, user, notes.length, kind, metaKey]);

  const send = useCallback(async (content: string, replyToId?: string | null) => {
    const text = content.trim();
    if (!taskId || !text || !user) return null;
    setSending(true);
    try {
      const { data, error } = await db
        .from(table)
        .insert({ [fk]: taskId, user_id: user.id, content: text, reply_to_id: replyToId || null })
        .select(`id, ${fk}, user_id, content, reply_to_id, created_at`)
        .single();
      if (error) throw new Error(error.message?.includes("row-level") ? "Você não tem acesso a esta conversa." : "Não foi possível enviar a mensagem.");
      const note = { ...data, lead_id: data[fk] } as LeadNoteMessage;
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
      return note;
    } finally {
      setSending(false);
    }
  }, [taskId, user, table, fk]);

  const remove = useCallback(async (noteId: string) => {
    const { error } = await db.from(table).delete().eq("id", noteId);
    if (error) throw new Error("Não foi possível remover a mensagem.");
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, [table]);

  return { notes, authors, loading, sending, currentUserId: user?.id || null, send, remove, reload: load };
}
