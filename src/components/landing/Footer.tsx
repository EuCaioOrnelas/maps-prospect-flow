import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export const Footer = () => {
 const currentYear = new Date().getFullYear();

 return (
 <footer className="py-8 sm:py-12 border-t border-border overflow-hidden w-full">
 <div className="container mx-auto px-4 max-w-6xl">
 <div className="flex flex-col items-center gap-6 text-center">
 <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between md:text-left w-full">
 <Logo size="sm" />
 
 <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
 <Link to="/terms" className="hover:text-foreground transition-colors">
 Termos de Uso
 </Link>
 <Link to="/privacy" className="hover:text-foreground transition-colors">
 Privacidade
 </Link>
 <Link to="/seguranca-faq" className="hover:text-foreground transition-colors">
 Segurança FAQ
 </Link>
 <Link to="/ajuda" className="hover:text-foreground transition-colors">
 Central de Ajuda
 </Link>
 </div>

 <p className="text-sm text-muted-foreground">
 © {currentYear} Wiize. Todos os direitos reservados.
 </p>
 </div>

 {/* Selos de qualidade - acima do aviso */}
 <div className="border-t border-border/50 pt-6 w-full">
 <p className="text-[10px] sm:text-xs text-muted-foreground/40 text-center max-w-3xl mx-auto leading-relaxed">
 <strong className="text-muted-foreground/50">Aviso importante:</strong> A Wiize utiliza integrações oficiais e recomenda o uso da plataforma em conformidade com as políticas dos canais de comunicação utilizados. O cliente é responsável pelos contatos e conteúdos enviados através da plataforma.
 </p>
 </div>
 </div>
 </div>
 </footer>
 );
};
