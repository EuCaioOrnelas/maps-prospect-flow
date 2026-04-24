import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Plus, Link2, Copy, Check, Search, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtDate } from "@/lib/partnerFormat";
import { PartnerCombobox } from "@/components/admin/partners/PartnerCombobox";

interface Partner { id: string; full_name: string; email: string; }
interface RefLink {
  id: string; partner_id: string; slug: string; label: string; internal_name: string | null; description: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  is_active: boolean; expires_at: string | null;
  total_clicks: number; total_leads: number; total_paid_clients: number;
  partners?: { full_name: string; email: string };
}

const normSlug = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export default function AdminPartnersLinks() {
  const [links, setLinks] = useState<RefLink[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [slugCheck, setSlugCheck] = useState<{ checking: boolean; available: boolean | null; normalized: string }>({ checking: false, available: null, normalized: "" });
  const { toast } = useToast();

  const [form, setForm] = useState({
    partner_id: "", slug: "", label: "", internal_name: "", description: "",
    utm_source: "", utm_medium: "", utm_campaign: "", expires_at: "",
  });

  const load = async () => {
    setLoading(true);
    const [l, p] = await Promise.all([
      supabase.from("partner_referral_links").select("*, partners:partner_id(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("partners").select("id, full_name, email").eq("status", "active").order("full_name"),
    ]);
    setLinks((l.data as any) || []);
    setPartners((p.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Live slug duplicate check (debounced)
  useEffect(() => {
    if (!form.slug.trim()) { setSlugCheck({ checking: false, available: null, normalized: "" }); return; }
    const normalized = normSlug(form.slug);
    setSlugCheck((s) => ({ ...s, checking: true, normalized }));
    const t = setTimeout(async () => {
      const { data } = await supabase.functions.invoke("admin-manage-partner-link", {
        body: { action: "check_slug", slug: normalized },
      });
      setSlugCheck({ checking: false, available: (data as any)?.available ?? null, normalized: (data as any)?.normalized || normalized });
    }, 350);
    return () => clearTimeout(t);
  }, [form.slug]);

  const create = async () => {
    if (!form.partner_id || !form.slug || !form.label) {
      toast({ title: "Obrigatórios", description: "Parceiro, slug e nome de exibição.", variant: "destructive" }); return;
    }
    if (slugCheck.available === false) {
      toast({ title: "Slug em uso", description: "Escolha um slug diferente.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: {
        action: "create", ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Link criado" });
    setOpen(false);
    setForm({ partner_id: "", slug: "", label: "", internal_name: "", description: "", utm_source: "", utm_medium: "", utm_campaign: "", expires_at: "" });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.functions.invoke("admin-manage-partner-link", {
      body: { action: "update", id, is_active },
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

  const isExpired = (l: RefLink) => l.expires_at && new Date(l.expires_at).getTime() < Date.now();

  const filtered = useMemo(() => {
    let list = links;
    if (statusFilter === "active") list = list.filter((l) => l.is_active && !isExpired(l));
    else if (statusFilter === "inactive") list = list.filter((l) => !l.is_active);
    else if (statusFilter === "expired") list = list.filter((l) => isExpired(l));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.slug.includes(q) || l.label.toLowerCase().includes(q) ||
        l.internal_name?.toLowerCase().includes(q) ||
        l.partners?.full_name?.toLowerCase().includes(q) ||
        l.partners?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [links, search, statusFilter]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Link2 size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Links de campanha</h1>
            <p className="text-sm text-muted-foreground">Slugs personalizados (/r/SLUG) com UTMs por parceiro. Vincule metas exclusivas a cada link.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Novo link</Button>
      </div>

      {/* UTM explainer */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Info size={14} /> Como funcionam os parâmetros UTM
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Os UTMs são adicionados automaticamente à URL final quando alguém acessa <code className="bg-muted px-1 rounded">/r/SLUG</code>.
            Eles ficam armazenados junto com o clique e o lead, permitindo identificar de onde veio cada conversão.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <li className="bg-card border border-border/60 rounded-md p-2"><strong>utm_source</strong> = origem (ex: <code>instagram</code>, <code>youtube</code>, <code>email</code>)</li>
            <li className="bg-card border border-border/60 rounded-md p-2"><strong>utm_medium</strong> = formato (ex: <code>story</code>, <code>video</code>, <code>newsletter</code>)</li>
            <li className="bg-card border border-border/60 rounded-md p-2"><strong>utm_campaign</strong> = nome da campanha (ex: <code>black-friday-2025</code>)</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por slug, parceiro, nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} de {links.length}</div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Slug</TableHead>
                  <TableHead>Nome / interno</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>UTMs</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Nenhum link encontrado.</TableCell></TableRow>
                ) : filtered.map((l) => (
                  <TableRow key={l.id} className={isExpired(l) ? "opacity-60" : ""}>
                    <TableCell><code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">/r/{l.slug}</code></TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{l.label}</div>
                      {l.internal_name && <div className="text-[11px] text-muted-foreground">interno: {l.internal_name}</div>}
                      {l.description && <div className="text-xs text-muted-foreground line-clamp-1">{l.description}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.partners?.full_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{l.partners?.email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.expires_at ? (
                        isExpired(l)
                          ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Expirado</Badge>
                          : <span className="text-muted-foreground">até {fmtDate(l.expires_at)}</span>
                      ) : <span className="text-muted-foreground">Sem prazo</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">{l.total_clicks}</TableCell>
                    <TableCell className="text-right text-sm">{l.total_leads}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-emerald-600">{l.total_paid_clients}</TableCell>
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo link de campanha</DialogTitle>
            <DialogDescription>Slug usado em /r/SLUG. Curto, sem espaços, sem acentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormRow label="Parceiro *">
              <PartnerCombobox partners={partners} value={form.partner_id} onChange={(id) => setForm({ ...form, partner_id: id })} />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Slug *">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="black-friday"
                />
                {form.slug && (
                  <div className="text-[11px] flex items-center gap-1 mt-0.5">
                    {slugCheck.checking ? (
                      <span className="text-muted-foreground">Verificando...</span>
                    ) : slugCheck.available === true ? (
                      <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={11} /> /r/{slugCheck.normalized} disponível</span>
                    ) : slugCheck.available === false ? (
                      <span className="text-destructive inline-flex items-center gap-1"><AlertCircle size={11} /> /r/{slugCheck.normalized} já em uso</span>
                    ) : null}
                  </div>
                )}
              </FormRow>
              <FormRow label="Nome de exibição *">
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Black Friday Instagram" />
              </FormRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Nome interno (opcional)">
                <Input value={form.internal_name} onChange={(e) => setForm({ ...form, internal_name: e.target.value })} placeholder="BF-IG-2025" />
              </FormRow>
              <FormRow label="Validade (opcional)">
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </FormRow>
            </div>
            <FormRow label="Descrição">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Onde será usado..." />
            </FormRow>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="utm_source"><Input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="instagram" /></FormRow>
              <FormRow label="utm_medium"><Input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="story" /></FormRow>
              <FormRow label="utm_campaign"><Input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="bf2025" /></FormRow>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={create} disabled={submitting || slugCheck.available === false}>
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
