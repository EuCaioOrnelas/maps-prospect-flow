import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 sm:py-12 border-t border-border overflow-hidden w-full">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col items-center gap-4 sm:gap-6 text-center md:flex-row md:justify-between md:text-left">
          <Logo size="sm" variant="dark" />
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link to="/refund-policy" className="hover:text-foreground transition-colors">
              Reembolso
            </Link>
            <Link to="/contato" className="hover:text-foreground transition-colors">
              Contato
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            © {currentYear} Wiize. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
