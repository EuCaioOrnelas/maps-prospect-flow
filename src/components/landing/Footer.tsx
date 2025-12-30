import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <Logo size="sm" />
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contato
            </a>
            <Link to="/admin" className="hover:text-foreground transition-colors">
              Admin
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2024 Prospex. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
