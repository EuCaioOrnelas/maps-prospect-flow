import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onRetry?: () => void;
}

export const EmailVerificationDialog = ({
  open,
  onOpenChange,
  email,
  onRetry,
}: EmailVerificationDialogProps) => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
    } catch (err) {
      toast({
        title: "Erro ao reenviar",
        description: "Aguarde alguns minutos e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="landing-light sm:max-w-md bg-background text-foreground border-border">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Verifique seu email
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Enviamos um link de confirmação para:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-semibold text-foreground text-center text-lg">
            {email}
          </p>

          <p className="text-muted-foreground text-sm text-center">
            Clique no link do email para ativar sua conta e começar a usar a plataforma.
          </p>

          {/* Spam Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400 text-sm">
                  Não encontrou o email?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verifique sua <strong>caixa de spam</strong> ou <strong>lixo eletrônico</strong>. 
                  Às vezes o email pode ir parar lá.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleResendEmail}
              disabled={resending}
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reenviar email de verificação
            </Button>

            <Link to="/login" className="w-full">
              <Button className="w-full" variant="default">
                Ir para o Login
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            {onRetry && (
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => {
                  onOpenChange(false);
                  onRetry();
                }}
              >
                Tentar com outro email
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Ainda com problemas?{" "}
            <Link to="/contato" className="text-primary hover:underline">
              Entre em contato
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
