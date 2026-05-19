import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/supabaseWithRetry";
import { useAuth } from "@/contexts/AuthContext";

export interface WhatsAppNumber {
  id: string;
  name: string;
  instance_name: string | null;
  phone_number: string | null;
  is_connected: boolean;
  daily_sent_count: number;
  last_sent_at: string | null;
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 1, // Free trial users get 1 number
  trial: 1, // Alias for free
  start: 2, // Start plan: 2 numbers
  growth: 5, // Growth plan: 5 numbers
  scale: 10 // Scale plan: 10 numbers
};

// Limites mensais de disparos por plano
const MONTHLY_MESSAGE_LIMITS: Record<string, number> = {
  free: 400,
  start: 12000,
  growth: 30000,
  scale: 60000
};

const DAILY_LIMIT_PER_NUMBER = 200;
const SAO_PAULO_OFFSET_HOURS = -3; // UTC-3

// Get current time in São Paulo timezone
const getSaoPauloTime = (): Date => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (SAO_PAULO_OFFSET_HOURS * 3600000));
};

// Get midnight in São Paulo timezone as UTC
const getSaoPauloMidnightUTC = (): Date => {
  const spNow = getSaoPauloTime();
  const spMidnight = new Date(spNow);
  spMidnight.setHours(0, 0, 0, 0);
  // Convert back to UTC
  return new Date(spMidnight.getTime() - (SAO_PAULO_OFFSET_HOURS * 3600000));
};

// Verifica se o último envio foi antes da meia-noite de São Paulo (reset às 00:00 SP)
const shouldResetCount = (lastSentAt: string | null, dailySentCount: number): boolean => {
  if (!lastSentAt || dailySentCount === 0) return false;
  
  const lastSent = new Date(lastSentAt);
  const spMidnightUTC = getSaoPauloMidnightUTC();
  
  // Reseta se o último envio foi antes da meia-noite de São Paulo
  return lastSent < spMidnightUTC;
};

// Verifica se um número está com reset pendente (contador não zerado quando deveria)
const hasPendingReset = (lastSentAt: string | null, dailySentCount: number): boolean => {
  return shouldResetCount(lastSentAt, dailySentCount);
};

