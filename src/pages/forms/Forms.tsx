import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Link2, Plus, Copy, Power, Trash2, BarChart3, Pencil,
  Eye, MousePointerClick, Users, Search, ExternalLink, Loader2, Lock,
} from "lucide-react";
import { useForms } from "@/hooks/useForms";
import { TrackedLinkDialog } from "@/components/forms/TrackedLinkDialog";
import { toast } from "sonner";

const PUBLIC_BASE = typeof window !== "undefined" ? window.location.origin : "";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

export default function Forms() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "links" ? "links" : "forms";
  const {
    loading, forms, links, statsByForm, clicksByLink, leadsByLink, limits, totals, refresh, callAdmin,
  } = useForms();

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "form" | "link"; id: string; name: string } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; link: any | null }>({ open: false, link: null });

  const filteredForms = useMemo(
    () => forms.filter((f) => !search || `${f.name} ${f.title}`.toLowerCase().includes(search.toLowerCase())),
    [forms, search],
  );
  const filteredLinks = useMemo(
    () => links.filter((l) => !search || `${l.name} ${l.destination_url}`.toLowerCase().includes(search.toLowerCase())),
    [links, search],
  );

  const totalClicks = Object.values(clicksByLink).reduce((a, c) => a + c.clicks, 0);
  const conversion = totals.views ? (totals.submissions / totals.views) * 100 : 0;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  };

  const formsAtLimit = forms.length >= limits.forms;
  const linksAtLimit = links.length >= limits.links;

  const setTab = (next: string) => {
    params.set("tab", next);
    setParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Forms" description="Formulários e links rastreados da Wiize" />
      <BackgroundGlow />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie formulários de captação e links rastreados que alimentam o seu CRM.
              </p>
            </div>
            <div className="flex gap-2">
              {tab === "forms" ? (
                <Button
                  onClick={() => (formsAtLimit ? toast.error("Limite de formulários do seu plano atingido.") : navigate("/forms/novo"))}
                  className="gap-2"
                >
                  {formsAtLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  Novo formulário
                </Button>
              ) : (
                <Button
                  onClick={() => (linksAtLimit ? toast.error("Limite de links do seu plano atingido.") : setLinkDialog({ open: true, link: null }))}
                  className="gap-2"
                >
                  {linksAtLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  Novo link
                </Button>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Formulários", value: `${forms.length}/${limits.forms}`, icon: FileText },
              { label: "Visualizações", value: totals.views, icon: Eye },
              { label: "Leads captados", value: totals.submissions, icon: Users },
              { label: "Cliques em links", value: totalClicks, icon: MousePointerClick },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <kpi.icon className="h-3.5 w-3.5" />
                  {kpi.label}
                </div>
                <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-3 border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Taxa de conversão dos formulários</p>
            <p className="mt-1 text-lg font-semibold">{conversion.toFixed(1)}%</p>
          </Card>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
              {[
                { id: "forms", label: "Formulários", icon: FileText },
                { id: "links", label: "Links rastreados", icon: Link2 },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
            </div>
          </div>

          {/* Conteúdo */}
          {loading ? (
            <Card className="mt-4 flex items-center justify-center border-border/60 p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ) : tab === "forms" ? (
            filteredForms.length === 0 ? (
              <Card className="mt-4 border-border/60 p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 font-medium">Nenhum formulário ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro formulário para começar a captar leads.</p>
              </Card>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredForms.map((f) => {
                  const s = statsByForm[f.id] || { views: 0, submissions: 0, lastSubmission: null };
                  const url = `${PUBLIC_BASE}/form/${f.slug}`;
                  const conv = s.views ? ((s.submissions / s.views) * 100).toFixed(1) : "0.0";
                  return (
                    <Card key={f.id} className="flex flex-col border-border/60 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{f.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">/form/{f.slug}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={f.status === "active"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                            : "border-border bg-muted text-muted-foreground"}
                        >
                          {f.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><p className="text-lg font-semibold">{s.views}</p><p className="text-[11px] text-muted-foreground">Views</p></div>
                          <div><p className="text-lg font-semibold">{s.submissions}</p><p className="text-[11px] text-muted-foreground">Leads</p></div>
                          <div><p className="text-lg font-semibold">{conv}%</p><p className="text-[11px] text-muted-foreground">Conversão</p></div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Último lead: {fmtDate(s.lastSubmission)} · Criado em {fmtDate(f.created_at)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/forms/${f.id}/editar`)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/forms/${f.id}/analytics`)}>
                          <BarChart3 className="h-3.5 w-3.5" /> Analytics
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(url)}>
                          <Copy className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(url, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="outline" className="gap-1.5"
                          disabled={busy === `toggle-${f.id}`}
                          onClick={() => run(`toggle-${f.id}`, () => callAdmin({ action: "toggle_form", id: f.id }).then(() => { toast.success("Status atualizado."); }))}
                        >
                          <Power className="h-3.5 w-3.5" /> {f.status === "active" ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm" variant="outline" className="gap-1.5"
                          disabled={busy === `dup-${f.id}`}
                          onClick={() => run(`dup-${f.id}`, () => callAdmin({ action: "duplicate_form", id: f.id }).then(() => { toast.success("Formulário duplicado."); }))}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 text-destructive"
                          onClick={() => setConfirm({ kind: "form", id: f.id, name: f.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          ) : filteredLinks.length === 0 ? (
            <Card className="mt-4 border-border/60 p-12 text-center">
              <Link2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 font-medium">Nenhum link rastreado</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie links com UTM para medir a origem dos seus acessos.</p>
            </Card>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredLinks.map((l) => {
                const stats = clicksByLink[l.id] || { clicks: 0, unique: 0, last: null };
                const leads = leadsByLink[l.id] || 0;
                const url = `${PUBLIC_BASE}/r/${l.slug}`;
                return (
                  <Card key={l.id} className="flex flex-col border-border/60 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{l.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">/r/{l.slug}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={l.status === "active"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-border bg-muted text-muted-foreground"}
                      >
                        {l.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <p className="mt-2 truncate text-xs text-muted-foreground">{l.destination_url}</p>

                    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-lg font-semibold">{stats.clicks}</p><p className="text-[11px] text-muted-foreground">Cliques</p></div>
                        <div><p className="text-lg font-semibold">{stats.unique}</p><p className="text-[11px] text-muted-foreground">Únicos</p></div>
                        <div><p className="text-lg font-semibold">{leads}</p><p className="text-[11px] text-muted-foreground">Leads</p></div>
                      </div>
                    </div>

                    {(l.utm_source || l.utm_campaign) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).map((u) => (
                          <Badge key={u as string} variant="secondary" className="text-[11px]">{u}</Badge>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted-foreground">Último clique: {fmtDate(stats.last)}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(url)}>
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog({ open: true, link: l })}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setConfirm({ kind: "link", id: l.id, name: l.name })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <TrackedLinkDialog
        open={linkDialog.open}
        link={linkDialog.link}
        onOpenChange={(open) => setLinkDialog({ open, link: open ? linkDialog.link : null })}
        onSaved={refresh}
      />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirm?.kind === "form" ? "formulário" : "link"}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirm?.name}” será removido permanentemente, junto com suas estatísticas. Os leads já enviados ao CRM permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const target = confirm;
                setConfirm(null);
                if (!target) return;
                run(`del-${target.id}`, () =>
                  callAdmin({ action: target.kind === "form" ? "delete_form" : "delete_link", id: target.id })
                    .then(() => { toast.success("Excluído com sucesso."); }),
                );
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
