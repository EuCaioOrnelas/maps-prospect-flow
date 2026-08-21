import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

/**
 * Página pública de descadastro das abordagens de parceria.
 * Fica no domínio da Wiize (e não no domínio do backend) para manter o
 * alinhamento de marca/DMARC dos e-mails enviados.
 */
export default function Descadastro() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setState("error"); return; }
      const { data, error } = await supabase.functions.invoke("influencer-outreach", {
        body: { action: "unsubscribe", token },
      });
      if (!active) return;
      if (error || (data as any)?.error) { setState("error"); return; }
      setEmail((data as any)?.email ?? "");
      setState("ok");
    })();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <SEO title="Descadastro | Wiize" description="Gerencie o recebimento de contatos comerciais da Wiize." />
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center space-y-3">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-muted-foreground" size={22} />
            <p className="text-sm text-muted-foreground">Processando seu pedido…</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="mx-auto text-primary" size={28} />
            <h1 className="text-lg font-semibold">Descadastro confirmado</h1>
            <p className="text-sm text-muted-foreground">
              Não enviaremos novos contatos comerciais{email ? <> para <strong>{email}</strong></> : null}.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto text-destructive" size={28} />
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível processar o descadastro. Responda o e-mail pedindo a remoção que faremos manualmente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
