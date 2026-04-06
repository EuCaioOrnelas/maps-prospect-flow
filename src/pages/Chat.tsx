import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

const Chat = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const chat = useChat();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="min-h-screen flex bg-[#111b21]">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col">
        <AppHeader profile={profile} />
        <div className="flex-1 flex overflow-hidden">
          {chat.connections.length === 0 && !chat.loading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] px-8">
              <div className="w-16 h-16 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-[#00a884]" />
              </div>
              <h2 className="text-xl font-medium text-[#e9edef] mb-2">Nenhum número conectado</h2>
              <p className="text-sm text-[#8696a0] text-center max-w-md">
                Para usar o chat, conecte um número WhatsApp Business via Meta API na seção de Relacionamento.
              </p>
            </div>
          ) : (
            <>
              <div className="w-[380px] shrink-0 border-r border-[#222d34]">
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
                />
              </div>
              <ChatMessageArea
                conversation={chat.activeConversation}
                messages={chat.messages}
                loading={chat.loadingMessages}
                onSendMessage={chat.sendMessage}
                onSendMedia={chat.sendMedia}
                messagesEndRef={chat.messagesEndRef as React.RefObject<HTMLDivElement>}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
