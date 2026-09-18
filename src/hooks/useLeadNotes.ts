import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeadNoteMessage {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
}

export interface LeadNoteAuthor {
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Notas internas do contato funcionando como um chat da equipe.
 * O conteúdo é criptografado no backend; o frontend só fala com a função `lead-notes`.
 */
export function useLeadNotes(leadId?: string | null, enabled = true) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LeadNoteMessage[]>([]);
  const [authors, setAuthors] = useState<Record<string, LeadNoteAuthor>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!leadId || !enabled || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lead-notes", {
        body: { action: "list", lead_id: leadId },
      });
      if (error) throw error;
      setNotes((data?.notes || []) as LeadNoteMessage[]);
      setAuthors((data?.authors || {}) as Record<string, LeadNoteAuthor>);
    } catch {
      setNotes([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [leadId, enabled]);

  useEffect(() => {
    if (!leadId || !enabled) {
      setNotes([]);
      return;
    }
    load();
  }, [leadId, enabled, load]);

  // Realtime apenas como sinal: o texto continua sendo lido pela função autorizada.
  useEffect(() => {
    if (!leadId || !enabled) return;
    const channel = supabase
      .channel(`lead-notes-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_notes", filter: `lead_id=eq.${leadId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, enabled, load]);

  const send = useCallback(
    async (content: string, replyToId?: string | null) => {
      const text = content.trim();
      if (!leadId || !text) return null;
      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke("lead-notes", {
          body: { action: "create", lead_id: leadId, content: text, reply_to_id: replyToId || null },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const note = data?.note as LeadNoteMessage | undefined;
        if (note) setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
        return note || null;
      } finally {
        setSending(false);
      }
    },
    [leadId],
  );

  const remove = useCallback(
    async (noteId: string) => {
      if (!leadId) return;
      const { data, error } = await supabase.functions.invoke("lead-notes", {
        body: { action: "delete", lead_id: leadId, note_id: noteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [leadId],
  );

  return { notes, authors, loading, sending, currentUserId: user?.id || null, send, remove, reload: load };
}
