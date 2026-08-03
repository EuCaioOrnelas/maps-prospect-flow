import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { formatTime } from "@/lib/calendarViews";
import { supabase } from "@/integrations/supabase/client";
import type { AccountMember } from "@/hooks/useAccountMembers";

const DEFAULT_LEAD_MINUTES = 15;
const STORAGE_KEY = "wiize.agenda.reminders.fired";

const loadFired = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const leadMinutes = (event: CalendarEvent) => {
  const first = Array.isArray(event.reminders) ? Number(event.reminders[0]) : NaN;
  return Number.isFinite(first) && first > 0 ? first : DEFAULT_LEAD_MINUTES;
};

/**
 * Avisa o usuário antes de cada compromisso da Agenda, respeitando o lembrete
 * configurado no evento. Dispara toast, notificação nativa e e-mail.
 */
export function useEventReminders(events: CalendarEvent[], members: AccountMember[] = []) {
  const fired = useRef<Set<string>>(new Set(loadFired()));
  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    const sendEmail = async (event: CalendarEvent, minutes: number) => {
      const list = membersRef.current;
      const ids = new Set<string>([event.assigned_user_id]);
      const participants = (event.metadata as any)?.participants;
      if (Array.isArray(participants)) participants.forEach((id: string) => ids.add(id));
      const recipients = list
        .filter((m) => ids.has(m.user_id) && m.email)
        .map((m) => ({ email: m.email as string, name: m.name || m.email }));
      if (!recipients.length) return;

      await Promise.all(
        recipients.map((r) =>
          supabase.functions
            .invoke("send-email", {
              body: {
                to: r.email,
                email_type: "EVENT_REMINDER",
                idempotency_key: `event-reminder-${event.id}`,
                payload: {
                  recipient_name: r.name,
                  title: event.title,
                  when_label: `${new Date(event.starts_at).toLocaleDateString("pt-BR")} às ${formatTime(event.starts_at)}`,
                  minutes,
                  location: event.location || "",
                  company_name: event.company_name || "",
                  contact_name: event.contact_name || "",
                  notes: event.notes || "",
                },
              },
            })
            .catch(() => undefined),
        ),
      );
    };

    const check = () => {
      const now = Date.now();
      events.forEach((event) => {
        if (event.status === "cancelled" || event.status === "completed") return;
        if (Array.isArray(event.reminders) && event.reminders.length === 0) return;
        const minutes = leadMinutes(event);
        const start = new Date(event.starts_at).getTime();
        const diff = start - now;
        if (diff <= 0 || diff > minutes * 60_000) return;
        if (fired.current.has(event.id)) return;

        fired.current.add(event.id);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...fired.current]));
        } catch {
          /* storage indisponível */
        }

        const body = `Começa às ${formatTime(event.starts_at)}${
          event.company_name ? ` · ${event.company_name}` : ""
        }`;
        toast.info(`Em breve: ${event.title}`, { description: body, duration: 15000 });

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`Em breve: ${event.title}`, { body });
          } catch {
            /* notificação bloqueada */
          }
        }

        void sendEmail(event, minutes);
      });
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [events]);
}
