import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { AIProvidersConnector } from "./AIProvidersConnector";
import { AI_PROVIDERS, ProviderId } from "@/lib/aiProviders";
import { useUserAICredentials } from "@/hooks/useUserAICredentials";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfigured?: () => void;
  onSkip?: () => void;
  required?: boolean;
};

export function MandatoryProviderDialog({ open, onOpenChange, onConfigured, onSkip, required = true }: Props) {
  const credsQ = useUserAICredentials();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const savedProviders = useMemo(
    () => new Set((credsQ.data ?? []).filter((c) => c.is_active && c.api_key).map((c) => c.provider)),
    [credsQ.data],
  );

  const [enabled, setEnabled] = useState<Record<ProviderId, boolean>>({
    openai: true, claude: false, gemini: false, deepseek: false, meta: false,
  });
  const [keys, setKeys] = useState<Record<ProviderId, string>>({
    openai: "", claude: "", gemini: "", deepseek: "", meta: "",
  });

  useEffect(() => {
    if (!credsQ.data) return;
    setEnabled((prev) => {
      const next = { ...prev };
      for (const c of credsQ.data) {
        if (c.is_active && c.api_key) (next as Record<string, boolean>)[c.provider] = true;
      }
      return next;
    });
  }, [credsQ.data]);

  const validation = useMemo(() => {
    const active = AI_PROVIDERS.filter((p) => enabled[p.id]);
    if (active.length === 0) return { ok: false, msg: "Ative pelo menos uma IA para o colaborador funcionar." };
    const missing = active.filter((p) => !savedProviders.has(p.id) && !keys[p.id].trim());
    if (missing.length > 0) return { ok: false, msg: `Informe a chave de: ${missing.map((m) => m.name).join(", ")}.` };
    return { ok: true, msg: "Pronto para usar." };
  }, [enabled, keys, savedProviders]);

  async function handleSave() {
    if (!validation.ok) { toast.error(validation.msg); return; }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada.");
      const rows = AI_PROVIDERS
        .filter((p) => enabled[p.id] && keys[p.id].trim())
        .map((p) => ({ user_id: uid, provider: p.id, api_key: keys[p.id].trim(), is_active: true }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("user_ai_credentials")
          .upsert(rows as never, { onConflict: "user_id,provider" as never });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["user_ai_credentials"] });
      toast.success("IA conectada!");
      onConfigured?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && required && !validation.ok) return; // block close when required & invalid
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card">
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Conecte uma IA para ativar seu colaborador
            </DialogTitle>
            <DialogDescription className="text-xs">
              Para abrir o construtor e usar esse colaborador, escolha pelo menos um provedor de IA e conecte sua chave.
              Sem isso, o colaborador fica salvo como rascunho.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          <AIProvidersConnector
            enabled={enabled}
            setEnabled={setEnabled}
            keys={keys}
            setKeys={setKeys}
            savedProviders={savedProviders}
            collapsible={false}
          />
          <div className={cn(
            "flex items-start gap-2 text-xs rounded-lg px-3 py-2 ring-1",
            validation.ok ? "bg-emerald-500/5 text-emerald-700 ring-emerald-500/20"
                          : "bg-amber-500/5 text-amber-700 ring-amber-500/20",
          )}>
            {validation.ok ? <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="size-3.5 mt-0.5 shrink-0" />}
            <span>{validation.msg}</span>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-between gap-2 bg-muted/20">
          {onSkip ? (
            <Button variant="ghost" size="sm" onClick={() => { onSkip(); onOpenChange(false); }}>
              Salvar como rascunho
            </Button>
          ) : <span />}
          <Button size="sm" onClick={handleSave} disabled={saving || !validation.ok}>
            {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Conectar e abrir construtor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