export const useWhatsAppNumbers = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user, profile } = useAuth();
  
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  // Ensure free users always have access to at least 1 number
  const basePlanNumbers = PLAN_LIMITS[userPlan] || PLAN_LIMITS['free'];
  // Add-on: +N números comprados (extra_numbers em profiles)
  const extraNumbers = (profile as any)?.extra_numbers || 0;
  const maxNumbers = basePlanNumbers + extraNumbers;
  // All plans have mass messaging access (free users can use 1 number with 400 message limit)
  const hasMassMessagingAccess = true;

  const fetchNumbers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      let fetchedNumbers = data || [];
      
      // Reset daily counts for numbers where last_sent_at is before today's 08:00
      const numbersToReset = fetchedNumbers.filter(n => 
        shouldResetCount(n.last_sent_at, n.daily_sent_count)
      );

      if (numbersToReset.length > 0) {
        // Reset counts in database
        await supabase
          .from('whatsapp_numbers')
          .update({ daily_sent_count: 0 })
          .in('id', numbersToReset.map(n => n.id));
        
        // Update local data to reflect reset
        fetchedNumbers = fetchedNumbers.map(n => 
          numbersToReset.some(r => r.id === n.id) 
            ? { ...n, daily_sent_count: 0 } 
            : n
        );
      }
      
      setNumbers(fetchedNumbers);
      
      // Auto-select first connected number
      const firstConnected = fetchedNumbers.find(n => n.is_connected);
      if (firstConnected) {
        setSelectedNumberId(firstConnected.id);
      }

      // Connection status is verified server-side by the periodic health check.
      // Do NOT re-verify all numbers on every page navigation to avoid flicker.
    } catch (err) {
      console.error('Error fetching numbers:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to realtime updates for whatsapp_numbers
  useEffect(() => {
    if (!user || !hasMassMessagingAccess) return;

    const channel = supabase
      .channel('whatsapp-numbers-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_numbers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          const updatedNumber = payload.new as WhatsAppNumber;

          // Check if we should reset this number's count based on the 08:00 rule
          if (shouldResetCount(updatedNumber.last_sent_at, updatedNumber.daily_sent_count)) {
            updatedNumber.daily_sent_count = 0;
          }

          // Avoid UI flicker: ignore updates that only change updated_at (or other non-meaningful fields)
          setNumbers(prev => prev.map(n => {
            if (n.id !== updatedNumber.id) return n;

            const merged = { ...n, ...updatedNumber };
            const changed =
              n.is_connected !== merged.is_connected ||
              n.phone_number !== merged.phone_number ||
              n.instance_name !== merged.instance_name ||
              n.daily_sent_count !== merged.daily_sent_count ||
              n.last_sent_at !== merged.last_sent_at ||
              n.name !== merged.name;

            return changed ? merged : n;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hasMassMessagingAccess]);

  useEffect(() => {
    if (user && hasMassMessagingAccess) {
      fetchNumbers();
    } else {
      setLoading(false);
    }
  }, [user, hasMassMessagingAccess, fetchNumbers]);

  // Verify and update connection status from Evolution API
  // IMPORTANT: This function should NEVER flip is_connected to false
  // Only webhooks from WhatsApp can trigger real disconnections
  const verifyAndUpdateConnectionStatus = async (numberId: string, instanceName: string): Promise<boolean> => {
    try {
      console.log(`Verifying connection status for ${instanceName}...`);

      const { data, error } = await invokeWithRetry<{
        connected: boolean | null;
        requiresReauth?: boolean;
      }>('evolution-check-status', {
        body: { instanceName, numberId },
      }, {
        maxRetries: 1,
      });

      if (error) {
        console.log(`[useWhatsAppNumbers] Could not verify status for ${instanceName}:`, error);
        // Keep previous state on errors - never disconnect
        return true;
      }

      // If API couldn't determine state (null), keep previous state
      if (data?.connected === null) {
        console.log(`[useWhatsAppNumbers] Uncertain status for ${instanceName}, keeping previous state`);
        return true;
      }

      // If evolution-check-status returns false, it already updated the DB
      // We just need to update local state to reflect the disconnection
      const isReallyConnected = data?.connected === true;
      
      if (!isReallyConnected) {
        console.log(`[useWhatsAppNumbers] ${instanceName} not connected — updating local state`);
        setNumbers(prev => prev.map(n => 
          n.instance_name === instanceName 
            ? { ...n, is_connected: false, phone_number: null } 
            : n
        ));
      }
      
      return isReallyConnected;
    } catch (err) {
      console.error('Error verifying connection status:', err);
      // Keep previous state on unexpected errors
      return true;
    }
  };

  // Alias para manter compatibilidade
  const verifyConnectionStatus = verifyAndUpdateConnectionStatus;

  // Manual refresh of connection status
  const refreshConnectionStatus = async () => {
    setLoading(true);
    await fetchNumbers();
  };

  const resetDailyCountsIfNeeded = async () => {
    if (!user) return;

    // Reset counts for numbers that haven't sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const numbersToReset = numbers.filter(n => {
      if (!n.last_sent_at) return false;
      const lastSent = new Date(n.last_sent_at);
      return lastSent < today && n.daily_sent_count > 0;
    });

    if (numbersToReset.length > 0) {
      try {
        await supabase
          .from('whatsapp_numbers')
          .update({ daily_sent_count: 0 })
          .in('id', numbersToReset.map(n => n.id));

        setNumbers(prev => prev.map(n => 
          numbersToReset.some(r => r.id === n.id) 
            ? { ...n, daily_sent_count: 0 } 
            : n
        ));
      } catch (err) {
        console.error('Error resetting daily counts:', err);
      }
    }
  };

  const incrementSentCount = async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (!number) return false;

    const newCount = number.daily_sent_count + 1;
    
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          daily_sent_count: newCount,
          last_sent_at: new Date().toISOString()
        })
        .eq('id', numberId);

      if (error) throw error;

      setNumbers(prev => prev.map(n => 
        n.id === numberId 
          ? { ...n, daily_sent_count: newCount, last_sent_at: new Date().toISOString() } 
          : n
      ));

      return true;
    } catch (err) {
      console.error('Error incrementing sent count:', err);
      return false;
    }
  };

  const getSelectedNumber = () => {
    return numbers.find(n => n.id === selectedNumberId);
  };

  const getRemainingDailyLimit = (numberId?: string) => {
    const id = numberId || selectedNumberId;
    const number = numbers.find(n => n.id === id);
    if (!number) return 0;
    return Math.max(0, DAILY_LIMIT_PER_NUMBER - number.daily_sent_count);
  };

  const isAtDailyLimit = (numberId?: string) => {
    return getRemainingDailyLimit(numberId) <= 0;
  };

  // Verifica se um número tem reset pendente (não pode disparar até resetar)
  const hasNumberPendingReset = (numberId?: string): boolean => {
    const id = numberId || selectedNumberId;
    const number = numbers.find(n => n.id === id);
    if (!number) return false;
    return hasPendingReset(number.last_sent_at, number.daily_sent_count);
  };

  // Verifica se pode fazer disparos (sem reset pendente e não no limite)
  const canSendMessages = (numberId?: string): boolean => {
    const id = numberId || selectedNumberId;
    if (!id) return false;
    
    const number = numbers.find(n => n.id === id);
    if (!number) return false;
    if (!number.is_connected) return false;
    if (hasNumberPendingReset(id)) return false;
    if (isAtDailyLimit(id)) return false;
    
    return true;
  };

  // Verifica se tem algum número conectado
  const hasConnectedNumbers = numbers.some(n => n.is_connected);

  // Obter limite mensal de mensagens do plano atual
  const getMonthlyMessageLimit = () => {
    return MONTHLY_MESSAGE_LIMITS[userPlan] || MONTHLY_MESSAGE_LIMITS.free;
  };

  return {
    numbers,
    setNumbers,
    selectedNumberId,
    setSelectedNumberId,
    loading,
    maxNumbers,
    basePlanNumbers,
    extraNumbers,
    hasMassMessagingAccess,
    hasConnectedNumbers,
    fetchNumbers,
    refreshConnectionStatus,
    verifyConnectionStatus,
    verifyAndUpdateConnectionStatus,
    resetDailyCountsIfNeeded,
    incrementSentCount,
    getSelectedNumber,
    getRemainingDailyLimit,
    isAtDailyLimit,
    hasNumberPendingReset,
    canSendMessages,
    getMonthlyMessageLimit,
    DAILY_LIMIT_PER_NUMBER,
    MONTHLY_MESSAGE_LIMITS,
    userPlan
  };
};