import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Plus, Copy, Check, MousePointerClick, UserPlus, DollarSign, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/partners/PageHeader";
import { fmtDate } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";

interface PartnerLink {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  total_clicks: number;
}

interface LinkStats {
  trials: number;
  clients: number;
}

export default function PartnerLinks() {
  const { partner } = useOutletContext<any>();
  const { toast } = useToast();

  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [stats, setStats] = useState<Record<string, LinkStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<PartnerLink | null>(null);

  const buildUrl = (slug: string) => `${window.location.origin}/r/${slug}`;

  const load = async () => {
    if (!partner?.id) return;
    setRefreshing(true);
    const [linksRes, leadsRes] = await Promise.all([
      supabase
        .from("partner_referral_links")
        .select("id, slug, label, description, is_active, created_at, total_clicks")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_leads")
        .select("referral_link_id, is_trial, is_paid, is_cancelled")
        .eq("partner_id", partner.id),
    ]);

    setLinks((linksRes.data as any) || []);

    const map: Record<string, LinkStats> = {};
    for (const l of (leadsRes.data as any[]) || []) {
      if (!l.referral_link_id) continue;
      const s = (map[l.referral_link_id] ||= { trials: 0, clients: 0 });
      if (l.is_trial || l.is_paid) s.trials += 1;
      if (l.is_paid && !l.is_cancelled) s.clients += 1;
    }
    setStats(map);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [partner?.id]);

  const copy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(null), 1800);
  };

  const createLink = async () => {
    if (name.trim().length < 2) {
      toast({ title: "Informe o nome do conteúdo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("partner_create_referral_link", {
      _label: name.trim(),
      _video_title: videoTitle.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível criar o link", description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    toast({ title: "Link criado!", description: row?.slug ? buildUrl(row.slug) : undefined });
    setCreateOpen(false);
    setName("");
    setVideoTitle("");
    load();
  };

  const toggleStatus = async (link: PartnerLink) => {
    const { error } = await (supabase as any).rpc("partner_set_referral_link_status", {
      _link_id: link.id,
      _is_active: !link.is_active,
    });
    if (error) {
      toast({ title: "Erro ao atualizar o link", description: error.message, variant: "destructive" });
      return;
    }
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)));
  };

  const totals = useMemo(() => {
    let clicks = 0, trials = 0, clients = 0;
    for (const l of links) {
      clicks += l.total_clicks || 0;
      trials += stats[l.id]?.trials || 0;
      clients += stats[l.id]?.clients || 0;
    }
    return { clicks, trials, clients };
  }, [links, stats]);

  const rate = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seus links"
        subtitle="Crie links exclusivos para cada conteúdo e acompanhe quais vídeos geram mais resultados."
        icon={Link2}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="gap-1.5">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Criar novo link
            </Button>
          </>
        }
      />

      {/* Link geral do parceiro */}
      {partner?.referral_code && (
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-medium">Link geral de indicação</div>
              <code className="text-[11px] font-mono text-muted-foreground truncate block">
                {`${window.location.origin}/?ref=${partner.referral_code}`}
              </code>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => copy("general", `${window.location.origin}/?ref=${partner.referral_code}`)}
            >
              {copied === "general" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied === "general" ? "Copiado" : "Copiar link"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={MousePointerClick} label="Cliques" value={totals.clicks} />
        <MiniStat icon={UserPlus} label="Trials" value={totals.trials} />
        <MiniStat icon={DollarSign} label="Clientes" value={totals.clients} />
      </div>

      {/* Tabela (desktop) */}
      <Card className="border-border/60 hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Trials</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!loading && links.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  Você ainda não criou nenhum link. Clique em "Criar novo link".
                </TableCell></TableRow>
              )}
              {links.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetail(l)}>
                  <TableCell className="font-medium max-w-[220px] truncate">{l.label}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[220px] truncate">/r/{l.slug}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
                  <TableCell className="text-right">{l.total_clicks || 0}</TableCell>
                  <TableCell className="text-right">{stats[l.id]?.trials || 0}</TableCell>
                  <TableCell className="text-right">{stats[l.id]?.clients || 0}</TableCell>
                  <TableCell>
                    {l.is_active
                      ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Ativo</Badge>
                      : <Badge variant="outline">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => copy(l.id, buildUrl(l.slug))}>
                        {copied === l.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        Copiar link
                      </Button>
                      <Switch checked={l.is_active} onCheckedChange={() => toggleStatus(l)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards (mobile) */}
      <div className="space-y-3 md:hidden">
        {!loading && links.length === 0 && (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Você ainda não criou nenhum link.
          </CardContent></Card>
        )}
        {links.map((l) => (
          <Card key={l.id} className="border-border/60">
            <CardContent className="p-4 space-y-2" onClick={() => setDetail(l)}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{l.label}</div>
                {l.is_active
                  ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Ativo</Badge>
                  : <Badge variant="outline">Inativo</Badge>}
              </div>
              <code className="text-[11px] font-mono text-muted-foreground block truncate">/r/{l.slug}</code>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {l.total_clicks || 0}</span>
                <span className="inline-flex items-center gap-1"><UserPlus size={12} /> {stats[l.id]?.trials || 0}</span>
                <span className="inline-flex items-center gap-1"><DollarSign size={12} /> {stats[l.id]?.clients || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => copy(l.id, buildUrl(l.slug))}>
                  {copied === l.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  Copiar link
                </Button>
                <Switch checked={l.is_active} onCheckedChange={() => toggleStatus(l)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Criar link */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo link</DialogTitle>
            <DialogDescription>
              O link é gerado automaticamente e leva para o cadastro da Wiize com a sua indicação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="link-name">Nome do conteúdo</Label>
              <Input
                id="link-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como prospectar empresas pelo Google Maps"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-video">Título do vídeo (opcional)</Label>
              <Input
                id="link-video"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Usado apenas para sua organização"
                maxLength={140}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createLink} disabled={saving}>{saving ? "Criando..." : "Criar link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{detail.label}</DialogTitle>
                <DialogDescription>Criado em {fmtDate(detail.created_at)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono truncate">{buildUrl(detail.slug)}</code>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 shrink-0" onClick={() => copy(detail.id, buildUrl(detail.slug))}>
                    {copied === detail.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    Copiar
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat icon={MousePointerClick} label="Cliques" value={detail.total_clicks || 0} />
                  <MiniStat icon={UserPlus} label="Trials" value={stats[detail.id]?.trials || 0} />
                  <MiniStat icon={DollarSign} label="Clientes" value={stats[detail.id]?.clients || 0} />
                </div>
                <div className="rounded-lg border border-border/60 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Clientes por clique</span>
                    <span className="font-semibold">{rate(stats[detail.id]?.clients || 0, detail.total_clicks || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Clientes por trial</span>
                    <span className="font-semibold">{rate(stats[detail.id]?.clients || 0, stats[detail.id]?.trials || 0)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon size={12} /> {label}
      </div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
