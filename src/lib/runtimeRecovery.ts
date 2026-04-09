import { lazy, type ComponentType } from "react";

type ComponentModule<T extends ComponentType<any>> = { default: T };

const RETRY_DELAY_MS = 250;
const RECOVERY_COOLDOWN_MS = 15_000;
const RECOVERY_STORAGE_KEY = "wiize:runtime-recovery";
const RUNTIME_ASSET_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to load module script/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/i,
  /Unable to preload CSS/i,
];

declare global {
  interface Window {
    __wiizeRuntimeRecoveryInstalled?: boolean;
  }
}

const wait = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return String(error ?? "");
}

export function isRuntimeAssetError(error: unknown) {
  const message = getErrorMessage(error);
  return RUNTIME_ASSET_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function shouldAttemptRecovery(scope: string) {
  if (typeof window === "undefined") return false;

  try {
    const rawState = window.sessionStorage.getItem(RECOVERY_STORAGE_KEY);
    if (!rawState) return true;

    const state = JSON.parse(rawState) as { scope?: string; ts?: number };
    if (!state.ts || Date.now() - state.ts > RECOVERY_COOLDOWN_MS) {
      window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      return true;
    }

    return state.scope !== scope;
  } catch {
    return true;
  }
}

function markRecovery(scope: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({ scope, ts: Date.now() }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export async function clearRuntimeCaches() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Ignore SW cleanup failures.
  }

  try {
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.allSettled(cacheNames.map((name) => window.caches.delete(name)));
    }
  } catch {
    // Ignore Cache API cleanup failures.
  }
}

export async function recoverFromRuntimeAssetError(scope: string, error: unknown) {
  if (typeof window === "undefined" || !isRuntimeAssetError(error)) return false;

  const recoveryScope = `${window.location.pathname}:${scope}`;
  if (!shouldAttemptRecovery(recoveryScope)) return false;

  markRecovery(recoveryScope);

  try {
    await clearRuntimeCaches();
  } finally {
    window.location.reload();
  }

  return true;
}

export function installRuntimeRecovery() {
  if (typeof window === "undefined" || window.__wiizeRuntimeRecoveryInstalled) return;

  const handleVitePreloadError = (event: Event) => {
    const preloadEvent = event as Event & { payload?: unknown };
    if (!isRuntimeAssetError(preloadEvent.payload)) return;

    event.preventDefault();
    void recoverFromRuntimeAssetError("vite:preloadError", preloadEvent.payload);
  };

  const handleWindowError = (event: ErrorEvent) => {
    const runtimeError = event.error ?? event.message;
    if (!isRuntimeAssetError(runtimeError)) return;

    event.preventDefault();
    void recoverFromRuntimeAssetError("window:error", runtimeError);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isRuntimeAssetError(event.reason)) return;

    event.preventDefault();
    void recoverFromRuntimeAssetError("window:unhandledrejection", event.reason);
  };

  window.addEventListener("vite:preloadError", handleVitePreloadError as EventListener);
  window.addEventListener("error", handleWindowError, true);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.__wiizeRuntimeRecoveryInstalled = true;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<ComponentModule<T>>,
  label: string,
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (firstError) {
      if (!isRuntimeAssetError(firstError)) {
        throw firstError;
      }

      await wait(RETRY_DELAY_MS);

      try {
        return await importer();
      } catch (secondError) {
        if (await recoverFromRuntimeAssetError(`lazy:${label}`, secondError)) {
          return await new Promise<never>(() => {
            // Keep suspense active until the refresh starts.
          });
        }

        throw secondError;
      }
    }
  });
}