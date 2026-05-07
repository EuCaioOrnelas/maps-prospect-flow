import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MetaManualSetup } from "@/components/meta-campaigns/MetaManualSetup";
import { useToast } from "@/hooks/use-toast";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

const Chat = () => {
  const { user } = useAuth();
  useAutoScoreTracking("chat");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [showApiDialog, setShowApiDialog] = useState<boolean | null>(null);
  const [handledLaunchKey, setHandledLaunchKey] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [reconnectOpen, setReconnectOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
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
                    <Button onClick={() => setReconnectOpen(true)} className="h-11 px-6 text-sm w-full">
                      <RefreshCw size={16} className="mr-2" />
                      Reconectar WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={verifying}
                      onClick={async () => {
                        setVerifying(true);
                        await chat.handleReconnect();
                        setVerifying(false);
                        toast({
                          title: "Verificação concluída",
                          description: chat.allConnectionsExpired
                            ? "Nenhum número ativo encontrado. Reconecte para continuar."
                            : "Conexão restaurada com sucesso.",
                        });
                      }}
                      className="text-xs text-muted-foreground h-8"
                    >
                      {verifying ? "Verificando..." : "Verificar novamente"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && shouldShowDialog ? (
              <div className="relative flex-1 overflow-auto bg-gradient-to-b from-background via-background to-muted/20">
                <header className="h-[58px] min-h-[58px] border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center">
                  <div className="px-6 sm:px-10 lg:px-14 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare size={16} className="text-primary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h1 className="text-sm font-bold tracking-tight text-foreground">Chat</h1>
                      <span className="text-xs text-muted-foreground hidden sm:inline">· Conversas integradas WhatsApp Business</span>
                    </div>
                  </div>
                </header>

                <div className="px-6 sm:px-10 lg:px-14 py-12 lg:py-20 max-w-6xl mx-auto">
                  {/* Hero card */}
                  <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm p-8 sm:p-12 lg:p-14 mb-10">
                    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                    <div className="relative">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-wider mb-6">
                        <Sparkles size={11} /> Em breve
                      </div>

                      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.05] mb-6 max-w-3xl">
                        Chat integrado <span className="text-primary">em desenvolvimento</span>
                      </h2>

                      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl">
                        Estamos finalizando a experiência completa de chat da Wiize para que você responda leads sem sair da plataforma, com histórico unificado, contexto comercial e operação mais profissional.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button asChild size="lg" className="gap-2 h-12 px-6 text-sm shadow-md">
                          <a href="https://business.facebook.com/wa/manage/home" target="_blank" rel="noopener noreferrer">
                            Acessar Meta Business Suite
                            <ExternalLink size={14} />
                          </a>
                        </Button>
                        <Button variant="outline" size="lg" className="h-12 px-6 text-sm" onClick={() => navigate("/dashboard")}>
                          Voltar ao dashboard
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Feature cards */}
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        O que vem por aí
                      </p>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FeatureCard
                        icon={<Clock3 size={18} className="text-primary" />}
                        title="Respostas em tempo real"
                        description="Acompanhe e responda mensagens com atualização contínua dentro da plataforma."
                      />
                      <FeatureCard
                        icon={<MessageSquare size={18} className="text-primary" />}
                        title="Histórico por contato"
                        description="Visualize toda a linha do tempo da conversa em um só lugar."
                      />
                      <FeatureCard
                        icon={<Shield size={18} className="text-primary" />}
                        title="Operação mais segura"
                        description="Uso via infraestrutura oficial, com mais controle e rastreabilidade."
                      />
                      <FeatureCard
                        icon={<Bell size={18} className="text-primary" />}
                        title="Integração com CRM"
                        description="Contexto do lead, tags e acompanhamento comercial na mesma rotina."
                      />
                    </div>
                  </div>

                  {/* Info cards */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl border border-border/60 bg-card p-7 hover:border-border transition-colors">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock3 size={15} className="text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Como usar enquanto liberamos
                        </p>
                      </div>
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>
                          Por enquanto, o atendimento deve ser feito no sistema oficial da Meta. Assim você continua respondendo seus leads normalmente sem interromper a operação.
                        </p>
                        <p>
                          Quando o módulo estiver concluído, o objetivo é centralizar atendimento, contexto do CRM e histórico de mensagens em uma experiência única dentro da Wiize.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card p-7 hover:border-border transition-colors">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles size={15} className="text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          O que vai entrar nesta versão
                        </p>
                      </div>
                      <ul className="space-y-2.5 text-sm text-foreground/90">
                        <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Caixa de entrada unificada</li>
                        <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Visualização completa da conversa</li>
                        <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Ações comerciais conectadas ao CRM</li>
                        <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />Fluxo operacional mais rápido para o time</li>
                      </ul>
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

      <Dialog open={reconnectOpen} onOpenChange={setReconnectOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-background flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
            <DialogTitle>Reconectar WhatsApp Business</DialogTitle>
            <DialogDescription>
              Faça login com a Meta para renovar o acesso. Suas conversas continuam salvas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <MetaManualSetup
              embedded
              onConnectionSaved={async () => {
                setReconnectOpen(false);
                await chat.handleReconnect();
                toast({ title: "Conectado!", description: "Seu WhatsApp Business foi reconectado." });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/15 transition-colors">
      {icon}
    </div>
    <h4 className="text-sm font-semibold text-foreground mb-1.5">{title}</h4>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export default Chat;

