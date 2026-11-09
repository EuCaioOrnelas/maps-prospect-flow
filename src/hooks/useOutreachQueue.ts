import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QueuedOutreach {
  id: string;
  content: string | null;
  scheduled_at: string;
  status: string;
}

/**
 * Fila de abordagens com intervalo inteligente. Os limites (200/dia e 50 a cada
 * 25 minutos) são aplicados no banco por schedule_outreach_message.
 */
export function useOutreachQueue(conversationId: string | null | undefined) {
  const [items, setItems] = useState<QueuedOutreach[]>([]);
  const timers = useRef<number[]>([]);

  const load = useCallback(async () => {
    if (!conversationId) { setItems([]); return; }
    const { data } = await supabase
      .from("chat_scheduled_messages")
      .select("id, content, scheduled_at, status")
      .eq("conversation_id", conversationId)
      .eq("is_outreach", true)
      .in("status", ["pending", "processing"])
      .order("scheduled_at", { ascending: true })
      .limit(20);
    setItems((data as QueuedOutreach[]) || []);
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);

  // Ao chegar a hora, aciona o envio (o agendador por minuto é a garantia de reserva)
  // e atualiza a fila até a mensagem sair.
  useEffect(() => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
    if (!items.length) return;
    items.forEach(item => {
      const wait = Math.max(0, new Date(item.scheduled_at).getTime() - Date.now()) + 800;
      timers.current.push(window.setTimeout(async () => {
        await supabase.functions.invoke("chat-scheduled-sender", { body: {} }).catch(() => undefined);
        void load();
      }, wait));
    });
    timers.current.push(window.setInterval(load, 15000) as unknown as number);
    return () => { timers.current.forEach(t => { window.clearTimeout(t); window.clearInterval(t); }); };
  }, [items, load]);

  const enqueue = useCallback(async (text: string): Promise<boolean> => {
    if (!conversationId) return false;
    const { data, error } = await supabase.rpc("schedule_outreach_message" as never, {
      _conversation_id: conversationId,
      _content: text,
    } as never);
    if (error) {
      toast.error(error.message || "Não foi possível colocar a abordagem na fila.");
      return false;
    }
    const res = data as unknown as { scheduled_at: string; daily_used: number; daily_limit: number };
    const secs = Math.max(1, Math.round((new Date(res.scheduled_at).getTime() - Date.now()) / 1000));
    toast.success("Abordagem na fila de envio", {
      description: secs > 120
        ? `Limite de ritmo atingido. Sai automaticamente em cerca de ${Math.ceil(secs / 60)} min. (${res.daily_used}/${res.daily_limit} hoje)`
        : `Será enviada automaticamente em cerca de ${secs}s. (${res.daily_used}/${res.daily_limit} hoje)`,
    });
    await load();
    return true;
  }, [conversationId, load]);

  const cancel = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("chat_scheduled_messages")
      .update({ status: "canceled", updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("status", "pending");
    if (error) toast.error("Não foi possível cancelar.");
    else toast.success("Envio cancelado.");
    void load();
  }, [load]);

  return { items, enqueue, cancel };
}
