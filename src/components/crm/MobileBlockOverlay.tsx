import { Monitor, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";

export const MobileBlockOverlay = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" asLink={false} />
        </div>
        
        <div className="relative">
          <div className="flex justify-center items-center gap-4">
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <Smartphone className="w-12 h-12 text-destructive" />
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Monitor className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            CRM disponível apenas no computador
          </h1>
          <p className="text-muted-foreground">
            Para uma melhor experiência com o CRM e todas suas funcionalidades de arrastar e soltar, 
            acesse pelo computador ou notebook.
          </p>
        </div>

        <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">💡 Dica</p>
          <p>
            Você pode usar o Chat e outras funcionalidades normalmente pelo celular. 
            O CRM requer uma tela maior para gerenciar seus leads de forma eficiente.
          </p>
        </div>
      </div>
    </div>
  );
};
