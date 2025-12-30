import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Crown,
  Settings2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

interface NumbersManagerProps {
  numbers: WhatsAppNumber[];
  onNumbersChange: (numbers: WhatsAppNumber[]) => void;
  maxNumbers: number;
  onConnect: (numberId: string) => void;
}

const DAILY_LIMIT_PER_NUMBER = 200;

export const NumbersManager = ({
  numbers,
  onNumbersChange,
  maxNumbers,
  onConnect
}: NumbersManagerProps) => {
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState<string | null>(null);
  const [newNumberName, setNewNumberName] = useState("");
  const [connectingNumberId, setConnectingNumberId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasMassMessagingAccess = ['start', 'growth', 'scale'].includes(userPlan);
  const connectedNumbers = numbers.filter(n => n.is_connected);
  const hasConnectedNumber = connectedNumbers.length > 0;

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

  const handleDeleteNumber = async () => {
    if (!numberToDelete) return;

    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberToDelete);

      if (error) throw error;

      onNumbersChange(numbers.filter(n => n.id !== numberToDelete));
      setDeleteConfirmOpen(false);
      setNumberToDelete(null);

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

  const handleConnectNumber = async (numberId: string) => {
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
      onConnect(numberId);

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

  const openConnectDialog = (numberId: string) => {
    setConnectingNumberId(numberId);
    setConnectDialogOpen(true);
    setManageDialogOpen(false);
  };

  const confirmDelete = (numberId: string) => {
    setNumberToDelete(numberId);
    setDeleteConfirmOpen(true);
  };

  if (!hasMassMessagingAccess) {
    return (
      <Button variant="outline" size="sm" asChild className="gap-2">
        <a href="/upgrade">
          <Crown size={16} className="text-warning" />
          Fazer Upgrade
        </a>
      </Button>
    );
  }

  return (
    <>
      {/* Main Connect Button - Green and prominent */}
      <div className="flex items-center gap-2">
        {hasConnectedNumber ? (
          <Button 
            variant="outline"
            size="sm"
            className="gap-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
            onClick={() => setManageDialogOpen(true)}
          >
            <Wifi size={16} className="text-green-500" />
            <span className="hidden sm:inline">{connectedNumbers.length} Conectado(s)</span>
            <span className="sm:hidden">{connectedNumbers.length}</span>
          </Button>
        ) : (
          <Button 
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              if (numbers.length === 0) {
                setAddDialogOpen(true);
              } else {
                setManageDialogOpen(true);
              }
            }}
          >
            <Smartphone size={16} />
            <span className="hidden sm:inline">Conectar WhatsApp</span>
            <span className="sm:hidden">Conectar</span>
          </Button>
        )}

        {/* Manage Numbers Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setManageDialogOpen(true)}
          className="text-muted-foreground"
        >
          <Settings2 size={18} />
        </Button>
      </div>

      {/* Manage Numbers Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              Gerenciar Números ({numbers.length}/{maxNumbers})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {numbers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Nenhum número cadastrado
                </p>
                <Button onClick={() => { setManageDialogOpen(false); setAddDialogOpen(true); }} className="gap-2">
                  <Plus size={16} />
                  Adicionar Número
                </Button>
              </div>
            ) : (
              <>
                {numbers.map((number) => {
                  const isAtLimit = number.daily_sent_count >= DAILY_LIMIT_PER_NUMBER;
                  const usagePercent = (number.daily_sent_count / DAILY_LIMIT_PER_NUMBER) * 100;
                  
                  return (
                    <div 
                      key={number.id}
                      className="p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {number.is_connected ? (
                            <CheckCircle2 size={16} className="text-green-500" />
                          ) : (
                            <XCircle size={16} className="text-muted-foreground" />
                          )}
                          <span className="font-medium">{number.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(number.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Daily Usage */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Disparos hoje</span>
                          <span className={`font-medium ${isAtLimit ? 'text-destructive' : 'text-foreground'}`}>
                            {number.daily_sent_count}/{DAILY_LIMIT_PER_NUMBER}
                          </span>
                        </div>
                        <Progress 
                          value={usagePercent} 
                          className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : ''}`}
                        />
                        {isAtLimit && (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle size={12} />
                            Limite atingido - retoma às 08:00
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!number.is_connected ? (
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => openConnectDialog(number.id)}
                          >
                            <Wifi size={14} className="mr-1" />
                            Conectar
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleDisconnect(number.id)}
                          >
                            <WifiOff size={14} className="mr-1" />
                            Desconectar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {numbers.length < maxNumbers && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => { setManageDialogOpen(false); setAddDialogOpen(true); }}
                  >
                    <Plus size={16} />
                    Adicionar Número
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} />
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
              className="w-full bg-green-600 hover:bg-green-700"
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
                      onClick={() => connectingNumberId && handleConnectNumber(connectingNumberId)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-2xl"
                    >
                      <span className="text-white text-sm font-medium bg-green-600 px-4 py-2 rounded-lg">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir número?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O número será desconectado e removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNumber}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};