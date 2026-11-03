import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSlug, slugProblem } from "@/lib/chatweb";
import { toast } from "sonner";

interface Props {
  flow: { id: string; name: string; owner_user_id?: string | null; user_id: string } | null;
  existing?: { id: string; enabled: boolean } | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** Cria (ou reativa) a configuração do ChatWeb ligada ao mesmo fluxo — sem copiar o fluxo. */
export async function activateChatWeb(flow: NonNullable<Props["flow"]>, existing?: Props["existing"]) {
  if (existing) {
    const { error } = await supabase.from("chatweb_configurations").update({ enabled: true }).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data: auth } = await supabase.auth.getUser();
  const base = normalizeSlug(flow.name) || "atendimento";
  for (let attempt = 0; attempt < 6; attempt++) {
    let slug = attempt === 0 ? base : `${base.slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
    if (slugProblem(slug)) slug = `atendimento-${Math.random().toString(36).slice(2, 7)}`;
    const { data: ok } = await supabase.rpc("chatweb_slug_available", { _slug: slug });
    if (!ok) continue;
    const { data, error } = await supabase.from("chatweb_configurations").insert({
      flow_id: flow.id,
      owner_user_id: flow.owner_user_id || flow.user_id,
      user_id: auth.user?.id || flow.user_id,
      slug,
      display_name: flow.name.slice(0, 60),
      welcome_message: "Olá! 👋 Como podemos ajudar?",
    }).select("id").single();
    if (!error) return data.id;
    if (error.code !== "23505") throw error; // conflito de endereço: tenta outro
  }
  throw new Error("Não foi possível gerar um endereço livre.");
}

export function ActivateChatWebDialog({ flow, existing, onOpenChange, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const activate = async () => {
    if (!flow) return;
    setBusy(true);
    try {
      await activateChatWeb(flow, existing);
      toast.success("ChatWeb ativado! Agora personalize seu atendimento.");
      onDone?.();
      onOpenChange(false);
      navigate(`/fluxos/${flow.id}/chatweb`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível ativar o ChatWeb.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!flow} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2"><Globe size={20} /></div>
          <DialogTitle>Transformar fluxo em ChatWeb</DialogTitle>
          <DialogDescription>
            Disponibilize este fluxo como um atendimento web. Seus clientes poderão conversar com sua automação por meio de um link exclusivo ou diretamente no seu site.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">O fluxo não é copiado: qualquer mudança no construtor vale para o WhatsApp e para o ChatWeb.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={activate} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ativar ChatWeb</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
