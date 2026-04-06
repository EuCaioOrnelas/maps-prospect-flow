import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import metaPartner from "@/assets/badges/meta-partner.png";
import googlePartner from "@/assets/badges/google-partner.png";
import gptwBadge from "@/assets/badges/gptw.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 sm:py-12 border-t border-border overflow-hidden w-full">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Selos de qualidade */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <img src={metaPartner} alt="Meta Business Partner" className="h-12 sm:h-14 object-contain rounded-md" />
            <img src={googlePartner} alt="Google Partner Premier 2026" className="h-12 sm:h-14 object-contain rounded-md" />
            <img src={gptwBadge} alt="Great Place To Work Certificado" className="h-12 sm:h-14 object-contain rounded-md" />
          </div>

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

          <div className="border-t border-border/50 pt-4 w-full">
            <p className="text-[10px] sm:text-xs text-muted-foreground/40 text-center max-w-3xl mx-auto leading-relaxed">
              <strong className="text-muted-foreground/50">Aviso importante:</strong> O uso de ferramentas de automação para WhatsApp envolve riscos inerentes, incluindo possível bloqueio de números pelo WhatsApp. O Wiize oferece recursos de proteção e limites inteligentes para ajudar a reduzir esses riscos, mas não garante a ausência de bloqueios. Ao utilizar nossos serviços, você concorda em assumir total responsabilidade pelo uso da plataforma.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
