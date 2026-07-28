import { ShieldX, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface BlockedUserModalProps {
  onLogout: () => void;
}

export const BlockedUserModal = ({ onLogout }: BlockedUserModalProps) => {
  const handleContactSupport = () => {
    // Open WhatsApp support or email
    window.open('https://wa.me/5511999999999?text=Olá! Minha conta foi bloqueada e acredito que foi um erro. Gostaria de solicitar uma revisão.', '_blank');
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:wiize.app@gmail.com?subject=Conta Bloqueada - Solicitação de Revisão&body=Olá! Minha conta foi bloqueada e acredito que foi um erro. Gostaria de solicitar uma revisão.';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="max-w-md w-full glass rounded-2xl p-8 text-center space-y-6 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldX size={40} className="text-destructive" />
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Conta Bloqueada
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Sua conta foi bloqueada por violar as{' '}
            <a href="/terms" target="_blank" className="text-primary hover:underline">
              Políticas de Uso
            </a>{' '}
            da plataforma.
          </p>
          <p className="text-sm text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com nosso suporte para solicitar uma revisão.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button 
            onClick={() => window.location.href = '/contact'}
            variant="default"
            size="lg"
            className="w-full gap-2"
          >
            <MessageCircle size={18} />
            Entrar em Contato
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

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Código de referência: {new Date().getTime().toString(36).toUpperCase()}
        </p>
      </div>
    </div>
  );
};