import { useCallback, useEffect, useState } from "react";

export interface ChatPrivacySettings {
  /** Desfoca a foto do contato na lista de conversas. */
  avatar: boolean;
  /** Desfoca o nome do contato na lista de conversas. */
  name: boolean;
  /** Desfoca a prévia da última mensagem na lista de conversas. */
  preview: boolean;
  /** Desfoca as mensagens dentro da conversa aberta. */
  messages: boolean;
}

const STORAGE_KEY = "wiize:chat:privacy";

const DEFAULTS: ChatPrivacySettings = {
  avatar: false,
  name: false,
  preview: false,
  messages: false,
};

const read = (): ChatPrivacySettings => {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ChatPrivacySettings>) };
  } catch {
    return DEFAULTS;
  }
};

let current: ChatPrivacySettings = read();
const listeners = new Set<(v: ChatPrivacySettings) => void>();

const persist = (next: ChatPrivacySettings) => {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l(next));
};

/**
 * Preferências de privacidade visual do Chat.
 * Ficam no dispositivo (localStorage) e valem para todas as telas do chat
 * na mesma aba, sincronizando também entre abas abertas.
 */
export function useChatPrivacy() {
  const [settings, setSettings] = useState<ChatPrivacySettings>(current);

  useEffect(() => {
    const listener = (v: ChatPrivacySettings) => setSettings(v);
    listeners.add(listener);
    setSettings(current);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      current = read();
      setSettings(current);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback(<K extends keyof ChatPrivacySettings>(key: K, value: boolean) => {
    persist({ ...current, [key]: value });
  }, []);

  const setAll = useCallback((value: boolean) => {
    persist({ avatar: value, name: value, preview: value, messages: value });
  }, []);

  const anyEnabled = settings.avatar || settings.name || settings.preview || settings.messages;

  return { settings, set, setAll, anyEnabled };
}

/** Classe aplicada aos elementos que devem ficar desfocados até o mouse passar. */
export const PRIVACY_BLUR_CLASS = "wa-private-blur";
