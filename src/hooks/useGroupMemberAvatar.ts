import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for member avatars to avoid repeated API calls
const avatarCache = new Map<string, string | null>();
const pendingRequests = new Map<string, Promise<string | null>>();

export function useGroupMemberAvatar(
  instanceName: string | null | undefined,
  senderJid: string | null | undefined,
  isGroup: boolean
) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isGroup || !instanceName || !senderJid) {
      setAvatarUrl(null);
      return;
    }

    // Extract phone number from sender JID
    const phone = senderJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    if (!phone || phone.length < 8) {
      setAvatarUrl(null);
      return;
    }

    const cacheKey = `${instanceName}:${phone}`;

    // Check cache first
    if (avatarCache.has(cacheKey)) {
      setAvatarUrl(avatarCache.get(cacheKey) || null);
      return;
    }

    // Check if there's already a pending request
    if (pendingRequests.has(cacheKey)) {
      pendingRequests.get(cacheKey)!.then((url) => {
        setAvatarUrl(url);
      });
      return;
    }

    // Fetch avatar from API
    const fetchAvatar = async (): Promise<string | null> => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const response = await supabase.functions.invoke('evolution-fetch-avatar', {
          body: { instanceName, phone },
        });

        const url = response.data?.avatarUrl || null;
        avatarCache.set(cacheKey, url);
        return url;
      } catch (error) {
        console.error('Error fetching group member avatar:', error);
        avatarCache.set(cacheKey, null);
        return null;
      } finally {
        setIsLoading(false);
        pendingRequests.delete(cacheKey);
      }
    };

    const promise = fetchAvatar();
    pendingRequests.set(cacheKey, promise);
    promise.then((url) => {
      setAvatarUrl(url);
    });
  }, [instanceName, senderJid, isGroup]);

  return { avatarUrl, isLoading };
}
