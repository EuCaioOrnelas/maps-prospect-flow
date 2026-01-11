import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DisconnectedWarmingNumber {
  id: string;
  name: string;
  instance_name: string | null;
  session_id: string;
  warming_status: string;
  leads_used: number;
}

export const useWarmingConnectionAlert = () => {
  const { user } = useAuth();
  const [disconnectedNumbers, setDisconnectedNumbers] = useState<DisconnectedWarmingNumber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisconnectedWarmingNumbers = async () => {
    if (!user) {
      setDisconnectedNumbers([]);
      setLoading(false);
      return;
    }

    try {
      // Find numbers that have active warming sessions but are disconnected
      const { data, error } = await supabase
        .from('warming_sessions')
        .select(`
          id,
          warming_status,
          leads_used,
          whatsapp_number_id,
          whatsapp_numbers!inner(
            id,
            name,
            instance_name,
            is_connected
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .eq('whatsapp_numbers.is_connected', false);

      if (error) {
        console.error('Error fetching disconnected warming numbers:', error);
        return;
      }

      const disconnected: DisconnectedWarmingNumber[] = (data || []).map((session: any) => ({
        id: session.whatsapp_numbers.id,
        name: session.whatsapp_numbers.name,
        instance_name: session.whatsapp_numbers.instance_name,
        session_id: session.id,
        warming_status: session.warming_status,
        leads_used: session.leads_used,
      }));

      setDisconnectedNumbers(disconnected);
    } catch (error) {
      console.error('Error in useWarmingConnectionAlert:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime listener for changes
  useEffect(() => {
    if (!user) return;

    fetchDisconnectedWarmingNumbers();

    // Listen for changes to whatsapp_numbers
    const channel = supabase
      .channel('warming-connection-alert')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_numbers',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchDisconnectedWarmingNumbers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warming_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchDisconnectedWarmingNumbers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Function to pause warming session when disconnected
  const pauseWarmingForDisconnection = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('warming_sessions')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          error_message: 'Número desconectado - aguardando reconexão'
        })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchDisconnectedWarmingNumbers();
    } catch (error) {
      console.error('Error pausing warming session:', error);
    }
  };

  // Function to resume warming after reconnection
  const resumeWarmingAfterReconnection = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('warming_sessions')
        .update({
          status: 'active',
          paused_at: null,
          error_message: null
        })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchDisconnectedWarmingNumbers();
    } catch (error) {
      console.error('Error resuming warming session:', error);
    }
  };

  return {
    disconnectedNumbers,
    hasDisconnectedWarming: disconnectedNumbers.length > 0,
    loading,
    pauseWarmingForDisconnection,
    resumeWarmingAfterReconnection,
    refetch: fetchDisconnectedWarmingNumbers,
  };
};
