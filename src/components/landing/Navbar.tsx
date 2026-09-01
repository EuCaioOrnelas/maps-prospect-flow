import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Lock, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { NavMegaMenu } from "./NavMegaMenu";
import { PRODUCT_COLUMNS, RESOURCE_COLUMNS, MENU_SIDE_LINKS } from "./navMenuData";
import { cn } from "@/lib/utils";


interface NavbarProps {
 onSignupClick?: () => void;
}

export const Navbar = ({ onSignupClick }: NavbarProps) => {
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [scrolled, setScrolled] = useState(false);
 const [openMenu, setOpenMenu] = useState<string | null>(null);
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

  const MENUS = [
    { key: "produtos", label: "Produtos", columns: PRODUCT_COLUMNS },
    { key: "recursos", label: "Recursos", columns: RESOURCE_COLUMNS },
  ] as const;
  const activeMenu = MENUS.find((m) => m.key === openMenu);
  const solid = scrolled || !!openMenu;


 return (
 <>
      <nav
        ref={navRef}
        className="fixed left-0 right-0 z-50 top-0"
        onMouseLeave={() => setOpenMenu(null)}
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
          style={{
            maxWidth: openMenu ? '1280px' : scrolled ? '920px' : '1280px',
            borderRadius: openMenu ? '0px' : scrolled ? '18px' : '0px',
            backgroundColor: openMenu
              ? 'hsl(var(--background))'
              : scrolled ? 'hsl(var(--background) / 0.55)' : 'transparent',
            backdropFilter: solid && !openMenu ? 'blur(16px) saturate(180%)' : 'none',
            WebkitBackdropFilter: solid && !openMenu ? 'blur(16px) saturate(180%)' : 'none',
            border: solid ? '1px solid hsl(var(--border) / 0.4)' : '1px solid transparent',
            boxShadow: solid ? '0 8px 32px hsl(var(--background) / 0.3)' : 'none',
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
                  onMouseEnter={() => setOpenMenu(menu.key)}
                  onClick={() => setOpenMenu(openMenu === menu.key ? null : menu.key)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    openMenu === menu.key
                      ? "bg-muted/70 text-primary"
                      : "text-foreground hover:bg-muted/60 hover:text-primary"
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
                    onMouseEnter={() => setOpenMenu(null)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => setOpenMenu(null)}
                    onClick={(e) => handleNavLinkClick(e, link.href!)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:text-primary"
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

 </div>
 </nav>

 {/* Mobile menu - rendered outside the glass container so it isn't affected by backdrop-blur */}
 {mobileMenuOpen && (
 <div
 className="sm:hidden fixed left-4 right-4 z-50 animate-fade-in rounded-panel"
 style={{
 top: scrolled ? '90px' : '88px',
 backgroundColor: 'hsl(var(--background))',
 border: '1px solid hsl(var(--border) / 0.6)',
 boxShadow: '0 12px 40px hsl(var(--background) / 0.4)',
 padding: '16px',
 transition: 'top 300ms ease-out',
 }}
 >
 <div className="flex flex-col gap-4">
 {navLinks.map(link => (
 link.to ? (
 <Link
 key={link.to}
 to={link.to}
 className="text-muted-foreground hover:text-foreground transition-colors py-2"
 onClick={() => setMobileMenuOpen(false)}
 >
 {link.label}
 </Link>
 ) : (
 <a
 key={link.href}
 href={link.href}
 className="text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer"
 onClick={(e) => handleNavLinkClick(e, link.href!)}
 >
 {link.label}
 </a>
 )
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
