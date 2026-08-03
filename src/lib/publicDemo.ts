/**
 * Public (no-login) demo mode.
 *
 * Security model:
 * - No real Supabase session is ever created (session stays `null`).
 * - The demo identity is generated per browser session and is NOT a real user id.
 * - While the demo is mounted, ALL network traffic to the backend is blocked at the
 *   fetch/XHR/WebSocket level, so no query, mutation, signup or storage call can leave
 *   the page even if a component forgets to guard itself.
 * - Nothing is written to localStorage; demo state lives in sessionStorage only.
 */

export const PUBLIC_DEMO_PATH = "/tour-guiado";

const DEMO_ID_KEY = "wiize:public-demo-id";

function sessionDemoId() {
  try {
    const existing = sessionStorage.getItem(DEMO_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `demo-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(DEMO_ID_KEY, generated);
    return generated;
  } catch {
    return "demo-session";
  }
}

export function isPublicDemoPath(pathname?: string) {
  if (typeof window === "undefined") return false;
  return (pathname ?? window.location.pathname) === PUBLIC_DEMO_PATH;
}

/** Synthetic profile — contains no customer data and no privileged flags. */
export function getPublicDemoProfile() {
  return {
    id: sessionDemoId(),
    email: "visitante@demo.local",
    name: "Visitante",
    searches_used: 1840,
    searches_limit: 10000,
    plan: "growth",
    created_at: new Date().toISOString(),
    terms_accepted_at: new Date().toISOString(),
    is_demo: true,
  };
}

export const PUBLIC_DEMO_PROFILE = getPublicDemoProfile();

export function buildTourDemoSearchHistory() {
  return [
    { id: "__tour_search_1__", keyword: "Clínicas de estética", location: "São Paulo, SP", results_count: 60, created_at: new Date().toISOString(), leads: [] },
    { id: "__tour_search_2__", keyword: "Clínicas odontológicas", location: "Belo Horizonte, MG", results_count: 48, created_at: new Date(Date.now() - 86400000).toISOString(), leads: [] },
    { id: "__tour_search_3__", keyword: "Academias premium", location: "Curitiba, PR", results_count: 54, created_at: new Date(Date.now() - 172800000).toISOString(), leads: [] },
  ];
}

/**
 * Hard network isolation for the public demo.
 * Blocks every request to the backend (REST, auth, functions, storage, realtime)
 * while the demo page is mounted. Returns a cleanup function.
 */
let guardInstalled = false;

export function installPublicDemoNetworkGuard() {
  if (typeof window === "undefined") return () => {};
  if (guardInstalled) return () => {};
  guardInstalled = true;

  const backendHost = (() => {
    try {
      return new URL(import.meta.env.VITE_SUPABASE_URL as string).host;
    } catch {
      return "";
    }
  })();

  const isBlocked = (url: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.origin);
      if (backendHost && parsed.host === backendHost) return true;
      return /supabase\.(co|in)$/.test(parsed.host);
    } catch {
      return false;
    }
  };

  // Respond with an empty, successful payload instead of an error status:
  // a 403 would surface as a runtime error in the app's error reporter while
  // the demo is running. Nothing ever reaches the backend either way.
  const blockedResponse = () =>
    new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (isBlocked(url)) return Promise.resolve(blockedResponse());
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  const OriginalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    if (isBlocked(String(url))) {
      // Redirect blocked calls to a harmless no-op endpoint.
      return OriginalXHROpen.call(this, method, "about:blank", ...(rest as []));
    }
    return OriginalXHROpen.call(this, method, url as string, ...(rest as []));
  } as typeof XMLHttpRequest.prototype.open;

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = new Proxy(OriginalWebSocket, {
    construct(target, args: [string, (string | string[])?]) {
      // Never throw (it would break the app shell): point blocked sockets at the
      // discard port so the connection simply fails silently.
      const url = isBlocked(String(args[0])) ? "ws://127.0.0.1:9" : args[0];
      return Reflect.construct(target, [url, args[1]]) as WebSocket;
    },
  }) as typeof WebSocket;

  return () => {
    guardInstalled = false;
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = OriginalXHROpen;
    window.WebSocket = OriginalWebSocket;
  };
}
