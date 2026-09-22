import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Instagram, Youtube, Lightbulb, ArrowUpRight } from "lucide-react";
import reclameAquiLogo from "@/assets/reclame-aqui-logo.png.asset.json";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const linkClass =
    "text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const socialClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <footer className="w-full overflow-hidden border-t border-border bg-card">
      <div className="container mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Logo size="sm" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Inteligência comercial B2B para prospectar empresas, organizar oportunidades e vender com mais contexto.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.instagram.com/wiize.app/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Wiize (@wiize.app)"
                className={socialClass}
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://www.youtube.com/@wiizebrasil"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube da Wiize (@wiizebrasil)"
                className={socialClass}
              >
                <Youtube className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <nav aria-label="Produto">
              <h2 className="mb-5 text-sm font-semibold text-foreground">Produto</h2>
              <ul className="space-y-3.5">
                <li><Link to="/#recursos" className={linkClass}>Recursos</Link></li>
                <li><Link to="/#pricing" className={linkClass}>Planos</Link></li>
                <li><Link to="/signup/escolher-plano" className={linkClass}>Teste grátis</Link></li>
                <li><Link to="/login" className={linkClass}>Entrar</Link></li>
              </ul>
            </nav>

            <nav aria-label="Empresa">
              <h2 className="mb-5 text-sm font-semibold text-foreground">Empresa</h2>
              <ul className="space-y-3.5">
                <li><Link to="/contato" className={linkClass}>Contato</Link></li>
                <li><Link to="/ajuda" className={linkClass}>Central de ajuda</Link></li>
                <li><Link to="/diretrizes-de-envio" className={linkClass}>Diretrizes de envio</Link></li>
                <li><Link to="/seguranca-faq" className={linkClass}>Segurança</Link></li>
              </ul>
            </nav>

            <div className="col-span-2 sm:col-span-1">
              <h2 className="mb-5 text-sm font-semibold text-foreground">Demandas</h2>
              <div className="space-y-3">
                <a
                  href="https://www.reclameaqui.com.br/empresa/61-420-593-caio-alexandre-de-souza-ornelas/sobre/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-20 items-center gap-3 rounded-panel border border-border bg-background p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Acessar o Reclame Aqui para reclamações"
                >
                  <img
                    src={reclameAquiLogo.url}
                    alt="Reclame Aqui"
                    className="h-10 w-10 shrink-0 rounded-lg bg-background object-contain p-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">Reclame Aqui</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      Reclamações e demandas
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                </a>

                <Link
                  to="/sugestoes"
                  className="group flex min-h-20 items-center gap-3 rounded-panel border border-border bg-background p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Enviar uma sugestão para a Wiize"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Lightbulb className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">Wiize Sugestões</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      Envie sua sugestão
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-border pt-7 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p>© {currentYear} Wiize. Todos os direitos reservados.</p>
            <p>Wiize · CNPJ 61.420.593/0001-30</p>
          </div>
          <nav aria-label="Documentos legais" className="flex flex-wrap gap-x-6 gap-y-3">
            <Link to="/terms" className={linkClass}>Termos de Uso</Link>
            <Link to="/privacy" className={linkClass}>Política de Privacidade</Link>
            <Link to="/refund-policy" className={linkClass}>Política de Reembolso</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};
