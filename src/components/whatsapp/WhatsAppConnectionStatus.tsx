import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhatsAppConnectionStatusProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WhatsAppConnectionStatus = ({
  isConnected,
  onConnect,
  onDisconnect
}: WhatsAppConnectionStatusProps) => {
  const [open, setOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Simulate QR code loading
  useEffect(() => {
    if (open && !isConnected) {
      setQrLoading(true);
      setQrExpired(false);
      setCountdown(60);
      const timer = setTimeout(() => {
        setQrLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, isConnected]);

  // QR code expiration countdown
  useEffect(() => {
    if (qrLoading || isConnected || qrExpired || !open) return;

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
  }, [qrLoading, isConnected, qrExpired, open]);

  const handleRefreshQR = () => {
    setQrLoading(true);
    setQrExpired(false);
    setCountdown(60);
    setTimeout(() => setQrLoading(false), 1500);
  };

  const handleSimulateConnect = () => {
    onConnect();
    setOpen(false);
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isConnected ? "outline" : "default"} 
          size="sm" 
          className="gap-2"
        >
          {isConnected ? (
            <>
              <Wifi size={16} className="text-green-500" />
              <span className="hidden sm:inline">WhatsApp Conectado</span>
              <span className="sm:hidden">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span className="hidden sm:inline">Conectar WhatsApp</span>
              <span className="sm:hidden">Conectar</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone size={20} />
            {isConnected ? "WhatsApp Conectado" : "Conectar WhatsApp"}
          </DialogTitle>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-green-600">Conectado!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Seu WhatsApp está pronto para disparos
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                A conexão permanece ativa enquanto você usa a plataforma. 
                Para desconectar, clique no botão abaixo.
              </p>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              className="w-full"
            >
              <XCircle size={16} className="mr-2" />
              Desconectar WhatsApp
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* QR Code Display */}
            <div className="flex flex-col items-center">
              <div className="relative w-56 h-56 bg-white rounded-2xl p-4">
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
                <p className="text-sm text-muted-foreground mt-3">
                  Expira em <span className="font-medium text-foreground">{countdown}s</span>
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 text-sm">
              <p className="font-medium">Como conectar:</p>
              <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no celular</li>
                <li>Vá em Menu → Aparelhos conectados</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>Escaneie o QR Code acima</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
