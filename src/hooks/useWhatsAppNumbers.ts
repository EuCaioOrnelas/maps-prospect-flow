import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  start: 2,
  growth: 5,
  scale: 10
};

// Limites mensais de disparos por plano
const MONTHLY_MESSAGE_LIMITS: Record<string, number> = {
  free: 400,
  start: 12000,
  growth: 30000,
  scale: 60000
};

const DAILY_LIMIT_PER_NUMBER = 200;
const RESET_HOUR = 8; // Reset às 08:00

// Verifica se o último envio foi antes do horário de reset de hoje
const shouldResetCount = (lastSentAt: string | null, dailySentCount: number): boolean => {
  if (!lastSentAt || dailySentCount === 0) return false;
  
  const now = new Date();
  const lastSent = new Date(lastSentAt);
  
  // Cria a data do reset de hoje às 08:00
  const todayReset = new Date(now);
  todayReset.setHours(RESET_HOUR, 0, 0, 0);
  
  // Se ainda não passou das 08:00 hoje, usa o reset de ontem
  if (now < todayReset) {
    todayReset.setDate(todayReset.getDate() - 1);
  }
  
  // Reseta se o último envio foi antes do horário de reset
  return lastSent < todayReset;
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
  const maxNumbers = PLAN_LIMITS[userPlan] || PLAN_LIMITS['free'];
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

      // Verify real connection status for ALL numbers marked as connected
      const connectedNumbers = fetchedNumbers.filter(n => n.is_connected && n.instance_name);
      const verificationPromises = connectedNumbers.map(number => 
        verifyAndUpdateConnectionStatus(number.id, number.instance_name!)
      );
      
      await Promise.all(verificationPromises);
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
          
          setNumbers(prev => prev.map(n => 
            n.id === updatedNumber.id ? { ...n, ...updatedNumber } : n
          ));
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
  // Esta função atualiza o estado local imediatamente quando detecta desconexão
  const verifyAndUpdateConnectionStatus = async (numberId: string, instanceName: string): Promise<boolean> => {
    try {
      console.log(`Verifying connection status for ${instanceName}...`);
      
      const response = await supabase.functions.invoke('evolution-check-status', {
        body: { instanceName, numberId },
      });

      const isReallyConnected = response.data?.connected === true;
      
      // Se não está conectado, atualizar o estado local imediatamente
      if (!isReallyConnected) {
        console.log(`Number ${numberId} (${instanceName}) is NOT connected. Updating local state.`);
        
        setNumbers(prev => prev.map(n => 
          n.id === numberId 
            ? { ...n, is_connected: false } 
            : n
        ));
        
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error verifying connection status:', err);
      // Em caso de erro, assumir desconectado por segurança
      setNumbers(prev => prev.map(n => 
        n.id === numberId 
          ? { ...n, is_connected: false } 
          : n
      ));
      return false;
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