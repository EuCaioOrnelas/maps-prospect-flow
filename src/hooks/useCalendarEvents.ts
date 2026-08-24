import { useCallback, useEffect, useMemo, useRef } from "react";
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
  metadata?: Record<string, unknown>;
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

  /**
   * Envio unidirecional para o Google Agenda (MVP): tudo que é criado, editado
   * ou excluído aqui reflete lá. Nada é importado de volta.
   * Falhas nunca bloqueiam a operação na Wiize.
   */
  const recentPushes = useRef<Map<string, number>>(new Map());

  const pushToGoogle = useCallback((body: Record<string, unknown>) => {
    const eventId = typeof body.event_id === "string" ? body.event_id : null;
    if (eventId) {
      const last = recentPushes.current.get(eventId) ?? 0;
      // Evita disparo duplicado (mutação + realtime) para o mesmo compromisso.
      if (Date.now() - last < 8000) return;
      recentPushes.current.set(eventId, Date.now());
    }
    void supabase.functions
      .invoke("google-calendar-sync", { body })
      .catch(() => undefined);
  }, []);

  // Realtime: qualquer inserção/alteração feita por outro usuário, pelo SDR
  // ou em outra aba atualiza a agenda imediatamente — e já reflete no Google.
  useEffect(() => {
    if (!accountOwnerId) return;
    const channel = supabase
      .channel(`calendar-events-${accountOwnerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        (payload) => {
          invalidate();
          const row = payload.new as { id?: string; assigned_user_id?: string } | null;
          if (
            (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
            row?.id &&
            row.assigned_user_id === user?.id
          ) {
            pushToGoogle({ action: "push_event", event_id: row.id });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accountOwnerId, invalidate, pushToGoogle, user?.id]);


  const createEvent = useMutation({
    mutationFn: async (input: CalendarEventInput) => {
      const payload = {
        ...input,
        owner_user_id: accountOwnerId,
        created_by: user?.id ?? null,
        reminders: input.reminders ?? [],
      };

      const { data, error } = await supabase
        .from("calendar_events")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw translateError(error);
      return data as unknown as CalendarEvent;
    },
    onSuccess: (event) => {
      invalidate();
      pushToGoogle({ action: "push_event", event_id: event.id });
    },
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
    onSuccess: (event) => {
      invalidate();
      pushToGoogle({ action: "push_event", event_id: event.id });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("external_event_id")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw translateError(error);
      return {
        id,
        externalEventId: (existing as { external_event_id?: string | null } | null)?.external_event_id ?? null,
      };
    },
    onSuccess: ({ externalEventId }) => {
      invalidate();
      if (externalEventId) {
        pushToGoogle({ action: "delete_event", external_event_id: externalEventId });
      }
    },
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
