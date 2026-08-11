import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WabaResponsible {
  id: string;
  connection_id: string;
  user_id: string;
  owner_user_id: string;
}

export interface WabaNumberLite {
  id: string;
  nickname: string | null;
  display_phone_number: string | null;
  phone_number_id: string;
}

/**
 * Responsáveis por número da API oficial (Meta Cloud).
 * Regras: 1 usuário pode ser responsável por apenas 1 número,
 * mas 1 número pode ter vários responsáveis.
 */
export function useWabaResponsibles() {
  const { user, accountOwnerId } = useAuth();
  const [responsibles, setResponsibles] = useState<WabaResponsible[]>([]);
  const [numbers, setNumbers] = useState<WabaNumberLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountOwnerId) return;
    setIsLoading(true);
    try {
      const [{ data: rels }, { data: conns }] = await Promise.all([
        supabase
          .from("waba_number_responsibles" as any)
          .select("id, connection_id, user_id, owner_user_id")
          .eq("owner_user_id", accountOwnerId),
        supabase
          .from("user_waba_connections")
          .select("id, nickname, display_phone_number, phone_number_id")
          .eq("owner_user_id", accountOwnerId),
      ]);
      setResponsibles((rels || []) as unknown as WabaResponsible[]);
      setNumbers((conns || []) as unknown as WabaNumberLite[]);
    } finally {
      setIsLoading(false);
    }
  }, [accountOwnerId]);

  useEffect(() => {
    if (accountOwnerId) load();
  }, [accountOwnerId, load]);

  /** Substitui a lista de responsáveis de um número. */
  const setNumberResponsibles = useCallback(
    async (connectionId: string, userIds: string[]) => {
      if (!accountOwnerId) throw new Error("not_authenticated");

      // Um usuário só pode estar em 1 número: remove vínculos antigos dele.
      if (userIds.length > 0) {
        await supabase
          .from("waba_number_responsibles" as any)
          .delete()
          .eq("owner_user_id", accountOwnerId)
          .in("user_id", userIds);
      }
      await supabase
        .from("waba_number_responsibles" as any)
        .delete()
        .eq("owner_user_id", accountOwnerId)
        .eq("connection_id", connectionId);

      if (userIds.length > 0) {
        const { error } = await supabase.from("waba_number_responsibles" as any).insert(
          userIds.map((uid) => ({
            owner_user_id: accountOwnerId,
            connection_id: connectionId,
            user_id: uid,
          }))
        );
        if (error) throw error;
      }
      await load();
    },
    [accountOwnerId, load]
  );

  const responsiblesOf = useCallback(
    (connectionId: string) => responsibles.filter((r) => r.connection_id === connectionId).map((r) => r.user_id),
    [responsibles]
  );

  /** Número sob responsabilidade do usuário logado (ou null). */
  const myNumber = (() => {
    const rel = responsibles.find((r) => r.user_id === user?.id);
    if (!rel) return null;
    return numbers.find((n) => n.id === rel.connection_id) || null;
  })();

  /** userId -> connectionId (para bloquear seleção em outro número) */
  const assignmentByUser: Record<string, string> = Object.fromEntries(
    responsibles.map((r) => [r.user_id, r.connection_id])
  );

  return {
    responsibles,
    numbers,
    isLoading,
    load,
    setNumberResponsibles,
    responsiblesOf,
    myNumber,
    assignmentByUser,
  };
}
