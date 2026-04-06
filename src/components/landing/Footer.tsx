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
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-6">
              <img src={metaPartner} alt="Meta Business Partner" className="h-16 sm:h-20 object-contain" />
              <img src={googlePartner} alt="Google Partner Premier 2026" className="h-16 sm:h-20 object-contain" />
              <img src={gptwBadge} alt="Great Place To Work Certificado" className="h-16 sm:h-20 object-contain" />
            </div>

            <p className="text-[10px] sm:text-xs text-muted-foreground/40 text-center max-w-3xl mx-auto leading-relaxed">
              <strong className="text-muted-foreground/50">Aviso importante:</strong> O uso de ferramentas de automação para WhatsApp envolve riscos inerentes, incluindo possível bloqueio de números pelo WhatsApp. O Wiize oferece recursos de proteção e limites inteligentes para ajudar a reduzir esses riscos, mas não garante a ausência de bloqueios. Ao utilizar nossos serviços, você concorda em assumir total responsabilidade pelo uso da plataforma.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
