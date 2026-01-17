import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTotalUnread = () => {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchTotalUnread = useCallback(async () => {
    if (!user) {
      setTotalUnread(0);
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('user_id', user.id)
      .gt('unread_count', 0);

    if (error) {
      console.error('Error fetching unread count:', error);
      return;
    }

    const total = data?.reduce((sum, conv) => sum + (conv.unread_count || 0), 0) || 0;
    setTotalUnread(total);
  }, [user]);

  useEffect(() => {
    fetchTotalUnread();

    if (!user) return;

    // Subscribe to conversation changes
    const channel = supabase
      .channel(`unread-count-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTotalUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTotalUnread]);

  // Update document title when unread count changes
  useEffect(() => {
    const baseTitle = 'Wiize';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalUnread]);

  return { totalUnread, refetch: fetchTotalUnread };
};
