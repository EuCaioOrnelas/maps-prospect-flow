import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  PartyPopper,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/supabaseWithRetry";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

interface NumbersManagerProps {
  numbers: WhatsAppNumber[];
  onNumbersChange: (numbers: WhatsAppNumber[]) => void;
  maxNumbers: number;
  onConnect: (numberId: string, shouldSync?: boolean) => void;
  forceOpen?: boolean;
  onClose?: () => void;
  hideButtons?: boolean;
}

const DAILY_LIMIT_PER_NUMBER = 200;

export const NumbersManager = ({
  numbers,
  onNumbersChange,
  maxNumbers,
  onConnect,
  forceOpen = false,
  onClose,
  hideButtons = false
}: NumbersManagerProps) => {
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
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
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [numberToRename, setNumberToRename] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  
  // Track if we're creating a NEW number (not saved to DB yet) vs connecting existing one
  const [pendingNumberName, setPendingNumberName] = useState<string | null>(null);
  
  // Warming sessions for each number
  const [warmingSessions, setWarmingSessions] = useState<Record<string, { warming_level: number; warming_status: string; status: string }>>({});
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch warming sessions when dialog opens
  useEffect(() => {
    const fetchWarmingSessions = async () => {
      if (!manageDialogOpen || numbers.length === 0) return;
      
      const numberIds = numbers.map(n => n.id);
      const { data } = await supabase
        .from('warming_sessions')
        .select('whatsapp_number_id, warming_level, warming_status, status')
        .in('whatsapp_number_id', numberIds);
      
      if (data) {
        const sessionsMap: Record<string, { warming_level: number; warming_status: string; status: string }> = {};
        data.forEach(session => {
          sessionsMap[session.whatsapp_number_id] = {
            warming_level: session.warming_level,
            warming_status: session.warming_status,
            status: session.status
          };
        });
        setWarmingSessions(sessionsMap);
      }
    };
    
    fetchWarmingSessions();
  }, [manageDialogOpen, numbers]);

  // Handle forceOpen prop - open manage dialog when there are numbers, add dialog when empty
  useEffect(() => {
    if (forceOpen) {
      if (numbers.length > 0) {
        setManageDialogOpen(true);
      } else {
        setAddDialogOpen(true);
      }
    }
  }, [forceOpen, numbers.length]);

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    setManageDialogOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  const handleAddDialogClose = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasMassMessagingAccess = ['start', 'growth', 'scale'].includes(userPlan);
  const connectedNumbers = numbers.filter(n => n.is_connected);
  const hasConnectedNumber = connectedNumbers.length > 0;

  // Pagination logic
  const totalPages = Math.ceil(numbers.length / ITEMS_PER_PAGE);
  const paginatedNumbers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return numbers.slice(start, start + ITEMS_PER_PAGE);
  }, [numbers, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when numbers change
  useEffect(() => {
    if (currentPage > Math.ceil(numbers.length / ITEMS_PER_PAGE)) {
      setCurrentPage(1);
    }
  }, [numbers.length, currentPage, ITEMS_PER_PAGE]);

  // Generate unique instance name
  const generateInstanceName = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `wiizeprospect_${user?.id?.substring(0, 8)}_${timestamp}_${random}`;
  }, [user?.id]);

  // Refresh connection status for all numbers
  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      // Check each connected number's real status
      for (const number of numbers) {
        if (number.is_connected && number.instance_name) {
          try {
            const response = await supabase.functions.invoke('evolution-check-status', {
              body: { instanceName: number.instance_name, numberId: number.id },
            });

            const isReallyConnected = response.data?.connected === true;
            
            if (!isReallyConnected) {
              // Update database
              await supabase
                .from('whatsapp_numbers')
                .update({ 
                  is_connected: false,
                  phone_number: null,
                  instance_name: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', number.id);

              // Update local state
              onNumbersChange(numbers.map(n => 
                n.id === number.id 
                  ? { ...n, is_connected: false, phone_number: null, instance_name: null } 
                  : n
              ));

              toast({
                title: "Conexão perdida",
                description: `O número "${number.name}" foi desconectado`,
                variant: "destructive",
              });
            }
          } catch (e) {
            console.error('Error checking status for', number.name, e);
          }
        }
      }

      toast({
        title: "Status atualizado",
        description: "Verificação de conexões concluída",
      });
    } catch (err) {
      console.error('Error refreshing status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check connection status periodically
  useEffect(() => {
    if (!connectDialogOpen || !connectingInstanceName || qrLoading) return;
    
    // For NEW numbers, we don't have an ID yet - check based on instance name
    const isNewNumber = pendingNumberName !== null;

    const checkStatus = async () => {
      try {
        setCheckingConnection(true);
        
        const { data, error } = await invokeWithRetry<{
          connected: boolean;
          phoneNumber?: string;
          requiresReauth?: boolean;
        }>('evolution-check-status', {
          body: { 
            instanceName: connectingInstanceName,
            numberId: isNewNumber ? null : connectingNumberId 
          },
        }, {
          maxRetries: 1,
          onSessionRefreshed: () => {
            console.log('[NumbersManager] Session refreshed during connection check');
          }
        });

        if (error) {
          console.log('Error checking connection status:', error);
          return;
        }

        if (data?.connected) {
          // Show success animation
          setShowSuccessAnimation(true);
          
          if (isNewNumber && user) {
            // NOW create the number in database since connection succeeded
            const { data: newNumber, error: insertError } = await supabase
              .from('whatsapp_numbers')
              .insert({
                user_id: user.id,
                name: pendingNumberName,
                is_connected: true,
                phone_number: data.phoneNumber || null,
                instance_name: connectingInstanceName
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('Error saving number:', insertError);
              toast({
                title: "Erro ao salvar",
                description: "Conexão bem-sucedida mas erro ao salvar. Tente novamente.",
                variant: "destructive",
              });
              return;
            }
            
            // Add to local state
            onNumbersChange([...numbers, newNumber]);
            
            // Wait for animation then close and trigger sync
            setTimeout(() => {
              setShowSuccessAnimation(false);
              setConnectDialogOpen(false);
              onConnect(newNumber.id, true); // Pass true to trigger sync
              
              // Reset all states
              setPendingNumberName(null);
            }, 2000);
          } else {
            // Existing number - just update local state
            onNumbersChange(numbers.map(n => 
              n.id === connectingNumberId 
                ? { ...n, is_connected: true, phone_number: data.phoneNumber, instance_name: connectingInstanceName } 
                : n
            ));

            // Wait for animation then close
            setTimeout(() => {
              setShowSuccessAnimation(false);
              setConnectDialogOpen(false);
              if (connectingNumberId) onConnect(connectingNumberId);
            }, 2000);
          }

          toast({
            title: "WhatsApp conectado!",
            description: data.phoneNumber 
              ? `Número ${data.phoneNumber} conectado com sucesso`
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
  }, [connectDialogOpen, connectingNumberId, connectingInstanceName, qrLoading, numbers, onNumbersChange, onConnect, toast, pendingNumberName, user]);

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

  const createInstanceAndGetQR = async (numberId: string | null, instanceName: string) => {
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

      // Get QR code
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

      // DON'T save to database yet - wait for successful connection
      // Just store the name and open the connection modal
      setPendingNumberName(newNumberName.trim());
      setNewNumberName("");
      setAddDialogOpen(false);
      
      // Open connection dialog - NO numberId since it doesn't exist yet
      setConnectingNumberId(null);
      setConnectingInstanceName(instanceName);
      setConnectDialogOpen(true);

      // Create instance in Evolution API and get QR
      await createInstanceAndGetQR(null, instanceName);

      toast({
        title: "Quase lá!",
        description: "Escaneie o QR Code para conectar e salvar o número",
      });
    } catch (err) {
      console.error('Error starting connection:', err);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conexão",
        variant: "destructive",
      });
      setPendingNumberName(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNumber = async () => {
    if (!numberToDelete) return;

    setLoading(true);
    try {
      // Find the number to get instance name
      const numberToRemove = numbers.find(n => n.id === numberToDelete);
      
      // Always try to disconnect from Evolution API if there's an instance name
      // This ensures the WhatsApp session is terminated even if is_connected is false
      if (numberToRemove?.instance_name) {
        try {
          console.log('Disconnecting instance:', numberToRemove.instance_name);
          const response = await supabase.functions.invoke('evolution-disconnect', {
            body: { 
              instanceName: numberToRemove.instance_name,
              numberId: numberToDelete 
            },
          });
          console.log('Disconnect response:', response);
        } catch (e) {
          console.error('Error disconnecting from Evolution:', e);
        }
      }

      // First, unlink any campaigns associated with this number
      const { error: unlinkError } = await supabase
        .from('whatsapp_campaigns')
        .update({ whatsapp_number_id: null })
        .eq('whatsapp_number_id', numberToDelete);

      if (unlinkError) {
        console.error('Error unlinking campaigns:', unlinkError);
        // Continue anyway, this shouldn't block deletion
      }

      // Now delete the number
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
        description: err instanceof Error ? err.message : "Não foi possível remover o número",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleReconfigureWebhook = async (instanceName: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('evolution-reconfigure-webhook', {
        body: { instanceName },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "Webhook sincronizado!",
          description: "As mensagens recebidas agora aparecerão no chat",
        });
      } else {
        throw new Error(response.data?.message || 'Falha ao sincronizar');
      }
    } catch (err) {
      console.error('Error reconfiguring webhook:', err);
      toast({
        title: "Erro ao sincronizar",
        description: err instanceof Error ? err.message : "Tente novamente",
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

  const openRenameDialog = (numberId: string, currentName: string) => {
    setNumberToRename(numberId);
    setNewName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameNumber = async () => {
    if (!numberToRename || !newName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', numberToRename);

      if (error) throw error;

      onNumbersChange(numbers.map(n => 
        n.id === numberToRename ? { ...n, name: newName.trim() } : n
      ));

      setRenameDialogOpen(false);
      setNumberToRename(null);
      setNewName("");

      toast({
        title: "Nome atualizado",
        description: "O número foi renomeado com sucesso",
      });
    } catch (err) {
      console.error('Error renaming number:', err);
      toast({
        title: "Erro",
        description: "Não foi possível renomear o número",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
      {!hideButtons && (
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
      )}

      {/* Manage Numbers Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={20} />
                Gerenciar Números ({numbers.length}/{maxNumbers})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>
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
                {paginatedNumbers.map((number) => {
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRenameDialog(number.id, number.name)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(number.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Warming Level Badge */}
                      {warmingSessions[number.id] && (
                        <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/50">
                          <Flame 
                            size={16} 
                            className={
                              warmingSessions[number.id].warming_status === 'hot' 
                                ? 'text-orange-500' 
                                : warmingSessions[number.id].warming_status === 'warm'
                                  ? 'text-yellow-500'
                                  : 'text-blue-400'
                            } 
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Aquecimento</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  warmingSessions[number.id].warming_status === 'hot' 
                                    ? 'bg-orange-500/20 text-orange-500' 
                                    : warmingSessions[number.id].warming_status === 'warm'
                                      ? 'bg-yellow-500/20 text-yellow-500'
                                      : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                Nível {warmingSessions[number.id].warming_level}/4
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4].map((level) => (
                                <div 
                                  key={level}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    level <= warmingSessions[number.id].warming_level
                                      ? warmingSessions[number.id].warming_status === 'hot' 
                                        ? 'bg-orange-500' 
                                        : warmingSessions[number.id].warming_status === 'warm'
                                          ? 'bg-yellow-500'
                                          : 'bg-blue-400'
                                      : 'bg-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

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
                            Limite atingido - retoma à meia-noite
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
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleReconfigureWebhook(number.instance_name!)}
                            >
                              <RefreshCw size={14} className="mr-1" />
                              Sincronizar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleDisconnect(number.id)}
                            >
                              <WifiOff size={14} className="mr-1" />
                              Desconectar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {numbers.length < maxNumbers ? (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => { setManageDialogOpen(false); setAddDialogOpen(true); }}
                  >
                    <Plus size={16} />
                    Adicionar Número
                  </Button>
                ) : (userPlan === 'start' || userPlan === 'growth') && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                    asChild
                  >
                    <a href="/upgrade">
                      <Crown size={16} />
                      Fazer Upgrade para Conectar Mais Números
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogClose}>
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

      {/* Connect QR Dialog - Modal stays open when clicking outside */}
      <Dialog open={connectDialogOpen} onOpenChange={async (open) => {
        // Only close via X button or success, not clicking outside
        if (!open && !showSuccessAnimation) {
          // User clicked X - cancel the instance if not connected
          // For NEW numbers (pendingNumberName set), there's no DB record to clean
          // For EXISTING numbers, we might have an orphan instance in Evolution
          if (connectingInstanceName) {
            try {
              // Delete the orphan instance from Evolution API
              await supabase.functions.invoke('evolution-disconnect', {
                body: { 
                  instanceName: connectingInstanceName,
                  numberId: connectingNumberId // null for new numbers
                },
              });
              console.log('Cancelled orphan instance:', connectingInstanceName);
            } catch (err) {
              console.error('Error cancelling instance:', err);
            }
          }
          
          setConnectDialogOpen(false);
          // Reset ALL states including pending number
          setConnectingInstanceName("");
          setConnectingNumberId(null);
          setPendingNumberName(null);
        }
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          
          {/* Success Animation Overlay */}
          <AnimatePresence>
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 rounded-lg"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </motion.div>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-semibold text-foreground"
                >
                  Conectado!
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 mt-2 text-muted-foreground"
                >
                  <PartyPopper className="w-4 h-4" />
                  <span className="text-sm">WhatsApp pronto para uso</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={20} />
              Renomear Número
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: WhatsApp Comercial"
                maxLength={50}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRenameNumber}
              disabled={loading || !newName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
