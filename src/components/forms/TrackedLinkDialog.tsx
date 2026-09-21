import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Globe, Hash, Link2, Loader2, Megaphone, Share2, Tag, Target } from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

const slugify = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function IconField({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="relative flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
      <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
      {children}
    </div>
  );
}

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
            <IconField icon={Tag}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Campanha Instagram - Bio" className="border-0 pl-9 shadow-none focus-visible:ring-0" />
            </IconField>
          </div>
          <div className="space-y-1.5">
            <Label>URL de destino</Label>
            <IconField icon={Globe}>
              <Input value={form.destination_url} onChange={(e) => set("destination_url", e.target.value)} placeholder="https://seusite.com.br/pagina" className="border-0 pl-9 shadow-none focus-visible:ring-0" />
            </IconField>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço do link</Label>
            <div className="flex min-w-0 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="shrink-0 border-r border-border px-3 text-sm text-muted-foreground">/r/</span>
              <Input
                value={form.slug || ""}
                onChange={(e) => { setSlugTaken(false); set("slug", slugify(e.target.value)); }}
                onBlur={checkSlug}
                placeholder="promo-instagram"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <p className={`text-xs ${slugTaken ? "text-destructive" : "text-muted-foreground"}`}>
              {slugTaken
                ? `O endereço "/r/${form.slug}" já está em uso. Escolha outro.`
                : "Deixe em branco para gerarmos um endereço curto automaticamente."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ["utm_source", "Origem (utm_source)", "instagram", Megaphone],
              ["utm_medium", "Mídia (utm_medium)", "bio", Share2],
              ["utm_campaign", "Campanha (utm_campaign)", "lancamento", Target],
              ["utm_term", "Termo (utm_term)", "opcional", Hash],
              ["utm_content", "Conteúdo (utm_content)", "opcional", FileText],
            ].map(([key, label, ph, icon]: any) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <IconField icon={icon}>
                  <Input value={form[key] || ""} onChange={(e) => set(key, e.target.value)} placeholder={ph} className="border-0 pl-9 shadow-none focus-visible:ring-0" />
                </IconField>
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
