import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { Menu, LogOut, User, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WiizeApiNav } from "@/components/wiize-api/WiizeApiNav";
import { TwoFactorGate } from "@/components/security/TwoFactorGate";
import { mockBalance, brl } from "@/data/wiizeApiMocks";
import { resolveWiizeApiAccess } from "@/lib/wiizeApiAuth";

/**
 * Shell do Wiize API. Exige sessão válida e, quando o 2FA está ativo,
 * o desafio do segundo fator antes de liberar qualquer tela.
 */
export default function WiizeApiLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    // Sessão local primeiro (instantâneo), validação com o servidor em seguida.
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
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [navigate]);


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
    <TwoFactorGate>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
          <WiizeApiNav />
        </aside>

        <div className="lg:ml-64">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <WiizeApiNav onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <span className="text-sm font-semibold tracking-tight">
                Wiize <span className="text-muted-foreground">API</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/api/credits"
                className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:flex"
              >
                <Wallet size={14} className="text-primary" strokeWidth={1.75} />
                Saldo {brl(mockBalance.balance)}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Conta">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {(email || "?").charAt(0)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/api/settings")}>
                    <User size={14} className="mr-2" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    Voltar para Wiize
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut size={14} className="mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TwoFactorGate>
  );
}
