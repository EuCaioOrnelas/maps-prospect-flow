import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'crm_phone_privacy_hidden';

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const listeners = new Set<(v: boolean) => void>();
let currentValue: boolean = readInitial();

const setGlobal = (v: boolean) => {
  currentValue = v;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l(v));
};

/**
 * Hook to manage phone number privacy (hide/show last digits) across the CRM.
 * State is persisted in localStorage and shared across all components in the same tab.
 */
export function usePhonePrivacy() {
  const [hidden, setHidden] = useState<boolean>(currentValue);

  useEffect(() => {
    const listener = (v: boolean) => setHidden(v);
    listeners.add(listener);
    // sync if changed before mount
    setHidden(currentValue);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback(() => setGlobal(!currentValue), []);
  const setHiddenValue = useCallback((v: boolean) => setGlobal(v), []);

  return { hidden, toggle, setHidden: setHiddenValue };
}

/**
 * Mask the last 4 digits of an already formatted phone string.
 * Replaces trailing digits with • characters preserving formatting.
 */
export const maskPhoneTail = (formatted: string, visibleLeading = 4): string => {
  if (!formatted) return formatted;
  // Walk from the end and replace digits with • until we masked `visibleLeading` (default 4) digits
  let masked = '';
  let toMask = visibleLeading;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const ch = formatted[i];
    if (toMask > 0 && /\d/.test(ch)) {
      masked = '•' + masked;
      toMask--;
    } else {
      masked = ch + masked;
    }
  }
  return masked;
};
