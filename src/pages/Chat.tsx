import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatOfficialApiDialog } from "@/components/chat/ChatOfficialApiDialog";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showApiDialog, setShowApiDialog] = useState<boolean | null>(null);
  const [handledLaunchKey, setHandledLaunchKey] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const chat = useChat();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url, chat_onboarding_seen").eq("id", user.id).single()
      .then(({ data }) => {
        setProfile(data);
        setShowApiDialog(data?.chat_onboarding_seen ? false : true);
      });
  }, [user]);

  const hasConnection = chat.connections.length > 0;
  const hasNoConnection = !hasConnection && !chat.loading;

  const handleDismissDialog = async () => {
    if (!hasConnection) return;
    setShowApiDialog(false);
    if (user) {
      await supabase.from("profiles").update({ chat_onboarding_seen: true } as any).eq("id", user.id);
    }
  };

  const isLoading = chat.loading || showApiDialog === null;
  const shouldShowDialog = isLoading ? false : hasNoConnection ? true : !!showApiDialog;

  useEffect(() => {
    if (isLoading || shouldShowDialog || !hasConnection) return;
    const phone = searchParams.get("phone");
    const name = searchParams.get("name") ?? undefined;
    const conversationId = searchParams.get("conversation");
    if (!phone && !conversationId) return;
    const nextLaunchKey = `${conversationId ?? ""}:${phone ?? ""}:${chat.activeConnectionId ?? ""}`;
    if (nextLaunchKey === handledLaunchKey) return;
    const openRequestedChat = async () => {
      if (conversationId) {
        chat.setActiveConversationId(conversationId);
      } else if (phone) {
        await chat.startNewConversation(phone, name);
      }
      setHandledLaunchKey(nextLaunchKey);
      setSearchParams({}, { replace: true });
    };
    void openRequestedChat();
  }, [
    chat.activeConnectionId, chat.setActiveConversationId, chat.startNewConversation,
    handledLaunchKey, hasConnection, isLoading, searchParams, setSearchParams, shouldShowDialog,
  ]);

  // All connections expired → block page
  const showDisconnectedOverlay = !chat.loading && hasConnection && chat.allConnectionsExpired;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full wa-app-bg overflow-hidden">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="flex-1 flex overflow-hidden relative">
            {!isLoading && shouldShowDialog && (
              <ChatOfficialApiDialog
                open={true}
                onClose={hasConnection ? handleDismissDialog : () => {}}
                hasConnection={hasConnection}
              />
            )}

            {/* Disconnected overlay — blocks entire chat */}
            {showDisconnectedOverlay && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-background border border-border rounded-2xl p-8 max-w-[440px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                    <WifiOff size={36} className="text-red-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Conexão desconectada</h2>
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                    O token de acesso do seu WhatsApp Business expirou ou foi revogado. 
                    Reconecte seu número para continuar usando o chat.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-6">
                    💡 As mensagens recebidas durante a desconexão serão sincronizadas automaticamente ao reconectar.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => navigate("/meta-campaigns")}
                      className="bg-[#00a884] hover:bg-[#008f6f] text-white h-11 px-6 text-sm w-full"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Reconectar WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => chat.handleReconnect()}
                      className="text-xs text-muted-foreground h-8"
                    >
                      Verificar novamente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!shouldShowDialog && hasConnection ? (
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
                    connectionHealth={chat.connectionHealth}
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
                  fetchTemplates={chat.fetchTemplates}
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
