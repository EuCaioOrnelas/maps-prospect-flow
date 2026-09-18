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
      .eq("owner_user_id", accountOwnerId)
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
    const payload: any = data ?? {};
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
    toast({ title: "Enviado para análise", description: "A Meta vai revisar o template. O status é atualizado ao sincronizar." });
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

  return { templates, loading, syncing, loadError, connection, load, sync, create, update, remove };
}
