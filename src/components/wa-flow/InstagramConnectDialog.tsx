import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Loader2, PowerOff, RefreshCw, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useInstagramAccounts, IG_MAX_ACCOUNTS } from "@/hooks/useInstagramAccounts";
import { cn } from "@/lib/utils";

const META_APP_ID = "988774494328539";
const IG_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "business_management",
].join(",");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstagramConnectDialog({ open, onOpenChange }: Props) {
  const { accounts, isLoading, canAddMore, connect, disconnect, refresh } = useInstagramAccounts();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUri = () => {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    return url.toString();
  };

  useEffect(() => {
    if (!open) return;
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: false, version: "v21.0" });
      setSdkLoaded(true);
    };
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [open]);

  const handleLogin = () => {
    if (!window.FB) return;
    setError(null);
    const redirectUri = getRedirectUri();
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          connect.mutate({ code: response.authResponse.code, redirect_uri: redirectUri });
        } else if (response.status === "not_authorized") {
          setError("Você precisa autorizar o acesso à sua conta profissional do Instagram.");
        } else {
          setError("Conexão cancelada. Tente novamente quando estiver pronto.");
        }
      },
      {
        scope: IG_SCOPES,
        response_type: "code",
        override_default_response_type: true,
        redirect_uri: redirectUri,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram size={18} className="text-pink-500" />
            Contas do Instagram
          </DialogTitle>
          <DialogDescription>
            Conecte até {IG_MAX_ACCOUNTS} contas profissionais para usar nos fluxos de automação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhuma conta conectada</p>
              <p className="text-xs text-muted-foreground">
                É necessário um perfil Empresa/Criador vinculado a uma Página do Facebook.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3",
                    acc.status === "active" ? "border-border bg-muted/20" : "border-destructive/40 bg-destructive/5",
                  )}
                >
                  {acc.profile_picture_url ? (
                    <img
                      src={acc.profile_picture_url}
                      alt={`Foto do perfil de @${acc.ig_username ?? "conta do Instagram"}`}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                      <Instagram size={16} className="text-pink-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      @{acc.ig_username || acc.ig_user_id}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {acc.page_name ? `Página: ${acc.page_name}` : "Conta profissional"}
                    </p>
                    {acc.status !== "active" && acc.last_error && (
                      <p className="text-[11px] text-destructive truncate">{acc.last_error}</p>
                    )}
                  </div>
                  <Badge variant={acc.status === "active" ? "secondary" : "destructive"} className="shrink-0 text-[10px]">
                    {acc.status === "active" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ativa
                      </span>
                    ) : (
                      "Erro"
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                    title="Desconectar"
                    onClick={() => disconnect.mutate(acc.id)}
                    disabled={disconnect.isPending}
                  >
                    <PowerOff size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Ao conectar, os webhooks de mensagens e comentários são assinados automaticamente. O WhatsApp continua
              funcionando normalmente e de forma independente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleLogin}
              disabled={!sdkLoaded || connect.isPending || !canAddMore}
              className="flex-1 gap-2"
            >
              {connect.isPending ? <Loader2 size={15} className="animate-spin" /> : <Instagram size={15} />}
              {canAddMore ? "Conectar conta do Instagram" : `Limite de ${IG_MAX_ACCOUNTS} contas atingido`}
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Revalidar conexões"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || accounts.length === 0}
            >
              <RefreshCw size={14} className={cn(refresh.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
