import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingState {
  [remoteJid: string]: boolean;
}

export const useTypingIndicator = () => {
  const { user } = useAuth();
  const [typingState, setTypingState] = useState<TypingState>({});
  const timeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Clear typing after 5 seconds of no updates
  const scheduleTypingClear = useCallback((remoteJid: string) => {
    if (timeoutsRef.current[remoteJid]) {
      clearTimeout(timeoutsRef.current[remoteJid]);
    }
    
    timeoutsRef.current[remoteJid] = setTimeout(() => {
      setTypingState(prev => {
        const newState = { ...prev };
        delete newState[remoteJid];
        return newState;
      });
      delete timeoutsRef.current[remoteJid];
    }, 5000);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    console.log('Subscribing to typing channel:', `typing:${user.id}`);
    
    const channel = supabase.channel(`typing:${user.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('Received typing event:', payload);
        const { remote_jid, is_typing } = payload.payload || {};
        
        if (remote_jid) {
          if (is_typing) {
            setTypingState(prev => ({ ...prev, [remote_jid]: true }));
            scheduleTypingClear(remote_jid);
          } else {
            setTypingState(prev => {
              const newState = { ...prev };
              delete newState[remote_jid];
              return newState;
            });
            if (timeoutsRef.current[remote_jid]) {
              clearTimeout(timeoutsRef.current[remote_jid]);
              delete timeoutsRef.current[remote_jid];
            }
          }
        }
      })
      .subscribe((status) => {
        console.log('Typing channel status:', status);
      });

    return () => {
      console.log('Unsubscribing from typing channel');
      supabase.removeChannel(channel);
      
      // Clear all timeouts
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };
  }, [user?.id, scheduleTypingClear]);

  const isTyping = useCallback((remoteJid: string) => {
    return typingState[remoteJid] || false;
  }, [typingState]);

  return { typingState, isTyping };
};
