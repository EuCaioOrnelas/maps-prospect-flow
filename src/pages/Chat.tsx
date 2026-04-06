import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";

const Chat = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const chat = useChat();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const hasNoConnection = chat.connections.length === 0 && !chat.loading;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full wa-app-bg overflow-hidden">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          {/* No AppHeader - chat uses full height */}
          <div className="flex-1 flex overflow-hidden">
            {hasNoConnection ? (
              <div className="flex-1 flex flex-col items-center justify-center wa-empty-bg px-8">
                <div className="w-[60px] h-[60px] rounded-full bg-[#00a884]/10 flex items-center justify-center mb-5">
                  <MessageSquare size={26} className="text-[#00a884]" />
                </div>
                <h2 className="text-[20px] font-normal wa-text-primary mb-[8px]">Nenhum número conectado</h2>
                <p className="text-[14px] wa-text-secondary text-center max-w-[400px] leading-[20px]">
                  Para usar o chat, conecte um número WhatsApp Business via Meta API na seção de Relacionamento.
                </p>
              </div>
            ) : (
              <>
                <div className="w-[360px] shrink-0 border-r border-[#1e2a32] landing-light:border-[#e9edef]" style={{ borderRight: '1px solid var(--wa-sidebar-divider, #1e2a32)' }}>
                  <ChatSidebar
                    conversations={chat.conversations}
                    activeConversationId={chat.activeConversationId}
                    onSelectConversation={chat.setActiveConversationId}
                    searchQuery={chat.searchQuery}
                    onSearchChange={chat.setSearchQuery}
                    connections={chat.connections}
                    activeConnectionId={chat.activeConnectionId}
                    onConnectionChange={chat.setActiveConnectionId}
                    onTogglePin={chat.togglePin}
                    onArchive={chat.archiveConversation}
                    onToggleMute={chat.toggleMute}
                    loading={chat.loading}
                    onNewConversation={chat.startNewConversation}
                  />
                </div>
                <ChatMessageArea
                  conversation={chat.activeConversation}
                  messages={chat.messages}
                  loading={chat.loadingMessages}
                  onSendMessage={chat.sendMessage}
                  onSendMedia={chat.sendMedia}
                  messagesEndRef={chat.messagesEndRef as React.RefObject<HTMLDivElement>}
                  onReopenConversation={(templateName) => {
                    console.log("Reabrir conversa com template:", templateName);
                    // TODO: integrate with Meta template API
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Chat;
