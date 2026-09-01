import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Lock, ChevronDown, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { NavMegaMenu } from "./NavMegaMenu";
import { PRODUCT_COLUMNS, RESOURCE_COLUMNS, type MenuItem } from "./navMenuData";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onSignupClick?: () => void;
}

const MENUS = [
  { key: "produtos", label: "Produtos", columns: PRODUCT_COLUMNS },
  { key: "recursos", label: "Recursos", columns: RESOURCE_COLUMNS },
];

export const Navbar = ({ onSignupClick }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenMenu, setMobileOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<1 | -1>(1);
  const closeTimerRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const tickingRef = useRef(false);
  const lastScrolledRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const evaluate = () => {
      const next = window.scrollY > 60;
      if (next !== lastScrolledRef.current) {
        lastScrolledRef.current = next;
        setScrolled(next);
      }
      tickingRef.current = false;
    };
    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(evaluate);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
    setMobileOpenMenu(null);
  }, [location.pathname]);

  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpenMenu(null), 120);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleSignupClick = () => {
    onSignupClick?.();
  };

  const scrollToId = (id: string) => {
    const start = Date.now();
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (Date.now() - start < 4000) {
        requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();
  };

  const handleNavLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const id = href.replace("#", "");
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
    }
    scrollToId(id);
  };

  const navLinks: Array<{ href?: string; to?: string; label: string }> = [
    { href: "#pricing", label: "Planos" },
    { href: "#faq", label: "FAQ" },
    { to: "/blog", label: "Blog" },
  ];

  const activeMenu = MENUS.find((m) => m.key === openMenu);

  // Overlay de fundo levemente desfocado quando qualquer menu está aberto
  const menuOverlay = (openMenu || mobileMenuOpen) ? (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-40 animate-fade-in bg-background/30 backdrop-blur-[3px] transition-opacity"
      onClick={() => { setOpenMenu(null); setMobileMenuOpen(false); setMobileOpenMenu(null); }}
    />
  ) : null;


  const openMenuWithDirection = (key: string | null) => {
    if (key) {
      const nextIdx = MENUS.findIndex((m) => m.key === key);
      const currIdx = MENUS.findIndex((m) => m.key === openMenu);
      setMenuDirection(currIdx === -1 || nextIdx >= currIdx ? 1 : -1);
    }
    setOpenMenu(key);
  };


  const renderMobileMenuItems = (items: MenuItem[]) => (
    <div className="flex flex-col gap-1 pl-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label + item.to}
            to={item.to}
            onClick={() => { setMobileMenuOpen(false); setMobileOpenMenu(null); }}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {Icon && <Icon size={15} className="shrink-0" />}
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {menuOverlay}
      <nav
        ref={navRef}
        className="fixed left-0 right-0 z-50 top-0"
        style={{
          paddingTop: scrolled ? '10px' : '0',
          paddingLeft: scrolled ? '16px' : '0',
          paddingRight: scrolled ? '16px' : '0',
          transition: 'padding 500ms cubic-bezier(0.22,1,0.36,1)',
          willChange: 'padding',
        }}
      >
        <div
          className="mx-auto"
          onMouseLeave={scheduleClose}
          style={{
            // Abrir o menu NÃO altera tamanho, largura, padding ou posição — só revela o fundo
            maxWidth: scrolled ? '920px' : '1280px',
            borderRadius: scrolled || openMenu ? '18px' : '0px',
            backgroundColor: openMenu
              ? 'hsl(var(--background))'
              : scrolled
                ? 'hsl(var(--background) / 0.55)'
                : 'transparent',
            backdropFilter: openMenu ? 'none' : scrolled ? 'blur(16px) saturate(180%)' : 'none',
            WebkitBackdropFilter: openMenu ? 'none' : scrolled ? 'blur(16px) saturate(180%)' : 'none',
            border: openMenu || scrolled ? '1px solid hsl(var(--border) / 0.4)' : '1px solid transparent',
            boxShadow: openMenu || scrolled ? '0 8px 32px hsl(var(--background) / 0.3)' : 'none',
            paddingTop: scrolled ? '8px' : '16px',
            paddingBottom: scrolled ? '8px' : '16px',
            paddingLeft: scrolled ? '24px' : '16px',
            paddingRight: scrolled ? '12px' : '16px',
            transition: 'max-width 500ms cubic-bezier(0.22,1,0.36,1), border-radius 300ms ease-out, background-color 300ms ease-out, box-shadow 300ms ease-out, padding 500ms cubic-bezier(0.22,1,0.36,1)',
            willChange: 'max-width, padding',
            transform: 'translateZ(0)',
          }}
        >
          <div className="flex items-center justify-between mx-auto w-full gap-8">
            <Logo size="md" mobileSize="md" />

            <div className="hidden md:flex items-center gap-1">
              {MENUS.map((menu) => (
                <button
                  key={menu.key}
                  type="button"
                  onMouseEnter={() => { cancelClose(); openMenuWithDirection(menu.key); }}
                  onClick={() => openMenuWithDirection(openMenu === menu.key ? null : menu.key)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-[font-weight] duration-150",
                    openMenu === menu.key && "font-bold"
                  )}
                  aria-expanded={openMenu === menu.key}
                >
                  {menu.label}
                  <ChevronDown
                    size={14}
                    className={cn("transition-transform duration-200", openMenu === menu.key && "rotate-180")}
                  />
                </button>
              ))}
              {navLinks.map(link => (
                link.to ? (
                  <Link
                    key={link.to}
                    to={link.to}
                    onMouseEnter={() => { cancelClose(); setOpenMenu(null); }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-[font-weight] duration-150 hover:font-bold"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => { cancelClose(); setOpenMenu(null); }}
                    onClick={(e) => handleNavLinkClick(e, link.href!)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-[font-weight] duration-150 hover:font-bold"
                  >
                    {link.label}
                  </a>
                )
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              {TRIAL_DISABLED ? (
                <Button
                  variant="hero"
                  size="sm"
                  className="rounded-full opacity-60 cursor-not-allowed"
                  disabled
                  aria-disabled="true"
                  onClick={(e) => { e.preventDefault(); notifyTrialDisabled(); }}
                >
                  <Lock size={14} className="mr-1" />
                  Indisponível
                </Button>
              ) : (
                <Link to="/signup/escolher-plano" onClick={handleSignupClick}>
                  <Button variant="hero" size="sm" className="rounded-full border-transparent shadow-lg">
                    Iniciar Teste Grátis
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mega menu desktop — dentro do container, sem mudar largura */}
          {activeMenu && (
            <div
              className="hidden md:block overflow-hidden pt-4"
              onMouseEnter={cancelClose}
            >
              <div className="animate-fade-in">
                <NavMegaMenu
                  key={activeMenu.key}
                  direction={menuDirection}
                  columns={activeMenu.columns}
                  onNavigate={() => setOpenMenu(null)}
                />
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu - rendered outside the glass container so it isn't affected by backdrop-blur */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden fixed left-4 right-4 z-50 animate-fade-in rounded-panel max-h-[75vh] overflow-y-auto"
          style={{
            top: scrolled ? '90px' : '88px',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border) / 0.6)',
            boxShadow: '0 12px 40px hsl(var(--background) / 0.4)',
            padding: '16px',
            transition: 'top 300ms ease-out',
          }}
        >
          <div className="flex flex-col gap-2">
            {MENUS.map((menu) => (
              <div key={menu.key} className="border-b border-border/60 pb-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-foreground"
                  onClick={() => setMobileOpenMenu(mobileOpenMenu === menu.key ? null : menu.key)}
                  aria-expanded={mobileOpenMenu === menu.key}
                >
                  {menu.label}
                  <ChevronDown size={16} className={cn("transition-transform duration-200", mobileOpenMenu === menu.key && "rotate-180")} />
                </button>
                {mobileOpenMenu === menu.key && (
                  <div className="animate-fade-in">
                    {menu.columns.map((col) => (
                      <div key={col.title} className="py-1">
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-primary">{col.title}</p>
                        {renderMobileMenuItems(col.items)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {navLinks.map(link => (
              <div key={link.label} className="border-b border-border/60 pb-2">
                {link.to ? (
                  <Link
                    to={link.to}
                    className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-foreground cursor-pointer"
                    onClick={(e) => handleNavLinkClick(e, link.href!)}
                  >
                    {link.label}
                  </a>
                )}
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Entrar
                </Button>
              </Link>
              {TRIAL_DISABLED ? (
                <Button
                  variant="hero"
                  size="sm"
                  className="w-full justify-center opacity-60 cursor-not-allowed"
                  disabled
                  aria-disabled="true"
                  onClick={(e) => { e.preventDefault(); notifyTrialDisabled(); }}
                >
                  <Lock size={14} className="mr-1" />
                  Indisponível
                </Button>
              ) : (
                <Link to="/signup/escolher-plano" onClick={() => { setMobileMenuOpen(false); handleSignupClick(); }}>
                  <Button variant="hero" size="sm" className="w-full justify-center">
                    Iniciar Teste Grátis
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-[72px] sm:h-[80px]" />
    </>
  );
};
