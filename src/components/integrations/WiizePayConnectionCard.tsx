import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plug, Loader2, RefreshCw, CheckCircle2, ShieldCheck, Receipt, Link2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordField, isStrongPassword } from "@/components/wiize-api/PasswordField";
import { useTheme } from "@/contexts/ThemeContext";

interface ConnStatus {
  configured: boolean;
  can_manage: boolean;
  connection: { status: string; connected_at: string | null; external_account_label: string | null; scopes?: string[] | null } | null;
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

export function WiizePayConnectionCard({ onPasswordSaved }: { onPasswordSaved?: () => void } = {}) {
  const { resolvedTheme } = useTheme();
  const [st, setSt] = useState<ConnStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setSt(await call({ action: "status" })); } catch { setSt(null); } finally { setLoaded(true); }
    try {
      const { data } = await supabase.functions.invoke("integration-export", { body: { action: "overview" } });
      setPasswordSet(!!data?.state?.password_set);
    } catch { setPasswordSet((p) => p ?? true); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Ao voltar para esta aba (depois de autorizar na outra), atualiza o status.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [load]);

  const onConnectClick = () => {
    if (passwordSet === false) { setPassError(null); setSetupOpen(true); return; }
    connect();
  };

  const saveAndContinue = async () => {
    setPassError(null);
    if (!isStrongPassword(newPass)) { setPassError("A senha ainda não atende a todos os requisitos."); return; }
    if (newPass !== confirmPass) { setPassError("As duas senhas não são iguais."); return; }
    // Abre a aba já neste clique (necessário na prévia); connect() reaproveita.
    const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const preTab = inFrame ? window.open("", "_blank") : null;
    setSavingPass(true);
    try {
      const { data, error } = await supabase.functions.invoke("integration-export", { body: { action: "set_password", new_password: newPass } });
      if (error || data?.error) throw new Error(data?.error || "save_failed");
      setPasswordSet(true);
      setNewPass(""); setConfirmPass("");
      setSetupOpen(false);
      onPasswordSaved?.();
      toast.success("Senha de Integração criada.");
      await connect(preTab);
    } catch (e) {
      if (preTab && !preTab.closed) preTab.close();
      setPassError((e as Error).message === "save_failed" ? "Não foi possível salvar a senha. Tente novamente." : (e as Error).message);
    } finally { setSavingPass(false); }
  };

  const connect = async (preTab?: Window | null) => {
    setBusy(true);
    // Dentro de um quadro (prévia), o navegador bloqueia a troca da página inteira
    // depois de uma espera. Por isso a nova aba é aberta JÁ no clique e só recebe o
    // endereço depois. Fora de quadro, a própria aba segue para o Wiize Pay.
    const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const tab = preTab !== undefined ? preTab : (inFrame ? window.open("", "_blank") : null);
    try {
      const r = await call({ action: "start", origin: window.location.origin, ui_theme: resolvedTheme });
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
  const scopes = st?.connection?.scopes ?? [];
  /** Conexões antigas não têm a permissão de enviar clientes e cobranças: precisa reconectar. */
  const needsReconnect = active && !scopes.includes("charges.write") && !scopes.includes("customers.write");
  const [syncing, setSyncing] = useState(false);
  const syncCustomers = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wiize-pay-customers", { body: { action: "sync_all" } });
      if (error) throw new Error(error.message);
      if (data?.error === "rate_limited") { toast.error("Aguarde um minuto antes de sincronizar de novo."); return; }
      if (data?.error) throw new Error(data.error);
      if (data.reason === "wiize_pay_route_unavailable") {
        toast.error(`O Wiize Pay ainda não está recebendo clientes. Publique a versão mais recente do Wiize Pay; os ${data.queued} clientes ficam guardados e serão enviados automaticamente.`, { duration: 10000 });
      } else if (data.reason === "reconnect_required") {
        toast.error(`Sua conexão foi feita antes da permissão de enviar clientes e cobranças. Clique em Desconectar e conecte de novo; os ${data.queued} clientes ficam guardados e são enviados em seguida.`, { duration: 12000 });
      } else if (data.reason === "token_unavailable") {
        toast.error("A conexão com o Wiize Pay expirou. Reconecte a conta; os clientes ficam guardados para envio.");
      } else if (data.failed) toast.error(`${data.sent} clientes enviados. ${data.failed} tiveram problema e serão reenviados automaticamente.`);
      else if (data.pending > 0) toast.success(`${data.sent} clientes enviados. Os outros ${data.pending} continuam sendo enviados em segundo plano.`);
      else toast.success(`${data.sent} clientes enviados ao Wiize Pay.`);
    } catch { toast.error("Não foi possível sincronizar agora. Vamos tentar de novo automaticamente."); }
    finally { setSyncing(false); }
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 sm:px-6 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Plug className="h-4 w-4 text-primary" /> CONEXÃO PRINCIPAL</div>
        {!loaded ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : active ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"><span className="h-2 w-2 rounded-full bg-primary" /> Ativa</span>
        ) : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Inativa</span>}
      </div>
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-primary/10" : "bg-muted"}`}>
          {active ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Plug className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg font-semibold text-foreground">Conta Wiize Pay</h2>
            {!loaded ? null : active ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Conectado
              </span>
            ) : !st?.configured ? (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground" title="READY_FOR_WIIZE_PAY">
                Em breve
              </span>
            ) : (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
          {needsReconnect && (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Esta conexão foi feita antes da permissão de enviar clientes e cobranças. Clique em <strong>Desconectar</strong> e conecte de novo para liberar. Seus clientes ficam guardados e são enviados em seguida.
            </p>
          )}
        </div>
        {st?.can_manage && (
          active ? (
             <div className="flex flex-wrap gap-2 lg:justify-end">
             <Button onClick={syncCustomers} disabled={syncing || busy} className="gap-2">
               {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar clientes
            </Button>
            <Button variant="outline" onClick={disconnect} disabled={busy} className="shrink-0">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Desconectar
            </Button>
            </div>
          ) : (
             <Button onClick={onConnectClick} disabled={busy || !st?.configured || passwordSet === null} className="gap-2 h-10 px-5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Wiize Pay
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          )
        )}
      </div>
      <div className="grid sm:grid-cols-3 border-t border-border/60 bg-muted/20">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
           <div key={title} className="p-4 sm:p-5 flex gap-3 border-b sm:border-b-0 sm:border-r last:border-0 border-border/60">
             <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={setupOpen} onOpenChange={(o) => !savingPass && setSetupOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Antes de conectar: crie sua Senha de Integração</DialogTitle>
            <DialogDescription>
              É uma senha só para integrações, diferente da senha de login. Ela protege ações sensíveis, como exportar dados ou desligar a conexão.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="font-semibold text-primary">1.</span> Crie a Senha de Integração abaixo.</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">2.</span> Você será levado ao Wiize Pay para entrar e clicar em <b>Autorizar</b>.</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">3.</span> Ao voltar, a conexão aparece como <b>Conectado</b>.</li>
          </ol>
          <div className="space-y-3">
            <PasswordField id="wp-setup-pass" label="Senha de Integração" value={newPass} onChange={setNewPass} autoComplete="new-password" showStrength />
            <PasswordField id="wp-setup-pass2" label="Repita a senha" value={confirmPass} onChange={setConfirmPass} autoComplete="new-password" />
            {passError && <p className="text-sm text-destructive">{passError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)} disabled={savingPass}>Cancelar</Button>
            <Button onClick={saveAndContinue} disabled={savingPass} className="gap-2">
              {savingPass && <Loader2 className="h-4 w-4 animate-spin" />}Salvar e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
