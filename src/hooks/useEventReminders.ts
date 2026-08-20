import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { formatTime } from "@/lib/calendarViews";
import type { AccountMember } from "@/hooks/useAccountMembers";

const STORAGE_KEY = "wiize.agenda.reminders.fired";

const loadFired = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Opt-in: só avisa quando o compromisso tem antecedência configurada. */
const leadMinutes = (event: CalendarEvent) => {
  if (!Array.isArray(event.reminders) || event.reminders.length === 0) return null;
  const first = Number(event.reminders[0]);
  return Number.isFinite(first) && first > 0 ? first : null;
};


/**
 * Avisa o usuário antes de cada compromisso da Agenda, respeitando o lembrete
 * configurado no evento. Dispara toast e notificação nativa;
 * o e-mail de lembrete é enviado pelo servidor (cron calendar-reminders).
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

      });
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [events]);
}
