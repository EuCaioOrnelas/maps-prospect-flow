// Cliente dedicado ao banco externo do Blog (projeto Supabase do usuário).
// Mantemos um client separado para que o resto do app continue usando a Lovable Cloud.
import { createClient } from "@supabase/supabase-js";

const BLOG_SUPABASE_URL = "https://lqfqnqfeuneorxocybru.supabase.co";
const BLOG_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8";

export const blogSupabase = createClient(BLOG_SUPABASE_URL, BLOG_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "blog-supabase-auth",
  },
});
