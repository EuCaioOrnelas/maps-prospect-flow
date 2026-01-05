import { useState, useEffect, useCallback } from 'react';
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

export const useChat = (selectedNumberId?: string | null) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch active conversations filtered by selected number
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('conversations')
      .select(`
        *,
        contacts (id, name, avatar_url),
        whatsapp_numbers (id, name, phone_number)
      `)
      .eq('user_id', user.id)
      .eq('is_archived', false);

    // Filter by selected WhatsApp number if provided
    if (selectedNumberId) {
      query = query.eq('whatsapp_number_id', selectedNumberId);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    setConversations(data || []);
    setIsLoading(false);
  }, [user, selectedNumberId]);

  // Fetch archived conversations
  const fetchArchivedConversations = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('conversations')
      .select(`
        *,
        contacts (id, name, avatar_url),
        whatsapp_numbers (id, name, phone_number)
      `)
      .eq('user_id', user.id)
      .eq('is_archived', true);

    if (selectedNumberId) {
      query = query.eq('whatsapp_number_id', selectedNumberId);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching archived conversations:', error);
      return;
    }

    setArchivedConversations(data || []);
  }, [user, selectedNumberId]);

  // Archive a conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: true })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }

    // If the archived conversation is selected, clear selection
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
    }

    await fetchConversations();
    await fetchArchivedConversations();
  }, [user, selectedConversation, fetchConversations, fetchArchivedConversations]);

  // Unarchive a conversation
  const unarchiveConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: false })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unarchiving conversation:', error);
      throw error;
    }

    await fetchConversations();
    await fetchArchivedConversations();
  }, [user, fetchConversations, fetchArchivedConversations]);

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
    await fetchArchivedConversations();
  }, [user, selectedConversation, fetchConversations, fetchArchivedConversations]);

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
    await fetchArchivedConversations();
  }, [user, fetchConversations, fetchArchivedConversations]);

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
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', quotedMessageId?: string) => {
    if (!user || !selectedConversation || !content.trim()) return;

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
      media_url: null,
      media_mimetype: null,
      media_filename: null,
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
  const startConversation = useCallback(async (phone: string, whatsappNumberId: string, contactName?: string) => {
    if (!user) return null;

    try {
      const response = await supabase.functions.invoke('chat-start-conversation', {
        body: {
          phone,
          whatsappNumberId,
          contactName,
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

  // Select conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  }, [fetchMessages]);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchArchivedConversations();
  }, [fetchConversations, fetchArchivedConversations]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('Message realtime update:', payload);
          
          if (selectedConversation && payload.new) {
            const newMessage = payload.new as Message;
            if (newMessage.conversation_id === selectedConversation.id) {
              await fetchMessages(selectedConversation.id);
            }
          }
          
          await fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation, fetchMessages, fetchConversations]);

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
    archivedConversations,
    messages,
    selectedConversation,
    isLoading,
    isSending,
    selectConversation,
    sendMessage,
    startConversation,
    fetchConversations,
    fetchArchivedConversations,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    linkContactToConversation,
    setSelectedConversation,
  };
};
