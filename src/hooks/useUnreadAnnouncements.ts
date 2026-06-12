import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DisconnectedNumberAlert {
  id: string;
  name: string;
  phone_number: string | null;
  instance_name: string | null;
}

export const useUnreadAnnouncements = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [disconnectedNumbers, setDisconnectedNumbers] = useState<DisconnectedNumberAlert[]>([]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setDisconnectedNumbers([]);
      return;
    }

    const fetchData = async () => {
      try {
        // Get active announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id')
          .gt('expires_at', new Date().toISOString());

        // Get user's read announcements
        const { data: reads } = await supabase
          .from('user_announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        const readIds = new Set(reads?.map(r => r.announcement_id) || []);
        const unreadAnnouncements = announcements?.filter(a => !readIds.has(a.id)).length || 0;

        // Get disconnected Meta WABA numbers (anything other than 'active' is a problem)
        const { data: wabaData } = await supabase
          .from('user_waba_connections')
          .select('id, nickname, business_name, display_phone_number, status')
          .eq('user_id', user.id)
          .neq('status', 'active');

        const disconnected = (wabaData || []).map((w: any) => ({
          id: w.id,
          name: w.nickname || w.business_name || 'Número Meta',
          phone_number: w.display_phone_number,
          instance_name: null,
        }));
        setDisconnectedNumbers(disconnected);

        // Check which disconnection alerts have been dismissed
        const dismissedKey = `dismissed_disconnections_${user.id}`;
        const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[];
        const undismissedDisconnections = disconnected.filter(n => !dismissed.includes(n.id)).length;

        setUnreadCount(unreadAnnouncements + undismissedDisconnections);
      } catch (error) {
        console.error('Error fetching unread announcements:', error);
      }
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_announcement_reads', filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_numbers', filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismissDisconnectionAlert = (numberId: string) => {
    if (!user) return;
    const dismissedKey = `dismissed_disconnections_${user.id}`;
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[];
    if (!dismissed.includes(numberId)) {
      dismissed.push(numberId);
      localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
    }
    // Recalculate unread
    const undismissedCount = disconnectedNumbers.filter(n => !dismissed.includes(n.id)).length;
    setUnreadCount(prev => {
      // Subtract 1 for the just-dismissed alert
      return Math.max(0, prev - 1);
    });
  };

  const clearReconnectedDismissals = () => {
    if (!user) return;
    const dismissedKey = `dismissed_disconnections_${user.id}`;
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[];
    // Only keep dismissals for numbers that are still disconnected
    const stillDisconnectedIds = disconnectedNumbers.map(n => n.id);
    const filtered = dismissed.filter((id: string) => stillDisconnectedIds.includes(id));
    localStorage.setItem(dismissedKey, JSON.stringify(filtered));
  };

  // Clean up stale dismissals whenever disconnectedNumbers changes
  useEffect(() => {
    clearReconnectedDismissals();
  }, [disconnectedNumbers]);

  return { unreadCount, disconnectedNumbers, dismissDisconnectionAlert };
};
