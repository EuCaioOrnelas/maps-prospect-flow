import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InstagramAccount {
  id: string;
  ig_user_id: string;
  ig_username: string | null;
  ig_name: string | null;
  profile_picture_url: string | null;
  page_id: string | null;
  page_name: string | null;
  status: string;
  last_error: string | null;
  created_at: string;
}

export const IG_MAX_ACCOUNTS = 2;

async function callConnect(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("instagram-connect", { body: payload });
  if (error) {
    const details = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    throw new Error(details || "Erro na conexão do Instagram");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useInstagramAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instagram-accounts", user?.id],
    queryFn: async (): Promise<InstagramAccount[]> => {
      const data = await callConnect({ action: "list" });
      return (data?.accounts || []) as InstagramAccount[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const connect = useMutation({
    mutationFn: async ({ code, redirect_uri }: { code: string; redirect_uri: string }) =>
      await callConnect({ action: "connect", code, redirect_uri }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
      const connected: string[] = data?.connected || [];
      const updated: string[] = data?.updated || [];
      const skipped: string[] = data?.skipped || [];
      if (connected.length) toast.success(`Conta conectada: @${connected.join(", @")}`);
      else if (updated.length) toast.success(`Conexão atualizada: @${updated.join(", @")}`);
      if (skipped.length) {
        toast.warning(
          `Limite de ${IG_MAX_ACCOUNTS} contas atingido. Não conectadas: @${skipped.join(", @")}`,
        );
      }
    },
    onError: (e: any) => toast.error(e.message || "Erro ao conectar Instagram"),
  });

  const disconnect = useMutation({
    mutationFn: async (connectionId: string) =>
      await callConnect({ action: "disconnect", connection_id: connectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
      toast.success("Conta do Instagram desconectada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao desconectar"),
  });

  const refresh = useMutation({
    mutationFn: async () => await callConnect({ action: "refresh" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
      toast.success("Conexões revalidadas");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao revalidar"),
  });

  const accounts = query.data || [];

  return {
    accounts,
    isLoading: query.isLoading,
    canAddMore: accounts.length < IG_MAX_ACCOUNTS,
    max: IG_MAX_ACCOUNTS,
    connect,
    disconnect,
    refresh,
  };
}
