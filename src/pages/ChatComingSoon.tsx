import { MessageSquare, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const ChatComingSoon = () => {
  return (
    <>
      <SEO 
        title="Chat WhatsApp - Em Breve | WiizeProspect"
        description="O Chat integrado do WiizeProspect está sendo desenvolvido e será lançado em breve."
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
            <MessageSquare size={40} className="text-primary" />
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Chat WhatsApp em Breve
            </h1>
            <p className="text-muted-foreground text-lg">
              Estamos finalizando o chat integrado para você conversar com seus leads diretamente pelo WiizeProspect.
            </p>
          </div>

          {/* Features preview */}
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
            <p className="text-sm font-medium text-foreground">O que está por vir:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Chat em tempo real com WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Envio de imagens, áudios e documentos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Respostas rápidas personalizadas
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Histórico completo de conversas
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Notificações de novas mensagens
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Integração com CRM e campanhas
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Button asChild variant="outline" className="gap-2">
            <Link to="/dashboard">
              <ArrowLeft size={16} />
              Voltar para Prospecção
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default ChatComingSoon;