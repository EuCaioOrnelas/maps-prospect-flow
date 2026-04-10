import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  ExternalLink,
  Shield,
  Loader2,
  Info,
  MessageSquare,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { WabaConnection } from "@/pages/MetaCampaigns";

const META_APP_ID = "988774494328539";

interface MetaAccountSetupProps {
  onConnectionSaved: (connection: WabaConnection) => void;
  existingConnection?: WabaConnection | null;
  isAddingExtra?: boolean;
}

// Extend window for Facebook SDK
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: any) => void;
      login: (callback: (response: any) => void, params: any) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
    };
  }
}

export const MetaAccountSetup = ({ onConnectionSaved, isAddingExtra }: MetaAccountSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUri = () => {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    return url.toString();
  };

  // Load Facebook SDK
  useEffect(() => {
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      setSdkLoaded(true);
    };

    // Check if script already exists
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const exchangeCode = async (code: string) => {
    if (!user) return;

    const redirectUri = getRedirectUri();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("meta-embedded-signup", {
        body: { code, user_id: user.id, redirect_uri: redirectUri },
      });

      if (fnError) throw new Error(fnError.message || "Erro ao processar conexão");

      if (!data?.success || !data?.connection) {
        throw new Error(data?.message || data?.error || "Resposta inesperada do servidor");
      }

      toast({
        title: "Conta conectada com sucesso!",
        description: `${data.connection.display_phone_number || data.connection.business_name || "Número"} vinculado e webhook configurado automaticamente.`,
      });

      onConnectionSaved({
        id: data.connection.id,
        waba_id: data.connection.waba_id || "",
        phone_number_id: data.connection.phone_number_id || "",
        business_name: data.connection.business_name,
        display_phone_number: data.connection.display_phone_number,
        access_token: data.connection.access_token || "",
        status: data.connection.status,
        nickname: data.connection.nickname || null,
      });
    } catch (err: any) {
      console.error("[MetaAccountSetup] Exchange error:", err);
      setError(err.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setConnecting(false);
    }
  };

  const handleFacebookLogin = () => {
    if (!window.FB || !user) return;

    const redirectUri = getRedirectUri();

    setConnecting(true);
    setError(null);

    // Safety timeout - if callback never fires (popup closed without interaction)
    const safetyTimeout = setTimeout(() => {
      setConnecting(false);
    }, 120000); // 2 min max

    try {
      window.FB.login(
        (response: any) => {
          clearTimeout(safetyTimeout);

          if (response.authResponse?.code) {
            exchangeCode(response.authResponse.code);
          } else {
            setConnecting(false);
            if (response.status === "not_authorized") {
              setError("Você precisa autorizar o acesso à sua conta WhatsApp Business.");
            } else {
              setError("Conexão cancelada. Tente novamente quando estiver pronto.");
            }
          }
        },
        {
          scope: "whatsapp_business_management,whatsapp_business_messaging",
          response_type: "code",
          override_default_response_type: true,
          redirect_uri: redirectUri,
          extras: {
            setup: {
              solutionID: META_APP_ID,
            },
          },
        }
      );
    } catch {
      clearTimeout(safetyTimeout);
      setConnecting(false);
      setError("Erro ao abrir janela do Facebook. Verifique se popups estão permitidos.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <MessageSquare size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {isAddingExtra ? "Adicionar outro número" : "Conecte sua conta WhatsApp Business"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Conecte via Meta Business Suite para enviar mensagens e receber status de entrega automaticamente.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
            <Zap size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Configuração automática</p>
              <p className="text-xs text-muted-foreground">Token permanente e webhook configurados em 1 clique</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
            <Shield size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Token permanente</p>
              <p className="text-xs text-muted-foreground">Sem expiração — não precisa renovar manualmente</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
            <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Status em tempo real</p>
              <p className="text-xs text-muted-foreground">Receba confirmações de entrega e leitura</p>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <div className="space-y-3">
          <Button
            onClick={handleFacebookLogin}
            disabled={!sdkLoaded || connecting}
            size="lg"
            className="gap-3 px-8 py-6 text-base font-semibold w-full sm:w-auto"
          >
            {connecting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            {connecting ? "Conectando..." : "Conectar com Meta Business"}
          </Button>

          {!sdkLoaded && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
              <Loader2 size={12} className="animate-spin" /> Carregando Facebook SDK...
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-left">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* How it works */}
        <div className="text-left space-y-3 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como funciona</p>
          <div className="space-y-2">
            <StepRow number={1} text="Clique em 'Conectar com Meta Business'" />
            <StepRow number={2} text="Faça login no Facebook e autorize o acesso à sua conta WhatsApp Business" />
            <StepRow number={3} text="Selecione o número que deseja conectar" />
            <StepRow number={4} text="Pronto! Token e webhook são configurados automaticamente" />
          </div>
        </div>

        {/* Info footer */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border text-left">
          <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Ao conectar, você compartilha o acesso à sua conta WhatsApp Business com a Wiize para envio de campanhas.
            Seus dados são protegidos e o acesso pode ser revogado a qualquer momento no{" "}
            <a
              href="https://business.facebook.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Meta Business Suite <ExternalLink size={9} />
            </a>.
          </p>
        </div>

        {/* Cancel for add extra */}
        {isAddingExtra && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onConnectionSaved(null as any)}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
};

const StepRow = ({ number, text }: { number: number; text: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold text-primary">{number}</span>
    </div>
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);
