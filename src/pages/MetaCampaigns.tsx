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
import { Plus, History, Settings, Loader2, Phone } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

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
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history" | "settings">("new");

  useEffect(() => {
    if (user) {
      checkSetup();
    }
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

      // Load ALL connections
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

          <MetaDisclaimerModal
            open={showDisclaimer}
            onAccept={handleDisclaimerAccept}
          />

          {!disclaimerAccepted && !showDisclaimer && null}

          {/* If no connection, show setup */}
          {disclaimerAccepted && !hasConnections && (
            <MetaAccountSetup onConnectionSaved={handleConnectionSaved} />
          )}

          {/* If has connections, show campaign interface */}
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
                  {/* Existing connections */}
                  <div className="space-y-3">
                    {connections.map((conn) => (
                      <div key={conn.id} className="glass rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Phone size={18} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {conn.nickname || conn.display_phone_number || conn.phone_number_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conn.business_name || conn.waba_id}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          Ativo
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add new number */}
                  <MetaAccountSetup
                    onConnectionSaved={handleConnectionSaved}
                    isAddingExtra
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
};

export default MetaCampaigns;
