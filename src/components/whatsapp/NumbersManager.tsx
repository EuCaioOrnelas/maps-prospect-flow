import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
const DELETABLE_CAMPAIGN_STATUSES = ['running', 'paused', 'scheduled', 'postponed', 'pending'] as const;

interface NumberDeleteImpact {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

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
  const [deletingNumberId, setDeletingNumberId] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<NumberDeleteImpact>({ campaigns: [] });
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
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
  const isInsertingRef = useRef(false);
  const connectionHandledRef = useRef(false);
  
  // Store proxy_id and api_tier from create-instance for new numbers
  const pendingProxyIdRef = useRef<string | null>(null);
  const pendingApiTierRef = useRef<string>('free');
  
  // Warming sessions for each number
  const [warmingSessions, setWarmingSessions] = useState<Record<string, { warming_level: number; warming_status: string; status: string }>>({});
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { trackScoreEvent } = useUserScoreTracking();

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
  const hasMassMessagingAccess = true; // All plans can connect numbers (free gets 1 number with 400 msg limit)
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
    return `wiize_${user?.id?.substring(0, 8)}_${timestamp}_${random}`;
  }, [user?.id]);

  // Re-link orphaned warming sessions and recent orphaned campaigns when the same chip reconnects
  const relinkWarmingSessions = async (numberId: string, phoneNumber?: string | null) => {
    if (!user) return;

    const phoneDigits = phoneNumber?.replace(/\D/g, '') || '';
    const phoneKey = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : null;

    try {
      let restoredWarmingSessions = 0;
      let restoredCampaigns = 0;
      let orphanedSessionsToRestore: Array<{ id: string; status: string }> = [];

      const { data: existingLinkedSession } = await supabase
        .from('warming_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('whatsapp_number_id', numberId)
        .maybeSingle();

      if (!existingLinkedSession && phoneKey) {
        const { data: orphanedSessions } = await supabase
          .from('warming_sessions')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('phone_key', phoneKey)
          .is('whatsapp_number_id', null);

        orphanedSessionsToRestore = orphanedSessions || [];
      }

      // Fallback seguro: se a API ainda não informou o telefone, mas só existe 1 sessão órfã,
      // vinculamos ela ao número recém-conectado.
      if (!existingLinkedSession && orphanedSessionsToRestore.length === 0) {
        const { data: fallbackOrphanedSessions } = await supabase
          .from('warming_sessions')
          .select('id, status')
          .eq('user_id', user.id)
          .is('whatsapp_number_id', null)
          .order('updated_at', { ascending: false })
          .limit(2);

        if ((fallbackOrphanedSessions?.length ?? 0) === 1) {
          orphanedSessionsToRestore = fallbackOrphanedSessions;
          console.log(`Fallback re-link: single orphaned warming session restored for number ${numberId}`);
        }
      }

      if (!existingLinkedSession && orphanedSessionsToRestore.length > 0) {
        const pausedSessions = orphanedSessionsToRestore.filter(s => s.status === 'paused');
        const otherSessions = orphanedSessionsToRestore.filter(s => s.status !== 'paused');

        if (pausedSessions.length > 0) {
          await supabase
            .from('warming_sessions')
            .update({
              whatsapp_number_id: numberId,
              status: 'active',
              paused_at: null,
              error_message: null,
            })
            .in('id', pausedSessions.map(s => s.id));
        }

        if (otherSessions.length > 0) {
          await supabase
            .from('warming_sessions')
            .update({
              whatsapp_number_id: numberId,
              error_message: null,
            })
            .in('id', otherSessions.map(s => s.id));
        }

        if (phoneKey) {
          await (supabase as any)
            .from('warming_search_assignments')
            .update({ whatsapp_number_id: numberId })
            .eq('user_id', user.id)
            .eq('phone_key', phoneKey)
            .is('whatsapp_number_id', null);
        } else {
          const { data: orphanedAssignments } = await (supabase as any)
            .from('warming_search_assignments')
            .select('id')
            .eq('user_id', user.id)
            .is('whatsapp_number_id', null)
            .limit(2);

          if ((orphanedAssignments?.length ?? 0) === 1) {
            await (supabase as any)
              .from('warming_search_assignments')
              .update({ whatsapp_number_id: numberId })
              .in('id', orphanedAssignments.map((assignment: { id: string }) => assignment.id));
          }
        }

        restoredWarmingSessions = orphanedSessionsToRestore.length;
        console.log(`Re-linked ${orphanedSessionsToRestore.length} warming session(s) to number ${numberId}${phoneKey ? ` via phone_key ${phoneKey}` : ' via fallback'}`);
      }

      // Best-effort relink for recent campaign history after the same chip is re-added
      const { count: connectedNumbersCount } = await supabase
        .from('whatsapp_numbers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_connected', true);

      if ((connectedNumbersCount ?? 0) === 1) {
        const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: orphanedCampaigns } = await supabase
          .from('whatsapp_campaigns')
          .select('id')
          .eq('user_id', user.id)
          .is('whatsapp_number_id', null)
          .in('status', ['paused', 'scheduled', 'postponed', 'pending', 'completed', 'failed'])
          .gte('updated_at', recentCutoff)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (orphanedCampaigns && orphanedCampaigns.length > 0) {
          const { error: relinkCampaignsError } = await supabase
            .from('whatsapp_campaigns')
            .update({
              whatsapp_number_id: numberId,
              updated_at: new Date().toISOString(),
            })
            .in('id', orphanedCampaigns.map(campaign => campaign.id));

          if (relinkCampaignsError) {
            console.error('Error re-linking orphaned campaigns:', relinkCampaignsError);
          } else {
            restoredCampaigns = orphanedCampaigns.length;
            console.log(`Re-linked ${orphanedCampaigns.length} orphaned campaign(s) to number ${numberId}`);
          }
        }
      }

      if (restoredWarmingSessions > 0 || restoredCampaigns > 0) {
        const restoredLabels = [
          restoredWarmingSessions > 0 ? `${restoredWarmingSessions} aquecimento(s)` : null,
          restoredCampaigns > 0 ? `${restoredCampaigns} campanha(s)` : null,
        ].filter(Boolean);

        toast({
          title: 'Dados restaurados!',
          description: `${restoredLabels.join(' e ')} foram religados automaticamente.`,
        });
      }
    } catch (e) {
      console.error('Error re-linking warming sessions:', e);
    }
  };


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
            const isDefinitelyDisconnected = response.data?.connected === false;
            
            if (isDefinitelyDisconnected) {
              if (number.instance_name) {
                await supabase.functions.invoke('evolution-disconnect', {
                  body: { instanceName: number.instance_name, numberId: number.id, deleteInstance: true },
                });
              }

              await supabase
                .from('whatsapp_numbers')
                .update({ 
                  is_connected: false,
                  phone_number: null,
                  instance_name: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', number.id);

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
            } else if (!isReallyConnected) {
              console.log(`[NumbersManager] Status uncertain for ${number.name}; keeping current connection state`);
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
          // Prevent duplicate processing using ref (synchronous, no race condition)
          if (connectionHandledRef.current) return;
          connectionHandledRef.current = true;
          
          // Show success animation
          setShowSuccessAnimation(true);
          trackScoreEvent("integration_connected", { type: "whatsapp" });
          
          if (isNewNumber && user) {
            // Guard against duplicate inserts
            if (isInsertingRef.current) return;
            isInsertingRef.current = true;
            const isPaidPlan = ['start', 'growth', 'scale'].includes(userPlan);
            const insertPayload: any = {
              user_id: user.id,
              name: pendingNumberName,
              is_connected: true,
              phone_number: data.phoneNumber || null,
              instance_name: connectingInstanceName,
              api_tier: pendingApiTierRef.current || (isPaidPlan ? 'paid' : 'free')
            };
            if (pendingProxyIdRef.current) {
              insertPayload.proxy_id = pendingProxyIdRef.current;
            }
            const { data: newNumber, error: insertError } = await supabase
              .from('whatsapp_numbers')
              .insert(insertPayload)
              .select()
              .single();
            
            if (insertError) {
              console.error('Error saving number:', insertError);
              toast({
                title: "Erro ao salvar",
                description: "Conexão bem-sucedida mas erro ao salvar. Tente novamente.",
                variant: "destructive",
              });
              isInsertingRef.current = false;
              return;
            }
            // Re-link orphaned warming sessions by phone_key
            await relinkWarmingSessions(newNumber.id, data.phoneNumber);
            
            // Add to local state
            onNumbersChange([...numbers, newNumber]);
            
            // Wait for animation then close and trigger sync
            setTimeout(() => {
              setShowSuccessAnimation(false);
              setConnectDialogOpen(false);
              onConnect(newNumber.id, true);
              setPendingNumberName(null);
              pendingProxyIdRef.current = null;
              pendingApiTierRef.current = 'free';
              isInsertingRef.current = false;
            }, 2000);
          } else {
            // Existing number - re-link warming sessions and update local state
            if (connectingNumberId) {
              await relinkWarmingSessions(connectingNumberId, data.phoneNumber);
            }
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
      console.log('[QR-DEBUG] Starting createInstanceAndGetQR', { numberId, instanceName });
      
      const createResponse = await supabase.functions.invoke('evolution-create-instance', {
        body: { 
          numberId,
          instanceName 
        },
      });

      console.log('[QR-DEBUG] create-instance response:', {
        error: createResponse.error?.message || null,
        dataKeys: createResponse.data ? Object.keys(createResponse.data) : null,
        hasQrcode: !!createResponse.data?.qrcode,
        qrcodeType: typeof createResponse.data?.qrcode,
        qrcodeLength: createResponse.data?.qrcode ? String(createResponse.data.qrcode).length : 0,
        rawData: JSON.stringify(createResponse.data)?.substring(0, 500),
      });

      if (createResponse.error) {
        throw new Error(createResponse.error.message);
      }

      // Store proxy and tier info for new numbers
      if (createResponse.data?.proxyId) {
        pendingProxyIdRef.current = createResponse.data.proxyId;
      }
      if (createResponse.data?.apiTier) {
        pendingApiTierRef.current = createResponse.data.apiTier;
      }

      // If QR code came with instance creation (string, not object)
      if (createResponse.data?.qrcode && typeof createResponse.data.qrcode === 'string' && createResponse.data.qrcode.length > 50) {
        console.log('[QR-DEBUG] Got QR from create-instance!');
        setQrCode(createResponse.data.qrcode);
        setQrLoading(false);
        return;
      }

      // Wait for instance to initialize before requesting QR
      console.log('[QR-DEBUG] Waiting 3s for instance to initialize...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Call get-qrcode which now does internal retries with proper delays
      console.log('[QR-DEBUG] Calling get-qrcode (with server-side retries)...');
      const qrResponse = await supabase.functions.invoke('evolution-get-qrcode', {
        body: { instanceName },
      });

      console.log('[QR-DEBUG] get-qrcode response:', {
        error: qrResponse.error?.message || null,
        hasQrcode: !!qrResponse.data?.qrcode,
        qrcodeType: typeof qrResponse.data?.qrcode,
        qrcodeLength: qrResponse.data?.qrcode ? String(qrResponse.data.qrcode).length : 0,
      });

      if (qrResponse.error) {
        throw new Error(qrResponse.error.message);
      }

      if (qrResponse.data?.qrcode && typeof qrResponse.data.qrcode === 'string' && qrResponse.data.qrcode.length > 50) {
        console.log('[QR-DEBUG] Got QR from get-qrcode!');
        setQrCode(qrResponse.data.qrcode);
      } else {
        throw new Error('QR Code não disponível após múltiplas tentativas. Tente novamente.');
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
      connectionHandledRef.current = false;
      isInsertingRef.current = false;
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
    setDeletingNumberId(numberToDelete);
    setDeleteConfirmOpen(false);

    try {
      const numberToRemove = numbers.find(n => n.id === numberToDelete);
      const campaignsToDelete = deleteImpact.campaigns.length > 0
        ? deleteImpact.campaigns
        : ((await supabase
            .from('whatsapp_campaigns')
            .select('id, name, status')
            .eq('whatsapp_number_id', numberToDelete)
            .in('status', [...DELETABLE_CAMPAIGN_STATUSES])) as any).data || [];
      const campaignIdsToDelete = campaignsToDelete.map((campaign: { id: string }) => campaign.id);

      if (campaignIdsToDelete.length > 0) {
        // Clean FK dependencies FIRST, then delete campaigns (sequential to avoid FK violations)
        await Promise.allSettled([
          (supabase as any).from('campaign_daily_reservations').delete().in('campaign_id', campaignIdsToDelete),
          (supabase as any).from('campaign_responses').delete().in('campaign_id', campaignIdsToDelete),
          (supabase as any).from('campaign_incidents').update({ campaign_id: null }).in('campaign_id', campaignIdsToDelete),
          (supabase as any).from('ignored_contacts').update({ campaign_id: null }).in('campaign_id', campaignIdsToDelete),
        ]);
        // Now safe to delete campaigns
        await supabase.from('whatsapp_campaigns').delete().in('id', campaignIdsToDelete);
      }

      // Delete the instance entirely from Evolution API since the number is being removed
      if (numberToRemove?.instance_name) {
        try {
          console.log('Deleting instance:', numberToRemove.instance_name);
          const response = await supabase.functions.invoke('evolution-disconnect', {
            body: { 
              instanceName: numberToRemove.instance_name,
              numberId: numberToDelete,
              deleteInstance: true // Fully delete since number is being removed
            },
          });
          console.log('Delete instance response:', response);
        } catch (e) {
          console.error('Error deleting instance from Evolution:', e);
        }
      }

      // Unlink proxy from whatsapp_proxies (decrement count)
      try {
        const proxyId = (numberToRemove as any)?.proxy_id;
        if (proxyId) {
          await (supabase as any)
            .from('whatsapp_proxies')
            .update({ assigned_numbers_count: Math.max(0, ((numberToRemove as any)?.assigned_numbers_count || 1) - 1) })
            .eq('id', proxyId);
        }
      } catch (e) {
        console.error('Error unlinking proxy:', e);
      }

      // Unlink completed/failed campaigns (preserve history, just remove FK)
      await supabase
        .from('whatsapp_campaigns')
        .update({ whatsapp_number_id: null })
        .eq('whatsapp_number_id', numberToDelete)
        .not('status', 'in', `(${[...DELETABLE_CAMPAIGN_STATUSES].join(',')})`);

      // Unlink related tables before deleting the number
      const unlinkPromises = [
        supabase.from('ai_agents').update({ whatsapp_number_id: null }).eq('whatsapp_number_id', numberToDelete),
        supabase.from('leads').update({ whatsapp_number_id: null }).eq('whatsapp_number_id', numberToDelete),
        (supabase as any).from('campaign_daily_reservations').delete().eq('whatsapp_number_id', numberToDelete),
        (supabase as any).from('campaign_incidents').update({ whatsapp_number_id: null }).eq('whatsapp_number_id', numberToDelete),
        (supabase as any).from('ignored_contacts').update({ whatsapp_number_id: null }).eq('whatsapp_number_id', numberToDelete),
        (supabase as any).from('revenue_conversations').update({ number_instance_id: null }).eq('number_instance_id', numberToDelete),
        (supabase as any).from('revenue_events').update({ number_instance_id: null }).eq('number_instance_id', numberToDelete),
        (supabase as any).from('revenue_leads').update({ source_number_instance_id: null }).eq('source_number_instance_id', numberToDelete),
        (supabase as any).from('revenue_number_config').delete().eq('whatsapp_number_id', numberToDelete),
      ];
      
      // PRESERVE warming sessions instead of deleting - pause and unlink so phone_key matching can re-link later
      const { data: warmingData } = await supabase
        .from('warming_sessions')
        .select('id, status')
        .eq('whatsapp_number_id', numberToDelete);
      
      if (warmingData && warmingData.length > 0) {
        // Compute phone_key from the number being deleted (for future re-linking)
        const phoneNumber = numberToRemove?.phone_number || '';
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        const phoneKey = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : null;

        const activeSessions = warmingData.filter(session => session.status === 'active');
        const otherSessions = warmingData.filter(session => session.status !== 'active');

        if (activeSessions.length > 0) {
          await supabase
            .from('warming_sessions')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              error_message: 'Número removido - reconecte o mesmo chip para retomar o aquecimento',
              whatsapp_number_id: null,
              ...(phoneKey ? { phone_key: phoneKey } : {})
            })
            .in('id', activeSessions.map(session => session.id));
        }

        if (otherSessions.length > 0) {
          await supabase
            .from('warming_sessions')
            .update({
              whatsapp_number_id: null,
              ...(phoneKey ? { phone_key: phoneKey } : {})
            })
            .in('id', otherSessions.map(session => session.id));
        }
      }

      // Unlink warming_search_assignments (preserve with phone_key for re-linking)
      await (supabase as any)
        .from('warming_search_assignments')
        .update({
          whatsapp_number_id: null,
          ...(numberToRemove?.phone_number ? { phone_key: numberToRemove.phone_number.replace(/\D/g, '').slice(-8) } : {})
        })
        .eq('whatsapp_number_id', numberToDelete);

      await Promise.allSettled(unlinkPromises);

      // Now delete the number
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberToDelete);

      if (error) throw error;

      onNumbersChange(numbers.filter(n => n.id !== numberToDelete));
      setNumberToDelete(null);
      setDeletingNumberId(null);

      toast({
        title: "Número removido",
        description: campaignsToDelete.length > 0
          ? `O número foi removido junto com ${campaignsToDelete.length} campanha(s) ativa(s)/agendada(s).`
          : "O número foi desconectado e removido",
      });
    } catch (err) {
      console.error('Error deleting number:', err);
      setDeletingNumberId(null);
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível remover o número",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteImpact({ campaigns: [] });
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
      // If there's an instance name, disconnect from WhatsApp but KEEP the instance
      if (numberToDisconnect.instance_name) {
        try {
          const response = await supabase.functions.invoke('evolution-disconnect', {
            body: { 
              instanceName: numberToDisconnect.instance_name,
              numberId,
              deleteInstance: false // Keep instance for future reconnection
            },
          });
          console.log('Disconnect response:', response);
        } catch (e) {
          console.error('Error calling evolution-disconnect:', e);
          // Continue anyway to update local state
        }
      }

      // Update in database - KEEP instance_name for reconnection
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          phone_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId);

      if (error) throw error;

      // Update local state - keep instance_name
      onNumbersChange(numbers.map(n => 
        n.id === numberId ? { ...n, is_connected: false, phone_number: null } : n
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
    const previousInstanceName = connectingInstanceName;
    const freshInstanceName = generateInstanceName();

    if (previousInstanceName) {
      supabase.functions.invoke('evolution-disconnect', {
        body: {
          instanceName: previousInstanceName,
          numberId: connectingNumberId,
          deleteInstance: true,
        },
      }).catch((err) => console.error('Error deleting expired QR instance:', err));
    }

    setConnectingInstanceName(freshInstanceName);
    connectionHandledRef.current = false;
    isInsertingRef.current = false;
    await createInstanceAndGetQR(connectingNumberId, freshInstanceName);
  };

  const openConnectDialog = async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (!number) return;

    const previousInstanceName = number.instance_name;
    const instanceName = generateInstanceName();
    if (previousInstanceName) {
      try {
        await supabase.functions.invoke('evolution-disconnect', {
          body: {
            instanceName: previousInstanceName,
            numberId,
            deleteInstance: true,
          },
        });
      } catch (err) {
        console.error('Error deleting stale instance before reconnect:', err);
      }
    }
    
    setConnectingNumberId(numberId);
    setConnectingInstanceName(instanceName);
    connectionHandledRef.current = false;
    isInsertingRef.current = false;
    setConnectDialogOpen(true);
    setManageDialogOpen(false);

    await createInstanceAndGetQR(numberId, instanceName);
  };

  const confirmDelete = async (numberId: string) => {
    setNumberToDelete(numberId);
    setDeleteImpactLoading(true);

    try {
      const { data } = await supabase
        .from('whatsapp_campaigns')
        .select('id, name, status')
        .eq('whatsapp_number_id', numberId)
        .in('status', [...DELETABLE_CAMPAIGN_STATUSES])
        .order('created_at', { ascending: false });

      setDeleteImpact({ campaigns: data || [] });
    } catch (error) {
      console.error('Error loading delete impact:', error);
      setDeleteImpact({ campaigns: [] });
    } finally {
      setDeleteImpactLoading(false);
    }

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
          {/* Manage Numbers Button - Only one button now */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setManageDialogOpen(true)}
            className="gap-2"
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
              {/* Sync button removed - not used */}
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
                      className={`p-4 rounded-lg border border-border bg-card relative overflow-hidden transition-opacity duration-300 ${deletingNumberId === number.id ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {deletingNumberId === number.id && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-destructive mb-2" />
                          <span className="text-sm font-medium text-destructive">Excluindo número...</span>
                        </div>
                      )}
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
                              warmingSessions[number.id].status === 'completed'
                                ? 'text-orange-500' 
                                : warmingSessions[number.id].warming_level >= 3
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
                                  warmingSessions[number.id].status === 'completed'
                                    ? 'bg-orange-500/20 text-orange-500' 
                                    : warmingSessions[number.id].warming_level >= 3
                                      ? 'bg-yellow-500/20 text-yellow-500'
                                      : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {warmingSessions[number.id].status === 'completed' 
                                  ? '🔥 Aquecido'
                                  : warmingSessions[number.id].warming_level >= 3
                                    ? '🌡️ Morno'
                                    : '❄️ Frio'
                                }
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4].map((level) => (
                                <div 
                                  key={level}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    level <= warmingSessions[number.id].warming_level
                                      ? warmingSessions[number.id].status === 'completed'
                                        ? 'bg-orange-500' 
                                        : warmingSessions[number.id].warming_level >= 3
                                          ? 'bg-yellow-500'
                                          : 'bg-blue-400'
                                      : 'bg-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Nível {warmingSessions[number.id].warming_level}/4 
                              {warmingSessions[number.id].status === 'running' && ' • Em andamento'}
                              {warmingSessions[number.id].status === 'paused' && ' • Pausado'}
                            </p>
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
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
              className="w-full bg-green-600 hover:bg-green-700 text-white"
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
      <Dialog open={connectDialogOpen} onOpenChange={(open) => {
        if (!open && !showSuccessAnimation) {
          // Close dialog immediately, cleanup in background
          setConnectDialogOpen(false);
          const instanceToCleanup = connectingInstanceName;
          const numberIdToCleanup = connectingNumberId;
          
          // Reset ALL states including pending number
          setConnectingInstanceName("");
          setConnectingNumberId(null);
          setPendingNumberName(null);
          
          // Cleanup cancelled QR instance in background (non-blocking) and clear the fresh
          // instance_name from the existing DB row to avoid stale internal sessions.
          if (instanceToCleanup) {
            supabase.functions.invoke('evolution-disconnect', {
              body: { 
                instanceName: instanceToCleanup,
                numberId: numberIdToCleanup,
                deleteInstance: true,
              },
            }).then(() => {
              console.log('Cancelled orphan instance:', instanceToCleanup);
            }).catch((err) => {
              console.error('Error cancelling instance:', err);
            });
          }
        }
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="sr-only">
              Escaneie o QR Code para conectar seu WhatsApp
            </DialogDescription>
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

            {/* Manual check button */}
            {!qrLoading && qrCode && !qrExpired && !showSuccessAnimation && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                disabled={checkingConnection}
                onClick={async () => {
                  try {
                    setCheckingConnection(true);
                    const { data, error } = await invokeWithRetry<{
                      connected: boolean;
                      phoneNumber?: string;
                    }>('evolution-check-status', {
                      body: { 
                        instanceName: connectingInstanceName,
                        numberId: pendingNumberName !== null ? null : connectingNumberId 
                      },
                    }, { maxRetries: 1 });
                    
                    if (data?.connected) {
                      // Connection detected - trigger same flow as polling
                      if (connectionHandledRef.current) return;
                      connectionHandledRef.current = true;
                      setShowSuccessAnimation(true);
                      
                      const isNewNumber = pendingNumberName !== null;
                      if (isNewNumber && user) {
                        if (isInsertingRef.current) return;
                        isInsertingRef.current = true;
                        const isPaidPlan = ['start', 'growth', 'scale'].includes(userPlan);
                        const manualInsertPayload: any = {
                          user_id: user.id,
                          name: pendingNumberName,
                          is_connected: true,
                          phone_number: data.phoneNumber || null,
                          instance_name: connectingInstanceName,
                          api_tier: pendingApiTierRef.current || (isPaidPlan ? 'paid' : 'free')
                        };
                        if (pendingProxyIdRef.current) {
                          manualInsertPayload.proxy_id = pendingProxyIdRef.current;
                        }
                        const { data: newNumber, error: insertError } = await supabase
                          .from('whatsapp_numbers')
                          .insert(manualInsertPayload)
                          .select()
                          .single();
                        
                        if (insertError) {
                          toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
                          isInsertingRef.current = false;
                          connectionHandledRef.current = false;
                          setShowSuccessAnimation(false);
                          return;
                        }
                        
                        onNumbersChange([...numbers, newNumber]);
                        setTimeout(() => {
                          setShowSuccessAnimation(false);
                          setConnectDialogOpen(false);
                          onConnect(newNumber.id, true);
                          setPendingNumberName(null);
                          pendingProxyIdRef.current = null;
                          pendingApiTierRef.current = 'free';
                          isInsertingRef.current = false;
                        }, 2000);
                      } else {
                        onNumbersChange(numbers.map(n => 
                          n.id === connectingNumberId 
                            ? { ...n, is_connected: true, phone_number: data.phoneNumber, instance_name: connectingInstanceName } 
                            : n
                        ));
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
                    } else {
                      toast({
                        title: "Ainda não conectado",
                        description: "Escaneie o QR Code com seu WhatsApp e aguarde alguns segundos",
                        variant: "destructive",
                      });
                    }
                  } catch (err) {
                    console.error('Manual check error:', err);
                    toast({ title: "Erro ao verificar", description: "Tente novamente", variant: "destructive" });
                  } finally {
                    setCheckingConnection(false);
                  }
                }}
              >
                {checkingConnection ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Já escaneei o QR Code
              </Button>
            )}

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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-lg">Excluir número</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                {deleteImpactLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando campanhas vinculadas...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Esta ação não pode ser desfeita. O número será desconectado e removido permanentemente.
                    </p>

                    {deleteImpact.campaigns.length > 0 && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          <span className="text-sm font-medium text-destructive">
                            {deleteImpact.campaigns.length} campanha{deleteImpact.campaigns.length > 1 ? 's' : ''} será{deleteImpact.campaigns.length > 1 ? 'ão' : ''} excluída{deleteImpact.campaigns.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <ul className="space-y-1 pl-6">
                          {deleteImpact.campaigns.slice(0, 5).map((campaign) => (
                            <li key={campaign.id} className="text-xs text-muted-foreground flex items-center justify-between">
                              <span className="truncate mr-2">• {campaign.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                                {campaign.status === 'running' ? 'em execução' : campaign.status === 'scheduled' ? 'agendada' : campaign.status}
                              </Badge>
                            </li>
                          ))}
                          {deleteImpact.campaigns.length > 5 && (
                            <li className="text-xs text-muted-foreground">
                              ...e mais {deleteImpact.campaigns.length - 5}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {warmingSessions[numberToDelete || ''] && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            O aquecimento será pausado e poderá ser retomado ao reconectar o mesmo chip.
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNumber}
              disabled={loading || deleteImpactLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </span>
              ) : 'Excluir número'}
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
