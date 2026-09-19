import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { DraftTemplate, MetaTemplateRow } from "@/lib/metaTemplates";
import { buildComponents } from "@/lib/metaTemplates";

interface InvokeResult {
  ok: boolean;
  message?: string;
  errors?: string[];
  data?: any;
}

export function useMetaWhatsAppTemplates() {
  const { user, accountOwnerId } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<MetaTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connection, setConnection] = useState<{ id: string; waba_id: string; label: string } | null>(null);

  const loadConnection = useCallback(async () => {
    if (!accountOwnerId) return;
    const { data } = await supabase
      .from("user_waba_connections")
      .select("id, waba_id, nickname, display_phone_number, business_name")
      .or(`owner_user_id.eq.${accountOwnerId},user_id.eq.${accountOwnerId}`)
      .eq("provider", "meta")
      .not("waba_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data?.waba_id) {
      setConnection({
        id: (data as any).id,
        waba_id: (data as any).waba_id,
        label: (data as any).nickname || (data as any).display_phone_number || (data as any).business_name || "Número conectado",
      });
    } else {
      setConnection(null);
    }
  }, [accountOwnerId]);

  const load = useCallback(async () => {
    if (!user || !accountOwnerId) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("meta_whatsapp_templates")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) setLoadError("Não foi possível carregar os templates salvos.");
    else setTemplates((data as unknown as MetaTemplateRow[]) || []);
    setLoading(false);
  }, [user?.id, accountOwnerId]);

  useEffect(() => {
    loadConnection();
    load();
  }, [loadConnection, load]);

  const invoke = useCallback(async (body: Record<string, unknown>): Promise<InvokeResult> => {
    const { data, error } = await supabase.functions.invoke("meta-templates", { body });
    let payload: any = data ?? {};
    // Supabase only exposes the response body of non-2xx replies through the error context.
    if (error && !payload?.error) {
      try {
        const parsed = await (error as any)?.context?.json?.();
        if (parsed && typeof parsed === "object") payload = parsed;
      } catch (_) { /* keeps the generic message below */ }
    }
    if (error && !payload?.error) {
      return { ok: false, message: "Não foi possível falar com a Meta agora. Tente novamente." };
    }
    if (payload?.error) {
      return {
        ok: false,
        message: payload.message || "A Meta recusou a operação.",
        errors: payload.errors,
      };
    }
    return { ok: true, data: payload };
  }, []);

  const sync = useCallback(async (silent = false) => {
    setSyncing(true);
    const res = await invoke({ action: "sync" });
    setSyncing(false);
    if (!res.ok) {
      if (!silent) toast({ title: "Falha ao sincronizar", description: res.message, variant: "destructive" });
      return false;
    }
    await load();
    if (!silent) {
      toast({
        title: "Sincronizado com a Meta",
        description: `${res.data?.synced ?? 0} template(s) atualizados${res.data?.removed ? ` · ${res.data.removed} removido(s)` : ""}.`,
      });
    }
    return true;
  }, [invoke, load, toast]);

  /** Sends the file to the Edge Function, which performs Meta's official upload. */
  const uploadMedia = useCallback(async (file: File): Promise<{ handle?: string; error?: string }> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("read_error"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!base64) return { error: "Não foi possível ler o arquivo selecionado." };

    const res = await invoke({
      action: "upload_media",
      file_name: file.name,
      mime_type: file.type,
      file_base64: base64,
    });
    if (!res.ok) return { error: res.message };
    return { handle: res.data?.handle };
  }, [invoke]);

  const create = useCallback(async (draft: DraftTemplate) => {
    const res = await invoke({
      action: "create",
      template: {
        name: draft.name,
        category: draft.category,
        language: draft.language,
        components: buildComponents(draft),
      },
    });
    if (!res.ok) {
      toast({
        title: "Não foi possível enviar",
        description: res.errors?.length ? res.errors.join(" ") : res.message,
        variant: "destructive",
      });
      return false;
    }
    toast({
      title: "Template enviado para a Meta",
      description: `Status retornado: ${res.data?.status ?? "PENDING"} · ID ${res.data?.id ?? "—"}`,
    });
    await load();
    return true;
  }, [invoke, load, toast]);

  const update = useCallback(async (id: string, draft: DraftTemplate) => {
    const res = await invoke({
      action: "update",
      id,
      template: { category: draft.category, components: buildComponents(draft) },
    });
    if (!res.ok) {
      toast({
        title: "Não foi possível salvar",
        description: res.errors?.length ? res.errors.join(" ") : res.message,
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "Alterações enviadas", description: "O template voltou para análise da Meta." });
    await load();
    return true;
  }, [invoke, load, toast]);

  const remove = useCallback(async (id: string) => {
    const res = await invoke({ action: "delete", id });
    if (!res.ok) {
      toast({ title: "Não foi possível excluir", description: res.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Template excluído", description: "A exclusão foi enviada à Meta." });
    await load();
    return true;
  }, [invoke, load, toast]);

  return { templates, loading, syncing, loadError, connection, load, sync, create, update, remove, uploadMedia };
}
