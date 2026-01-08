import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  messageType: string;
  quotedMessageId?: string;
  mediaUrl?: string;
  mediaFilename?: string;
  status: 'queued' | 'uploading' | 'sending' | 'sent' | 'failed';
  progress?: number;
  error?: string;
  createdAt: string;
}

interface UseMessageQueueOptions {
  maxConcurrent?: number;
  onMessageSent?: (message: QueuedMessage) => void;
  onMessageFailed?: (message: QueuedMessage, error: string) => void;
}

export function useMessageQueue(options: UseMessageQueueOptions = {}) {
  const { maxConcurrent = 3, onMessageSent, onMessageFailed } = options;
  const { user } = useAuth();
  
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [activeSends, setActiveSends] = useState<Set<string>>(new Set());
  const processingRef = useRef(false);

  // Add message to queue
  const enqueue = useCallback((
    conversationId: string,
    content: string,
    messageType: string = 'text',
    quotedMessageId?: string,
    mediaUrl?: string,
    mediaFilename?: string
  ): string => {
    const id = `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const queuedMessage: QueuedMessage = {
      id,
      conversationId,
      content,
      messageType,
      quotedMessageId,
      mediaUrl,
      mediaFilename,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    setQueue(prev => [...prev, queuedMessage]);
    return id;
  }, []);

  // Update queue item status
  const updateQueueItem = useCallback((id: string, updates: Partial<QueuedMessage>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    setActiveSends(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Process a single message
  const processMessage = useCallback(async (message: QueuedMessage) => {
    if (!user) return;

    setActiveSends(prev => new Set(prev).add(message.id));
    updateQueueItem(message.id, { status: 'sending' });

    try {
      const response = await supabase.functions.invoke('chat-send-message', {
        body: {
          conversationId: message.conversationId,
          content: message.content.trim(),
          messageType: message.messageType,
          quotedMessageId: message.quotedMessageId,
          mediaUrl: message.mediaUrl,
          mediaFilename: message.mediaFilename,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      updateQueueItem(message.id, { status: 'sent' });
      onMessageSent?.(message);
      
      // Remove from queue after a short delay
      setTimeout(() => removeFromQueue(message.id), 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar';
      updateQueueItem(message.id, { status: 'failed', error: errorMessage });
      onMessageFailed?.(message, errorMessage);
      toast.error(`Falha ao enviar: ${errorMessage}`);
    } finally {
      setActiveSends(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  }, [user, updateQueueItem, removeFromQueue, onMessageSent, onMessageFailed]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const queuedItems = queue.filter(item => item.status === 'queued');
      const availableSlots = maxConcurrent - activeSends.size;

      if (availableSlots > 0 && queuedItems.length > 0) {
        const toProcess = queuedItems.slice(0, availableSlots);
        await Promise.all(toProcess.map(processMessage));
      }
    } finally {
      processingRef.current = false;
    }
  }, [queue, activeSends.size, maxConcurrent, processMessage]);

  // Auto-process queue when items are added
  useEffect(() => {
    const hasQueued = queue.some(item => item.status === 'queued');
    if (hasQueued && activeSends.size < maxConcurrent) {
      processQueue();
    }
  }, [queue, activeSends.size, maxConcurrent, processQueue]);

  // Retry failed message
  const retry = useCallback((id: string) => {
    updateQueueItem(id, { status: 'queued', error: undefined });
  }, [updateQueueItem]);

  // Cancel queued message
  const cancel = useCallback((id: string) => {
    const item = queue.find(q => q.id === id);
    if (item && item.status === 'queued') {
      removeFromQueue(id);
    }
  }, [queue, removeFromQueue]);

  // Get queue for a specific conversation
  const getQueueForConversation = useCallback((conversationId: string) => {
    return queue.filter(item => item.conversationId === conversationId);
  }, [queue]);

  // Check if there are pending messages
  const hasPending = queue.some(item => 
    item.status === 'queued' || item.status === 'sending' || item.status === 'uploading'
  );

  return {
    queue,
    activeSends: activeSends.size,
    hasPending,
    enqueue,
    retry,
    cancel,
    removeFromQueue,
    getQueueForConversation,
    updateQueueItem,
  };
}
