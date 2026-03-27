import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, History, Settings, Loader2, Phone, Pencil, Info, ExternalLink } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { useToast } from "@/hooks/use-toast";

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
  const { trackScoreEvent } = useAutoScoreTracking("meta-campaigns");
  const { toast } = useToast();
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history" | "settings">("new");

  // Edit dialog
  const [editingConn, setEditingConn] = useState<WabaConnection | null>(null);
  const [editNickname, setEditNickname] = useState("");

  useEffect(() => {
    if (user) checkSetup();
  }, [user]);

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
        setConnections(conns as unknown as WabaConnection[]);
      }
    } catch (err) {
      console.error("Error checking meta setup:", err);
    } finally {
      setLoading(false);
    }
  };

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
    setActiveTab("new");
  };

  const handleSaveNickname = async () => {
    if (!editingConn) return;
    try {
      await supabase
        .from("user_waba_connections")
        .update({ nickname: editNickname || null })
        .eq("id", editingConn.id);

      setConnections((prev) =>
        prev.map((c) => (c.id === editingConn.id ? { ...c, nickname: editNickname || null } : c))
      );
      setEditingConn(null);
      toast({ title: "Apelido atualizado!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const maskSecret = (token: string) => {
    if (!token || token.length < 12) return "••••••••";
    return token.slice(0, 8) + "••••••••••••";
  };

  const hasConnections = connections.length > 0;

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Campanhas Meta</h1>
            <p className="text-muted-foreground mt-1">
              Envie mensagens em massa via API Oficial do WhatsApp — sem risco de bloqueio
            </p>
          </div>

          <MetaDisclaimerModal open={showDisclaimer} onAccept={handleDisclaimerAccept} />

          {!disclaimerAccepted && !showDisclaimer && null}

          {disclaimerAccepted && !hasConnections && (
            <MetaAccountSetup onConnectionSaved={handleConnectionSaved} />
          )}

          {disclaimerAccepted && hasConnections && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="mb-6">
                <TabsTrigger value="new" className="gap-2">
                  <Plus size={16} />
                  Nova Campanha
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History size={16} />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings size={16} />
                  Números Conectados
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                <MetaCampaignFlow connections={connections} />
              </TabsContent>

              <TabsContent value="history">
                <MetaCampaignHistory connections={connections} />
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  {/* Opt-in info */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <Info size={16} className="text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground text-sm">Sobre números conectados</p>
                      <p>
                        A API Oficial do WhatsApp (Cloud API) só permite o envio de templates pré-aprovados para contatos que já <strong>interagiram com seu número</strong> ou que deram <strong>opt-in explícito</strong> (ex: formulário no site, cadastro). Cada número conectado tem seu próprio limite de envio definido pela Meta com base na <strong>qualidade e tier do número</strong>. <strong>Não é possível enviar para leads frios</strong> — para isso, use as <strong>Campanhas Wiize</strong>.
                      </p>
                      <a
                        href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink size={10} /> Ver limites de envio da Meta
                      </a>
                    </div>
                  </div>

                  {/* Grid 2 per row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {connections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Phone size={14} className="text-primary" />
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-sm truncate">
                              {conn.nickname || conn.display_phone_number || conn.phone_number_id}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {conn.business_name || conn.waba_id}
                            </p>
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
                            }}
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                          </Button>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Ativo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <MetaAccountSetup onConnectionSaved={handleConnectionSaved} isAddingExtra />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* Edit Number Dialog */}
      <Dialog open={!!editingConn} onOpenChange={(o) => !o && setEditingConn(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalhes do Número</DialogTitle>
          </DialogHeader>
          {editingConn && (
            <div className="space-y-4">
              <div className="space-y-3">
                <DetailRow label="Phone Number ID" value={editingConn.phone_number_id} />
                <DetailRow label="WABA ID" value={editingConn.waba_id} />
                <DetailRow label="Número" value={editingConn.display_phone_number || "—"} />
                <DetailRow label="Empresa" value={editingConn.business_name || "—"} />
                <DetailRow label="Access Token" value={maskSecret(editingConn.access_token)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido do número</label>
                <Input
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="Ex: Atendimento, Vendas..."
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                />
              </div>
              <Button onClick={handleSaveNickname} className="w-full">
                Salvar
              </Button>
            </div>
          )}
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

export default MetaCampaigns;
