import { useEffect, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { blogSupabase } from "@/integrations/blog/client";
import { Loader2 } from "lucide-react";

type State = "checking" | "allowed" | "denied";

export default function BlogAdminGuard() {
  const [state, setState] = useState<State>("checking");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    async function check() {
      const { data: sessionData } = await blogSupabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (active) setState("denied");
        return;
      }
      const { data: role } = await blogSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setState(role ? "allowed" : "denied");
    }
    check();

    const { data: sub } = blogSupabase.auth.onAuthStateChange(() => check());
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
