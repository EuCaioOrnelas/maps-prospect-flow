import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  link: any | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EMPTY = {
  name: "",
  destination_url: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  status: "active",
};

export function TrackedLinkDialog({ open, link, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(link ? { ...EMPTY, ...link } : EMPTY);
  }, [open, link]);

  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("forms-admin", {
        body: { action: link ? "update_link" : "create_link", link: form },
      });
      if (error) {
        let message = "Não foi possível salvar o link.";
        const ctx: any = (error as any).context;
        try {
          const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
          if (body?.message || body?.error) message = body.message || body.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      toast.success(link ? "Link atualizado." : "Link criado.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {link ? "Editar link rastreado" : "Novo link rastreado"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Nome interno</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Campanha Instagram - Bio" />
          </div>
          <div className="space-y-1.5">
            <Label>URL de destino</Label>
            <Input value={form.destination_url} onChange={(e) => set("destination_url", e.target.value)} placeholder="https://seusite.com.br/pagina" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["utm_source", "utm_source", "instagram"],
              ["utm_medium", "utm_medium", "bio"],
              ["utm_campaign", "utm_campaign", "lancamento"],
              ["utm_term", "utm_term", "opcional"],
              ["utm_content", "utm_content", "opcional"],
            ].map(([key, label, ph]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={form[key] || ""} onChange={(e) => set(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Link ativo</p>
              <p className="text-xs text-muted-foreground">Links inativos param de redirecionar.</p>
            </div>
            <Switch checked={form.status === "active"} onCheckedChange={(c) => set("status", c ? "active" : "inactive")} />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {link ? "Salvar alterações" : "Criar link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
