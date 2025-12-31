import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const [connectingInstanceName, setConnectingInstanceName] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasMassMessagingAccess = ['start', 'growth', 'scale'].includes(userPlan);
  const connectedNumbers = numbers.filter(n => n.is_connected);
  const hasConnectedNumber = connectedNumbers.length > 0;

  // Generate unique instance name
  const generateInstanceName = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `prospex_${user?.id?.substring(0, 8)}_${timestamp}_${random}`;
  }, [user?.id]);

  // Check connection status periodically
  useEffect(() => {
    if (!connectDialogOpen || !connectingNumberId || !connectingInstanceName || qrLoading) return;

    const checkStatus = async () => {
      try {
        setCheckingConnection(true);
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('evolution-check-status', {
          body: { 
            instanceName: connectingInstanceName,
            numberId: connectingNumberId 
          },
        });

        if (response.data?.connected) {
          // Update local state
          onNumbersChange(numbers.map(n => 
            n.id === connectingNumberId 
              ? { ...n, is_connected: true, phone_number: response.data.phoneNumber } 
              : n
          ));

          setConnectDialogOpen(false);
          onConnect(connectingNumberId);

          toast({
            title: "WhatsApp conectado!",
            description: response.data.phoneNumber 
              ? `Número ${response.data.phoneNumber} conectado com sucesso`
              : "Número pronto para disparos",
          });
        }
      } catch (err) {
        console.error('Error checking connection status:', err);
      } finally {
        setCheckingConnection(false);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [connectDialogOpen, connectingNumberId, connectingInstanceName, qrLoading, numbers, onNumbersChange, onConnect, toast]);

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

  const createInstanceAndGetQR = async (numberId: string, instanceName: string) => {
    setQrLoading(true);
    setQrExpired(false);
    setQrCode(null);
    setCountdown(60);

    try {
      // Create instance in Evolution API
      const createResponse = await supabase.functions.invoke('evolution-create-instance', {
        body: { 
          numberId,
          instanceName 
        },
      });

      if (createResponse.error) {
        throw new Error(createResponse.error.message);
      }

      console.log('Instance created:', createResponse.data);

      // If QR code came with instance creation
      if (createResponse.data?.qrcode) {
        setQrCode(createResponse.data.qrcode);
        setQrLoading(false);
        return;
      }

      // Otherwise, get QR code separately
      const qrResponse = await supabase.functions.invoke('evolution-get-qrcode', {
        body: { instanceName },
      });

      if (qrResponse.error) {
        throw new Error(qrResponse.error.message);
      }

      if (qrResponse.data?.qrcode) {
        setQrCode(qrResponse.data.qrcode);
      } else {
        throw new Error('QR Code não disponível');
      }

    } catch (err) {
      console.error('Error creating instance:', err);
      toast({
        title: "Erro ao gerar QR Code",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
      setQrExpired(true);
    } finally {
      setQrLoading(false);
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
      const instanceName = generateInstanceName();

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
      setConnectingInstanceName(instanceName);
      setConnectDialogOpen(true);

      // Create instance and get QR
      await createInstanceAndGetQR(data.id, instanceName);

      toast({
        title: "Número adicionado",
        description: "Escaneie o QR Code para conectar",
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
      // Find the number to get instance name
      const numberToRemove = numbers.find(n => n.id === numberToDelete);
      
      // Try to disconnect from Evolution API if connected
      if (numberToRemove?.is_connected && numberToRemove.instance_name) {
        try {
          await supabase.functions.invoke('evolution-disconnect', {
            body: { 
              instanceName: numberToRemove.instance_name,
              numberId: numberToDelete 
            },
          });
        } catch (e) {
          console.error('Error disconnecting from Evolution:', e);
        }
      }

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

  const handleDisconnect = async (numberId: string) => {
    const numberToDisconnect = numbers.find(n => n.id === numberId);
    if (!numberToDisconnect) {
      toast({
        title: "Erro",
        description: "Número não encontrado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // If there's an instance name, try to disconnect from Evolution API
      if (numberToDisconnect.instance_name) {
        try {
          const response = await supabase.functions.invoke('evolution-disconnect', {
            body: { 
              instanceName: numberToDisconnect.instance_name,
              numberId 
            },
          });
          console.log('Disconnect response:', response);
        } catch (e) {
          console.error('Error calling evolution-disconnect:', e);
          // Continue anyway to update local state
        }
      }

      // Update in database directly as a fallback
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          phone_number: null,
          instance_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId);

      if (error) throw error;

      // Update local state
      onNumbersChange(numbers.map(n => 
        n.id === numberId ? { ...n, is_connected: false, phone_number: null, instance_name: null } : n
      ));

      toast({
        title: "WhatsApp desconectado",
        description: "Conecte novamente para disparar mensagens",
      });
    } catch (err) {
      console.error('Error disconnecting number:', err);
      toast({
        title: "Erro",
        description: "Não foi possível desconectar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!connectingNumberId) return;
    const instanceName = generateInstanceName();
    setConnectingInstanceName(instanceName);
    await createInstanceAndGetQR(connectingNumberId, instanceName);
  };

  const openConnectDialog = async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (!number) return;

    const instanceName = generateInstanceName();
    
    setConnectingNumberId(numberId);
    setConnectingInstanceName(instanceName);
    setConnectDialogOpen(true);
    setManageDialogOpen(false);

    await createInstanceAndGetQR(numberId, instanceName);
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
            onClick={() => {
              if (numbers.length === 0) {
                setAddDialogOpen(true);
              } else {
                setManageDialogOpen(true);
              }
            }}
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

        {/* Manage Numbers Button - More prominent */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setManageDialogOpen(true)}
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
        >
          <Settings2 size={16} />
          <span className="hidden sm:inline">Gerenciar Números</span>
          <span className="sm:hidden">Gerenciar</span>
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
                          <div>
                            <span className="font-medium">{number.name}</span>
                            {number.phone_number && (
                              <p className="text-xs text-muted-foreground">{number.phone_number}</p>
                            )}
                          </div>
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
              <div className="relative w-64 h-64 bg-white rounded-2xl p-2 flex items-center justify-center">
                {qrLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 size={40} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                  </div>
                ) : qrExpired ? (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <QrCode size={40} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">QR Code expirado</p>
                    <Button size="sm" variant="outline" onClick={handleRefreshQR}>
                      <RefreshCw size={14} className="mr-2" />
                      Gerar novo
                    </Button>
                  </div>
                ) : qrCode ? (
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <QrCode size={40} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Erro ao carregar QR Code</p>
                    <Button size="sm" variant="outline" onClick={handleRefreshQR} className="mt-3">
                      <RefreshCw size={14} className="mr-2" />
                      Tentar novamente
                    </Button>
                  </div>
                )}
              </div>

              {!qrExpired && !qrLoading && qrCode && (
                <div className="flex flex-col items-center gap-2 mt-3">
                  <p className="text-sm text-muted-foreground">
                    Expira em <span className="font-medium text-foreground">{countdown}s</span>
                  </p>
                  {checkingConnection && (
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <Loader2 size={12} className="animate-spin" />
                      Aguardando conexão...
                    </div>
                  )}
                </div>
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
