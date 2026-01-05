import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationMessage {
  id: string;
  content: string | null;
  from_me: boolean;
  conversation_id: string;
}

export const useChatNotifications = () => {
  const { user } = useAuth();
  const permissionRef = useRef<NotificationPermission>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Request permission on mount
  useEffect(() => {
    if (isSupported) {
      permissionRef.current = Notification.permission;
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!isSupported || permissionRef.current !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'chat-message',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || !isSupported) return;

    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const message = payload.new as NotificationMessage;
          
          // Only notify for received messages (not from me)
          if (message.from_me) return;

          // Don't notify if page is visible and focused
          if (document.visibilityState === 'visible' && document.hasFocus()) return;

          // Get conversation details
          const { data: conversation } = await supabase
            .from('conversations')
            .select('contact_name, phone, contacts(name)')
            .eq('id', message.conversation_id)
            .single();

          if (conversation) {
            const contactName = 
              conversation.contacts?.name || 
              conversation.contact_name || 
              conversation.phone;
            
            const body = message.content || 'Nova mídia recebida';
            sendNotification(`Mensagem de ${contactName}`, body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSupported, sendNotification]);

  return {
    isSupported,
    permission: permissionRef.current,
    requestPermission,
    sendNotification,
  };
};
