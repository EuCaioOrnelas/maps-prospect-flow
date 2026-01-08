import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

interface ConnectionMonitorOptions {
  numbers: WhatsAppNumber[];
  onNumbersChange: (numbers: WhatsAppNumber[]) => void;
  enabled?: boolean;
  checkIntervalMs?: number;
}

interface ReconnectState {
  numberId: string;
  instanceName: string;
  needsQR: boolean;
  qrCode: string | null;
  isReconnecting: boolean;
}

export const useConnectionMonitor = ({
  numbers,
  onNumbersChange,
  enabled = true,
  checkIntervalMs = 60000, // Check every 60 seconds
}: ConnectionMonitorOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reconnectState, setReconnectState] = useState<ReconnectState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastCheckRef = useRef<Record<string, number>>({});
  const reconnectAttemptsRef = useRef<Record<string, number>>({});

  // Realtime payloads often come without full `old` data, so we keep our own last-known state
  const lastKnownConnectedRef = useRef<Record<string, boolean>>({});

  // Avoid spamming sync calls (which can degrade overall performance and slow sending)
  const SYNC_COOLDOWN_MS = 30_000;
  const lastSyncRef = useRef<Record<string, number>>({});
  const syncInFlightRef = useRef<Record<string, boolean>>({});

  // Check connection status for a single number
  const checkConnectionStatus = useCallback(async (number: WhatsAppNumber): Promise<boolean | null> => {
    if (!number.instance_name) return false;

    try {
      const response = await supabase.functions.invoke('evolution-check-status', {
        body: { 
          instanceName: number.instance_name,
          numberId: number.id 
        },
      });

      // Handle uncertain state (API temporarily unavailable)
      if (response.data?.connected === null) {
        console.log(`Uncertain connection state for ${number.name}, skipping update`);
        return null; // Uncertain - don't change state
      }

      return response.data?.connected === true;
    } catch (err) {
      console.error(`Error checking status for ${number.name}:`, err);
      return null; // On error, don't assume disconnected
    }
  }, []);

  // Attempt to reconnect a number
  const attemptReconnect = useCallback(async (number: WhatsAppNumber): Promise<boolean> => {
    if (!number.instance_name) return false;

    const attempts = reconnectAttemptsRef.current[number.id] || 0;
    
    // Limit reconnect attempts to avoid infinite loops
    if (attempts >= 3) {
      console.log(`Max reconnect attempts reached for ${number.name}`);
      return false;
    }

    reconnectAttemptsRef.current[number.id] = attempts + 1;

    try {
      console.log(`Attempting auto-reconnect for ${number.name} (attempt ${attempts + 1})`);

      const response = await supabase.functions.invoke('evolution-reconnect', {
        body: { 
          instanceName: number.instance_name,
          numberId: number.id 
        },
      });

      if (response.data?.connected) {
        // Successfully reconnected!
        reconnectAttemptsRef.current[number.id] = 0;
        
        onNumbersChange(numbers.map(n => 
          n.id === number.id 
            ? { ...n, is_connected: true } 
            : n
        ));

        toast({
          title: "Reconectado automaticamente!",
          description: `O número "${number.name}" foi reconectado com sucesso`,
        });

        // Sync messages after reconnect
        syncMessages(number);
        
        return true;
      } else if (response.data?.needsQR) {
        // Need QR code - user intervention required
        setReconnectState({
          numberId: number.id,
          instanceName: number.instance_name,
          needsQR: true,
          qrCode: response.data.qrCode,
          isReconnecting: true,
        });

        toast({
          title: "Reconexão necessária",
          description: `O número "${number.name}" precisa ser reconectado. Escaneie o QR Code.`,
          variant: "destructive",
        });

        return false;
      }
    } catch (err) {
      console.error(`Error reconnecting ${number.name}:`, err);
    }

    return false;
  }, [numbers, onNumbersChange, toast]);

  // Sync messages for a number
  const syncMessages = useCallback(async (number: WhatsAppNumber) => {
    if (!number.instance_name) return;

    setIsSyncing(true);
    try {
      console.log(`Syncing messages for ${number.name}...`);

      const response = await supabase.functions.invoke('evolution-sync-messages', {
        body: { 
          instanceName: number.instance_name,
          numberId: number.id,
          lastSyncAt: new Date().toISOString()
        },
      });

      if (response.data?.success) {
        const { syncedConversations, syncedMessages } = response.data;
        
        if (syncedConversations > 0 || syncedMessages > 0) {
          toast({
            title: "Mensagens sincronizadas",
            description: `${syncedConversations} conversas, ${syncedMessages} mensagens recuperadas`,
          });
        }
      }
    } catch (err) {
      console.error(`Error syncing messages for ${number.name}:`, err);
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  // Manual sync trigger
  const triggerSync = useCallback(async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (number && number.is_connected && number.instance_name) {
      await syncMessages(number);
    }
  }, [numbers, syncMessages]);

  // Force reconnect for a specific number
  const forceReconnect = useCallback(async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (number && number.instance_name) {
      reconnectAttemptsRef.current[numberId] = 0; // Reset attempts
      await attemptReconnect(number);
    }
  }, [numbers, attemptReconnect]);

  // Clear reconnect state (e.g., when user closes QR dialog)
  const clearReconnectState = useCallback(() => {
    setReconnectState(null);
  }, []);

  // Main monitoring loop
  useEffect(() => {
    if (!enabled || !user || numbers.length === 0) return;

    const checkAllConnections = async () => {
      const now = Date.now();
      const connectedNumbers = numbers.filter(n => n.is_connected && n.instance_name);

      for (const number of connectedNumbers) {
        // Skip if recently checked
        const lastCheck = lastCheckRef.current[number.id] || 0;
        if (now - lastCheck < checkIntervalMs) continue;

        lastCheckRef.current[number.id] = now;

        const isConnected = await checkConnectionStatus(number);
        
        // Skip state update if uncertain (null)
        if (isConnected === null) {
          console.log(`Skipping state update for ${number.name} due to uncertain status`);
          continue;
        }
        
        if (!isConnected) {
          console.log(`Connection lost for ${number.name}, attempting reconnect...`);

          // Update local state to reflect disconnection
          onNumbersChange(numbers.map(n => 
            n.id === number.id 
              ? { ...n, is_connected: false } 
              : n
          ));

          // Attempt automatic reconnect
          await attemptReconnect(number);
        } else {
          // Reset reconnect attempts on successful check
          reconnectAttemptsRef.current[number.id] = 0;
        }
      }
    };

    // Initial check
    checkAllConnections();

    // Set up interval
    const interval = setInterval(checkAllConnections, checkIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, user, numbers, checkIntervalMs, checkConnectionStatus, attemptReconnect, onNumbersChange]);

  // Listen for realtime connection updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('connection-monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_numbers',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const updated = payload.new as WhatsAppNumber;
          const old = payload.old as WhatsAppNumber;

          // If connection was lost
          if (old.is_connected && !updated.is_connected) {
            console.log(`Realtime: Connection lost for ${updated.name}`);
            
            // Update local state
            onNumbersChange(numbers.map(n => 
              n.id === updated.id ? { ...n, ...updated } : n
            ));

            // Attempt reconnect if we have instance name
            if (updated.instance_name) {
              const number = { ...updated };
              setTimeout(() => attemptReconnect(number), 2000);
            }
          }

          // If connection was restored
          if (!old.is_connected && updated.is_connected) {
            console.log(`Realtime: Connection restored for ${updated.name}`);
            
            onNumbersChange(numbers.map(n => 
              n.id === updated.id ? { ...n, ...updated } : n
            ));

            // Clear reconnect state if this was the number being reconnected
            if (reconnectState?.numberId === updated.id) {
              setReconnectState(null);
            }

            // Sync messages
            syncMessages(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, numbers, onNumbersChange, attemptReconnect, syncMessages, reconnectState]);

  return {
    reconnectState,
    isSyncing,
    triggerSync,
    forceReconnect,
    clearReconnectState,
  };
};
