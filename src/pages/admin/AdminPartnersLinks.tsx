import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Link2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Partner { id: string; full_name: string; email: string; }
interface RefLink {
  id: string; partner_id: string; slug: string; label: string; description: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  is_active: boolean; total_clicks: number; total_leads: number; total_paid_clients: number;
  partners?: { full_name: string };
}

export default function AdminPartnersLinks() {
  const [links, setLinks] = useState<RefLink[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    partner_id: "", slug: "", label: "", description: "",
    utm_source: "", utm_medium: "", utm_campaign: "",
  });

  const load = async () => {
    setLoading(true);
    const [l, p] = await Promise.all([
      supabase.from("partner_referral_links").select("*, partners:partner_id(full_name)").order("created_at", { ascending: false }),
      supabase.from("partners").select("id, full_name, email").eq("status", "active").order("full_name"),
    ]);
    setLinks((l.data as any) || []);
    setPartners((p.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.partner_id || !form.slug || !form.label) {
      toast({ title: "Obrigatórios", description: "Parceiro, slug e nome.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "create", ...form },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Link criado" });
    setOpen(false);
    setForm({ partner_id: "", slug: "", label: "", description: "", utm_source: "", utm_medium: "", utm_campaign: "" });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "update", link_id: id, is_active },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const copyUrl = async (id: string, slug: string) => {
    const url = `${window.location.origin}/r/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Link2 size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Links de campanha</h1>
            <p className="text-sm text-muted-foreground">Crie slugs personalizados (/r/SLUG) com UTMs para cada parceiro.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Novo link</Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Slug</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>UTMs</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Pagos</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : links.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Nenhum link criado.</TableCell></TableRow>
              ) : links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">/r/{l.slug}</code></TableCell>
                  <TableCell><div className="text-sm font-medium">{l.label}</div>{l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}</TableCell>
                  <TableCell className="text-sm">{l.partners?.full_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{l.total_clicks}</TableCell>
                  <TableCell className="text-right text-sm">{l.total_leads}</TableCell>
                  <TableCell className="text-right text-sm">{l.total_paid_clients}</TableCell>
                  <TableCell><Switch checked={l.is_active} onCheckedChange={(v) => toggle(l.id, v)} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => copyUrl(l.id, l.slug)}>
                      {copiedId === l.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo link de campanha</DialogTitle>
            <DialogDescription>Slug usado em /r/SLUG. Curto, sem espaços, sem acentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormRow label="Parceiro *">
              <Select value={form.partner_id} onValueChange={(v) => setForm({ ...form, partner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} · {p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Slug *"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="black-friday" /></FormRow>
              <FormRow label="Nome interno *"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Black Friday Instagram" /></FormRow>
            </div>
            <FormRow label="Descrição"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Onde será usado..." /></FormRow>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="utm_source"><Input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="instagram" /></FormRow>
              <FormRow label="utm_medium"><Input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="story" /></FormRow>
              <FormRow label="utm_campaign"><Input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="bf2024" /></FormRow>
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
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
