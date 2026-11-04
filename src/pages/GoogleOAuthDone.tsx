import { useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Página final da conexão com o Google: avisa a janela da Wiize e fecha sozinha. */
export default function GoogleOAuthDone() {
  const params = new URLSearchParams(window.location.search);
  const ok = params.get("ok") === "1";
  const msg = params.get("msg") || (ok ? "Conta Google conectada." : "Não foi possível conectar.");

  useEffect(() => {
    const payload = { source: "wiize-google-oauth", ok, at: Date.now() };
    try { new BroadcastChannel("wiize-google-oauth").postMessage(payload); } catch { /* sem suporte */ }
    try { localStorage.setItem("wiize-google-oauth", JSON.stringify(payload)); } catch { /* bloqueado */ }
    try { window.opener?.postMessage(payload, window.location.origin); } catch { /* sem janela */ }
    if (ok) {
      const t = window.setTimeout(() => window.close(), 1200);
      return () => window.clearTimeout(t);
    }
  }, [ok]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        {ok ? <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" /> : <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />}
        <h1 className="mb-2 text-lg font-semibold text-foreground">{ok ? "Conectado!" : "Erro na conexão"}</h1>
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button className="mt-6 w-full" onClick={() => window.close()}>Fechar janela</Button>
      </div>
    </div>
  );
}
