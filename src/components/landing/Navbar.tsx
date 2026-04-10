import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Menu, X, Shield, Zap, CreditCard, Gift, Bot, Flame } from "lucide-react";
import { useState, useEffect } from "react";

const promoItems = [
  { icon: Shield, text: "API Oficial do WhatsApp: Meta Business Partner verificado" },
  { icon: Gift, text: "Até 63% de desconto nos planos: oferta por tempo limitado" },
  { icon: Zap, text: "Até 50% de desconto nos planos: promoção por tempo limitado" },
  { icon: CreditCard, text: "PIX recorrente: parcele sem cartão, débito automático mensal" },
  { icon: Bot, text: "Agente de IA no WhatsApp: atendimento automático 24h" },
  { icon: Flame, text: "Mensagens personalizadas com IA para cada lead" },
];

export const PromoBanner = () => {
  const marqueeItems = [...promoItems, ...promoItems];

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-b border-primary/20 overflow-hidden">
      <div className="relative py-2.5">
        <motion.div
          className="flex w-max min-w-max whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 36,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          {marqueeItems.map((item, i) => (
            <span
              key={`${item.text}-${i}`}
              className="inline-flex items-center gap-1.5 pr-10 text-xs sm:text-sm text-muted-foreground shrink-0"
            >
              <item.icon size={14} className="text-primary" />
              <span>{item.text}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

interface NavbarProps {
  onSignupClick?: () => void;
}

export const Navbar = ({ onSignupClick }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <>
      <nav
        className={`fixed left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'top-3 mx-auto max-w-3xl px-2 sm:px-0'
            : 'top-0'
        }`}
      >
        <div
          className={`transition-all duration-500 ease-out ${
            scrolled
              ? 'rounded-full backdrop-blur-xl bg-background/70 border border-border/50 shadow-lg shadow-background/20 px-5 py-2.5'
              : 'glass px-4 py-4'
          }`}
        >
          <div className={`flex items-center justify-between ${scrolled ? '' : 'container mx-auto'}`}>
            <Logo size={scrolled ? "md" : "lg"} mobileSize="md" />
            
            <div className={`hidden md:flex items-center ${scrolled ? 'gap-5' : 'gap-8'}`}>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Recursos
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Depoimentos
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Planos
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                FAQ
              </a>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className={scrolled ? 'h-8 text-xs px-3' : ''}>
                  Entrar
                </Button>
              </Link>
              <a href="#pricing" onClick={handleSignupClick}>
                <Button variant="hero" size="sm" className={scrolled ? 'h-8 text-xs px-4 rounded-full' : ''}>
                  Começar
                </Button>
              </a>
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
          {mobileMenuOpen && !scrolled && (
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

      {/* Spacer for fixed navbar + promo banner */}
      <div className="h-[80px] sm:h-[88px]" />
      <PromoBanner />
    </>
  );
};
