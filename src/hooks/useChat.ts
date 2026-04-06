import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatConversation {
  id: string;
  user_id: string;
  waba_connection_id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_profile_pic: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_type: string;
  last_message_direction: string;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  waba_message_id: string | null;
  direction: string;
  message_type: string;
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  media_caption: string | null;
  status: string;
  status_updated_at: string | null;
  reply_to_message_id: string | null;
  metadata: any;
  created_at: string;
}

export interface WabaConnection {
  id: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  business_name: string | null;
  nickname: string | null;
  status: string;
  waba_id: string;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load WABA connections
  useEffect(() => {
    if (!user) return;
    const loadConnections = async () => {
      const { data } = await supabase
        .from("user_waba_connections")
        .select("id, phone_number_id, display_phone_number, business_name, nickname, status, waba_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data && data.length > 0) {
        setConnections(data);
        setActiveConnectionId(data[0].id);
      }
    };
    loadConnections();
  }, [user]);

  // Load conversations
  useEffect(() => {
    if (!user || !activeConnectionId) return;
    const loadConversations = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("waba_connection_id", activeConnectionId)
        .eq("is_archived", false)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false });
      setConversations((data as ChatConversation[]) || []);
      setLoading(false);
    };
    loadConversations();
  }, [user, activeConnectionId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as ChatMessage[]) || []);
      setLoadingMessages(false);
      // Mark as read
      await supabase
        .from("chat_conversations")
        .update({ unread_count: 0 })
        .eq("id", activeConversationId);
      setConversations(prev =>
        prev.map(c => c.id === activeConversationId ? { ...c, unread_count: 0 } : c)
      );
    };
    loadMessages();
  }, [activeConversationId, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_conversations",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setConversations(prev => [payload.new as ChatConversation, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setConversations(prev =>
            prev.map(c => c.id === (payload.new as ChatConversation).id ? payload.new as ChatConversation : c)
              .sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
              })
          );
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        if (newMsg.conversation_id === activeConversationId) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConversationId]);

  // Send text message
  const sendMessage = useCallback(async (text: string) => {
    if (!activeConversationId || !user || !text.trim()) return;
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;

    // Optimistic insert
    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConversationId,
      user_id: user.id,
      waba_message_id: null,
      direction: "outbound",
      message_type: "text",
      content: text,
      media_url: null,
      media_mime_type: null,
      media_filename: null,
      media_caption: null,
      status: "pending",
      status_updated_at: null,
      reply_to_message_id: null,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    // Insert in DB
    const { data: inserted } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      user_id: user.id,
      direction: "outbound",
      message_type: "text",
      content: text,
      status: "pending",
    }).select().single();

    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempId ? inserted as ChatMessage : m));
    }

    // Update conversation last message
    await supabase.from("chat_conversations").update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
      last_message_type: "text",
      last_message_direction: "outbound",
    }).eq("id", activeConversationId);

    // Call edge function to send via Meta API
    const connection = connections.find(c => c.id === conversation.waba_connection_id);
    if (connection && inserted) {
      supabase.functions.invoke("send-chat-message", {
        body: {
          message_id: (inserted as any).id,
          phone_number_id: connection.phone_number_id,
          to: conversation.contact_phone,
          type: "text",
          text: text,
          waba_connection_id: connection.id,
        },
      });
    }
  }, [activeConversationId, user, conversations, connections]);

  // Send media message
  const sendMedia = useCallback(async (file: File, caption?: string) => {
    if (!activeConversationId || !user) return;
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;

    const messageType = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video"
      : "document";

    // Upload to storage
    const filePath = `chat/${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData } = await supabase.storage.from("chat-media").upload(filePath, file);
    if (!uploadData) return;

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { data: inserted } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      user_id: user.id,
      direction: "outbound",
      message_type: messageType,
      content: caption || null,
      media_url: publicUrl,
      media_mime_type: file.type,
      media_filename: file.name,
      media_caption: caption || null,
      status: "pending",
    }).select().single();

    const lastText = messageType === "image" ? "📷 Imagem" 
      : messageType === "video" ? "🎥 Vídeo" 
      : `📄 ${file.name}`;

    await supabase.from("chat_conversations").update({
      last_message_text: lastText,
      last_message_at: new Date().toISOString(),
      last_message_type: messageType,
      last_message_direction: "outbound",
    }).eq("id", activeConversationId);

    const connection = connections.find(c => c.id === conversation.waba_connection_id);
    if (connection && inserted) {
      supabase.functions.invoke("send-chat-message", {
        body: {
          message_id: (inserted as any).id,
          phone_number_id: connection.phone_number_id,
          to: conversation.contact_phone,
          type: messageType,
          media_url: publicUrl,
          caption: caption || "",
          filename: file.name,
          waba_connection_id: connection.id,
        },
      });
    }
  }, [activeConversationId, user, conversations, connections]);

  // Pin/unpin conversation
  const togglePin = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    await supabase.from("chat_conversations").update({
      is_pinned: !conv.is_pinned,
      pinned_at: !conv.is_pinned ? new Date().toISOString() : null,
    }).eq("id", conversationId);
  }, [conversations]);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    await supabase.from("chat_conversations").update({ is_archived: true }).eq("id", conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) setActiveConversationId(null);
  }, [activeConversationId]);

  // Mute
  const toggleMute = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    await supabase.from("chat_conversations").update({ is_muted: !conv.is_muted }).eq("id", conversationId);
  }, [conversations]);

  // Filter conversations
  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        (c.contact_name || c.contact_phone).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  return {
    conversations: filteredConversations,
    messages,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    connections,
    activeConnectionId,
    setActiveConnectionId,
    loading,
    loadingMessages,
    searchQuery,
    setSearchQuery,
    messageSearchQuery,
    setMessageSearchQuery,
    sendMessage,
    sendMedia,
    togglePin,
    archiveConversation,
    toggleMute,
    messagesEndRef,
  };
}
