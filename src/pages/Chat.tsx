import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ContactInfoPanel } from '@/components/chat/ContactInfoPanel';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Phone, MessageSquare } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Chat = () => {
  const { profile } = useAuth();
  const { numbers, loading: loadingNumbers } = useWhatsAppNumbers();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  
  const {
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
  } = useChat(selectedNumberId);

  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  // Get connected numbers only
  const connectedNumbers = numbers.filter(n => n.is_connected);

  // Auto-select first connected number
  useEffect(() => {
    if (connectedNumbers.length > 0 && !selectedNumberId) {
      setSelectedNumberId(connectedNumbers[0].id);
    }
  }, [connectedNumbers, selectedNumberId]);

  // Clear selected conversation when changing number
  const handleNumberChange = (numberId: string) => {
    setSelectedNumberId(numberId);
    setSelectedConversation(null);
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleStartConversation = async (
    phone: string,
    whatsappNumberId: string,
    contactName?: string
  ) => {
    const conversation = await startConversation(phone, whatsappNumberId, contactName);
    if (conversation) {
      selectConversation(conversation);
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
        <main className="flex-1 lg:ml-14 flex flex-col h-screen">
          {/* Mobile Nav */}
          <MobileNav profile={profile} />

          {/* Chat Layout */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Number Selector Header */}
            {loadingNumbers ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : connectedNumbers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold text-foreground">Nenhum número conectado</h2>
                  <p className="text-muted-foreground max-w-md">
                    Para usar o chat, conecte um número WhatsApp na página de Disparos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Número:</span>
                  <Select value={selectedNumberId || ''} onValueChange={handleNumberChange}>
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

                {/* Main Chat Content */}
                <div className="flex-1 flex overflow-hidden">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {/* Conversation List - Hidden on mobile when chat selected */}
                      <div className={`w-full sm:w-80 lg:w-96 shrink-0 ${selectedConversation ? 'hidden sm:block' : ''}`}>
                        <ConversationList
                          conversations={conversations}
                          selectedConversation={selectedConversation}
                          onSelect={selectConversation}
                          onNewChat={() => setShowNewChatDialog(true)}
                        />
                      </div>

                      {/* Chat Area */}
                      <div className={`flex-1 ${!selectedConversation ? 'hidden sm:flex' : 'flex'}`}>
                        <div className="flex-1">
                          <ChatArea
                            conversation={selectedConversation}
                            messages={messages}
                            isSending={isSending}
                            onSendMessage={handleSendMessage}
                            onOpenContactInfo={() => setShowContactInfo(true)}
                          />
                        </div>

                        {/* Contact Info Panel - Desktop only */}
                        {showContactInfo && selectedConversation && (
                          <div className="hidden lg:block">
                            <ContactInfoPanel
                              conversation={selectedConversation}
                              onClose={() => setShowContactInfo(false)}
                              onContactUpdated={fetchConversations}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* New Chat Dialog */}
        {selectedNumberId && (
          <NewChatDialog
            open={showNewChatDialog}
            onOpenChange={setShowNewChatDialog}
            onStartConversation={handleStartConversation}
            defaultWhatsAppNumberId={selectedNumberId}
          />
        )}
      </div>
    </>
  );
};

export default Chat;
