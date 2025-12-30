import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Smartphone, 
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  RefreshCw,
  Wifi,
  WifiOff,
  Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
  daily_sent_count: number;
  last_sent_at: string | null;
}

interface ConnectedNumbersProps {
  selectedNumberId: string | null;
  onSelectNumber: (numberId: string | null) => void;
  numbers: WhatsAppNumber[];
  onNumbersChange: (numbers: WhatsAppNumber[]) => void;
  maxNumbers: number;
}

const DAILY_LIMIT_PER_NUMBER = 200;

export const ConnectedNumbers = ({
  selectedNumberId,
  onSelectNumber,
  numbers,
  onNumbersChange,
  maxNumbers
}: ConnectedNumbersProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [newNumberName, setNewNumberName] = useState("");
  const [connectingNumberId, setConnectingNumberId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Check if user has access to mass messaging (paid plans only)
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasMassMessagingAccess = ['start', 'growth', 'scale'].includes(userPlan);

  useEffect(() => {
    if (user && hasMassMessagingAccess) {
      fetchNumbers();
    }
  }, [user, hasMassMessagingAccess]);

  // QR code loading simulation
  useEffect(() => {
    if (connectDialogOpen && connectingNumberId) {
      setQrLoading(true);
      setQrExpired(false);
      setCountdown(60);
      const timer = setTimeout(() => {
        setQrLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [connectDialogOpen, connectingNumberId]);

  // QR code expiration countdown
  useEffect(() => {
    if (qrLoading || qrExpired || !connectDialogOpen) return;

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
  }, [qrLoading, qrExpired, connectDialogOpen]);

  const fetchNumbers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      onNumbersChange(data || []);
    } catch (err) {
      console.error('Error fetching numbers:', err);
    }
  };

  const handleAddNumber = async () => {
    if (!user || !newNumberName.trim()) return;

    if (numbers.length >= maxNumbers) {
      toast({
        title: "Limite atingido",
        description: `Seu plano permite no máximo ${maxNumbers} número(s)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .insert({
          user_id: user.id,
          name: newNumberName.trim()
        })
        .select()
        .single();

      if (error) throw error;

      onNumbersChange([...numbers, data]);
      setNewNumberName("");
      setAddDialogOpen(false);
      
      // Open connection dialog for new number
      setConnectingNumberId(data.id);
      setConnectDialogOpen(true);

      toast({
        title: "Número adicionado",
        description: "Agora conecte seu WhatsApp",
      });
    } catch (err) {
      console.error('Error adding number:', err);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o número",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNumber = async (numberId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberId);

      if (error) throw error;

      onNumbersChange(numbers.filter(n => n.id !== numberId));
      
      if (selectedNumberId === numberId) {
        onSelectNumber(null);
      }

      toast({
        title: "Número removido",
        description: "O número foi desconectado e removido",
      });
    } catch (err) {
      console.error('Error deleting number:', err);
      toast({
        title: "Erro",
        description: "Não foi possível remover o número",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async (numberId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ is_connected: true })
        .eq('id', numberId);

      if (error) throw error;

      onNumbersChange(numbers.map(n => 
        n.id === numberId ? { ...n, is_connected: true } : n
      ));

      setConnectDialogOpen(false);
      onSelectNumber(numberId);

      toast({
        title: "WhatsApp conectado!",
        description: "Número pronto para disparos",
      });
    } catch (err) {
      console.error('Error connecting number:', err);
    }
  };

  const handleDisconnect = async (numberId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ is_connected: false })
        .eq('id', numberId);

      if (error) throw error;

      onNumbersChange(numbers.map(n => 
        n.id === numberId ? { ...n, is_connected: false } : n
      ));

      if (selectedNumberId === numberId) {
        onSelectNumber(null);
      }

      toast({
        title: "WhatsApp desconectado",
        description: "Conecte novamente para disparar mensagens",
      });
    } catch (err) {
      console.error('Error disconnecting number:', err);
    }
  };

  const handleRefreshQR = () => {
    setQrLoading(true);
    setQrExpired(false);
    setCountdown(60);
    setTimeout(() => setQrLoading(false), 1500);
  };

  const connectedNumbers = numbers.filter(n => n.is_connected);
  const selectedNumber = numbers.find(n => n.id === selectedNumberId);

  if (!hasMassMessagingAccess) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
        <Crown size={16} className="text-warning" />
        <span className="text-sm">
          Disparos em massa exclusivo para planos pagos
        </span>
        <Button variant="outline" size="sm" asChild>
          <a href="/upgrade">Fazer Upgrade</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Number selector */}
      {numbers.length > 0 && (
        <Select
          value={selectedNumberId || ""}
          onValueChange={(value) => onSelectNumber(value || null)}
        >
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-2">
              {selectedNumber?.is_connected ? (
                <Wifi size={14} className="text-green-500" />
              ) : (
                <WifiOff size={14} className="text-muted-foreground" />
              )}
              <SelectValue placeholder="Selecionar número" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {numbers.map((number) => (
              <SelectItem key={number.id} value={number.id}>
                <div className="flex items-center gap-2">
                  {number.is_connected ? (
                    <CheckCircle2 size={12} className="text-green-500" />
                  ) : (
                    <XCircle size={12} className="text-muted-foreground" />
                  )}
                  <span>{number.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({number.daily_sent_count}/{DAILY_LIMIT_PER_NUMBER})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Add number button */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={numbers.length >= maxNumbers}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">
              {numbers.length}/{maxNumbers}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              Adicionar Número WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do número</Label>
              <Input
                value={newNumberName}
                onChange={(e) => setNewNumberName(e.target.value)}
                placeholder="Ex: WhatsApp Principal"
              />
              <p className="text-xs text-muted-foreground">
                Dê um nome para identificar este número
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                Seu plano permite <strong>{maxNumbers} número(s)</strong>.
                Você tem <strong>{numbers.length}</strong> cadastrado(s).
              </p>
            </div>

            <Button 
              onClick={handleAddNumber} 
              className="w-full"
              disabled={!newNumberName.trim() || loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Adicionar e Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect QR Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
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
                    
                    <button
                      onClick={() => connectingNumberId && handleConnect(connectingNumberId)}
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
        </DialogContent>
      </Dialog>

      {/* Numbers management dropdown */}
      {connectedNumbers.length > 0 && selectedNumber && (
        <div className="flex items-center gap-2">
          {!selectedNumber.is_connected && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setConnectingNumberId(selectedNumber.id);
                setConnectDialogOpen(true);
              }}
            >
              Conectar
            </Button>
          )}
          {selectedNumber.is_connected && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDisconnect(selectedNumber.id)}
            >
              <WifiOff size={14} className="mr-1" />
              Desconectar
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDeleteNumber(selectedNumber.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};