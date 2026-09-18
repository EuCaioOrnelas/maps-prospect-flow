import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { CRMResponsibleFilter, type ResponsibleFilter } from "@/components/crm/CRMResponsibleFilter";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  RefreshCw,
  WifiOff,
  History,
  Link2,
  MessageSquare,
  Bell,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MetaManualSetup } from "@/components/meta-campaigns/MetaManualSetup";
import { useToast } from "@/hooks/use-toast";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { useWebhookGate } from "@/hooks/useWebhookGate";
import { WebhookRequiredDialog } from "@/components/meta/WebhookRequiredDialog";
import { BackupProgressBanner } from "@/components/chat/BackupProgressBanner";

import { SEO } from "@/components/SEO";
const Chat = () => {
  const { user, accountOwnerId, profile: authProfile } = useAuth();
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
  const webhookGate = useWebhookGate();
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const { role } = useAccountRole();
  const { members } = useAccountMembers();
  const canChangeResponsible = role === "owner" || role === "admin";
  const isMobile = useIsMobile();
  const RESP_FILTER_KEY = user ? `wiize:chat:respFilter:${user.id}` : null;
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>(() => {
    try {
      if (typeof window === "undefined" || !user) return "me";
      const saved = window.localStorage.getItem(`wiize:chat:respFilter:${user.id}`);
      return (saved as ResponsibleFilter) || "me";
    } catch { return "me"; }
  });
  useEffect(() => {
    if (!RESP_FILTER_KEY) return;
    try { window.localStorage.setItem(RESP_FILTER_KEY, responsibleFilter); } catch {}
  }, [responsibleFilter, RESP_FILTER_KEY]);
  const filteredConversations = useMemo(() => {
    if (responsibleFilter === "all") return chat.conversations;
    if (responsibleFilter === "me") {
      return chat.conversations.filter(c => c.responsible_user_id === user?.id || !c.responsible_user_id);
    }
    return chat.conversations.filter(c => c.responsible_user_id === responsibleFilter);
  }, [chat.conversations, responsibleFilter, user?.id]);

  // Auto-revalidate webhook subscription on chat load so inbound messages flow.
  // Runs once per connection per session — if Meta lost the subscription,
  // this re-installs the /subscribed_apps POST silently.
  useEffect(() => {
    if (!user || chat.loading || chat.connections.length === 0) return;
    const SESSION_KEY = `wiize:chat:webhookRevalidated:${user.id}`;
    try {
      const already = sessionStorage.getItem(SESSION_KEY);
      if (already) return;
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } catch {}
    (async () => {
      for (const conn of chat.connections) {
        if (conn.provider === "evolution") continue; // Número de Atendimento não usa webhook Meta
        try {
          await supabase.functions.invoke("meta-webhook-config", {
            body: { action: "validate", connection_id: conn.id },
          });
        } catch (e) {
          console.warn("[chat] webhook revalidate failed", conn.id, e);
        }
      }
      // Refresh the gate state after revalidation so we don't show a stale
      // "pending webhook" warning when validation actually succeeded.
      try { await webhookGate.reload(); } catch {}
    })();
  }, [user, chat.loading, chat.connections, webhookGate.reload]);

  useEffect(() => {
    if (webhookGate.loading) return;
    if (webhookGate.blocked) setWebhookDialogOpen(true);
    else setWebhookDialogOpen(false);
  }, [webhookGate.loading, webhookGate.blocked]);

  // Request browser notification permission once for inbound messages
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
  }, []);


  // ESC closes the active conversation, returning to the Wiize Chat home screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!chat.activeConversationId) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      const hasOpenOverlay = !!document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]');
      if (isEditable || hasOpenOverlay) return;
      chat.setActiveConversationId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chat.activeConversationId, chat.setActiveConversationId]);




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
  // O chat está liberado para todos os usuários. A tela de apresentação só
  // aparece quando ainda não existe nenhum número conectado à conta.
  const shouldShowDialog = isLoading ? false : hasNoConnection;

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
    <> 
      <SEO title="Chat" />
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full wa-app-bg overflow-hidden">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px] bg-background">
          <div className="lg:hidden">
            <AppHeader profile={(authProfile as any) || profile} />
          </div>
          <BackupProgressBanner className="mx-3 mt-2" />
          <div className="flex-1 flex overflow-hidden relative">

            {showDisconnectedOverlay && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-background border border-border rounded-2xl p-8 max-w-[440px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 rounded-[22px] bg-destructive/10 flex items-center justify-center mx-auto mb-5">
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
              <div className="relative flex-1 overflow-auto bg-background">
                <header className="h-[58px] min-h-[58px] border-b border-border/60 bg-background sticky top-0 z-10 flex items-center">
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

                <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-14 max-w-6xl mx-auto">
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-10 lg:gap-16 items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 text-primary text-xs font-semibold mb-5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10"><CheckCircle2 size={15} /></span>
                        Chat disponível na sua conta
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4 max-w-2xl">
                        Atenda seus contatos pelo WhatsApp dentro da Wiize
                      </h2>
                      <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-7">
                        Para abrir sua caixa de entrada, conecte um número. As conversas ficam organizadas por contato e integradas ao contexto comercial do CRM.
                      </p>

                      <div className="space-y-4 mb-8">
                        <ConnectionStep icon={<Link2 size={17} />} number="01" title="Conecte seu WhatsApp" description="Escolha o tipo de número e conclua a conexão com segurança." />
                        <ConnectionStep icon={<History size={17} />} number="02" title="Centralize as conversas" description="Acompanhe mensagens e histórico em uma única caixa de entrada." />
                        <ConnectionStep icon={<Users size={17} />} number="03" title="Atenda com seu time" description="Distribua responsáveis e trabalhe com as informações do CRM ao lado." />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button size="lg" className="gap-2 h-12 px-6 text-sm" onClick={() => navigate("/numeros")}>
                          Conectar meu número <ArrowRight size={16} />
                        </Button>
                        <Button variant="ghost" size="lg" className="h-12 px-5 text-sm text-muted-foreground" onClick={() => navigate("/dashboard")}>
                          Voltar ao painel
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-label="Exemplo da caixa de entrada Wiize">
                      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot size={18} /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">Atendimento Wiize</p>
                          <p className="text-[11px] text-muted-foreground">Conversa integrada ao CRM</p>
                        </div>
                        <span className="ml-auto size-2 rounded-full bg-primary" />
                      </div>
                      <div className="wa-chat-bg min-h-[300px] p-5 flex flex-col justify-end gap-3">
                        <div className="wa-chat-glow" />
                        <div className="wa-date-badge self-center rounded-lg px-2.5 py-1 text-[10px]">HOJE</div>
                        <div className="wa-bubble-in self-start max-w-[82%] rounded-[7.5px] rounded-tl-none px-3 py-2 shadow-sm">
                          <p className="wa-text-primary text-sm">Olá! Gostaria de entender melhor como funciona.</p>
                          <p className="wa-text-timestamp mt-1 text-right text-[10px]">10:42</p>
                        </div>
                        <div className="wa-bubble-out self-end max-w-[82%] rounded-[7.5px] rounded-tr-none px-3 py-2 shadow-sm">
                          <p className="wa-text-primary text-sm">Claro! Vou te ajudar por aqui.</p>
                          <p className="wa-text-timestamp mt-1 text-right text-[10px]">10:43</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-card">
                        <Capability icon={<MessageSquare size={15} />} label="Mensagens" />
                        <Capability icon={<Shield size={15} />} label="Seguro" />
                        <Capability icon={<Bell size={15} />} label="Tempo real" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : hasConnection ? (
              <>
                <div
                  className={cn(
                    "wa-sidebar-border flex flex-col",
                    isMobile
                      ? chat.activeConversationId
                        ? "hidden"
                        : "flex-1 min-w-0"
                      : "w-[360px] shrink-0"
                  )}
                >
                  <div className="flex-1 min-h-0">
                    <ChatSidebar
                      conversations={filteredConversations}
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
                      onSaveContactName={chat.saveContactName}
                      onDeleteConversation={chat.deleteConversation}
                      onToggleBlock={chat.toggleBlock}
                      onMarkRead={chat.markAsRead}
                      onMarkUnread={chat.markAsUnread}
                      connectionHealth={chat.connectionHealth}
                      members={members.map(m => ({ user_id: m.user_id, name: m.name, email: m.email, avatar_url: m.avatar_url }))}
                      currentUserId={user?.id || null}
                      responsibleFilter={responsibleFilter}
                      topToolbar={
                        (role === "owner" || role === "admin") ? (
                          <CRMResponsibleFilter
                            value={responsibleFilter}
                            onChange={setResponsibleFilter}
                            members={members.map(m => ({ user_id: m.user_id, name: m.name, email: m.email }))}
                            currentUserId={user?.id || ""}
                          />
                        ) : null
                      }
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "flex-1 flex min-w-0",
                    isMobile && !chat.activeConversationId && "hidden"
                  )}
                >
                  <ChatMessageArea
                    conversation={chat.activeConversation}
                    conversations={chat.conversations}
                    messages={chat.messages}
                    loading={chat.loadingMessages}
                    onSendMessage={chat.sendMessage}
                    onSendMedia={chat.sendMedia}
                    messagesEndRef={chat.messagesEndRef as React.RefObject<HTMLDivElement>}
                    onReopenConversation={chat.reopenConversation}
                    fetchTemplates={chat.fetchTemplates}
                    members={members.map(m => ({ user_id: m.user_id, name: m.name, email: m.email, avatar_url: m.avatar_url }))}
                    canChangeResponsible={canChangeResponsible}
                    onTransferResponsible={chat.transferConversation}
                    currentUserId={user?.id || ""}
                    onBack={isMobile ? () => chat.setActiveConversationId(null) : undefined}
                    onDeleteConversation={chat.deleteConversation}
                    onToggleBlock={chat.toggleBlock}
                    onSaveContactName={chat.saveContactName}
                    onForwardMessages={chat.forwardMessages}
                    onDeleteMessages={chat.deleteMessages}
                    isEvolution={(chat.connections.find(c => c.id === chat.activeConversation?.waba_connection_id) ?? chat.activeConnection)?.provider === "evolution"}
                  />
                </div>
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

      <WebhookRequiredDialog
        open={webhookDialogOpen}
        onOpenChange={setWebhookDialogOpen}
        pendingConnections={webhookGate.pendingConnections}
        context="chat"
      />
    </SidebarProvider>
    </>
  );
};

const ConnectionStep = ({
  icon,
  number,
  title,
  description,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground">{number}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  </div>
);

const Capability = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium text-muted-foreground">
    <span className="text-primary">{icon}</span>{label}
  </div>
);

export default Chat;
