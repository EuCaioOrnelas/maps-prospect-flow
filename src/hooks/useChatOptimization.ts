import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './useChat';

// Cache for quoted messages fetched from DB
const quotedMessageCache = new Map<string, Message | null>();
const pendingQuotedFetches = new Map<string, Promise<Message | null>>();

// Constants for optimization
const MESSAGE_PAGE_SIZE = 100; // Load only last 100 messages initially
const AVATAR_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const MAX_MEDIA_AUTO_DOWNLOAD_SIZE = 5 * 1024 * 1024; // 5MB - don't auto-download larger files

export interface ChatOptimizationConfig {
  enableLazyMedia: boolean;
  enableMessagePagination: boolean;
  messageCacheLimit: number;
}

export const useChatOptimization = () => {
  const [fetchingQuotedIds, setFetchingQuotedIds] = useState<Set<string>>(new Set());
  const avatarCacheRef = useRef<Map<string, { url: string; fetchedAt: number }>>(new Map());

  /**
   * Fetch a quoted message from the database when it's not in the local messages array
   * Uses caching to avoid duplicate fetches
   */
  const fetchQuotedMessage = useCallback(async (
    quotedMessageId: string,
    conversationId: string
  ): Promise<Message | null> => {
    // Check cache first
    const cacheKey = `${conversationId}:${quotedMessageId}`;
    if (quotedMessageCache.has(cacheKey)) {
      return quotedMessageCache.get(cacheKey) || null;
    }

    // Check if already fetching
    if (pendingQuotedFetches.has(cacheKey)) {
      return pendingQuotedFetches.get(cacheKey)!;
    }

    // Start fetch
    setFetchingQuotedIds(prev => new Set([...prev, quotedMessageId]));

    const fetchPromise = (async () => {
      try {
        // Try to find by message_id (WhatsApp ID) first
        const { data: byMessageId } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('message_id', quotedMessageId)
          .maybeSingle();

        if (byMessageId) {
          quotedMessageCache.set(cacheKey, byMessageId);
          return byMessageId;
        }

        // Try by id (UUID)
        const { data: byId } = await supabase
          .from('messages')
          .select('*')
          .eq('id', quotedMessageId)
          .maybeSingle();

        if (byId) {
          quotedMessageCache.set(cacheKey, byId);
          return byId;
        }

        // Try partial match (last part of WhatsApp ID)
        const { data: partialMatches } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .not('message_id', 'is', null)
          .limit(500);

        if (partialMatches) {
          const quotedIdClean = quotedMessageId.replace(/^(3EB0|BAE5|false_|true_)/gi, '').toLowerCase();
          const found = partialMatches.find(m => {
            if (!m.message_id) return false;
            const msgIdClean = m.message_id.replace(/^(3EB0|BAE5|false_|true_)/gi, '').toLowerCase();
            return msgIdClean === quotedIdClean || 
                   msgIdClean.includes(quotedIdClean) || 
                   quotedIdClean.includes(msgIdClean);
          });

          if (found) {
            quotedMessageCache.set(cacheKey, found);
            return found;
          }
        }

        // Not found - cache null to avoid repeated fetches
        quotedMessageCache.set(cacheKey, null);
        return null;
      } catch (error) {
        console.error('Error fetching quoted message:', error);
        return null;
      } finally {
        setFetchingQuotedIds(prev => {
          const next = new Set(prev);
          next.delete(quotedMessageId);
          return next;
        });
        pendingQuotedFetches.delete(cacheKey);
      }
    })();

    pendingQuotedFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }, []);

  /**
   * Load messages with pagination - returns most recent N messages
   * and provides a function to load more
   */
  const loadMessagesPaginated = useCallback(async (
    conversationId: string,
    limit: number = MESSAGE_PAGE_SIZE,
    before?: string // Load messages before this date
  ): Promise<{ messages: Message[]; hasMore: boolean }> => {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
      return { messages: [], hasMore: false };
    }

    const hasMore = data.length > limit;
    const messages = (hasMore ? data.slice(0, -1) : data).reverse(); // Reverse to chronological order

    return { messages, hasMore };
  }, []);

  /**
   * Check if an avatar should be re-fetched based on TTL
   */
  const shouldRefetchAvatar = useCallback((conversationId: string): boolean => {
    const cached = avatarCacheRef.current.get(conversationId);
    if (!cached) return true;
    return Date.now() - cached.fetchedAt > AVATAR_CACHE_TTL;
  }, []);

  /**
   * Cache an avatar URL with timestamp
   */
  const cacheAvatarUrl = useCallback((conversationId: string, url: string) => {
    avatarCacheRef.current.set(conversationId, {
      url,
      fetchedAt: Date.now(),
    });
  }, []);

  /**
   * Get cached avatar URL if valid
   */
  const getCachedAvatar = useCallback((conversationId: string): string | null => {
    const cached = avatarCacheRef.current.get(conversationId);
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > AVATAR_CACHE_TTL) {
      avatarCacheRef.current.delete(conversationId);
      return null;
    }
    return cached.url;
  }, []);

  /**
   * Clear the quoted message cache (useful when refreshing data)
   */
  const clearQuotedMessageCache = useCallback(() => {
    quotedMessageCache.clear();
    pendingQuotedFetches.clear();
  }, []);

  /**
   * Check if media should be auto-downloaded based on size
   */
  const shouldAutoDownloadMedia = useCallback((mimetype: string | null, _filename: string | null): boolean => {
    // Always download small media types
    if (mimetype?.startsWith('image/')) return true;
    if (mimetype?.startsWith('audio/')) return true;
    // Don't auto-download videos and documents by default
    if (mimetype?.startsWith('video/')) return false;
    if (mimetype?.startsWith('application/')) return false;
    return true;
  }, []);

  return {
    fetchQuotedMessage,
    fetchingQuotedIds,
    loadMessagesPaginated,
    shouldRefetchAvatar,
    cacheAvatarUrl,
    getCachedAvatar,
    clearQuotedMessageCache,
    shouldAutoDownloadMedia,
    MESSAGE_PAGE_SIZE,
    MAX_MEDIA_AUTO_DOWNLOAD_SIZE,
  };
};

// Export constants for use elsewhere
export { MESSAGE_PAGE_SIZE, MAX_MEDIA_AUTO_DOWNLOAD_SIZE };
