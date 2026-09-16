import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateProfilePics } from "@/lib/profilePicCache";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPhoneForMeta } from "@/lib/phoneUtils";
import { resolveStorageUrl, resolveStorageUrls } from "@/lib/privateStorage";

export interface ChatConversation {
  id: string;
  user_id: string;
  owner_user_id?: string | null;
  waba_connection_id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_profile_pic: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_type: string;
  last_message_direction: string;
  last_message_status?: string | null;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  responsible_user_id: string | null;
  created_at: string;
  updated_at: string;
}


export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  owner_user_id?: string | null;
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
  deleted_for_all_at?: string | null;
}

export interface WabaConnection {
  id: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  business_name: string | null;
  nickname: string | null;
  status: string;
  waba_id: string | null;
  access_token?: string | null;
  token_expires_at?: string | null;
  provider?: string | null;
  evolution_state?: string | null;
}

export function useChat() {
  const { user, accountOwnerId } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [activeConnectionId, setActiveConnectionIdState] = useState<string | null>(null);

  // Número selecionado fica salvo no cache: ao voltar ao chat o usuário
  // continua no mesmo número, em vez de cair sempre no primeiro.
  const activeConnKey = user ? `wa_active_connection_${user.id}` : null;
  const setActiveConnectionId = useCallback((id: string | null) => {
    setActiveConnectionIdState(id);
    try {
      if (!activeConnKey) return;
      if (id) localStorage.setItem(activeConnKey, id);
      else localStorage.removeItem(activeConnKey);
    } catch {}
  }, [activeConnKey]);
  const readSavedConnectionId = useCallback(() => {
    try { return activeConnKey ? localStorage.getItem(activeConnKey) : null; } catch { return null; }
  }, [activeConnKey]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [connectionHealth, setConnectionHealth] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validate a single token against Graph API (lightweight debug_token or /me check)
  const validateToken = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(accessToken)}`, {
        method: "GET",
      });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.id;
    } catch {
      return false;
    }
  }, []);

  // Load WABA connections and validate tokens
  const loadConnections = useCallback(async (forceValidate = false) => {
    if (!user) return;
    const { data } = await supabase
      .from("user_waba_connections")
      .select("id, phone_number_id, display_phone_number, business_name, nickname, status, waba_id, access_token, token_expires_at, provider, evolution_state")
      .eq("owner_user_id", accountOwnerId);
    if (!data || data.length === 0) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setConnections(data);

    // Check localStorage cache for health status
    const CACHE_KEY = `waba_health_${user.id}`;
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    let cached: { ts: number; health: Record<string, boolean> } | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {}

    if (!forceValidate && cached && (Date.now() - cached.ts) < CACHE_TTL) {
      setConnectionHealth(cached.health);
      // Pick best active connection
      const healthyConn = data.find(c => cached!.health[c.id] !== false);
      const savedId = readSavedConnectionId();
      const saved = savedId ? data.find(c => c.id === savedId) : null;
      setActiveConnectionId(saved?.id || healthyConn?.id || data[0].id);
      setLoading(false);
      return;
    }

    // Validate each token in parallel
    const healthMap: Record<string, boolean> = {};
    await Promise.all(
      data.map(async (conn) => {
        // Número de Atendimento (Evolution): saúde = sessão do WhatsApp aberta
        if ((conn as any).provider === "evolution") {
          healthMap[conn.id] = (conn as any).evolution_state === "open" && conn.status === "active";
          return;
        }
        if (!conn.access_token) {
          healthMap[conn.id] = false;
          return;
        }
        // Quick check: if token_expires_at is in the past, skip API call
        if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
          healthMap[conn.id] = false;
          return;
        }
        healthMap[conn.id] = await validateToken(conn.access_token);
      })
    );

    setConnectionHealth(healthMap);

    // Save to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), health: healthMap }));
    } catch {}

    // Note: email notifications for disconnected Meta numbers are sent by the
    // global cron `meta-token-health-check` (runs daily), not from the chat page.
    // The chat just reflects connection health visually.

    // Prefer a healthy connection
    const healthyConn = data.find(c => healthMap[c.id] === true);
    const savedId2 = readSavedConnectionId();
    const saved2 = savedId2 ? data.find(c => c.id === savedId2) : null;
    setActiveConnectionId(saved2?.id || healthyConn?.id || data[0].id);
    setLoading(false);
  }, [user, accountOwnerId, validateToken, readSavedConnectionId, setActiveConnectionId]);

  useEffect(() => {
    if (!user) return;
    loadConnections();
  }, [user?.id, loadConnections]);

  // Track last loaded ids to avoid blanking UI when effects re-run with same params
  // (e.g. after AuthContext refocus produces a new `user` reference).
  const loadedConvForConnRef = useRef<string | null>(null);
  const loadedMessagesForConvRef = useRef<string | null>(null);

  // Load conversations
  useEffect(() => {
    if (!user || !activeConnectionId) return;
    const isFirstLoadForConn = loadedConvForConnRef.current !== activeConnectionId;
    const loadConversations = async () => {
      if (isFirstLoadForConn) setLoading(true);
      const { data: secureData, error } = await supabase.functions.invoke("chat-secure-read", {
        body: { action: "conversations", connection_id: activeConnectionId },
      });
      if (error) {
        console.error("[chat] secure conversation load failed", error);
        setLoading(false);
        return;
      }
      const data = secureData?.conversations;

      setConversations(hydrateProfilePics((data as ChatConversation[]) || []));
      loadedConvForConnRef.current = activeConnectionId;
      setLoading(false);
    };
    loadConversations();
  }, [user?.id, accountOwnerId, activeConnectionId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const isFirstLoadForConv = loadedMessagesForConvRef.current !== activeConversationId;

    const loadMessages = async () => {
      if (isFirstLoadForConv) setLoadingMessages(true);
      const { data: secureData, error } = await supabase.functions.invoke("chat-secure-read", {
        body: { action: "messages", conversation_id: activeConversationId, limit: 200 },
      });
      if (error) {
        console.error("[chat] secure message load failed", error);
        setLoadingMessages(false);
        return;
      }
      const rawData = secureData?.messages;
      // Media lives in a private bucket: swap stored paths for short-lived signed URLs.
      const signedMap = await resolveStorageUrls(((rawData as any[]) || []).map((m) => m.media_url));
      const data = ((rawData as any[]) || []).map((m) =>
        m.media_url && signedMap.has(m.media_url) ? { ...m, media_url: signedMap.get(m.media_url)! } : m
      );
      // Avoid clobbering an optimistic/realtime-updated list when re-running for
      // the same conversation (e.g. user object got a new reference on refocus).
      if (isFirstLoadForConv) {
        setMessages((data as ChatMessage[]) || []);
      } else {
        const fresh = (data as ChatMessage[]) || [];
        setMessages(prev => {
          const map = new Map<string, ChatMessage>();
          for (const m of fresh) map.set(m.id, m);
          // Keep any optimistic/local messages that aren't in the fresh server set
          for (const m of prev) if (!map.has(m.id)) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
      loadedMessagesForConvRef.current = activeConversationId;
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
  }, [activeConversationId, user?.id]);

  // Keep a ref to activeConversationId so the realtime channel doesn't
  // unsubscribe/resubscribe every time the user opens a different conversation.
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);
  const conversationsRef = useRef<ChatConversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user || !accountOwnerId) return;
    const channel = supabase
      .channel(`chat-realtime-${accountOwnerId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_conversations",
      }, (payload) => {
        const nextRow = (payload.new || payload.old) as ChatConversation | undefined;
        if (nextRow?.owner_user_id && nextRow.owner_user_id !== accountOwnerId) return;
        if (nextRow?.waba_connection_id && activeConnectionId && nextRow.waba_connection_id !== activeConnectionId) return;
        if (payload.eventType === "INSERT") {
          const encrypted = payload.new as ChatConversation;
          supabase.functions.invoke("chat-secure-read", { body: { action: "conversation", conversation_id: encrypted.id } })
            .then(({ data }) => {
              const next = data?.conversation as ChatConversation | undefined;
              if (!next) return;
              setConversations(prev => prev.some(c => c.id === next.id) ? prev : [next, ...prev]);
            });
        } else if (payload.eventType === "UPDATE") {
          const encryptedConv = payload.new as ChatConversation;
          const updatedConv = { ...encryptedConv, last_message_text: null };
          const isOpen = updatedConv.id === activeConversationIdRef.current;
          // A conversa aberta na tela nunca mostra contador de não lidas:
          // se o webhook incrementar, zeramos de novo no banco.
          if (isOpen && (updatedConv.unread_count || 0) > 0) {
            supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", updatedConv.id).then(() => {});
          }
          setConversations(prev =>
            prev.map(c => c.id === updatedConv.id ? (isOpen ? { ...updatedConv, last_message_text: c.last_message_text, unread_count: 0 } : { ...updatedConv, last_message_text: c.last_message_text }) : c)
              .sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
              })
          );
          supabase.functions.invoke("chat-secure-read", { body: { action: "conversation", conversation_id: updatedConv.id } })
            .then(({ data }) => {
              const secure = data?.conversation as ChatConversation | undefined;
              if (secure) setConversations(prev => prev.map(c => c.id === secure.id ? { ...c, last_message_text: secure.last_message_text } : c));
            });
        } else if (payload.eventType === "DELETE") {
          setConversations(prev => prev.filter(c => c.id !== (payload.old as any).id));
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
      }, (payload) => {
        const encryptedMsg = payload.new as ChatMessage;
        const newMsg = { ...encryptedMsg, content: null, media_caption: null };
        if ((newMsg as any).owner_user_id && (newMsg as any).owner_user_id !== accountOwnerId) return;
        const currentActive = activeConversationIdRef.current;
        if (newMsg.conversation_id === currentActive) {
          const applyMsg = (msg: ChatMessage) => setMessages(prev => {
            // Dedupe by id
            if (prev.some(m => m.id === msg.id)) return prev;
            // Replace optimistic temp msg matched by client_token in metadata
            const ct = (msg.metadata as any)?.client_token;
            if (ct && prev.some(m => m.id === ct)) {
              return prev.map(m => m.id === ct ? msg : m);
            }
            return [...prev, msg];
          });
          supabase.functions.invoke("chat-secure-read", { body: { action: "message", message_id: newMsg.id } })
            .then(async ({ data }) => {
              const secureMsg = data?.messages?.[0] as ChatMessage | undefined;
              if (!secureMsg) return;
              const signed = secureMsg.media_url ? await resolveStorageUrl(secureMsg.media_url) : null;
              applyMsg(signed ? { ...secureMsg, media_url: signed } : secureMsg);
            });
          // Conversa aberta: zera o aviso de não lidas em tempo real, sem
          // precisar sair e voltar da conversa.
          if (newMsg.direction === "inbound") {
            setConversations(prev => prev.map(c => c.id === currentActive ? { ...c, unread_count: 0 } : c));
            supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", currentActive).then(() => {});
          }
        }
        // Browser notification on inbound (skip muted, blocked, active conversation, or hidden tab off)
        if (newMsg.direction === "inbound") {
          const conv = conversationsRef.current.find(c => c.id === newMsg.conversation_id);
          const muted = !!(conv && (conv.is_muted || (conv as any).is_blocked));
          const isActive = newMsg.conversation_id === currentActive && document.visibilityState === "visible";
          if (!muted && !isActive && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const title = conv?.contact_name || conv?.contact_phone || "Nova mensagem";
              const body = (newMsg as any).text || ((newMsg as any).type ? `[${(newMsg as any).type}]` : "Nova mensagem recebida");
              const n = new Notification(title, { body, icon: "/favicon.png", tag: newMsg.conversation_id });
              n.onclick = () => { window.focus(); n.close(); };
            } catch {}
          }
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
      }, (payload) => {
        const encrypted = payload.new as ChatMessage;
        const updated = { ...encrypted, content: null, media_caption: null };
        if ((updated as any).owner_user_id && (updated as any).owner_user_id !== accountOwnerId) return;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...updated, content: m.content, media_caption: m.media_caption } : m));
        // Also reflect the new status on the sidebar conversation row, in case
        // the chat_conversations realtime UPDATE is delayed or dropped.
        if (updated.direction === "outbound") {
          setConversations(prev => prev.map(c => {
            if (c.id !== updated.conversation_id) return c;
            const order: Record<string, number> = { pending: 0, sent: 1, failed: 1, delivered: 2, read: 3 };
            const cur = (c as any).last_message_status as string | null | undefined;
            if (cur && (order[cur] ?? 0) > (order[updated.status] ?? 0)) return c;
            return { ...c, last_message_status: updated.status } as ChatConversation;
          }));
        }
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "chat_messages",
      }, (payload) => {
        // "Apagar para mim" remove a linha no banco: propaga a remoção para
        // todas as abas/usuários da conta que estejam com a conversa aberta.
        const removedId = (payload.old as { id?: string } | null)?.id;
        if (!removedId) return;
        setMessages(prev => prev.filter(m => m.id !== removedId));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, accountOwnerId, activeConnectionId]);

  // Send text message
  const sendMessage = useCallback(async (text: string, replyToId?: string, targetConversationId?: string) => {
    const convId = targetConversationId || activeConversationId;
    if (!convId || !user || !text.trim()) return;
    const conversation = conversations.find(c => c.id === convId);
    if (!conversation) return;
    const isActive = convId === activeConversationId;

    // Optimistic insert — tempId is also written to DB row metadata.client_token,
    // so realtime INSERT can replace the optimistic row instead of duplicating it.
    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId,
      conversation_id: convId,
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
      reply_to_message_id: replyToId || null,
      metadata: { client_token: tempId },
      created_at: new Date().toISOString(),
    };
    if (isActive) setMessages(prev => [...prev, tempMsg]);

    const connection = connections.find(c => c.id === conversation.waba_connection_id);
    if (!connection) {
      if (isActive) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
      toast.error("Conexão não encontrada");
      return;
    }
    if (connection) {
      supabase.functions.invoke("send-chat-message", {
        body: {
          conversation_id: convId,
          phone_number_id: connection.phone_number_id,
          to: conversation.contact_phone,
          type: "text",
          text: text,
          reply_to_message_id: replyToId || null,
          client_token: tempId,
          waba_connection_id: connection.id,
        },
      }).then(({ error: fnError }) => {
        if (fnError) {
          console.error("send-chat-message error:", fnError);
          if (isActive) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
        }
      });
    }
  }, [activeConversationId, user, accountOwnerId, conversations, connections]);

  // Send media message
  const sendMedia = useCallback(async (file: File, caption?: string, targetConversationId?: string) => {
    const convId = targetConversationId || activeConversationId;
    if (!convId || !user) return;
    const conversation = conversations.find(c => c.id === convId);
    if (!conversation) return;
    const isActive = convId === activeConversationId;

    const messageType = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video"
      : file.type.startsWith("audio/") ? "audio"
      : "document";

    // Upload to storage — path MUST start with user.id (RLS policy)
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const filePath = `${user.id}/${Date.now()}_${safeName}`;
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    // Alguns content-types (ex: audio/mp4 gerado pelo MediaRecorder do Safari)
    // são rejeitados pelo storage. Refaz o upload com content-type genérico
    // para garantir o envio — o mime real é preservado em media_mime_type.
    if (uploadError && /mime type|not supported/i.test(uploadError.message || "")) {
      const retry = await supabase.storage
        .from("chat-media")
        .upload(filePath, file, { contentType: "application/octet-stream", upsert: false });
      uploadData = retry.data;
      uploadError = retry.error;
    }

    if (uploadError || !uploadData) {
      console.error("[sendMedia] upload failed", uploadError);
      toast.error("Falha ao enviar arquivo", { description: uploadError?.message });
      return;
    }

    // Canonical reference stored in the DB (bucket is private; never publicly readable).
    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    // Short-lived signed URL used for local rendering only.
    const signedUrl = (await resolveStorageUrl(publicUrl)) || publicUrl;

    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId, conversation_id: convId, user_id: user.id,
      waba_message_id: null, direction: "outbound", message_type: messageType,
      content: caption || null, media_url: signedUrl, media_mime_type: file.type,
      media_filename: file.name, media_caption: caption || null, status: "pending",
      status_updated_at: null, reply_to_message_id: null,
      metadata: { client_token: tempId }, created_at: new Date().toISOString(),
    };
    if (isActive) setMessages(prev => [...prev, tempMsg]);
    const connection = connections.find(c => c.id === conversation.waba_connection_id);
    if (!connection) {
      if (isActive) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
      toast.error("Conexão não encontrada");
      return;
    }
    if (connection) {
      supabase.functions.invoke("send-chat-message", {
        body: {
          conversation_id: convId,
          phone_number_id: connection.phone_number_id,
          to: conversation.contact_phone,
          type: messageType,
          media_url: publicUrl,
          caption: caption || "",
          filename: file.name,
          media_mime_type: file.type,
          client_token: tempId,
          waba_connection_id: connection.id,
        },
      }).then(({ error: fnError }) => {
        if (fnError) {
          console.error("[sendMedia] send-chat-message error:", fnError);
          if (isActive) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
          toast.error("Falha ao enviar mídia", { description: fnError.message });
        }
      });
    }
  }, [activeConversationId, user, accountOwnerId, conversations, connections]);

  // Pin/unpin conversation
  const togglePin = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    const next = !conv.is_pinned;
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, is_pinned: next, pinned_at: next ? new Date().toISOString() : null } as ChatConversation : c));
    const { error } = await supabase.from("chat_conversations").update({
      is_pinned: next,
      pinned_at: next ? new Date().toISOString() : null,
    }).eq("id", conversationId);
    if (error) {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, is_pinned: conv.is_pinned } as ChatConversation : c));
      throw error;
    }
  }, [conversations]);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    await supabase.from("chat_conversations").update({ is_archived: true }).eq("id", conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) setActiveConversationId(null);
  }, [activeConversationId]);

  // Mark as read
  const markAsRead = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    const hadUnread = (conv?.unread_count || 0) > 0;
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    const { error } = await supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", conversationId);
    if (error) throw error;
    // Número de Atendimento (Evolution): sincroniza o "lido" (ticks azuis) no WhatsApp do contato
    const connection = conv ? connections.find(c => c.id === conv.waba_connection_id) : null;
    if (hadUnread && connection?.provider === "evolution") {
      supabase.functions.invoke("evolution-instance", {
        body: { action: "mark_read", connection_id: connection.id, conversation_id: conversationId },
      }).catch(() => {});
    }
  }, [conversations, connections]);

  // Mark as unread
  const markAsUnread = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    const next = Math.max(1, conv?.unread_count || 0);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: next } : c));
    const { error } = await supabase.from("chat_conversations").update({ unread_count: next }).eq("id", conversationId);
    if (error) throw error;
  }, [conversations]);

  // Mute
  const toggleMute = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    const next = !conv.is_muted;
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, is_muted: next } as ChatConversation : c));
    const { error } = await supabase.from("chat_conversations").update({ is_muted: next }).eq("id", conversationId);
    if (error) {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, is_muted: conv.is_muted } as ChatConversation : c));
      throw error;
    }
  }, [conversations]);


  // Start new conversation
  const startNewConversation = useCallback(async (phone: string, name?: string) => {
    if (!user || !activeConnectionId) return;

    // E.164 global (BR + intl, com 9º dígito BR automático)
    const cleanPhone = formatPhoneForMeta(phone);
    if (!cleanPhone) {
      toast.error("Telefone inválido. Use formato internacional (ex: +55 11 99999-9999).");
      return;
    }

    const existing = conversations.find(c =>
      c.contact_phone.replace(/\D/g, "").endsWith(cleanPhone.slice(-8))
    );

    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    const { data } = await supabase.from("chat_conversations").insert({
      user_id: user.id,
      waba_connection_id: activeConnectionId,
      contact_phone: cleanPhone,
      contact_name: name || null,
    }).select().single();

    if (data) {
      setConversations(prev => [data as ChatConversation, ...prev]);
      setActiveConversationId(data.id);
    }
  }, [user, activeConnectionId, conversations]);

  // Filter conversations
  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        (c.contact_name || c.contact_phone).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Detect if the active connection has an expired/invalid token
  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const isConnectionExpired = activeConnection
    ? connectionHealth[activeConnection.id] === false
    : false;

  // All connections expired = block page
  const allConnectionsExpired = connections.length > 0 && 
    connections.every(c => connectionHealth[c.id] === false);

  // Fetch real Meta templates for the active connection
  const fetchTemplates = useCallback(async () => {
    if (!activeConnection || !activeConnection.access_token || !activeConnection.waba_id) return [];
    try {
      const { data, error } = await supabase.functions.invoke("meta-fetch-templates", {
        body: {
          waba_id: activeConnection.waba_id,
          access_token: activeConnection.access_token,
        },
      });
      if (error || !data?.templates) return [];
      return data.templates
        .filter((t: any) => t.status === "APPROVED")
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category?.toLowerCase() || "utility",
          language: t.language || "pt_BR",
          components: t.components || [],
        }));
    } catch {
      return [];
    }
  }, [activeConnection]);

  // Reconnect handler: clear cache and reload, returns whether any healthy connection exists
  const handleReconnect = useCallback(async () => {
    if (user) {
      try { localStorage.removeItem(`waba_health_${user.id}`); } catch {}
    }
    await loadConnections(true);
  }, [loadConnections, user]);

  const transferConversation = useCallback(async (conversationId: string, responsibleUserId: string | null) => {
    const { error } = await supabase
      .from("chat_conversations")
      .update({ responsible_user_id: responsibleUserId } as any)
      .eq("id", conversationId);
    if (error) throw error;
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, responsible_user_id: responsibleUserId } : c));
  }, []);

  // Delete conversation (apaga DB; mensagens em cascade)
  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase.from("chat_conversations").delete().eq("id", conversationId);
    if (error) throw error;
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) setActiveConversationId(null);
  }, [activeConversationId]);

  // Delete messages. Both modes remove the row permanently from the database
  // (hard delete), including any media object stored in the chat-media bucket.
  // The official Meta API does not support revoking a message already delivered
  // to the contact's WhatsApp, so "all" only guarantees removal inside Wiize.
  const deleteMessages = useCallback(async (messageIds: string[], _mode: "me" | "all" = "me") => {
    if (!messageIds.length) return;
    const idSet = new Set(messageIds);
    const targets = messages.filter(m => idSet.has(m.id));

    // Optimistic removal
    setMessages(prev => prev.filter(m => !idSet.has(m.id)));

    // Purge media objects from storage so nothing remains recoverable
    const paths = targets
      .map(m => m.media_url || "")
      .filter(url => url.includes("/chat-media/"))
      .map(url => url.split("/chat-media/")[1]?.split("?")[0] || "")
      .filter(Boolean);
    if (paths.length) {
      try { await supabase.storage.from("chat-media").remove(paths); } catch { /* ignore */ }
    }

    const { error } = await supabase.from("chat_messages").delete().in("id", messageIds);
    if (error) throw error;

    // Clear the stored preview of affected conversations so the deleted text
    // does not survive in chat_conversations.last_message_text
    const convIds = Array.from(new Set(targets.map(m => m.conversation_id).filter(Boolean)));
    if (convIds.length) {
      try {
        await supabase
          .from("chat_conversations")
          .update({ last_message_text: null } as any)
          .in("id", convIds);
      } catch { /* ignore */ }
    }
  }, [messages]);

  // Toggle block: bloqueia/desbloqueia contato; mensagens recebidas ficam silenciadas
  const toggleBlock = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    const next = !(conv as any).is_blocked;
    const { error } = await supabase
      .from("chat_conversations")
      .update({ is_blocked: next, is_muted: next } as any)
      .eq("id", conversationId);
    if (error) throw error;
    setConversations(prev => prev.map(c => c.id === conversationId ? ({ ...c, is_blocked: next, is_muted: next } as any) : c));
  }, [conversations]);

  // Salva o nome do contato no chat E sincroniza no CRM (cria lead se não existir)
  const saveContactName = useCallback(async (conversationId: string, name: string) => {
    if (!user) return;
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    // 1. Update chat conversation
    await supabase
      .from("chat_conversations")
      .update({ contact_name: name })
      .eq("id", conversationId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, contact_name: name } : c));

    // 2. Sync to CRM: find lead by phone (last 8 digits) or create
    const cleanPhone = conv.contact_phone.replace(/\D/g, "");
    const last8 = cleanPhone.slice(-8);
    const { data: existing } = await supabase
      .from("leads")
      .select("id, contact_name, phone")
      .eq("user_id", accountOwnerId)
      .ilike("phone", `%${last8}`)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from("leads").update({ contact_name: name }).eq("id", existing[0].id);
    } else {
      // Find default pipeline stage (Prospectado or first)
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("user_id", accountOwnerId)
        .order("position", { ascending: true })
        .limit(1);
      const stageId = stages?.[0]?.id;
      if (stageId) {
        await supabase.from("leads").insert({
          user_id: accountOwnerId,
          contact_name: name,
          phone: cleanPhone,
          pipeline_stage_id: stageId,
          origin: "chat",
        } as any);
      }
    }
  }, [user, accountOwnerId, conversations]);

  // Forward selected messages to a target phone. Returns {requiresTemplate} when window closed.
  const forwardMessages = useCallback(async (
    targetPhone: string,
    targetName: string | undefined,
    msgs: ChatMessage[],
    templateName?: string,
  ): Promise<{ requiresTemplate?: boolean }> => {
    if (!user || !activeConnectionId) return {};
    const clean = formatPhoneForMeta(targetPhone);
    if (!clean) {
      toast.error("Telefone destino inválido.");
      return {};
    }
    const last8 = clean.slice(-8);

    // Find or create conversation
    let conv = conversations.find(c => c.contact_phone.replace(/\D/g, "").endsWith(last8) && c.waba_connection_id === activeConnectionId);
    if (!conv) {
      const { data } = await supabase.from("chat_conversations").insert({
        user_id: user.id,
        owner_user_id: accountOwnerId || user.id,
        waba_connection_id: activeConnectionId,
        contact_phone: clean,
        contact_name: targetName || null,
      } as any).select().single();
      if (!data) throw new Error("Falha ao criar conversa");
      conv = data as ChatConversation;
      setConversations(prev => [conv as ChatConversation, ...prev]);
    }

    const connection = connections.find(c => c.id === activeConnectionId);
    if (!connection) throw new Error("Conexão não encontrada");

    // If template requested, send template first
    if (templateName) {
      await supabase.functions.invoke("send-chat-message", {
        body: {
          conversation_id: conv.id,
          phone_number_id: connection.phone_number_id,
          to: clean,
          type: "template",
          template_name: templateName,
          waba_connection_id: connection.id,
        },
      });
    }

    // Forward each message
    for (const m of msgs) {
      await supabase.functions.invoke("send-chat-message", {
        body: {
          conversation_id: conv.id,
          phone_number_id: connection.phone_number_id,
          to: clean,
          type: m.message_type,
          text: m.message_type === "text" ? m.content : undefined,
          media_url: m.media_url || undefined,
          caption: m.media_caption || undefined,
          filename: m.media_filename || undefined,
          media_mime_type: m.media_mime_type || undefined,
          metadata: { forwarded: true, forwarded_from_message_id: m.id },
          waba_connection_id: connection.id,
        },
      });
    }

    return {};
  }, [user, accountOwnerId, activeConnectionId, conversations, connections]);

  // Reopen an expired conversation by sending an approved Meta template
  const reopenConversation = useCallback(async (templateName: string) => {
    if (!user || !activeConversation) {
      toast.error("Selecione uma conversa");
      return;
    }
    const connection = connections.find(c => c.id === activeConversation.waba_connection_id);
    if (!connection) {
      toast.error("Conexão Meta não encontrada");
      return;
    }
    const to = formatPhoneForMeta(activeConversation.contact_phone);
    if (!to) {
      toast.error("Telefone do contato inválido");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-chat-message", {
        body: {
          conversation_id: activeConversation.id,
          phone_number_id: connection.phone_number_id,
          to,
          type: "template",
          template_name: templateName,
          metadata: { template_name: templateName, reopen: true },
          waba_connection_id: connection.id,
        },
      });
      if (error) throw error;
      toast.success("Template enviado. Janela reaberta após resposta do contato.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao reabrir conversa");
    }
  }, [user, accountOwnerId, activeConversation, connections]);

  return {
    conversations: filteredConversations,
    messages,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    connections,
    activeConnectionId,
    setActiveConnectionId,
    activeConnection,
    isConnectionExpired,
    allConnectionsExpired,
    connectionHealth,
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
    markAsRead,
    markAsUnread,
    startNewConversation,
    messagesEndRef,
    fetchTemplates,
    handleReconnect,
    transferConversation,
    deleteConversation,
    deleteMessages,
    toggleBlock,
    saveContactName,
    forwardMessages,
    reopenConversation,
  };
}

