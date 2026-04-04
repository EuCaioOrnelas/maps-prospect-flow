import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Menu, X, Shield, Zap, CreditCard, Gift, Bot, Flame } from "lucide-react";
import { useState } from "react";

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

  const handleSignupClick = () => {
    onSignupClick?.();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="lg" mobileSize="md" />
            
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
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/signup" onClick={handleSignupClick}>
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
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => { setMobileMenuOpen(false); handleSignupClick(); }}>
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
      <div className="h-[80px] sm:h-[88px]" />
      <PromoBanner />
    </>
  );
};