import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface QuickReply {
  id: string;
  account_owner_id: string;
  created_by_user_id: string;
  shortcut: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  media_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyInput {
  shortcut: string;
  title?: string | null;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  media_filename?: string | null;
}

export function useQuickReplies() {
  const { user, accountOwnerId } = useAuth();
  const [items, setItems] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerId = accountOwnerId || user?.id || null;

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_quick_replies" as any)
      .select("*")
      .eq("account_owner_id", ownerId)
      .order("shortcut", { ascending: true });
    if (error) {
      console.error("[quick_replies] load error", error);
      toast.error("Erro ao carregar mensagens rápidas");
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => { void load(); }, [load]);

  const upsert = useCallback(async (input: QuickReplyInput, id?: string) => {
    if (!ownerId || !user) return null;
    const shortcut = input.shortcut.trim().toLowerCase().replace(/^\/+/, "");
    if (!shortcut) {
      toast.error("Atalho obrigatório");
      return null;
    }
    if (id) {
      const { error } = await supabase
        .from("chat_quick_replies" as any)
        .update({
          shortcut,
          title: input.title ?? null,
          content: input.content,
          media_url: input.media_url ?? null,
          media_type: input.media_type ?? null,
          media_filename: input.media_filename ?? null,
        })
        .eq("id", id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return null; }
      toast.success("Mensagem rápida atualizada");
    } else {
      const { error } = await supabase
        .from("chat_quick_replies" as any)
        .insert({
          account_owner_id: ownerId,
          created_by_user_id: user.id,
          shortcut,
          title: input.title ?? null,
          content: input.content,
          media_url: input.media_url ?? null,
          media_type: input.media_type ?? null,
          media_filename: input.media_filename ?? null,
        });
      if (error) { toast.error("Erro ao criar: " + error.message); return null; }
      toast.success("Mensagem rápida criada");
    }
    await load();
    return true;
  }, [ownerId, user, load]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("chat_quick_replies" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Removida");
    await load();
  }, [load]);

  return { items, loading, reload: load, upsert, remove };
}

/** Variables available to interpolate in quick reply content. */
export const QUICK_REPLY_VARIABLES = [
  { key: "nome", label: "Nome do contato", description: "Nome salvo no contato ou CRM" },
  { key: "empresa", label: "Empresa", description: "Razão social ou nome fantasia (CRM)" },
  { key: "cidade", label: "Cidade", description: "Cidade do lead no CRM" },
  { key: "endereco", label: "Endereço", description: "Endereço completo do lead no CRM" },
  { key: "email", label: "E-mail", description: "E-mail cadastrado no CRM" },
  { key: "telefone", label: "Telefone", description: "Telefone formatado da conversa" },
] as const;

export type QuickReplyVarKey = typeof QUICK_REPLY_VARIABLES[number]["key"];

/** Substitui {{var}} pelos valores do contexto. Mantém placeholder caso vazio. */
export function applyQuickReplyVariables(
  content: string,
  ctx: Partial<Record<QuickReplyVarKey, string | null | undefined>>
): string {
  return content.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, raw) => {
    const key = String(raw).toLowerCase() as QuickReplyVarKey;
    const value = ctx[key];
    return value && String(value).trim() ? String(value) : `{{${key}}}`;
  });
}
