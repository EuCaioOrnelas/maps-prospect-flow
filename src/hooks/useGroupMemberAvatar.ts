import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// In-memory cache for session (fast lookup before DB check)
const memoryCache = new Map<string, string | null>();
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
    const phone = senderJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    if (!phone || phone.length < 8) {
      setAvatarUrl(null);
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const cacheKey = `${instanceName}:${normalizedPhone}`;

    // Check memory cache first (fastest)
    if (memoryCache.has(cacheKey)) {
      setAvatarUrl(memoryCache.get(cacheKey) || null);
      return;
    }

    // Check if there's already a pending request
    if (pendingRequests.has(cacheKey)) {
      pendingRequests.get(cacheKey)!.then((url) => {
        setAvatarUrl(url);
      });
      return;
    }

    // Fetch avatar (will check DB cache first, then API)
    const fetchAvatar = async (): Promise<string | null> => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        // First check local DB cache for faster response
        const { data: cachedData } = await supabase
          .from('group_member_avatars')
          .select('avatar_url')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (cachedData?.avatar_url) {
          memoryCache.set(cacheKey, cachedData.avatar_url);
          return cachedData.avatar_url;
        }

        // If not in DB cache, call edge function (which will also cache it)
        const response = await supabase.functions.invoke('evolution-fetch-avatar', {
          body: { instanceName, phone: normalizedPhone },
        });

        const url = response.data?.avatarUrl || null;
        memoryCache.set(cacheKey, url);
        return url;
      } catch (error) {
        console.error('Error fetching group member avatar:', error);
        memoryCache.set(cacheKey, null);
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
