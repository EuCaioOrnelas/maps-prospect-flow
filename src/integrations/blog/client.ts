// Cliente dedicado ao banco externo do Blog (projeto Supabase do usuário).
// Mantemos um client separado para que o resto do app continue usando a Lovable Cloud.
import { createClient } from "@supabase/supabase-js";

export const BLOG_SUPABASE_URL = "https://lqfqnqfeuneorxocybru.supabase.co";
export const BLOG_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8";

// O Navigator LockManager entra em deadlock quando dois clients supabase-js
// coexistem na mesma origem (Lovable Cloud + Blog externo), causando o erro
// "Acquiring an exclusive Navigator LockManager lock ... timed out".
// Usamos um lock no-op: cada client tem seu próprio storageKey, então não há
// concorrência real pelo mesmo token.
const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn();

export const blogSupabase = createClient(BLOG_SUPABASE_URL, BLOG_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "blog-supabase-auth",
    lock: noopLock,
  },
});

// Client somente-leitura para páginas públicas do blog: sem sessão, sem lock,
// sem refresh de token — evita qualquer contenção de storage/lock.
export const blogPublic = createClient(BLOG_SUPABASE_URL, BLOG_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    lock: noopLock,
  },
});
