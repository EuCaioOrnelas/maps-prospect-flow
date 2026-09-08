import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import wiizeLogo from "@/assets/logo-icon-new.png";

const NAV_LINKS = [
  { to: "/api#recursos", label: "Recursos" },
  { to: "/api#como-funciona", label: "Como funciona" },
  { to: "/api#seguranca", label: "Segurança" },
  { to: "/", label: "Home" },
];

/** Navbar pública do Wiize API — fixa no topo e vira card glass flutuante ao rolar. */
export const ApiPublicNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tickingRef = useRef(false);
  const lastRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    const evaluate = () => {
      const next = window.scrollY > 60;
      if (next !== lastRef.current) {
        lastRef.current = next;
        setScrolled(next);
      }
      tickingRef.current = false;
    };
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(evaluate);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50" style={{ paddingTop: "16px" }}>
        <div
          className="relative mx-auto w-full px-4 sm:px-7 lg:px-12"
          style={{ maxWidth: "90rem", paddingTop: "8px", paddingBottom: "8px" }}
        >
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-[16px] right-[16px] top-0 sm:left-[28px] sm:right-[28px] lg:left-[48px] lg:right-[48px]"
            style={{
              borderRadius: scrolled ? "18px" : "0px",
              backgroundColor: scrolled ? "hsl(var(--background) / 0.55)" : "transparent",
              backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
              WebkitBackdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
              border: scrolled ? "1px solid hsl(var(--border) / 0.4)" : "1px solid transparent",
              boxShadow: scrolled ? "0 8px 32px hsl(var(--background) / 0.3)" : "none",
              transition:
                "border-radius 220ms ease-out, background-color 220ms ease-out, box-shadow 220ms ease-out",
            }}
          />

          <div className="relative mx-auto flex w-full items-center justify-between gap-8 px-2 sm:px-3 lg:px-4">
            <Link to="/api" className="flex items-center gap-2.5">
              <img src={wiizeLogo} alt="Wiize API" className="h-8 w-8 object-contain" />
              <span className="text-base font-bold tracking-tight text-foreground">
                Wiize <span className="font-semibold text-muted-foreground">API</span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/api/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/api/login?modo=cadastro"><Button size="sm">Criar conta grátis</Button></Link>
            </div>

            <button
              className="p-2 text-muted-foreground hover:text-foreground sm:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {mobileOpen && (
            <div
              className="absolute left-[16px] right-[16px] top-full z-50 mt-2 max-h-[75vh] animate-fade-in overflow-y-auto rounded-panel px-[10px] py-[10px] sm:hidden"
              style={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border) / 0.82)",
                boxShadow: "0 12px 40px hsl(var(--background) / 0.4)",
              }}
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="border-b border-border/60 py-2.5 text-sm font-semibold text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-3">
                  <Link to="/api/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/api/login?modo=cadastro" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full justify-center">Criar conta grátis</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="h-[72px] sm:h-[80px]" />
    </>
  );
};

export default ApiPublicNavbar;
