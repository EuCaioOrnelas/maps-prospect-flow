import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Send,
  QrCode,
  Loader2
} from "lucide-react";

interface QRCodeConnectionProps {
  isConnected: boolean;
  onConnect: () => void;
  onBack: () => void;
  onStartCampaign: () => void;
  totalLeads: number;
}

export const QRCodeConnection = ({
  isConnected,
  onConnect,
  onBack,
  onStartCampaign,
  totalLeads
}: QRCodeConnectionProps) => {
  const [qrLoading, setQrLoading] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Simulate QR code loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setQrLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // QR code expiration countdown
  useEffect(() => {
    if (qrLoading || isConnected || qrExpired) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrLoading, isConnected, qrExpired]);

  const handleRefreshQR = () => {
    setQrLoading(true);
    setQrExpired(false);
    setCountdown(60);
    setTimeout(() => setQrLoading(false), 1500);
  };

  // Simulate QR scan (for demo purposes - real implementation would use WebSocket)
  const handleSimulateConnect = () => {
    onConnect();
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Smartphone size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Conectar WhatsApp</h2>
        <p className="text-muted-foreground">
          Escaneie o QR Code com seu WhatsApp
        </p>
      </div>

      {!isConnected ? (
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 bg-white rounded-2xl p-4 mb-4">
              {qrLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-muted-foreground" />
                </div>
              ) : qrExpired ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <QrCode size={40} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">QR Code expirado</p>
                  <Button size="sm" variant="outline" onClick={handleRefreshQR}>
                    <RefreshCw size={14} className="mr-2" />
                    Gerar novo
                  </Button>
                </div>
              ) : (
                <>
                  {/* Placeholder QR Code Pattern */}
                  <div className="w-full h-full grid grid-cols-8 gap-1">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${
                          Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Simulated scan button for demo */}
                  <button
                    onClick={handleSimulateConnect}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-2xl"
                  >
                    <span className="text-white text-sm font-medium bg-primary px-4 py-2 rounded-lg">
                      Simular Conexão
                    </span>
                  </button>
                </>
              )}
            </div>

            {!qrExpired && !qrLoading && (
              <p className="text-sm text-muted-foreground">
                QR Code expira em <span className="font-medium text-foreground">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30">
            <p className="text-sm font-medium">Como conectar:</p>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">1</span>
                Abra o WhatsApp no seu celular
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">2</span>
                Toque em Menu ⋮ ou Configurações
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">3</span>
                Selecione "Aparelhos conectados"
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">4</span>
                Toque em "Conectar um aparelho"
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">5</span>
                Aponte a câmera para o QR Code acima
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connected State */}
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
              <CheckCircle2 size={40} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">WhatsApp Conectado!</h3>
            <p className="text-muted-foreground">
              Seu WhatsApp está pronto para os disparos
            </p>
          </div>

          {/* Campaign Summary */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
            <h4 className="font-medium">Resumo da Campanha</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de leads</p>
                <p className="font-medium text-lg">{totalLeads}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Variações</p>
                <p className="font-medium text-lg">5 mensagens</p>
              </div>
            </div>
          </div>

          <Button onClick={onStartCampaign} className="w-full h-12 text-lg gap-2">
            <Send size={20} />
            Iniciar Disparos
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-start mt-6 pt-6 border-t border-border">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Voltar
        </Button>
      </div>
    </div>
  );
};
