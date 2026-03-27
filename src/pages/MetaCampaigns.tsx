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
import { Plus, History, Settings, Loader2 } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone_number: string | null;
  access_token: string;
  status: string | null;
}

const MetaCampaigns = () => {
  const { user, profile } = useAuth();
  const { trackScoreEvent } = useAutoScoreTracking("meta-campaigns");
  const [wabaConnection, setWabaConnection] = useState<WabaConnection | null>(null);
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
      // Check if user already dismissed the meta disclaimer
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

      // Check if user has a WABA connection
      const { data: connection } = await supabase
        .from("user_waba_connections")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (connection) {
        setWabaConnection(connection as unknown as WabaConnection);
      }
    } catch (err) {
      console.error("Error checking meta setup:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerAccept = async () => {
    if (!user) return;

    // Save popup dismissal
    await supabase.from("user_dismissed_popups").insert({
      user_id: user.id,
      popup_key: "meta_campaigns_disclaimer",
    });

    // Log the terms acceptance event with details
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
    setWabaConnection(connection);
    setActiveTab("new");
  };

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

          {/* Disclaimer Modal */}
          <MetaDisclaimerModal
            open={showDisclaimer}
            onAccept={handleDisclaimerAccept}
          />

          {/* If disclaimer not accepted yet, show nothing */}
          {!disclaimerAccepted && !showDisclaimer && null}

          {/* If no WABA connection, show setup */}
          {disclaimerAccepted && !wabaConnection && (
            <MetaAccountSetup onConnectionSaved={handleConnectionSaved} />
          )}

          {/* If connected, show campaign flow */}
          {disclaimerAccepted && wabaConnection && (
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
                  Configurações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                <MetaCampaignFlow connection={wabaConnection} />
              </TabsContent>

              <TabsContent value="history">
                <MetaCampaignHistory connection={wabaConnection} />
              </TabsContent>

              <TabsContent value="settings">
                <MetaAccountSetup
                  onConnectionSaved={handleConnectionSaved}
                  existingConnection={wabaConnection}
                />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
};

export default MetaCampaigns;
