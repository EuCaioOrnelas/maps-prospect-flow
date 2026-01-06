import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  contact_id: string | null;
  remote_jid: string;
  phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  contacts?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  whatsapp_numbers?: {
    id: string;
    name: string;
    phone_number: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  message_id: string | null;
  remote_jid: string;
  from_me: boolean;
  message_type: string;
  content: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  media_filename: string | null;
  quoted_message_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  origin: string | null;
  notes: string | null;
  tags: string[];
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ConversationFilter = 'all' | 'unread' | 'contacts' | 'non_contacts';

export const useChat = (selectedNumberId?: string | null) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');
  
  // Refs for debouncing and preventing excessive refetches
  const fetchConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 1000; // Minimum 1 second between fetches

  // Fetch all conversations filtered by selected number
  const fetchConversationsInternal = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('conversations')
      .select(`
        *,
        contacts (id, name, avatar_url),
        whatsapp_numbers (id, name, phone_number)
      `)
      .eq('user_id', user.id);

    // Filter by selected WhatsApp number if provided
    if (selectedNumberId) {
      query = query.eq('whatsapp_number_id', selectedNumberId);
    }

    // Order by most recent first (nulls last for better UX)
    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    setConversations(data || []);
    setIsLoading(false);
    lastFetchRef.current = Date.now();
  }, [user, selectedNumberId]);

  // Debounced fetch to prevent excessive calls
  const fetchConversations = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    
    // If called too soon, debounce it
    if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      if (fetchConversationsTimeoutRef.current) {
        clearTimeout(fetchConversationsTimeoutRef.current);
      }
      fetchConversationsTimeoutRef.current = setTimeout(() => {
        fetchConversationsInternal();
      }, MIN_FETCH_INTERVAL - timeSinceLastFetch);
      return;
    }
    
    await fetchConversationsInternal();
  }, [fetchConversationsInternal]);

  // Get filtered conversations based on current filter
  const getFilteredConversations = useCallback(() => {
    switch (conversationFilter) {
      case 'unread':
        return conversations.filter(c => c.unread_count > 0);
      case 'contacts':
        return conversations.filter(c => c.contact_id && c.contacts?.name);
      case 'non_contacts':
        return conversations.filter(c => !c.contact_id || !c.contacts?.name);
      default:
        return conversations;
    }
  }, [conversations, conversationFilter]);

  // Delete a conversation permanently
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    // First delete all messages in the conversation
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (msgError) {
      console.error('Error deleting messages:', msgError);
      throw msgError;
    }

    // Then delete the conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }

    // If the deleted conversation is selected, clear selection
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
      setMessages([]);
    }

    await fetchConversations();
  }, [user, selectedConversation, fetchConversations]);

  // Bulk delete conversations and optionally their contacts
  const bulkDeleteConversations = useCallback(async (conversationIds: string[], deleteContacts: boolean = false) => {
    if (!user || conversationIds.length === 0) return;

    // Get conversations with their contact_ids before deletion
    const { data: conversationsToDelete } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .in('id', conversationIds)
      .eq('user_id', user.id);

    const contactIdsToDelete = deleteContacts && conversationsToDelete
      ? conversationsToDelete.filter(c => c.contact_id).map(c => c.contact_id!)
      : [];

    // Delete all messages for these conversations
    for (const convId of conversationIds) {
      await supabase.from('messages').delete().eq('conversation_id', convId);
    }

    // Delete the conversations
    const { error } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error bulk deleting conversations:', error);
      throw error;
    }

    // Delete contacts if requested
    if (deleteContacts && contactIdsToDelete.length > 0) {
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .in('id', contactIdsToDelete)
        .eq('user_id', user.id);

      if (contactError) {
        console.error('Error deleting contacts:', contactError);
      }
    }

    // Clear selection if any deleted conversation was selected
    if (selectedConversation && conversationIds.includes(selectedConversation.id)) {
      setSelectedConversation(null);
      setMessages([]);
    }

    await fetchConversations();
  }, [user, selectedConversation, fetchConversations]);

  // Link contact to conversation
  const linkContactToConversation = useCallback(async (conversationId: string, contactId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversations')
      .update({ contact_id: contactId })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error linking contact to conversation:', error);
      throw error;
    }

    await fetchConversations();
  }, [user, fetchConversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);

    // Mark as read
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  }, [user]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (
    content: string, 
    messageType: string = 'text', 
    quotedMessageId?: string,
    mediaUrl?: string,
    mediaFilename?: string
  ) => {
    if (!user || !selectedConversation) return;
    if (!content.trim() && !mediaUrl) return;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      user_id: user.id,
      message_id: null,
      remote_jid: selectedConversation.remote_jid,
      from_me: true,
      message_type: messageType,
      content: content.trim(),
      media_url: mediaUrl || null,
      media_mimetype: null,
      media_filename: mediaFilename || null,
      quoted_message_id: quotedMessageId || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const response = await supabase.functions.invoke('chat-send-message', {
        body: {
          conversationId: selectedConversation.id,
          content: content.trim(),
          messageType,
          quotedMessageId,
          mediaUrl,
          mediaFilename,
        },
      });

      if (response.error) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        throw new Error(response.error.message);
      }

      // Refresh messages to get the real message with proper ID and status
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, selectedConversation, fetchMessages, fetchConversations]);

  // Start new conversation
  const startConversation = useCallback(async (phone: string, whatsappNumberId: string, contactName?: string, initialMessage?: string) => {
    if (!user) return null;

    try {
      const response = await supabase.functions.invoke('chat-start-conversation', {
        body: {
          phone,
          whatsappNumberId,
          contactName,
          initialMessage,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { conversation } = response.data;
      await fetchConversations();
      return conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }, [user, fetchConversations]);

  // Merge duplicate conversations based on normalized phone number
  const mergeDuplicateConversations = useCallback(async () => {
    if (!user) return { merged: 0, deleted: 0 };

    // Get all conversations (active + archived)
    const { data: allConversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false, nullsFirst: true });

    if (error || !allConversations) {
      console.error('Error fetching conversations for merge:', error);
      throw error;
    }

    // Group by normalized phone (last 10-11 digits) and whatsapp_number_id
    const phoneGroups: Record<string, typeof allConversations> = {};
    
    allConversations.forEach(conv => {
      const normalizedPhone = conv.phone.replace(/\D/g, '').slice(-11);
      const key = `${normalizedPhone}_${conv.whatsapp_number_id}`;
      
      if (!phoneGroups[key]) {
        phoneGroups[key] = [];
      }
      phoneGroups[key].push(conv);
    });

    let mergedCount = 0;
    let deletedCount = 0;

    // Process each group with duplicates
    for (const [key, convs] of Object.entries(phoneGroups)) {
      if (convs.length <= 1) continue;

      // Keep the one with most recent message or contact_id
      const sortedConvs = convs.sort((a, b) => {
        // Prefer one with contact_id
        if (a.contact_id && !b.contact_id) return -1;
        if (!a.contact_id && b.contact_id) return 1;
        // Then by most recent message
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });

      const primary = sortedConvs[0];
      const duplicates = sortedConvs.slice(1);

      for (const dup of duplicates) {
        // Move all messages from duplicate to primary
        const { error: moveError } = await supabase
          .from('messages')
          .update({ conversation_id: primary.id })
          .eq('conversation_id', dup.id);

        if (moveError) {
          console.error('Error moving messages:', moveError);
          continue;
        }

        // Delete the duplicate conversation
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', dup.id);

        if (deleteError) {
          console.error('Error deleting duplicate:', deleteError);
          continue;
        }

        deletedCount++;
      }

      if (duplicates.length > 0) {
        mergedCount++;
        
        // Update primary conversation with correct unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', primary.id)
          .eq('from_me', false)
          .gt('created_at', primary.updated_at || primary.created_at);

        // Get most recent message
        const { data: recentMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', primary.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentMsg) {
          await supabase
            .from('conversations')
            .update({
              last_message: recentMsg.content,
              last_message_at: recentMsg.created_at,
              unread_count: count || 0,
            })
            .eq('id', primary.id);
        }
      }
    }

    await fetchConversations();

    return { merged: mergedCount, deleted: deletedCount };
  }, [user, fetchConversations]);

  // Select conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  }, [fetchMessages]);

  // Initial load with immediate fetch
  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    fetchConversationsInternal().finally(() => setIsLoading(false));
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchConversationsTimeoutRef.current) {
        clearTimeout(fetchConversationsTimeoutRef.current);
      }
    };
  }, [user, selectedNumberId, fetchConversationsInternal]);

  // Use refs to avoid recreating subscriptions
  const selectedConversationRef = useRef<Conversation | null>(null);
  selectedConversationRef.current = selectedConversation;

  // Realtime subscription for messages - using ref to avoid dependency issues
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;
          
          // Add new message if it's for the selected conversation
          if (selectedConversationRef.current && newMessage.conversation_id === selectedConversationRef.current.id) {
            setMessages(prev => {
              // Check if message already exists (avoid duplicates from optimistic updates)
              const exists = prev.some(m => 
                m.id === newMessage.id || 
                m.message_id === newMessage.message_id ||
                (m.id.startsWith('temp-') && m.content === newMessage.content && m.from_me === newMessage.from_me)
              );
              
              if (exists) {
                // Replace temp message with real one
                return prev.map(m => 
                  (m.id.startsWith('temp-') && m.content === newMessage.content && m.from_me === newMessage.from_me)
                    ? newMessage
                    : m
                );
              }
              
              return [...prev, newMessage];
            });
          }
          
          // Refresh conversations to update last message (debounced)
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          
          // Update message status in real-time
          setMessages(prev => 
            prev.map(m => 
              (m.id === updatedMessage.id || m.message_id === updatedMessage.message_id)
                ? { ...m, status: updatedMessage.status }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  // Realtime subscription for conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        async () => {
          await fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    selectedConversation,
    isLoading,
    isSending,
    conversationFilter,
    setConversationFilter,
    getFilteredConversations,
    selectConversation,
    sendMessage,
    startConversation,
    fetchConversations,
    deleteConversation,
    bulkDeleteConversations,
    linkContactToConversation,
    setSelectedConversation,
    mergeDuplicateConversations,
  };
};
