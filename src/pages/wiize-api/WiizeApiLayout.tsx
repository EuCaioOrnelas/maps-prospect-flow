import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import wiizeLogo from "@/assets/logo-icon-new.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { WiizeApiNav } from "@/components/wiize-api/WiizeApiNav";
import { TwoFactorGate } from "@/components/security/TwoFactorGate";
import { DashboardThemeProvider } from "@/contexts/ThemeContext";
import { resolveWiizeApiAccess } from "@/lib/wiizeApiAuth";
import { cn } from "@/lib/utils";

/**
 * Shell do Wiize API. Exige sessão válida e, quando o 2FA está ativo,
 * o desafio do segundo fator antes de liberar qualquer tela.
 */
export default function WiizeApiLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) {
        navigate("/api/login", { replace: true });
        return;
      }
      const access = await resolveWiizeApiAccess(user);
      if (!active) return;
      if (!access.hasAccess) {
        navigate("/api/login", { replace: true });
        return;
      }
      setEmail(user.email ?? null);
      setName((user.user_metadata?.full_name as string) || null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/api/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <DashboardThemeProvider>
      <TwoFactorGate>
        <div className="min-h-screen bg-background">
          {/* Rail lateral — colapsa/expande igual ao interno da Wiize */}
          <div
            className="fixed inset-y-0 left-0 z-40 hidden lg:flex"
            onMouseEnter={() => {
              if (leaveTimer.current) clearTimeout(leaveTimer.current);
              setHovered(true);
            }}
            onMouseLeave={() => {
              leaveTimer.current = setTimeout(() => setHovered(false), 120);
            }}
          >
            <aside
              className={cn(
                "flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar",
                "transition-[width] duration-300 ease-out",
                hovered ? "w-[268px]" : "w-[72px]",
              )}
            >
              <WiizeApiNav isExpanded={hovered} email={email} name={name} onLogout={logout} />
            </aside>
          </div>

          {/* Barra mobile apenas para abrir o menu */}
          <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <WiizeApiNav
                  isExpanded
                  email={email}
                  name={name}
                  onNavigate={() => setMobileOpen(false)}
                  onLogout={logout}
                />
              </SheetContent>
            </Sheet>
            <Link to="/api/dashboard" className="flex items-center gap-2">
              <img src={wiizeLogo} alt="Wiize" className="h-8 w-8 shrink-0 rounded-hover object-contain" />
              <span className="text-sm font-semibold tracking-tight">
                Wiize <span className="text-muted-foreground">API</span>
              </span>
            </Link>
          </div>

          <div className="lg:ml-[72px]">
            <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
              <Outlet />
            </main>
          </div>
        </div>
      </TwoFactorGate>
    </DashboardThemeProvider>
  );
}
