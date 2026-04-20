import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  ExternalLink,
  MessageSquare,
  Bell,
  Sparkles,
  Shield,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

const Chat = () => {
  const { user } = useAuth();
  useAutoScoreTracking("chat");
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showApiDialog, setShowApiDialog] = useState<boolean | null>(null);
  const [handledLaunchKey, setHandledLaunchKey] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const chat = useChat();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan, name, email, avatar_url, chat_onboarding_seen")
      .eq("id", user.id)
      .single()
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
    chat.activeConnectionId,
    chat.setActiveConversationId,
    chat.startNewConversation,
    handledLaunchKey,
    hasConnection,
    isLoading,
    searchParams,
    setSearchParams,
    shouldShowDialog,
  ]);

  const showDisconnectedOverlay = !chat.loading && hasConnection && chat.allConnectionsExpired;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full wa-app-bg overflow-hidden">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px] bg-background">
          <div className="flex-1 flex overflow-hidden relative">
            {showDisconnectedOverlay && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-background border border-border rounded-2xl p-8 max-w-[440px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                    <WifiOff size={36} className="text-destructive" />
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
                    <Button onClick={() => navigate("/meta-campaigns")} className="h-11 px-6 text-sm w-full">
                      <RefreshCw size={16} className="mr-2" />
                      Reconectar WhatsApp
                    </Button>
                    <Button variant="ghost" onClick={() => chat.handleReconnect()} className="text-xs text-muted-foreground h-8">
                      Verificar novamente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && shouldShowDialog ? (
              <div className="relative flex-1 overflow-auto">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-1/4 -left-32 h-[420px] w-[420px] rounded-full bg-primary/5 blur-3xl" />
                  <div className="absolute right-0 bottom-0 h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl" />
                </div>

                <div className="relative flex min-h-full flex-col">
                  <header className="border-b border-border bg-background">
                    <div className="px-6 sm:px-10 py-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MessageSquare size={20} className="text-primary" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold tracking-tight text-foreground">Chat</h1>
                        <p className="text-xs text-muted-foreground">Conversas integradas WhatsApp Business</p>
                      </div>
                    </div>
                  </header>

                  <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
                    <div className="w-full max-w-4xl rounded-3xl border border-border bg-card shadow-sm">
                      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-0">
                        <div className="p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-border">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-4">
                            <Sparkles size={10} /> Em breve
                          </div>

                          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">
                            Chat integrado em desenvolvimento
                          </h2>

                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                            Estamos finalizando a experiência completa de chat da Wiize para que você responda leads sem sair da plataforma, com histórico unificado, contexto comercial e operação mais profissional.
                          </p>

                          <div className="grid sm:grid-cols-2 gap-3 mb-6">
                            <FeatureCard
                              icon={<Clock3 size={16} className="text-primary" />}
                              title="Respostas em tempo real"
                              description="Acompanhe e responda mensagens com atualização contínua dentro da plataforma."
                            />
                            <FeatureCard
                              icon={<MessageSquare size={16} className="text-primary" />}
                              title="Histórico por contato"
                              description="Visualize toda a linha do tempo da conversa em um só lugar."
                            />
                            <FeatureCard
                              icon={<Shield size={16} className="text-primary" />}
                              title="Operação mais segura"
                              description="Uso via infraestrutura oficial, com mais controle e rastreabilidade."
                            />
                            <FeatureCard
                              icon={<Bell size={16} className="text-primary" />}
                              title="Integração com CRM"
                              description="Contexto do lead, tags e acompanhamento comercial na mesma rotina."
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button asChild size="lg" className="gap-2">
                              <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer">
                                Acessar Meta Business Suite
                                <ExternalLink size={14} />
                              </a>
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
                              Voltar ao dashboard
                            </Button>
                          </div>
                        </div>

                        <div className="p-7 sm:p-10 bg-muted/30">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                            <AlertTriangle size={28} className="text-primary" />
                          </div>

                          <h3 className="text-xl font-semibold text-foreground mb-3">
                            Como usar enquanto liberamos o módulo
                          </h3>

                          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                            <p>
                              Por enquanto, o atendimento deve ser feito no sistema oficial da Meta. Assim você continua respondendo seus leads normalmente sem interromper a operação.
                            </p>
                            <p>
                              Quando o módulo estiver concluído, o objetivo é centralizar atendimento, contexto do CRM e histórico de mensagens em uma experiência única dentro da Wiize.
                            </p>
                          </div>

                          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                            <p className="text-sm font-medium text-foreground mb-2">O que vai entrar nesta versão</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Caixa de entrada unificada</li>
                              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Visualização completa da conversa</li>
                              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Ações comerciais conectadas ao CRM</li>
                              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Fluxo operacional mais rápido para o time</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : hasConnection ? (
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

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl border border-border bg-background p-4">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
      {icon}
    </div>
    <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export default Chat;

