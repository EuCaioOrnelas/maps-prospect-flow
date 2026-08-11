import { ArrowLeft, HelpCircle, MessageSquareText, Link2, Instagram, Youtube, Mail, Headphones, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";
import { SEO } from "@/components/SEO";

const HelpCenter = () => {
  const navigate = useNavigate();

  const usefulLinks = [
    { label: "Blog Wiize", path: "/blog" },
    { label: "Segurança e Proteção de Dados", hash: "seguranca" },
    { label: "WhatsApp via API Oficial da Meta", hash: "meta-api" },
    { label: "Campanhas e Disparos Oficiais", hash: "whatsapp" },
    { label: "Prospecção Inteligente e Buscas", hash: "plataforma" },
    { label: "Agentes de IA e Automação", hash: "agentes-ia" },
    { label: "Planos, Pagamentos e Reembolso", hash: "planos" },
    { label: "Como Conectar a Meta API Oficial", hash: "meta-api" },
    { label: "Diretrizes de Envio", path: "/diretrizes-de-envio" },
    { label: "Política de Reembolso", path: "/refund-policy" },
  ];

  return (
    <>
      <SEO
        title="Central de Ajuda - Wiize"
        description="Encontre respostas, suporte e links úteis para tirar o máximo proveito do Wiize."
        keywords="ajuda, suporte, FAQ, central de ajuda, wiize"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="gap-2 text-sm px-3"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Logo size="md" />
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10 sm:py-16 max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
              Central de Ajuda
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Nós acreditamos que todo o suporte e atenção aos nossos usuários é importante. Separamos abaixo alguns dos nossos meios de contato e recursos para que você possa usar o Wiize com toda segurança!
            </p>
          </div>

          {/* Cards Grid - 2 columns like reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* FAQ Card */}
            <div className="relative rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-[hsl(158,72%,45%)]/[0.06] rounded-full blur-3xl pointer-events-none group-hover:bg-[hsl(158,72%,45%)]/[0.1] transition-colors duration-500" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <HelpCircle size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Perguntas frequentes</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 flex-1 relative z-10">
                Lista de respostas para as dúvidas mais frequentes que os nossos usuários costumam ter. Antes de usar os outros meios de suporte, verifique se a sua dúvida já não está respondida aqui!
              </p>
              <div className="flex justify-end relative z-10">
                <Button asChild>
                  <Link to="/ajuda/faq">Ver FAQ's</Link>
                </Button>
              </div>
            </div>

            {/* Suporte Card */}
            <div className="relative rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[hsl(200,98%,45%)]/[0.06] rounded-full blur-3xl pointer-events-none group-hover:bg-[hsl(200,98%,45%)]/[0.1] transition-colors duration-500" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Headphones size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Suporte</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 flex-1 relative z-10">
                Precisa de ajuda técnica? Tem algum problema com sua conta ou funcionalidade? Nossa equipe de suporte está pronta para ajudar você a resolver qualquer questão.
              </p>
              <div className="flex justify-end relative z-10">
                <Button asChild>
                  <Link to="/contato">Ir para Suporte</Link>
                </Button>
              </div>
            </div>

            {/* Links Úteis Card */}
            <div className="relative rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[hsl(262,83%,58%)]/[0.05] rounded-full blur-3xl pointer-events-none group-hover:bg-[hsl(262,83%,58%)]/[0.09] transition-colors duration-500" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Link2 size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Links</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mb-5 relative z-10">
                Separamos alguns links úteis.
              </p>
              <ul className="space-y-2.5 flex-1 relative z-10">
                {usefulLinks.map((link, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-primary">•</span>
                    {link.path ? (
                      <Link
                        to={link.path}
                        className="text-primary hover:underline text-sm sm:text-base"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <Link
                        to={`/ajuda/faq#${link.hash}`}
                        className="text-primary hover:underline text-sm sm:text-base"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column: Sociais + Fale Conosco stacked */}
            <div className="flex flex-col gap-6 lg:gap-8">
              {/* Sociais Card */}
              <div className="relative rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-[hsl(340,75%,55%)]/[0.05] rounded-full blur-3xl pointer-events-none group-hover:bg-[hsl(340,75%,55%)]/[0.09] transition-colors duration-500" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <MessageSquareText size={24} className="text-primary shrink-0" />
                  <h2 className="text-2xl sm:text-3xl font-bold">Sociais</h2>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base mb-5 relative z-10">
                  Nossas redes sociais.
                </p>
                <div className="flex items-center gap-4 relative z-10">
                  <a
                    href="https://www.youtube.com/@wiizebrasil"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-[12px] bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube size={20} className="text-foreground" />
                  </a>
                  <a
                    href="https://www.instagram.com/wiizebrasil"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-[12px] bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={20} className="text-foreground" />
                  </a>
                </div>
              </div>

              {/* Fale Conosco Card */}
              <div className="relative rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[hsl(43,96%,56%)]/[0.06] rounded-full blur-3xl pointer-events-none group-hover:bg-[hsl(43,96%,56%)]/[0.1] transition-colors duration-500" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <Mail size={24} className="text-primary shrink-0" />
                  <h2 className="text-2xl sm:text-3xl font-bold">Fale conosco</h2>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base mb-2 relative z-10">
                  E-mail comercial para assuntos não relacionados ao suporte:{" "}
                  <a
                    href="mailto:Wiize.app@gmail.com"
                    className="text-primary hover:underline font-medium"
                  >
                    Wiize.app@gmail.com
                  </a>
                </p>
                <p className="text-muted-foreground/70 text-xs sm:text-sm mt-3 leading-relaxed relative z-10">
                  E-mail exclusivo para tratativas comerciais, parcerias e semelhantes. Assuntos relacionados a suporte <strong>não</strong> serão respondidos.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default HelpCenter;
