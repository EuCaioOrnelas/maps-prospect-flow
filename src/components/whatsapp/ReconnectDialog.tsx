import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, WifiOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numberId: string;
  instanceName: string;
  numberName: string;
  qrCode: string | null;
  onReconnected: () => void;
}

export const ReconnectDialog = ({
  open,
  onOpenChange,
  numberId,
  instanceName,
  numberName,
  qrCode: initialQrCode,
  onReconnected,
}: ReconnectDialogProps) => {
  const [qrCode, setQrCode] = useState<string | null>(initialQrCode);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [qrExpired, setQrExpired] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeInstanceName, setActiveInstanceName] = useState(instanceName);
  const [createdFreshInstance, setCreatedFreshInstance] = useState(false);

  useEffect(() => {
    setQrCode(initialQrCode);
    setQrExpired(false);
    setCountdown(60);
    setIsConnected(false);
    setActiveInstanceName(instanceName);
    setCreatedFreshInstance(false);
  }, [initialQrCode, instanceName, open]);

  // QR code countdown
  useEffect(() => {
    if (!open || !qrCode || qrExpired || isConnected) return;

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
  }, [open, qrCode, qrExpired, isConnected]);

  // Check connection status periodically
  useEffect(() => {
    if (!open || !qrCode || isConnected) return;

    const checkStatus = async () => {
      try {
        const response = await supabase.functions.invoke('evolution-check-status', {
          body: { instanceName: activeInstanceName, numberId },
        });

        if (response.data?.connected) {
          setIsConnected(true);
          setTimeout(() => {
            onReconnected();
            onOpenChange(false);
          }, 2000);
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [open, activeInstanceName, numberId, qrCode, isConnected, onReconnected, onOpenChange]);

  const handleRefreshQR = async () => {
    setLoading(true);
    try {
      if (activeInstanceName) {
        await supabase.functions.invoke('evolution-disconnect', {
          body: { instanceName: activeInstanceName, numberId, deleteInstance: true },
        });
      }

      const freshInstanceName = `wiize_reconnect_${numberId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setActiveInstanceName(freshInstanceName);
      setCreatedFreshInstance(true);

      const response = await supabase.functions.invoke('evolution-create-instance', {
        body: { instanceName: freshInstanceName, numberId },
      });

      if (response.data?.qrcode) {
        setQrCode(response.data.qrcode);
        setQrExpired(false);
        setCountdown(60);
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const qrResponse = await supabase.functions.invoke('evolution-get-qrcode', {
          body: { instanceName: freshInstanceName, numberId },
        });
        if (qrResponse.data?.qrcode) {
          setQrCode(qrResponse.data.qrcode);
          setQrExpired(false);
          setCountdown(60);
        }
      }
    } catch (err) {
      console.error('Error refreshing QR:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && createdFreshInstance && activeInstanceName && !isConnected) {
        supabase.functions.invoke('evolution-disconnect', {
          body: { instanceName: activeInstanceName, numberId, deleteInstance: true },
        }).catch((err) => console.error('Error cleaning cancelled reconnect instance:', err));
      }
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            Reconectar "{numberName}"
          </DialogTitle>
          <DialogDescription>
            Sua conexão WhatsApp foi perdida. Escaneie o QR Code para reconectar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {isConnected ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-green-500 font-medium">Reconectado com sucesso!</p>
            </div>
          ) : loading ? (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : qrExpired || !qrCode ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg space-y-4">
              <p className="text-muted-foreground text-sm text-center">
                {qrExpired ? "QR Code expirado" : "Gerando QR Code..."}
              </p>
              <Button onClick={handleRefreshQR} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Gerar novo QR Code
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <img 
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code"
                  className="w-64 h-64 rounded-lg"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Expira em <span className="font-mono font-bold text-foreground">{countdown}s</span>
                </p>
              </div>
            </>
          )}

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>1. Abra o WhatsApp no seu celular</p>
            <p>2. Vá em Configurações → Dispositivos conectados</p>
            <p>3. Escaneie este QR Code</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
