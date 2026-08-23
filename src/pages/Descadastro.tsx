import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

/**
 * Página pública de descadastro das abordagens de parceria.
 * Fluxo em duas etapas: valida o token e só remove após confirmação do usuário.
 */
export default function Descadastro() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "confirm" | "done" | "error">("loading");
  const [email, setEmail] = useState("");
  const [already, setAlready] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setState("error"); return; }
      const { data, error } = await supabase.functions.invoke("influencer-outreach", {
        body: { action: "unsubscribe", token, confirm: false },
      });
      if (!active) return;
      if (error || (data as any)?.error) { setState("error"); return; }
      setEmail((data as any)?.email ?? "");
      setAlready(Boolean((data as any)?.already));
      setState("confirm");
    })();
    return () => { active = false; };
  }, [token]);

  const confirmUnsubscribe = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("influencer-outreach", {
      body: { action: "unsubscribe", token, confirm: true },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) { setState("error"); return; }
    setState("done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <SEO title="Descadastro | Wiize" description="Gerencie o recebimento de contatos comerciais da Wiize." />
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center space-y-4">
        <img src="/wiize-logo.png" alt="Wiize" className="mx-auto h-8 w-auto" />

        {state === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-muted-foreground" size={22} />
            <p className="text-sm text-muted-foreground">Validando seu link…</p>
          </>
        )}

        {state === "confirm" && (
          <>
            <MailX className="mx-auto text-muted-foreground" size={28} />
            <h1 className="text-lg font-semibold">Confirmar descadastro</h1>
            <p className="text-sm text-muted-foreground">
              {already
                ? <>O e-mail {email && <strong>{email}</strong>} já está descadastrado. Você pode confirmar novamente se preferir.</>
                : <>Deseja parar de receber contatos comerciais da Wiize{email ? <> em <strong>{email}</strong></> : null}?</>}
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={confirmUnsubscribe} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : "Sim, quero me descadastrar"}
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <a href="https://wiize.com.br">Cancelar e continuar recebendo</a>
              </Button>
            </div>
          </>
        )}

        {state === "done" && (
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
