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

export const useChat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        contacts (id, name, avatar_url),
        whatsapp_numbers (id, name, phone_number)
      `)
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    setConversations(data || []);
    setIsLoading(false);
  }, [user]);

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

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!user || !selectedConversation || !content.trim()) return;

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('chat-send-message', {
        body: {
          conversationId: selectedConversation.id,
          content: content.trim(),
          messageType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh messages
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
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
  }, [fetchConversations]);

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
    messages,
    selectedConversation,
    isLoading,
    isSending,
    selectConversation,
    sendMessage,
    startConversation,
    fetchConversations,
    setSelectedConversation,
  };
};
