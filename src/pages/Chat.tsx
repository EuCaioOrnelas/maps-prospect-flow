import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatOfficialApiDialog } from "@/components/chat/ChatOfficialApiDialog";

const Chat = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [showApiDialog, setShowApiDialog] = useState(true);
  const chat = useChat();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const hasConnection = chat.connections.length > 0;
  const hasNoConnection = !hasConnection && !chat.loading;

  // If no connection and dialog dismissed, block access
  const chatBlocked = hasNoConnection && !showApiDialog;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full wa-app-bg overflow-hidden">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="flex-1 flex overflow-hidden">
            {/* Show dialog on entry */}
            {!chat.loading && (
              <ChatOfficialApiDialog
                open={showApiDialog}
                onClose={() => {
                  if (hasConnection) {
                    setShowApiDialog(false);
                  }
                }}
                hasConnection={hasConnection}
              />
            )}

            {hasNoConnection ? (
              <div className="flex-1 flex flex-col items-center justify-center wa-empty-bg px-8">
                <ChatOfficialApiDialog
                  open={true}
                  onClose={() => {}}
                  hasConnection={false}
                />
              </div>
            ) : !showApiDialog ? (
              <>
                <div className="w-[360px] shrink-0 wa-sidebar-border">
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
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Chat;
