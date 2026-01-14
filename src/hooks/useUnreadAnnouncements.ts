import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadAnnouncements = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get active announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id')
          .gt('expires_at', new Date().toISOString());

        if (!announcements || announcements.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Get user's read announcements
        const { data: reads } = await supabase
          .from('user_announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        const readIds = new Set(reads?.map(r => r.announcement_id) || []);
        const unread = announcements.filter(a => !readIds.has(a.id)).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching unread announcements:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_announcement_reads', filter: `user_id=eq.${user.id}` },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount };
};
