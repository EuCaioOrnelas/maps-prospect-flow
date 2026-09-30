import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function WiizePayCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Concluindo a conexão com o Wiize Pay…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    // limpa o code da barra de endereço
    window.history.replaceState(null, "", window.location.pathname);
    if (err || !code || !state) {
      setMsg("A autorização foi cancelada ou não foi concluída.");
      setTimeout(() => navigate("/configuracoes/integracoes/wiize-pay", { replace: true }), 2500);
      return;
    }
    supabase.functions
      .invoke("wiize-pay-connect", { body: { action: "callback", code, state, origin: window.location.origin } })
      .then(({ data, error }) => {
        setMsg(error || data?.error ? "Não foi possível concluir a conexão. Tente novamente." : "Wiize Pay conectado!");
      })
      .finally(() => setTimeout(() => navigate("/configuracoes/integracoes/wiize-pay", { replace: true }), 1800));
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> <span>{msg}</span>
      </div>
    </div>
  );
}
