import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plug, Loader2, CheckCircle2, ShieldCheck, Receipt, Link2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ConnStatus {
  configured: boolean;
  can_manage: boolean;
  connection: { status: string; connected_at: string | null; external_account_label: string | null } | null;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("wiize-pay-connect", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

const BENEFITS = [
  { icon: Receipt, title: "Cobranças pelo CRM", text: "PIX, boleto e cartão direto de cada venda." },
  { icon: Link2, title: "Status automático", text: "Pagamentos aparecem no lead sem digitar nada." },
  { icon: ShieldCheck, title: "Acesso seguro", text: "Você autoriza no Wiize Pay; sua senha não passa pelo Wiize." },
];

export function WiizePayConnectionCard() {
  const [st, setSt] = useState<ConnStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setSt(await call({ action: "status" })); } catch { setSt(null); } finally { setLoaded(true); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Ao voltar para esta aba (depois de autorizar na outra), atualiza o status.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [load]);

  const connect = async () => {
    setBusy(true);
    // Dentro de um quadro (prévia), o navegador bloqueia a troca da página inteira
    // depois de uma espera. Por isso a nova aba é aberta JÁ no clique e só recebe o
    // endereço depois. Fora de quadro, a própria aba segue para o Wiize Pay.
    const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const tab = inFrame ? window.open("", "_blank") : null;
    try {
      const uiTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const r = await call({ action: "start", origin: window.location.origin, ui_theme: uiTheme });
      const url = new URL(r.authorize_url);
      if (url.protocol !== "https:") throw new Error("invalid_url");
      if (tab && !tab.closed) {
        tab.location.href = url.toString();
        toast.info("Continue a autorização na nova aba do Wiize Pay.");
        setBusy(false);
      } else if (inFrame) {
        // Bloqueador de pop-up: tenta sair do quadro direto.
        window.open(url.toString(), "_top", "noopener");
        setBusy(false);
      } else {
        window.location.assign(url.toString());
      }
    } catch (e) {
      if (tab && !tab.closed) tab.close();
      toast.error((e as Error).message === "not_configured"
        ? "O Wiize Pay ainda não liberou a conexão. Tente mais tarde."
        : "Não foi possível iniciar a conexão.");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Desconectar o Wiize Pay? O histórico já registrado será mantido.")) return;
    setBusy(true);
    try { await call({ action: "disconnect" }); toast.success("Wiize Pay desconectado."); await load(); }
    catch { toast.error("Não foi possível desconectar."); }
    finally { setBusy(false); }
  };

  const active = st?.connection?.status === "active";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary" : "bg-primary/10"}`}>
          {active ? <CheckCircle2 className="h-6 w-6 text-primary-foreground" /> : <Plug className="h-6 w-6 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">Conta Wiize Pay</h2>
            {!loaded ? null : active ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Conectado
              </span>
            ) : !st?.configured ? (
              <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground" title="READY_FOR_WIIZE_PAY">
                Em breve
              </span>
            ) : (
              <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Não conectado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {active
              ? `Conectado${st?.connection?.external_account_label ? ` à conta ${st.connection.external_account_label}` : ""}${st?.connection?.connected_at ? ` desde ${new Date(st.connection.connected_at).toLocaleDateString("pt-BR")}` : ""}.`
              : !st?.configured
                ? "A conexão será liberada assim que o Wiize Pay ativar o acesso seguro."
                : "Você será levado ao Wiize Pay para autorizar. A conexão fica ativa até você desconectar."}
          </p>
        </div>
        {st?.can_manage && (
          active ? (
            <Button variant="outline" onClick={disconnect} disabled={busy} className="shrink-0">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Desconectar
            </Button>
          ) : (
            <Button onClick={connect} disabled={busy || !st?.configured} className="shrink-0 gap-2 h-11 px-5 shadow-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Wiize Pay
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          )
        )}
      </div>
      <div className="grid sm:grid-cols-3 border-t border-border bg-muted/30">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="p-5 flex gap-3 border-b sm:border-b-0 sm:border-r last:border-0 border-border">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
