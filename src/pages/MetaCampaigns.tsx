import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { MetaDisclaimerModal } from "@/components/meta-campaigns/MetaDisclaimerModal";
import { MetaAccountSetup } from "@/components/meta-campaigns/MetaAccountSetup";
import { MetaCampaignFlow } from "@/components/meta-campaigns/MetaCampaignFlow";
import { MetaCampaignHistory } from "@/components/meta-campaigns/MetaCampaignHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, History, Settings, Loader2, Phone, Pencil, Info, ExternalLink, Trash2, AlertTriangle, ShieldAlert, BookOpen, FlaskConical } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { useToast } from "@/hooks/use-toast";
import { usePagePopupDismiss } from "@/hooks/usePagePopupDismiss";

export interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone_number: string | null;
  access_token: string;
  status: string | null;
  nickname: string | null;
}

const MetaCampaigns = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { trackScoreEvent } = useAutoScoreTracking("meta-campaigns");
  const { toast } = useToast();
  const { showPopup: showBetaWarning, dismiss: dismissBetaWarning, canClose: canCloseBeta, countdown: betaCountdown } = usePagePopupDismiss("meta_campaigns_beta_warning");
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history" | "settings">("new");

  const [editingConn, setEditingConn] = useState<WabaConnection | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editToken, setEditToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);
  const [showAddNumber, setShowAddNumber] = useState(false);

  const [expiredTokenIds, setExpiredTokenIds] = useState<Set<string>>(new Set());
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);

  const validateConnectionToken = useCallback(async (conn: WabaConnection) => {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-fetch-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        waba_id: conn.waba_id,
        access_token: conn.access_token,
      }),
    });

    const rawText = await response.text();
    let payload: any = null;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    const details = payload?.details?.error;
    return details?.code === 190 || details?.error_subcode === 463;
  }, []);

  useEffect(() => {
    if (user) checkSetup();
  }, [user]);

  useEffect(() => {
    if (activeTab === "settings" && expiredTokenIds.size > 0) {
      setShowExpiredAlert(true);
    }
  }, [activeTab, expiredTokenIds]);

  const checkSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: dismissed } = await supabase
        .from("user_dismissed_popups")
        .select("id")
        .eq("user_id", user.id)
        .eq("popup_key", "meta_campaigns_disclaimer")
        .maybeSingle();

      if (!dismissed) {
        setShowDisclaimer(true);
      } else {
        setDisclaimerAccepted(true);
      }

      const { data: conns } = await supabase
        .from("user_waba_connections")
        .select("*")
        .eq("user_id", user.id);

      if (conns && conns.length > 0) {
        const typedConns = conns as unknown as WabaConnection[];
        setConnections(typedConns);
        validateTokens(typedConns);
      } else {
        setExpiredTokenIds(new Set());
      }
    } catch (err) {
      console.error("Error checking meta setup:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateTokens = useCallback(async (conns: WabaConnection[]) => {
    const validationResults = await Promise.all(
      conns.map(async (conn) => {
        try {
          const isExpired = await validateConnectionToken(conn);
          return isExpired ? conn.id : null;
        } catch {
          return null;
        }
      })
    );

    const nextExpired = new Set(validationResults.filter(Boolean) as string[]);
    setExpiredTokenIds(nextExpired);
  }, [validateConnectionToken]);

  const handleDisclaimerAccept = async () => {
    if (!user) return;
    await supabase.from("user_dismissed_popups").insert({
      user_id: user.id,
      popup_key: "meta_campaigns_disclaimer",
    });
    await supabase.from("user_events").insert({
      user_id: user.id,
      event_name: "meta_disclaimer_accepted",
      event_data: {
        accepted_at: new Date().toISOString(),
        terms_version: "1.0",
        section: "meta_whatsapp_api",
      },
    });
    setShowDisclaimer(false);
    setDisclaimerAccepted(true);
  };

  const handleConnectionSaved = (connection: WabaConnection) => {
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === connection.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = connection;
        return updated;
      }
      return [...prev, connection];
    });
    setExpiredTokenIds((prev) => {
      const next = new Set(prev);
      next.delete(connection.id);
      return next;
    });
    setShowAddNumber(false);
    setActiveTab("new");
  };

  const handleSaveEdit = async () => {
    if (!editingConn) return;
    try {
      const updates: Record<string, any> = { nickname: editNickname || null };
      if (showTokenField && editToken.trim()) {
        updates.access_token = editToken.trim();
      }

      await supabase.from("user_waba_connections").update(updates).eq("id", editingConn.id);

      const updatedConnection = {
        ...editingConn,
        nickname: editNickname || null,
        ...(showTokenField && editToken.trim() ? { access_token: editToken.trim() } : {}),
      };

      setConnections((prev) => prev.map((c) => (c.id === editingConn.id ? updatedConnection : c)));

      if (showTokenField && editToken.trim()) {
        const isStillExpired = await validateConnectionToken(updatedConnection);
        setExpiredTokenIds((prev) => {
          const next = new Set(prev);
          if (isStillExpired) next.add(editingConn.id);
          else next.delete(editingConn.id);
          return next;
        });
        if (!isStillExpired) {
          toast({ title: "Token atualizado com sucesso!" });
        }
      } else {
        toast({ title: "Número atualizado!" });
      }

      setEditingConn(null);
      setShowTokenField(false);
      setEditToken("");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    try {
      await supabase.from("user_waba_connections").delete().eq("id", connId);
      setConnections((prev) => prev.filter((c) => c.id !== connId));
      setExpiredTokenIds((prev) => {
        const next = new Set(prev);
        next.delete(connId);
        return next;
      });
      setEditingConn(null);
      toast({ title: "Número removido!" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const maskSecret = (token: string) => {
    if (!token || token.length < 12) return "••••••••";
    return token.slice(0, 8) + "••••••••••••";
  };

  const hasConnections = connections.length > 0;
  const expiredConnections = connections.filter((c) => expiredTokenIds.has(c.id));
  const hasExpired = expiredConnections.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar profile={profile} />
        <div className="flex-1 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar profile={profile} />
      <div className="flex-1 lg:pl-[72px]">
        <AppHeader profile={profile} />
        <BackgroundGlow />

        <main className="container max-w-6xl mx-auto px-4 py-8 relative z-10">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Relacionamento</h1>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs font-semibold gap-1">
                  <FlaskConical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  BETA
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 max-w-3xl">
                Comunicação de mensagens inbound com leads que já deram opt-in, utilizando canais oficiais da Meta Platforms.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate("/meta-api-guide")}>
              <BookOpen size={14} /> Documentação
            </Button>
          </div>

          <MetaDisclaimerModal open={showDisclaimer} onAccept={handleDisclaimerAccept} />

          {!disclaimerAccepted && !showDisclaimer && null}

          {disclaimerAccepted && !hasConnections && (
            <MetaAccountSetup onConnectionSaved={handleConnectionSaved} />
          )}

          {disclaimerAccepted && hasConnections && (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                const nextTab = v as "new" | "history" | "settings";
                setActiveTab(nextTab);
                if (nextTab === "settings" && hasExpired) {
                  setShowExpiredAlert(true);
                }
              }}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="new" className="gap-2">
                  <Plus size={16} />
                  Nova Campanha
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History size={16} />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2 relative data-[state=active]:shadow-sm">
                  <Settings size={16} />
                  Números Conectados
                  {hasExpired && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive animate-pulse">
                      <AlertTriangle size={11} className="text-destructive-foreground" />
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                <MetaCampaignFlow connections={connections} expiredTokenIds={expiredTokenIds} />
              </TabsContent>

              <TabsContent value="history">
                <MetaCampaignHistory connections={connections} />
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  {/* Expired tokens alert */}
                  {hasExpired && (
                    <div className="flex items-start gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                        <ShieldAlert size={20} className="text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base text-destructive">
                          {expiredConnections.length === 1 ? "1 token expirado" : `${expiredConnections.length} tokens expirados`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {expiredConnections.map(c => c.nickname || c.display_phone_number || c.phone_number_id).join(", ")} — o token de acesso expirou. Clique em editar para atualizar.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => setShowExpiredAlert(true)}
                        >
                          <Info size={12} /> Como resolver
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Grid 2 per row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {connections.map((conn) => {
                      const isExpired = expiredTokenIds.has(conn.id);
                      return (
                        <div
                          key={conn.id}
                          className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                            isExpired ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isExpired ? "bg-destructive/10" : "bg-primary/10"
                            }`}>
                              {isExpired ? (
                                <AlertTriangle size={14} className="text-destructive" />
                              ) : (
                                <Phone size={14} className="text-primary" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-sm truncate">
                                {conn.nickname || conn.display_phone_number || conn.phone_number_id}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {conn.business_name || conn.waba_id}
                              </p>
                              {isExpired && (
                                <p className="mt-1 text-[11px] font-medium text-destructive">
                                  Atualize o token para voltar a carregar templates e enviar mensagens.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingConn(conn);
                                setEditNickname(conn.nickname || "");
                                setEditToken("");
                                setShowTokenField(isExpired);
                              }}
                            >
                              <Pencil size={13} className="text-muted-foreground" />
                            </Button>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isExpired
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {isExpired ? "Expirado" : "Ativo"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="outline" className="gap-2" onClick={() => setShowAddNumber(true)}>
                    <Plus size={14} /> Adicionar número
                  </Button>

                  {/* Footer info */}
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <Info size={18} className="text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">API de Marketing do WhatsApp (Cloud API)</p>
                      <p className="text-muted-foreground mt-0.5">
                        A API Oficial só permite o envio de templates pré-aprovados para contatos que já <strong>interagiram com seu número</strong> ou que deram <strong>opt-in explícito</strong> (ex: formulário no site, cadastro). Cada número tem seu próprio limite de envio definido pela Meta com base na <strong>qualidade e tier</strong>. <strong className="text-destructive">Não é possível enviar para leads frios</strong>, para isso use a <strong className="text-primary">Prospecção</strong>.
                      </p>
                      <a
                        href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 mt-1 text-xs"
                      >
                        <ExternalLink size={10} /> Ver limites de envio da Meta
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* Edit Number Dialog */}
      <Dialog open={!!editingConn} onOpenChange={(o) => { if (!o) { setEditingConn(null); setShowTokenField(false); setEditToken(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Número
              {editingConn && expiredTokenIds.has(editingConn.id) && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                  <AlertTriangle size={10} /> Token expirado
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {editingConn && (
            <div className="space-y-4">
              <div className="space-y-3">
                <DetailRow label="Phone Number ID" value={editingConn.phone_number_id} />
                <DetailRow label="WABA ID" value={editingConn.waba_id} />
                <DetailRow label="Número" value={editingConn.display_phone_number || "N/A"} />
                <DetailRow label="Empresa" value={editingConn.business_name || "N/A"} />
                <div>
                  <p className="text-[11px] text-muted-foreground">Access Token</p>
                  <p className="text-sm font-mono truncate">{maskSecret(editingConn.access_token)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido do número</label>
                <Input
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="Ex: Atendimento, Vendas..."
                />
              </div>

              {/* Token update section */}
              {!showTokenField ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTokenField(true)}
                >
                  <Pencil size={11} /> Atualizar token de acesso
                </Button>
              ) : (
                <div className="space-y-2 p-3 rounded-lg border border-accent/30 bg-accent/5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-accent-foreground" />
                    Novo Access Token
                  </label>
                  <Textarea
                    value={editToken}
                    onChange={(e) => setEditToken(e.target.value)}
                    placeholder="Cole aqui o novo token permanente..."
                    className="font-mono text-xs min-h-[60px]"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use um token de <strong>System User</strong> para evitar expirações.{" "}
                    <a
                      href="https://business.facebook.com/settings/system-users"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Gerar token permanente →
                    </a>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Salvar
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteConnection(editingConn.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expired Token Help Dialog */}
      <Dialog open={showExpiredAlert} onOpenChange={setShowExpiredAlert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-destructive" />
              Token de acesso expirado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show which numbers are expired */}
            <div className="space-y-2">
              {expiredConnections.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive shrink-0" />
                  <span className="text-sm font-medium">{c.nickname || c.display_phone_number || c.phone_number_id}</span>
                  {c.business_name && <span className="text-xs text-muted-foreground">({c.business_name})</span>}
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              O token de acesso {expiredConnections.length === 1 ? "deste número" : "destes números"} expirou. Isso acontece quando é usado um <strong>token temporário</strong> da Meta, que tem validade de poucas horas. Para evitar esse problema, gere um <strong>token permanente</strong> usando um Usuário do Sistema no Meta Business Suite.
            </p>

            <div className="space-y-3">
              <StepItem number={1} title="Acesse o Meta Business Suite">
                <a
                  href="https://business.facebook.com/settings/system-users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  <ExternalLink size={10} /> Abrir Usuários do Sistema
                </a>
              </StepItem>

              <StepItem number={2} title="Crie ou selecione um Usuário do Sistema">
                <p className="text-xs text-muted-foreground">
                  Se não tiver, clique em "Adicionar" e crie um com tipo "Admin".
                </p>
              </StepItem>

              <StepItem number={3} title="Gere um token permanente">
                <p className="text-xs text-muted-foreground">
                  Clique em "Gerar token", selecione o app e as permissões: <strong>whatsapp_business_messaging</strong> e <strong>whatsapp_business_management</strong>.
                </p>
              </StepItem>

              <StepItem number={4} title="Atualize o token aqui">
                <p className="text-xs text-muted-foreground">
                  Volte, clique no ícone de edição do número e cole o novo token.
                </p>
              </StepItem>
            </div>

            <Button onClick={() => setShowExpiredAlert(false)} className="w-full">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Número</DialogTitle>
          </DialogHeader>
          <MetaAccountSetup
            onConnectionSaved={(conn) => {
              if (conn) handleConnectionSaved(conn);
              else setShowAddNumber(false);
            }}
            isAddingExtra
          />
        </DialogContent>
      </Dialog>

      {/* Beta Warning Dialog */}
      <Dialog open={showBetaWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Relacionamento em Versão Beta</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                O sistema de <strong>Relacionamento</strong> está atualmente em versão <span className="text-amber-500 font-semibold">beta</span> e pode apresentar alguns bugs ou comportamentos inesperados.
              </p>
              <p>
                Estamos trabalhando constantemente para melhorar a experiência. Caso encontre algum problema, por favor nos informe pelo suporte.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              onClick={() => dismissBetaWarning()}
              disabled={!canCloseBeta}
              className="w-full sm:w-auto"
            >
              {canCloseBeta ? "Entendi, continuar" : `Aguarde ${betaCountdown}s`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-mono truncate">{value}</p>
  </div>
);

const StepItem = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-xs font-bold text-primary">{number}</span>
    </div>
    <div>
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  </div>
);

export default MetaCampaigns;
