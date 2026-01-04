import { Smartphone, QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoConnectedNumbersProps {
  onConnectClick: () => void;
}

export const NoConnectedNumbers = ({ onConnectClick }: NoConnectedNumbersProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>
        
        {/* Title and Description */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Nenhum número conectado
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Para começar a enviar mensagens em massa, você precisa conectar seu WhatsApp 
            escaneando o QR Code com seu celular.
          </p>
        </div>
        
        {/* Steps */}
        <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Como conectar:</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para adicionar um novo número
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no seu celular e vá em <strong>Configurações → Dispositivos conectados</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code que aparecerá na tela
              </p>
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <Button 
          onClick={onConnectClick}
          size="lg"
          className="w-full gap-2 h-12 text-base"
        >
          <QrCode className="w-5 h-5" />
          Conectar WhatsApp
          <ArrowRight className="w-4 h-4" />
        </Button>
        
        {/* Security Note */}
        <p className="text-xs text-muted-foreground">
          🔒 Sua conexão é segura e criptografada. Você pode desconectar a qualquer momento.
        </p>
      </div>
    </div>
  );
};