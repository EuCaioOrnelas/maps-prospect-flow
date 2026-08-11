import { Users, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const CRMComingSoon = () => {
  return (
    <>
      <SEO 
        title="CRM - Em Breve | Wiize"
        description="O CRM do Wiize está sendo desenvolvido e será lançado em breve."
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-[22px] flex items-center justify-center relative">
            <Users size={40} className="text-primary" />
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-500/20 rounded-[9px] flex items-center justify-center">
              <Sparkles size={16} className="text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              CRM em Breve
            </h1>
            <p className="text-muted-foreground text-lg">
              Estamos desenvolvendo um CRM completo para você gerenciar todos os seus leads em um só lugar.
            </p>
          </div>

          {/* Features preview */}
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
            <p className="text-sm font-medium text-foreground">O que está por vir:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Pipeline visual com drag-and-drop
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Histórico completo de interações
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Notas e tarefas por lead
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Integração com WhatsApp
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

export default CRMComingSoon;
