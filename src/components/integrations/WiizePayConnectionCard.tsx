import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Loader2 } from "lucide-react";
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

export function WiizePayConnectionCard() {
  const [st, setSt] = useState<ConnStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setSt(await call({ action: "status" })); } catch { setSt(null); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    setBusy(true);
    try {
      const r = await call({ action: "start", origin: window.location.origin });
      const url = new URL(r.authorize_url);
      if (url.protocol !== "https:") throw new Error("invalid_url");
      window.location.assign(url.toString());
    } catch (e) {
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

  const status = st?.connection?.status;
  const active = status === "active";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> Wiize Pay</CardTitle>
            <CardDescription>Conecte para criar contratos e cobranças direto do CRM.</CardDescription>
          </div>
          {active ? (
            <Badge className="bg-emerald-100 text-emerald-800">Conectado</Badge>
          ) : !st?.configured ? (
            <Badge className="bg-violet-100 text-violet-800">READY_FOR_WIIZE_PAY</Badge>
          ) : (
            <Badge variant="secondary">Não conectado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        {active ? (
          <p className="text-muted-foreground">
            Conectado{st?.connection?.external_account_label ? ` à conta ${st.connection.external_account_label}` : ""}
            {st?.connection?.connected_at ? ` desde ${new Date(st.connection.connected_at).toLocaleDateString("pt-BR")}` : ""}.
          </p>
        ) : !st?.configured ? (
          <p className="text-muted-foreground">
            A conexão será liberada assim que o Wiize Pay ativar o acesso seguro. Você autoriza no próprio Wiize Pay —
            sua senha nunca passa pelo Wiize.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Você será levado ao Wiize Pay para autorizar. Depois disso a conexão fica ativa até você desconectar.
          </p>
        )}
        {st?.can_manage && (
          active ? (
            <Button variant="outline" onClick={disconnect} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Desconectar
            </Button>
          ) : (
            <Button onClick={connect} disabled={busy || !st?.configured}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Conectar Wiize Pay
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
