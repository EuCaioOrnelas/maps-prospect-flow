import { ArrowLeft, HelpCircle, MessageSquareText, Link2, Instagram, Youtube, Mail, Headphones, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

const HelpCenter = () => {
  const navigate = useNavigate();

  const usefulLinks = [
    { label: "Segurança e Proteção de Dados", hash: "seguranca" },
    { label: "API Oficial do Meta (Inbound)", hash: "meta-api" },
    { label: "Prospecção Outbound via Evolution API", hash: "whatsapp" },
    { label: "Bloqueios de WhatsApp e Prevenção", hash: "aquecimento" },
    { label: "Prospecção Inteligente e Buscas", hash: "plataforma" },
    { label: "Agentes de IA e Automação", hash: "agentes-ia" },
    { label: "CRM e Gestão de Leads", hash: "crm" },
    { label: "Planos, Pagamentos e Reembolso", hash: "planos" },
    { label: "Relatórios e Métricas", hash: "relatorios" },
    { label: "Como Conectar a Meta API Oficial", hash: "meta-api" },
    { label: "Termos de Uso", path: "/terms" },
    { label: "Política de Privacidade", path: "/privacy" },
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
                onClick={() => navigate(-1)}
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

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* FAQ Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Perguntas frequentes</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 flex-1">
                Lista de respostas para as dúvidas mais frequentes que os nossos usuários costumam ter. Antes de usar os outros meios de suporte, verifique se a sua dúvida já não está respondida aqui!
              </p>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/ajuda/faq">Ver FAQ's</Link>
                </Button>
              </div>
            </div>

            {/* Suporte Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Headphones size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Suporte</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 flex-1">
                Precisa de ajuda técnica? Tem algum problema com sua conta ou funcionalidade? Nossa equipe de suporte está pronta para ajudar você a resolver qualquer questão.
              </p>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/contato">Ir para Suporte</Link>
                </Button>
              </div>
            </div>

            {/* Links Úteis Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Link2 size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Links úteis</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mb-5">
                Separamos alguns links úteis sobre temas importantes.
              </p>
              <ul className="space-y-2.5 flex-1">
                {usefulLinks.map((link, i) => (
                  <li key={i}>
                    {link.path ? (
                      <Link
                        to={link.path}
                        className="text-primary hover:underline text-sm sm:text-base flex items-center gap-1.5"
                      >
                        <ExternalLink size={14} className="shrink-0" />
                        {link.label}
                      </Link>
                    ) : (
                      <Link
                        to={`/ajuda/faq#${link.hash}`}
                        className="text-primary hover:underline text-sm sm:text-base flex items-center gap-1.5"
                      >
                        <ExternalLink size={14} className="shrink-0" />
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sociais Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquareText size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Sociais</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mb-5 flex-1">
                Acompanhe nosso conteúdo, novidades e dicas nas redes sociais. Siga-nos para ficar por dentro de tudo!
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.instagram.com/wiizebrasil"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={20} className="text-foreground" />
                </a>
                <a
                  href="https://www.youtube.com/@wiizebrasil"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube size={20} className="text-foreground" />
                </a>
              </div>
            </div>

            {/* Fale Conosco Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Mail size={24} className="text-primary shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold">Fale conosco</h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mb-2 flex-1">
                E-mail comercial para assuntos não relacionados ao suporte:
              </p>
              <a
                href="mailto:Wiize.app@gmail.com"
                className="text-primary hover:underline font-medium text-sm sm:text-base"
              >
                Wiize.app@gmail.com
              </a>
              <p className="text-muted-foreground/70 text-xs sm:text-sm mt-3 leading-relaxed">
                E-mail exclusivo para tratativas comerciais, parcerias e semelhantes. Assuntos relacionados a suporte <strong>não</strong> serão respondidos.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HelpCenter;
