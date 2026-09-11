import { useEffect, useRef } from "react";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;
const LOGOUT_LOCK_MS = 15 * 1000;
const STORAGE_PREFIX = "wiize:auth:activity";

type ActivityState = {
  sessionStartedAt: string;
  lastActivityAt: number;
};

const activityKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;
const logoutKey = (userId: string) => `${STORAGE_PREFIX}:logout:${userId}`;

const readActivity = (key: string): ActivityState | null => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null") as Partial<ActivityState> | null;
    if (!parsed?.sessionStartedAt || typeof parsed.lastActivityAt !== "number") return null;
    return { sessionStartedAt: parsed.sessionStartedAt, lastActivityAt: parsed.lastActivityAt };
  } catch {
    return null;
  }
};

interface UseInactivityLogoutOptions {
  userId: string | null;
  sessionStartedAt: string | null;
  disabled?: boolean;
  onTimeout: () => Promise<void>;
}

export function useInactivityLogout({
  userId,
  sessionStartedAt,
  disabled = false,
  onTimeout,
}: UseInactivityLogoutOptions) {
  const timeoutRef = useRef<number | null>(null);
  const lastHandledActivityRef = useRef(0);
  const loggingOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!userId || !sessionStartedAt || disabled) return;

    const sharedActivityKey = activityKey(userId);
    const sharedLogoutKey = logoutKey(userId);

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const performLogoutOnce = async () => {
      if (loggingOutRef.current) return;

      const current = readActivity(sharedActivityKey);
      if (current && Date.now() - current.lastActivityAt < INACTIVITY_LIMIT_MS) {
        scheduleFromSharedActivity();
        return;
      }

      const recentLogout = Number(window.localStorage.getItem(sharedLogoutKey) || 0);
      if (Date.now() - recentLogout < LOGOUT_LOCK_MS) return;

      loggingOutRef.current = true;
      window.localStorage.setItem(sharedLogoutKey, String(Date.now()));
      clearTimer();
      await onTimeoutRef.current();
    };

    const scheduleFromSharedActivity = () => {
      clearTimer();
      const current = readActivity(sharedActivityKey);
      const lastActivityAt = current?.sessionStartedAt === sessionStartedAt
        ? current.lastActivityAt
        : Date.now();
      const remaining = INACTIVITY_LIMIT_MS - (Date.now() - lastActivityAt);

      if (remaining <= 0) {
        void performLogoutOnce();
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        void performLogoutOnce();
      }, remaining);
    };

    const existing = readActivity(sharedActivityKey);
    if (!existing || existing.sessionStartedAt !== sessionStartedAt) {
      window.localStorage.setItem(
        sharedActivityKey,
        JSON.stringify({ sessionStartedAt, lastActivityAt: Date.now() } satisfies ActivityState),
      );
      window.localStorage.removeItem(sharedLogoutKey);
    }

    const registerActivity = () => {
      const now = Date.now();
      if (now - lastHandledActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastHandledActivityRef.current = now;
      window.localStorage.setItem(
        sharedActivityKey,
        JSON.stringify({ sessionStartedAt, lastActivityAt: now } satisfies ActivityState),
      );
      scheduleFromSharedActivity();
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleFromSharedActivity();
    };

    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === sharedActivityKey) scheduleFromSharedActivity();
      if (event.key === sharedLogoutKey && event.newValue) {
        clearTimer();
        void performLogoutOnce();
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "mousemove",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true });
    });
    window.addEventListener("storage", syncAcrossTabs);
    document.addEventListener("visibilitychange", checkWhenVisible);
    scheduleFromSharedActivity();

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
      window.removeEventListener("storage", syncAcrossTabs);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [disabled, sessionStartedAt, userId]);
}
