// Captura global de erros JS do app — alimenta a tabela frontend_errors
// que o Wian usa para diagnosticar bugs do usuário com arquivo + linha.
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "wiize:err-session";
const APP_VERSION = "2026-04-20-v3";

function sessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "s_anon";
  }
}

// dedupe agressivo + rate-limit (no máx 1 por 5s pra mesma fingerprint)
const recent = new Map<string, number>();
function shouldSkip(fp: string) {
  const now = Date.now();
  const last = recent.get(fp) || 0;
  if (now - last < 5000) return true;
  recent.set(fp, now);
  if (recent.size > 50) {
    const cutoff = now - 30000;
    for (const [k, v] of recent) if (v < cutoff) recent.delete(k);
  }
  return false;
}

// Mensagens irrelevantes (extensões, ResizeObserver, etc.)
const IGNORE = [
  "ResizeObserver loop",
  "Non-Error promise rejection captured",
  "Script error.",
  "Load failed",
  "ChunkLoadError",
  "Failed to fetch dynamically imported module",
];

function shouldIgnore(msg: string) {
  return IGNORE.some((p) => msg.includes(p));
}

async function report(payload: {
  message: string;
  source_file?: string | null;
  line_no?: number | null;
  col_no?: number | null;
  stack?: string | null;
}) {
  try {
    if (!payload.message || shouldIgnore(payload.message)) return;
    const fp = `${payload.message}|${payload.source_file || ""}|${payload.line_no || 0}`;
    if (shouldSkip(fp)) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("frontend_errors").insert({
      user_id: user?.id ?? null,
      session_id: sessionId(),
      message: payload.message.slice(0, 500),
      source_file: payload.source_file?.slice(0, 300) ?? null,
      line_no: payload.line_no ?? null,
      col_no: payload.col_no ?? null,
      stack: payload.stack?.slice(0, 4000) ?? null,
      route: window.location.pathname + window.location.search,
      user_agent: navigator.userAgent.slice(0, 300),
      app_version: APP_VERSION,
      severity: "error",
    });
  } catch {
    /* swallow — reporter nunca deve quebrar o app */
  }
}

export function installErrorReporter() {
  if ((window as any).__wiizeErrReporter) return;
  (window as any).__wiizeErrReporter = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    const err = e.error as Error | undefined;
    void report({
      message: err?.message || e.message || "Unknown error",
      source_file: e.filename || null,
      line_no: e.lineno || null,
      col_no: e.colno || null,
      stack: err?.stack || null,
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    const msg = typeof r === "string" ? r : r?.message || "Unhandled rejection";
    void report({
      message: msg,
      stack: r?.stack || null,
      source_file: null,
      line_no: null,
      col_no: null,
    });
  });
}
