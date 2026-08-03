import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountRole } from "@/hooks/useAccountRole";
import type { CalendarEvent } from "@/lib/calendarConfig";

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  event_type: string;
  status?: string;
  source?: string;
  assigned_user_id: string;
  starts_at: string;
  ends_at: string;
  lead_id?: string | null;
  contact_name?: string | null;
  company_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  location?: string | null;
  notes?: string | null;
  reminders?: number[];
}

interface UseCalendarEventsOptions {
  /** Início da janela buscada (ISO). */
  from: string;
  /** Fim da janela buscada (ISO). */
  to: string;
  /** "all" (apenas owner/admin) ou o id de um usuário. */
  userFilter: string;
}

const CONFLICT_CODE = "23P01";

/**
 * Fonte única de dados da Agenda.
 * As permissões reais são aplicadas pelo banco (RLS): colaboradores
 * enxergam apenas os próprios compromissos, owner e admin veem a conta toda.
 */
export function useCalendarEvents({ from, to, userFilter }: UseCalendarEventsOptions) {
  const { user } = useAuth();
  const { role, ownerUserId } = useAccountRole();
  const queryClient = useQueryClient();

  const canSeeEveryone = role === "owner" || role === "admin";
  const accountOwnerId = ownerUserId || user?.id || null;

  const queryKey = useMemo(
    () => ["calendar-events", accountOwnerId, from, to, canSeeEveryone ? userFilter : "self"],
    [accountOwnerId, from, to, userFilter, canSeeEveryone],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!accountOwnerId,
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("calendar_events")
        .select("*")
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true });

      if (!canSeeEveryone) {
        query = query.eq("assigned_user_id", user!.id);
      } else if (userFilter && userFilter !== "all") {
        query = query.eq("assigned_user_id", userFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CalendarEvent[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
  }, [queryClient]);

  const translateError = (error: unknown) => {
    const err = error as { code?: string; message?: string };
    if (err?.code === CONFLICT_CODE) {
      return new Error(
        "Já existe um compromisso nesse horário para o responsável escolhido. Escolha outro horário.",
      );
    }
    if (err?.message?.includes("calendar_events_time_check")) {
      return new Error("O horário final precisa ser maior que o horário inicial.");
    }
    return new Error(err?.message || "Não foi possível salvar o compromisso.");
  };

  const createEvent = useMutation({
    mutationFn: async (input: CalendarEventInput) => {
      const payload = {
        ...input,
        owner_user_id: accountOwnerId,
        created_by: user?.id ?? null,
        reminders: input.reminders ?? [15],
      };
      const { data, error } = await supabase
        .from("calendar_events")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw translateError(error);
      return data as unknown as CalendarEvent;
    },
    onSuccess: invalidate,
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CalendarEventInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(patch as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw translateError(error);
      return data as unknown as CalendarEvent;
    },
    onSuccess: invalidate,
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw translateError(error);
      return id;
    },
    onSuccess: invalidate,
  });

  return {
    events: data ?? [],
    loading: isLoading,
    refetch,
    canSeeEveryone,
    accountOwnerId,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
