import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ContactInfoPanel } from '@/components/chat/ContactInfoPanel';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';

const Chat = () => {
  const { profile } = useAuth();
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
  } = useChat();

  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

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
        </main>

        {/* New Chat Dialog */}
        <NewChatDialog
          open={showNewChatDialog}
          onOpenChange={setShowNewChatDialog}
          onStartConversation={handleStartConversation}
        />
      </div>
    </>
  );
};

export default Chat;
