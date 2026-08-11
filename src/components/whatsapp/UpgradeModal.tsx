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
import { Crown, MessageSquare, Users, Zap, Check, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-warning/5 pointer-events-none" />
        
        <DialogHeader className="relative space-y-4 pt-2">
          <div className="mx-auto relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-warning to-warning/80 shadow-lg shadow-warning/25">
              <Crown className="h-8 w-8 text-warning-foreground" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Funcionalidade Premium
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Disparos em massa estão disponíveis nos planos pagos da Wiize
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="relative space-y-4 py-4">
          {/* Features list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Disparos em massa</p>
                <p className="text-xs text-muted-foreground">Até 200 mensagens por dia</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Até 5 números WhatsApp</p>
                <p className="text-xs text-muted-foreground">Conecte múltiplos números</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Automação inteligente</p>
                <p className="text-xs text-muted-foreground">Delays e pausas automáticas</p>
              </div>
            </div>
          </div>

          {/* Discount highlight */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-warning/20 p-4 border border-primary/30">
            <div className="absolute top-0 right-0 w-20 h-20 bg-warning/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Oferta especial</p>
                <p className="text-xl font-bold text-foreground">50% de desconto</p>
                <p className="text-xs text-muted-foreground">No primeiro mês de qualquer plano</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-warning/20 border border-warning/30">
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
            className="w-full text-muted-foreground"
          >
            Voltar ao Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
