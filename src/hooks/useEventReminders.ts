import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/calendarConfig";
import { formatTime } from "@/lib/calendarViews";

const LEAD_MINUTES = 15;
const STORAGE_KEY = "wiize.agenda.reminders.fired";

const loadFired = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

/**
 * Avisa o usuário 15 minutos antes de cada compromisso da Agenda.
 * Usa toast e, quando permitido, notificação nativa do navegador.
 */
export function useEventReminders(events: CalendarEvent[]) {
  const fired = useRef<Set<string>>(new Set(loadFired()));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    const check = () => {
      const now = Date.now();
      events.forEach((event) => {
        if (event.status === "cancelled" || event.status === "completed") return;
        const start = new Date(event.starts_at).getTime();
        const diff = start - now;
        if (diff <= 0 || diff > LEAD_MINUTES * 60_000) return;
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
