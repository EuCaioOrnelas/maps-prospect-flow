import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { MetaDisclaimerModal } from "@/components/meta-campaigns/MetaDisclaimerModal";
import { MetaManualSetup } from "@/components/meta-campaigns/MetaManualSetup";
import { MetaCampaignFlow } from "@/components/meta-campaigns/MetaCampaignFlow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, BookOpen, FlaskConical } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
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
  useAutoScoreTracking("meta-campaigns");
  const { showPopup: showBetaWarning, dismiss: dismissBetaWarning, canClose: canCloseBeta, countdown: betaCountdown } = usePagePopupDismiss("meta_campaigns_beta_warning");
  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [expiredTokenIds, setExpiredTokenIds] = useState<Set<string>>(new Set());

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
      body: JSON.stringify({ waba_id: conn.waba_id, access_token: conn.access_token }),
    });
    const rawText = await response.text();
    let payload: any = null;
    try { payload = rawText ? JSON.parse(rawText) : null; } catch { payload = null; }
    const details = payload?.details?.error;
    return payload?.token_expired === true || details?.code === 190 || details?.error_subcode === 463;
  }, []);

  const validateTokens = useCallback(async (conns: WabaConnection[]) => {
    const results = await Promise.all(conns.map(async (c) => {
      try { return (await validateConnectionToken(c)) ? c.id : null; } catch { return null; }
    }));
    setExpiredTokenIds(new Set(results.filter(Boolean) as string[]));
  }, [validateConnectionToken]);

  useEffect(() => {
    if (user) checkSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (!dismissed) setShowDisclaimer(true);
      else setDisclaimerAccepted(true);

      const { data: conns } = await supabase
        .from("user_waba_connections")
        .select("*")
        .eq("user_id", user.id);

      if (conns && conns.length > 0) {
        const typed = conns as unknown as WabaConnection[];
        setConnections(typed);
        validateTokens(typed);
      } else {
        setExpiredTokenIds(new Set());
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
      event_data: { accepted_at: new Date().toISOString(), terms_version: "1.0", section: "meta_whatsapp_api" },
    });
    setShowDisclaimer(false);
    setDisclaimerAccepted(true);
  };

  const handleConnectionSaved = (connection: WabaConnection) => {
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === connection.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = connection; return u; }
      return [...prev, connection];
    });
    setExpiredTokenIds((prev) => { const n = new Set(prev); n.delete(connection.id); return n; });
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
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Campanha de Mensagem</h1>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs font-semibold gap-1">
                  <FlaskConical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  BETA
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 max-w-3xl">
                Envie campanhas via Meta Cloud API usando <strong>templates pré-aprovados</strong> pela Meta. Funciona inclusive para <strong>leads frios</strong>, desde que o template tenha sido aprovado. O <strong>custo das mensagens é cobrado à parte pela Meta</strong>, conforme a tabela oficial por país e categoria do template.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate("/meta-api-guide")}>
              <BookOpen size={14} /> Documentação
            </Button>
          </div>

          <MetaDisclaimerModal open={showDisclaimer} onAccept={handleDisclaimerAccept} />

          {disclaimerAccepted && !hasConnections && (
            <MetaManualSetup onConnectionSaved={handleConnectionSaved} />
          )}

          {disclaimerAccepted && hasConnections && (
            <MetaCampaignFlow connections={connections} expiredTokenIds={expiredTokenIds} />
          )}
        </main>
      </div>

      {/* Beta Warning Dialog */}
      <Dialog open={showBetaWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Campanha de Mensagem em Versão Beta</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                O sistema de <strong>Campanha de Mensagem</strong> está atualmente em versão <span className="text-amber-500 font-semibold">beta</span> e pode apresentar alguns bugs ou comportamentos inesperados.
              </p>
              <p>
                Estamos trabalhando constantemente para melhorar a experiência. Caso encontre algum problema, por favor nos informe pelo suporte.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={() => dismissBetaWarning()} disabled={!canCloseBeta} className="w-full sm:w-auto">
              {canCloseBeta ? "Entendi, continuar" : `Aguarde ${betaCountdown}s`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MetaCampaigns;
