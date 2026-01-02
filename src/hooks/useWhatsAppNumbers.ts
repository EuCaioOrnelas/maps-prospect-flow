import { useState, useEffect } from "react";
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

const PLAN_LIMITS: Record<string, number> = {
  free: 1, // Free trial users get 1 number
  start: 1,
  growth: 2,
  scale: 5
};

const DAILY_LIMIT_PER_NUMBER = 200;

export const useWhatsAppNumbers = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user, profile } = useAuth();
  
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const maxNumbers = PLAN_LIMITS[userPlan] || 0;
  const hasMassMessagingAccess = maxNumbers > 0;

  useEffect(() => {
    if (user && hasMassMessagingAccess) {
      fetchNumbers();
    } else {
      setLoading(false);
    }
  }, [user, hasMassMessagingAccess]);

  const fetchNumbers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const fetchedNumbers = data || [];
      setNumbers(fetchedNumbers);
      
      // Auto-select first connected number
      const firstConnected = fetchedNumbers.find(n => n.is_connected);
      if (firstConnected) {
        setSelectedNumberId(firstConnected.id);
      }

      // Verify real connection status for numbers marked as connected
      const connectedNumbers = fetchedNumbers.filter(n => n.is_connected && n.instance_name);
      for (const number of connectedNumbers) {
        verifyConnectionStatus(number.id, number.instance_name!);
      }
    } catch (err) {
      console.error('Error fetching numbers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verify real connection status from Evolution API
  const verifyConnectionStatus = async (numberId: string, instanceName: string) => {
    try {
      const response = await supabase.functions.invoke('evolution-check-status', {
        body: { instanceName, numberId },
      });

      const isReallyConnected = response.data?.connected === true;
      
      // Get current number from state
      const currentNumber = numbers.find(n => n.id === numberId);
      
      // If status changed, update database and state
      if (currentNumber?.is_connected && !isReallyConnected) {
        console.log(`Number ${numberId} is no longer connected, updating status`);
        
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: false,
            phone_number: null,
            instance_name: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId);

        setNumbers(prev => prev.map(n => 
          n.id === numberId 
            ? { ...n, is_connected: false, phone_number: null, instance_name: null } 
            : n
        ));
      }
    } catch (err) {
      console.error('Error verifying connection status:', err);
    }
  };

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

  return {
    numbers,
    setNumbers,
    selectedNumberId,
    setSelectedNumberId,
    loading,
    maxNumbers,
    hasMassMessagingAccess,
    fetchNumbers,
    refreshConnectionStatus,
    verifyConnectionStatus,
    resetDailyCountsIfNeeded,
    incrementSentCount,
    getSelectedNumber,
    getRemainingDailyLimit,
    isAtDailyLimit,
    DAILY_LIMIT_PER_NUMBER
  };
};