import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, Home, Sparkles } from "lucide-react";

interface FreeTrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedMessages: number;
  limit: number;
}

export function FreeTrialLimitModal({ isOpen, onClose, usedMessages, limit }: FreeTrialLimitModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/upgrade');
  };

  const handleBack = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleBack()}>
      <DialogContent className="sm:max-w-md border-border/50 bg-gradient-to-b from-card to-card/95 overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-primary/5 pointer-events-none" />
        
        <DialogHeader className="relative space-y-4 pt-2">
          <div className="mx-auto relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl font-bold">
              Limite Gratuito Atingido
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você já usou seus <span className="font-semibold text-foreground">{limit} disparos gratuitos</span> do período de teste
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="relative space-y-4 py-4">
          {/* Usage info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
            <p className="text-3xl font-bold text-foreground">{usedMessages}/{limit}</p>
            <p className="text-sm text-muted-foreground">disparos utilizados</p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Para continuar enviando mensagens em massa, escolha um plano que se adapta ao seu negócio.
          </p>

          {/* Discount highlight */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-warning/20 p-4 border border-primary/30">
            <div className="absolute top-0 right-0 w-20 h-20 bg-warning/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Oferta especial</p>
                <p className="text-xl font-bold text-foreground">50% de desconto</p>
                <p className="text-xs text-muted-foreground">No primeiro mês de qualquer plano</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 border border-warning/30">
                <Sparkles className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="relative flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleUpgrade} 
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
            size="lg"
          >
            <Crown className="h-4 w-4" />
            Adquirir plano com desconto
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="w-full text-muted-foreground gap-2"
          >
            <Home className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
