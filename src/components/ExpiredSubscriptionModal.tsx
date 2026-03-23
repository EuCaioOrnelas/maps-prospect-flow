import { AlertTriangle, CreditCard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useNavigate } from 'react-router-dom';

interface ExpiredSubscriptionModalProps {
  planName?: string;
  onLogout: () => void;
}

export const ExpiredSubscriptionModal = ({ planName, onLogout }: ExpiredSubscriptionModalProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />
      
      <div className="max-w-md w-full glass rounded-2xl p-8 text-center space-y-6 relative z-10">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        
        <div className="mx-auto w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle size={40} className="text-yellow-500" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Assinatura Expirada
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Sua assinatura{planName ? ` do plano ${planName}` : ''} expirou por falta de pagamento. 
            Renove agora para recuperar o acesso completo à plataforma.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-medium text-foreground">O que acontece agora:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Suas buscas foram limitadas ao plano gratuito
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Seus dados e leads foram preservados
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Renove para restaurar todos os recursos
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <Button 
            onClick={() => navigate('/upgrade')}
            variant="default"
            size="lg"
            className="w-full gap-2"
          >
            <CreditCard size={18} />
            Renovar Assinatura
          </Button>
          
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Continuar com plano gratuito
          </Button>

          <Button 
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground gap-2"
          >
            <LogOut size={16} />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};
