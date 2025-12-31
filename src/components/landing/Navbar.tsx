import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

export const PromoBanner = () => (
  <div className="bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-b border-primary/20 overflow-hidden">
    <div className="container mx-auto px-4 py-3 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)] animate-pulse" />
      <p className="text-center text-xs sm:text-sm text-muted-foreground relative z-10">
        <Sparkles size={14} className="inline-block mr-1.5 text-primary animate-pulse" />
        <span className="text-primary font-semibold">Promoção de Lançamento:</span>{" "}
        até 50% de desconto em todos os planos{" "}
        <span className="inline-flex items-center gap-1 ml-1 bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
          Por tempo limitado
        </span>
      </p>
    </div>
  </div>
);

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="md" />
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Depoimentos
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Planos
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
              <Link to="/contato" className="text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </Link>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="hero" size="sm">
                  Começar Grátis
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
              <div className="flex flex-col gap-4">
                <a 
                  href="#features" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Recursos
                </a>
                <a 
                  href="#testimonials" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Depoimentos
                </a>
                <a 
                  href="#pricing" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planos
                </a>
                <a 
                  href="#faq" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </a>
                <Link 
                  to="/contato" 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contato
                </Link>
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="hero" size="sm" className="w-full justify-center">
                      Começar Grátis
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer for fixed navbar + promo banner */}
      <div className="h-[72px] sm:h-[76px]" />
      <PromoBanner />
    </>
  );
};