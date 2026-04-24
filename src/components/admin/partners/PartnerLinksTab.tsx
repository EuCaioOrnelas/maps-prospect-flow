import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Link2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RefLink {
  id: string; partner_id: string; slug: string; label: string; description: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  is_active: boolean; total_clicks: number; total_leads: number; total_paid_clients: number;
}

export function PartnerLinksTab({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const [links, setLinks] = useState<RefLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "", label: "", description: "",
    utm_source: "", utm_medium: "", utm_campaign: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_referral_links")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    setLinks((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (partnerId) load(); /* eslint-disable-next-line */ }, [partnerId]);

  const create = async () => {
    if (!form.label.trim() || !form.slug.trim()) {
      toast({ title: "Obrigatórios", description: "Slug e nome.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "create", partner_id: partnerId, ...form },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Link criado" });
    setOpen(false);
    setForm({ slug: "", label: "", description: "", utm_source: "", utm_medium: "", utm_campaign: "" });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "update", id, is_active },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Excluir este link de campanha? Cliques históricos permanecem registrados.")) return;
    const { error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "delete", id },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Link removido" });
    load();
  };

  const copyUrl = async (id: string, slug: string) => {
    const url = `${window.location.origin}/r/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Link copiado!", description: url });
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${links.length} link(s) de campanha`}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus size={14} /> Novo link</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo link de campanha</DialogTitle>
              <DialogDescription>Slug usado em /r/SLUG. Curto, sem espaços, sem acentos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <Row label="Slug *">
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="black-friday"
                  />
                </Row>
                <Row label="Nome interno *">
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Black Friday Instagram" />
                </Row>
              </div>
              <Row label="Descrição">
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Onde será usado..." />
              </Row>
              <div className="grid grid-cols-3 gap-3">
                <Row label="utm_source">
                  <Input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="instagram" />
                </Row>
                <Row label="utm_medium">
                  <Input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="story" />
                </Row>
                <Row label="utm_campaign">
                  <Input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="bf2024" />
                </Row>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={create} disabled={submitting}>
                {submitting ? <><Loader2 className="animate-spin mr-2" size={16} />Criando...</> : "Criar link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : links.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Link2 className="text-muted-foreground/50" />
              Nenhum link de campanha criado para este parceiro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Slug</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>UTMs</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Pagos</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">/r/{l.slug}</code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{l.label}</div>
                        {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{l.total_clicks}</TableCell>
                      <TableCell className="text-right text-sm">{l.total_leads}</TableCell>
                      <TableCell className="text-right text-sm">{l.total_paid_clients}</TableCell>
                      <TableCell><Switch checked={l.is_active} onCheckedChange={(v) => toggle(l.id, v)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => copyUrl(l.id, l.slug)}>
                            {copiedId === l.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => remove(l.id)}>
                            ✕
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
