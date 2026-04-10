import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface NavbarProps {
  onSignupClick?: () => void;
}

export const Navbar = ({ onSignupClick }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignupClick = () => {
    onSignupClick?.();
  };

  const navLinks = [
    { href: "#features", label: "Recursos" },
    { href: "#testimonials", label: "Depoimentos" },
    { href: "#pricing", label: "Planos" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className="fixed left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] top-0"
        style={{
          padding: scrolled ? '10px 16px 0' : '0',
        }}
      >
        <div
          className="mx-auto transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            maxWidth: scrolled ? '720px' : '100%',
            borderRadius: scrolled ? '9999px' : '0',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            backgroundColor: scrolled ? 'hsl(var(--background) / 0.65)' : 'hsl(var(--background) / 0.8)',
            border: scrolled ? '1px solid hsl(var(--border) / 0.4)' : '1px solid transparent',
            boxShadow: scrolled ? '0 8px 32px hsl(var(--background) / 0.3), 0 0 0 1px hsl(var(--primary) / 0.05)' : 'none',
            padding: scrolled ? '8px 20px' : '16px 16px',
          }}
        >
          <div className="flex items-center justify-between mx-auto" style={{ maxWidth: scrolled ? '100%' : '1280px' }}>
            <Logo size="md" mobileSize="md" />
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <a href="#pricing" onClick={handleSignupClick}>
                <Button variant="hero" size="sm" className="rounded-full">
                  Começar
                </Button>
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile menu - only when not scrolled */}
          {mobileMenuOpen && !scrolled && (
            <div className="sm:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
              <div className="flex flex-col gap-4 max-w-[1280px] mx-auto">
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Entrar
                    </Button>
                  </Link>
                  <a href="#pricing" onClick={() => { setMobileMenuOpen(false); handleSignupClick(); }}>
                    <Button variant="hero" size="sm" className="w-full justify-center">
                      Começar
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-[72px] sm:h-[80px]" />
    </>
  );
};
