import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { useWhatsAppNumbers, PLAN_LIMITS } from '@/hooks/useWhatsAppNumbers';
import { useContacts } from '@/hooks/useContacts';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ContactInfoPanel } from '@/components/chat/ContactInfoPanel';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { SaveContactDialog } from '@/components/chat/SaveContactDialog';

import { NumbersManager } from '@/components/whatsapp/NumbersManager';
import { ReconnectDialog } from '@/components/whatsapp/ReconnectDialog';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Phone, MessageSquare, Plus, Settings2, Bell, BellOff, RefreshCw, GitMerge, Download, Settings, UsersRound } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WhatsAppNumber } from '@/hooks/useWhatsAppNumbers';
import ChatComingSoon from './ChatComingSoon';

// Emails com acesso ao Chat
const CHAT_ALLOWED_EMAILS = [
  'sonencorretora@hotmail.com',
  'caiowiize@gmail.com'
];

const Chat = () => {
  const { profile } = useAuth();
  
  // Verificar se o usuário tem acesso ao chat
  const hasChatAccess = profile?.email && CHAT_ALLOWED_EMAILS.includes(profile.email.toLowerCase());
  
  // Se não tem acesso, mostra a página "Em Breve"
  if (!hasChatAccess) {
    return <ChatComingSoon />;
  }
  const { numbers, loading: loadingNumbers, fetchNumbers, setNumbers } = useWhatsAppNumbers();
  const { createContact } = useContacts();
  const { quickReplies } = useQuickReplies();
  const { isSupported: notificationsSupported, permission, requestPermission } = useChatNotifications();
  const { isTyping } = useTypingIndicator();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(() => {
    // Restore from localStorage on initial load
    return localStorage.getItem('chat_selected_number_id');
  });
  const [notificationRequested, setNotificationRequested] = useState(false);
  const [showNumbersManager, setShowNumbersManager] = useState(false);
  const [webhookSyncedFor, setWebhookSyncedFor] = useState<string | null>(null);
  const [syncingWebhook, setSyncingWebhook] = useState(false);
  const [mergingConversations, setMergingConversations] = useState(false);
  const [syncingGroups, setSyncingGroups] = useState(false);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [initialSyncLoading, setInitialSyncLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ conversations: number; messages: number } | null>(null);
  
  const {
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
    togglePinConversation,
    markAsUnread,
    editMessage,
  } = useChat(selectedNumberId);

  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showSaveContactDialog, setShowSaveContactDialog] = useState(false);
  const [conversationToSave, setConversationToSave] = useState<Conversation | null>(null);

  // Connection monitor for auto-reconnect
  const { 
    reconnectState, 
    isSyncing, 
    triggerSync, 
    clearReconnectState 
  } = useConnectionMonitor({
    numbers,
    onNumbersChange: (updated) => setNumbers(updated),
    enabled: true,
    checkIntervalMs: 30000, // Check every 30 seconds
  });

  // Show reconnect dialog when needed
  useEffect(() => {
    if (reconnectState?.needsQR) {
      setShowReconnectDialog(true);
    }
  }, [reconnectState]);

  // Get connected numbers only
  const connectedNumbers = numbers.filter(n => n.is_connected);
  
  // Get plan limits
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const maxNumbers = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || 1;

  // Auto-select number: restore from localStorage or fallback to first connected
  useEffect(() => {
    if (connectedNumbers.length === 0) return;
    
    const savedNumberId = localStorage.getItem('chat_selected_number_id');
    
    // Check if saved number still exists and is connected
    const savedNumberExists = savedNumberId && connectedNumbers.some(n => n.id === savedNumberId);
    
    if (savedNumberExists && !selectedNumberId) {
      setSelectedNumberId(savedNumberId);
    } else if (!savedNumberExists && !selectedNumberId) {
      // Fallback to first connected number
      setSelectedNumberId(connectedNumbers[0].id);
    }
  }, [connectedNumbers, selectedNumberId]);

  // Auto-sync webhook when a number is selected to ensure messages are received
  useEffect(() => {
    const syncWebhook = async () => {
      if (!selectedNumberId) return;
      
      // Only sync once per number per session
      if (webhookSyncedFor === selectedNumberId) return;
      
      const selectedNumber = connectedNumbers.find(n => n.id === selectedNumberId);
      if (!selectedNumber?.instance_name || !selectedNumber.is_connected) return;

      try {
        // Silently reconfigure webhook to ensure messages come through
        await supabase.functions.invoke('evolution-reconfigure-webhook', {
          body: { instanceName: selectedNumber.instance_name },
        });
        console.log('Webhook synced for:', selectedNumber.instance_name);
        setWebhookSyncedFor(selectedNumberId);
      } catch (error) {
        console.error('Error syncing webhook:', error);
      }
    };

    syncWebhook();
  }, [selectedNumberId, connectedNumbers, webhookSyncedFor]);

  // Clear selected conversation when changing number and persist to localStorage
  const handleNumberChange = (numberId: string) => {
    const newId = numberId || null;
    setSelectedNumberId(newId);
    setSelectedConversation(null);
    
    // Persist selection to localStorage
    if (newId) {
      localStorage.setItem('chat_selected_number_id', newId);
    } else {
      localStorage.removeItem('chat_selected_number_id');
    }
  };

  const handleSendMessage = async (content: string, quotedMessageId?: string) => {
    try {
      await sendMessage(content, 'text', quotedMessageId);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleSendMedia = async (mediaUrl: string, messageType: 'image' | 'audio', caption?: string) => {
    try {
      await sendMessage(caption || '', messageType, undefined, mediaUrl);
    } catch (error) {
      toast.error('Erro ao enviar mídia');
    }
  };

  const handleStartConversation = async (
    phone: string,
    whatsappNumberId: string,
    contactName?: string,
    initialMessage?: string
  ) => {
    const conversation = await startConversation(phone, whatsappNumberId, contactName, initialMessage);
    if (conversation) {
      selectConversation(conversation);
    }
  };

  // Handle selecting an existing conversation and optionally sending a message
  const handleSelectExistingConversation = async (conversationId: string, initialMessage?: string) => {
    const existingConv = conversations.find(c => c.id === conversationId);
    if (existingConv) {
      await selectConversation(existingConv);
      
      // If there's an initial message, send it
      if (initialMessage) {
        try {
          await sendMessage(initialMessage, 'text');
        } catch (error) {
          toast.error('Erro ao enviar mensagem');
          throw error;
        }
      }
    }
  };

  const handleNumbersChange = (updatedNumbers: WhatsAppNumber[]) => {
    fetchNumbers();
  };

  const handleConnect = async (numberId: string, shouldSync?: boolean) => {
    setSelectedNumberId(numberId);
    setShowNumbersManager(false);
    
    // If this is a new connection, sync messages first
    if (shouldSync) {
      setInitialSyncLoading(true);
      setSyncProgress(null);
      
      // Fetch the number from database to ensure we have latest data
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('instance_name')
        .eq('id', numberId)
        .single();
      
      if (numberData?.instance_name) {
        try {
          const response = await supabase.functions.invoke('evolution-sync-messages', {
            body: { 
              instanceName: numberData.instance_name,
              numberId: numberId,
              lastSyncAt: new Date().toISOString()
            },
          });

          if (response.data?.success) {
            setSyncProgress({
              conversations: response.data.syncedConversations || 0,
              messages: response.data.syncedMessages || 0,
            });
            
            // Refresh conversations
            await fetchConversations();
            
            toast.success(`Sincronizado: ${response.data.syncedConversations || 0} conversas, ${response.data.syncedMessages || 0} mensagens`);
          }
        } catch (err) {
          console.error('Error syncing messages:', err);
          toast.error('Erro ao sincronizar mensagens');
        }
      }
      
      // Small delay to show results
      await new Promise(resolve => setTimeout(resolve, 1500));
      setInitialSyncLoading(false);
      setSyncProgress(null);
      
      // Refresh numbers list
      await fetchNumbers();
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await requestPermission();
    setNotificationRequested(true);
    if (granted) {
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão de notificações negada');
    }
  };

  const handleManualWebhookSync = async () => {
    const selectedNumber = connectedNumbers.find(n => n.id === selectedNumberId);
    if (!selectedNumber?.instance_name) return;

    setSyncingWebhook(true);
    try {
      const response = await supabase.functions.invoke('test-webhook', {
        body: { instanceName: selectedNumber.instance_name, action: 'reconfigure' },
      });
      
      if (response.data?.reconfigureSuccess) {
        toast.success('Webhook reconfigurado! Mensagens devem chegar agora.');
        setWebhookSyncedFor(null); // Force re-sync
      } else {
        toast.error('Não foi possível reconfigurar. Tente desconectar e reconectar o WhatsApp.');
      }
      console.log('Webhook sync result:', response.data);
    } catch (error) {
      console.error('Webhook sync error:', error);
      toast.error('Erro ao sincronizar webhook');
    } finally {
      setSyncingWebhook(false);
    }
  };

  // Handle sync messages from server
  const handleSyncMessages = async () => {
    if (!selectedNumberId) return;
    
    setSyncingWebhook(true);
    try {
      await triggerSync(selectedNumberId);
    } finally {
      setSyncingWebhook(false);
    }
  };

  // Handle sync groups from WhatsApp
  const handleSyncGroups = async () => {
    const selectedNumber = connectedNumbers.find(n => n.id === selectedNumberId);
    if (!selectedNumber?.instance_name) {
      toast.error('Selecione um número conectado');
      return;
    }

    setSyncingGroups(true);
    try {
      const response = await supabase.functions.invoke('evolution-sync-messages', {
        body: { 
          instanceName: selectedNumber.instance_name,
          numberId: selectedNumberId,
          syncGroupsOnly: true, // Flag to sync only groups
        },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.success) {
        const groupsFound = response.data?.groupsFound ?? 0;
        const groupsCreated = response.data?.groupsCreated ?? response.data?.syncedConversations ?? 0;
        const groupsUpdated = response.data?.groupsUpdated ?? 0;

        toast.success(`Grupos: ${groupsFound} encontrados • ${groupsCreated} novos • ${groupsUpdated} atualizados`);
        await fetchConversations();
      } else {
        toast.error('Erro ao sincronizar grupos');
      }
    } catch (error) {
      console.error('Error syncing groups:', error);
      toast.error('Erro ao sincronizar grupos');
    } finally {
      setSyncingGroups(false);
    }
  };

  const handleMergeDuplicates = async () => {
    setMergingConversations(true);
    try {
      const result = await mergeDuplicateConversations();
      if (result.deleted > 0) {
        toast.success(`${result.deleted} conversas duplicadas mescladas com sucesso!`);
      } else {
        toast.info('Nenhuma conversa duplicada encontrada.');
      }
    } catch (error) {
      console.error('Error merging conversations:', error);
      toast.error('Erro ao mesclar conversas duplicadas');
    } finally {
      setMergingConversations(false);
    }
  };

  const handleSaveContact = (conversation: Conversation) => {
    setConversationToSave(conversation);
    setShowSaveContactDialog(true);
  };

  const handleSaveContactSubmit = async (data: { 
    name: string; 
    email?: string; 
    company?: string; 
    notes?: string;
    createLead?: boolean;
    category?: string;
  }) => {
    if (!conversationToSave) return;

    try {
      const contact = await createContact({
        phone: conversationToSave.phone,
        name: data.name,
        email: data.email,
        company: data.company,
        notes: data.notes,
        origin: 'chat',
      });

      if (contact) {
        await linkContactToConversation(conversationToSave.id, contact.id);
        
        // Update selected conversation to reflect the saved contact
        if (selectedConversation?.id === conversationToSave.id) {
          setSelectedConversation({
            ...selectedConversation,
            contact_id: contact.id,
            contacts: {
              id: contact.id,
              name: contact.name,
              avatar_url: contact.avatar_url,
            },
          });
        }
        
        // Create lead in CRM if requested
        if (data.createLead && profile) {
          // Get the first pipeline stage (Prospectado)
          const { data: stages } = await supabase
            .from('pipeline_stages')
            .select('id')
            .eq('user_id', profile.id)
            .order('position', { ascending: true })
            .limit(1);
          
          // Determine whatsapp_status based on conversation history
          let whatsappStatus = 'in_conversation';
          
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('phone', conversationToSave.phone)
            .eq('user_id', profile.id)
            .single();
          
          if (!existingLead) {
            const { error: leadError } = await supabase
              .from('leads')
              .insert({
                user_id: profile.id,
                phone: conversationToSave.phone,
                contact_name: data.name,
                company_name: data.company || null,
                category: data.category || null,
                origin: 'chat',
                pipeline_stage_id: stages?.[0]?.id || null,
                contact_id: contact.id,
                conversation_id: conversationToSave.id,
                whatsapp_status: whatsappStatus,
                last_response: conversationToSave.last_message,
                last_response_at: conversationToSave.last_message_at,
              });

            if (leadError) {
              console.error('Error creating lead:', leadError);
              toast.error('Contato salvo, mas erro ao criar lead no CRM');
            } else {
              toast.success('Contato e lead salvos com sucesso!');
            }
          } else {
            // Update existing lead with contact_id
            await supabase
              .from('leads')
              .update({ 
                contact_id: contact.id,
                conversation_id: conversationToSave.id,
                contact_name: data.name,
                company_name: data.company || null,
              })
              .eq('id', existingLead.id);
            
            toast.success('Contato salvo e lead atualizado!');
          }
        } else {
          toast.success('Contato salvo com sucesso!');
        }
      }
    } catch (error) {
      toast.error('Erro ao salvar contato');
      throw error;
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      toast.success('Conversa deletada');
    } catch (error) {
      toast.error('Erro ao deletar conversa');
    }
  };

  // Handle forwarding a message to other conversations
  const handleForwardMessage = async (conversationIds: string[], message: { content?: string | null; media_url?: string | null; message_type: string }) => {
    for (const convId of conversationIds) {
      try {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) continue;

        // Send the message to the conversation via the edge function
        await supabase.functions.invoke('chat-send-message', {
          body: {
            conversationId: convId,
            content: message.content || '',
            messageType: message.message_type,
            mediaUrl: message.media_url,
          },
        });
      } catch (error) {
        console.error('Error forwarding to conversation:', convId, error);
      }
    }
    toast.success(`Mensagem encaminhada para ${conversationIds.length} conversa(s)`);
  };

  // Track messages being deleted
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());

  // Handle deleting a message
  const handleDeleteMessage = async (message: Message, forEveryone: boolean) => {
    // Add to deleting set immediately for visual feedback
    setDeletingMessageIds(prev => new Set(prev).add(message.id));
    
    try {
      // Call edge function to delete (handles both local DB and Evolution API)
      const { error } = await supabase.functions.invoke('evolution-delete-message', {
        body: {
          messageId: message.message_id,
          messageDbId: message.id,
          remoteJid: message.remote_jid,
          whatsappNumberId: selectedConversation?.whatsapp_number_id,
          forEveryone: forEveryone && message.from_me, // Only can delete for everyone if sent by us
        },
      });

      if (error) {
        console.error('Error deleting message:', error);
        throw error;
      }

      // Re-select conversation to refresh messages
      if (selectedConversation) {
        await selectConversation(selectedConversation);
      }
      
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    } finally {
      // Remove from deleting set
      setDeletingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  };

  // Handle editing a message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      toast.success('Mensagem editada com sucesso');
    } catch (error) {
      toast.error('Erro ao editar mensagem');
      throw error;
    }
  };

  return (
    <>
      <SEO
        title="Chat - WiizeProspect"
        description="Converse com seus leads em tempo real"
      />
      
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <AppSidebar profile={profile} />

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:pl-14 flex flex-col h-screen">
          {/* Mobile Nav */}
          <MobileNav profile={profile} />

          {/* Chat Layout */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Initial Sync Loading Screen */}
            {initialSyncLoading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="w-10 h-10 text-primary animate-bounce" />
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-foreground">
                      Sincronizando conversas...
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Estamos carregando suas conversas do WhatsApp. Isso pode levar alguns segundos.
                    </p>
                  </div>
                  
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    
                    {syncProgress && (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>✓ {syncProgress.conversations} conversas encontradas</p>
                        <p>✓ {syncProgress.messages} mensagens sincronizadas</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Aguarde, você será redirecionado automaticamente...
                    </p>
                  </div>
                </div>
              </div>
            ) : loadingNumbers ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : connectedNumbers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                  {/* Icon */}
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-primary" />
                  </div>
                  
                  {/* Title and Description */}
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-foreground">
                      Nenhum número conectado
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Para usar o chat, conecte seu WhatsApp escaneando o QR Code com seu celular.
                    </p>
                  </div>
                  
                  {/* Steps */}
                  <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
                    <h3 className="font-semibold text-foreground text-sm">Como conectar:</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          1
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Clique no botão abaixo para adicionar um novo número
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          2
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Abra o WhatsApp no seu celular e vá em <strong>Configurações → Dispositivos conectados</strong>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          3
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Escaneie o QR Code que aparecerá na tela
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <Button 
                    onClick={() => setShowNumbersManager(true)}
                    size="lg"
                    className="w-full gap-2 h-12 text-base"
                  >
                    <Plus className="w-5 h-5" />
                    Conectar WhatsApp
                  </Button>
                  
                  {/* Security Note */}
                  <p className="text-xs text-muted-foreground">
                    🔒 Sua conexão é segura e criptografada. Você pode desconectar a qualquer momento.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="h-14 px-4 border-b border-border bg-card/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Número:</span>
                    <Select value={selectedNumberId || ''} onValueChange={(value) => handleNumberChange(value)}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione um número" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedNumbers.map((number) => (
                          <SelectItem key={number.id} value={number.id}>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              <span>{number.name}</span>
                              {number.phone_number && (
                                <span className="text-muted-foreground text-xs">
                                  ({number.phone_number})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Notification Toggle */}
                    {notificationsSupported && permission !== 'granted' && !notificationRequested && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleRequestNotifications}
                            >
                              <BellOff className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ativar notificações</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {notificationsSupported && permission === 'granted' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-green-500">
                              <Bell className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Notificações ativadas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* New Chat Button */}
                    <Button
                      size="sm"
                      onClick={() => setShowNewChatDialog(true)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nova Conversa</span>
                    </Button>
                    
                    {/* Merge Duplicates Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleMergeDuplicates}
                            disabled={mergingConversations}
                          >
                            <GitMerge className={`h-4 w-4 ${mergingConversations ? 'animate-pulse' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mesclar conversas duplicadas</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Sync Webhook Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleManualWebhookSync}
                            disabled={syncingWebhook}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncingWebhook ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sincronizar webhook</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Sync Messages Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSyncMessages}
                            disabled={isSyncing || syncingWebhook}
                          >
                            <Download className={`h-4 w-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Recuperar mensagens do WhatsApp</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Sync Groups Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSyncGroups}
                            disabled={syncingGroups}
                          >
                            <UsersRound className={`h-4 w-4 ${syncingGroups ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sincronizar grupos do WhatsApp</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Manage Numbers Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNumbersManager(true)}
                      className="gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Gerenciar</span>
                    </Button>
                    
                    {/* Chat Settings Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/chat/settings">
                            <Button size="sm" variant="ghost">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Configurações do Chat</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Main Chat Content */}
                <div className="flex-1 min-w-0 flex min-h-0 overflow-hidden">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {/* Conversation List - Hidden on mobile when chat selected */}
                      <div className={`w-full sm:w-80 lg:w-96 shrink-0 ${selectedConversation ? 'hidden sm:block' : ''}`}>
                        <ConversationList
                          conversations={getFilteredConversations()}
                          selectedConversation={selectedConversation}
                          onSelect={selectConversation}
                          onNewChat={() => setShowNewChatDialog(true)}
                          onSaveContact={handleSaveContact}
                          onDelete={handleDelete}
                          onBulkDelete={async (ids, deleteContacts) => {
                            try {
                              await bulkDeleteConversations(ids, deleteContacts);
                              toast.success(`${ids.length} conversa(s) excluída(s) com sucesso`);
                            } catch (error) {
                              toast.error('Erro ao excluir conversas');
                              throw error;
                            }
                          }}
                          onTogglePin={(conversation) => togglePinConversation(conversation.id, !!conversation.pinned_at)}
                          onMarkUnread={(conversation) => {
                            markAsUnread(conversation.id);
                            toast.success('Conversa marcada como não lida');
                          }}
                          filter={conversationFilter}
                          onFilterChange={setConversationFilter}
                          totalConversations={conversations.length}
                        />
                      </div>

                      {/* Chat Area */}
                      <div className={`flex-1 min-w-0 flex flex-col min-h-0 ${!selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
                        <div className="flex-1 min-w-0 flex min-h-0 overflow-hidden">
                          <div className="flex-1 min-h-0 flex flex-col">
                            <ChatArea
                              conversation={selectedConversation}
                              messages={messages}
                              isSending={isSending}
                              isTyping={selectedConversation ? isTyping(selectedConversation.remote_jid) : false}
                              deletingMessageIds={deletingMessageIds}
                              onSendMessage={handleSendMessage}
                              onSendMedia={handleSendMedia}
                              onOpenContactInfo={() => setShowContactInfo(true)}
                              onBack={() => setSelectedConversation(null)}
                              onSaveContact={handleSaveContact}
                              quickReplies={quickReplies}
                              allConversations={conversations}
                              onForwardMessage={handleForwardMessage}
                              onDeleteMessage={handleDeleteMessage}
                              onEditMessage={handleEditMessage}
                              onCloseConversation={() => setSelectedConversation(null)}
                            />
                          </div>

                          {/* Contact Info Panel - Desktop only */}
                          {showContactInfo && selectedConversation && (
                            <div className="hidden lg:block">
                              <ContactInfoPanel
                                conversation={selectedConversation}
                                onClose={() => setShowContactInfo(false)}
                                onContactUpdated={fetchConversations}
                                onOpenNumbersManager={() => setShowNumbersManager(true)}
                                onStartConversation={(phone) => {
                                  // Close the contact info panel
                                  setShowContactInfo(false);
                                  // Start a new conversation with the selected WhatsApp number
                                  if (selectedNumberId) {
                                    handleStartConversation(phone, selectedNumberId);
                                  } else {
                                    // If no number selected, open new chat dialog with the phone pre-filled
                                    setShowNewChatDialog(true);
                                    toast.info(`Número: ${phone}. Selecione o WhatsApp para iniciar.`);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* New Chat Dialog */}
        <NewChatDialog
          open={showNewChatDialog}
          onOpenChange={setShowNewChatDialog}
          onStartConversation={handleStartConversation}
          defaultWhatsAppNumberId={selectedNumberId || undefined}
          existingConversations={conversations.map(c => ({
            id: c.id,
            phone: c.phone,
            whatsapp_number_id: c.whatsapp_number_id,
          }))}
          onSelectExistingConversation={handleSelectExistingConversation}
        />

        {/* Save Contact Dialog */}
        <SaveContactDialog
          open={showSaveContactDialog}
          onOpenChange={setShowSaveContactDialog}
          conversation={conversationToSave}
          onSave={handleSaveContactSubmit}
        />

        {/* Numbers Manager - reusing from WhatsApp campaigns */}
        <NumbersManager
          numbers={numbers}
          onNumbersChange={handleNumbersChange}
          maxNumbers={maxNumbers}
          onConnect={handleConnect}
          forceOpen={showNumbersManager}
          onClose={() => setShowNumbersManager(false)}
          hideButtons={true}
        />

        {/* Reconnect Dialog */}
        {reconnectState && (
          <ReconnectDialog
            open={showReconnectDialog}
            onOpenChange={(open) => {
              setShowReconnectDialog(open);
              if (!open) clearReconnectState();
            }}
            numberId={reconnectState.numberId}
            instanceName={reconnectState.instanceName}
            numberName={numbers.find(n => n.id === reconnectState.numberId)?.name || 'WhatsApp'}
            qrCode={reconnectState.qrCode}
            onReconnected={() => {
              fetchNumbers();
              fetchConversations();
              setShowReconnectDialog(false);
              clearReconnectState();
            }}
          />
        )}
      </div>
    </>
  );
};

export default Chat;
