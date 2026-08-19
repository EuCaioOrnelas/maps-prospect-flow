import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { blogSupabase } from "@/integrations/blog/client";
import { Loader2 } from "lucide-react";

type State = "checking" | "allowed" | "denied";

// Evita que qualquer chamada pendurada (rede/lock) deixe a tela girando pra sempre.
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export default function BlogAdminGuard() {
  const [state, setState] = useState<State>("checking");
  const location = useLocation();
  const runningRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function check() {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const sessionRes = await withTimeout(blogSupabase.auth.getSession(), 8000);
        const user = sessionRes?.data?.session?.user;
        if (!active) return;
        if (!user) {
          setState("denied");
          return;
        }
        const roleRes = await withTimeout(
          blogSupabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          8000,
        );
        if (!active) return;
        setState(roleRes?.data ? "allowed" : "denied");
      } finally {
        runningRef.current = false;
      }
    }

    check();

    const { data: sub } = blogSupabase.auth.onAuthStateChange(() => {
      // não bloqueia o callback do supabase-js
      setTimeout(() => {
        if (active) check();
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "denied") {
    return <Navigate to="/admin/blog/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}
