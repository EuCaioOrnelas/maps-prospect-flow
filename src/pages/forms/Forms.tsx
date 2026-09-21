import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Link2, Plus, Copy, Power, Trash2, BarChart3, Pencil,
  Eye, MousePointerClick, Users, Search, ExternalLink, Loader2, Lock,
  Activity, CalendarClock, CheckCircle2, Code2, Globe2, TrendingUp,
} from "lucide-react";
import { useForms } from "@/hooks/useForms";
import { TrackedLinkDialog } from "@/components/forms/TrackedLinkDialog";
import { FormEmbedDialog } from "@/components/forms/FormEmbedDialog";
import { toast } from "sonner";
import { rangeCalendarClassNames } from "@/lib/calendarRange";

const PUBLIC_BASE = typeof window !== "undefined" ? window.location.origin : "";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

const metricCards = {
  forms: [
    { key: "forms", label: "Formulários", icon: FileText },
    { key: "views", label: "Visualizações", icon: Eye },
    { key: "submissions", label: "Leads captados", icon: Users },
    { key: "conversion", label: "Conversão", icon: TrendingUp },
  ],
  links: [
    { key: "links", label: "Links rastreados", icon: Link2 },
    { key: "clicks", label: "Cliques totais", icon: MousePointerClick },
    { key: "unique", label: "Pessoas únicas", icon: Users },
  ],
} as const;

const dayMs = 24 * 60 * 60 * 1000;
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const QUICK_PERIODS = [7, 30, 60, 90] as const;

export default function Forms() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "links" ? "links" : "forms";
  const {
    loading, forms, links, statsByForm, clicksByLink, limits, totals, refresh, callAdmin, setRange,
  } = useForms();

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "form" | "link"; id: string; name: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; link: any | null }>({ open: false, link: null });
  const [embedForm, setEmbedForm] = useState<{ name: string; slug: string } | null>(null);
  const [quickDays, setQuickDays] = useState<number | null>(30);
  const [fromDate, setFromDate] = useState(() => toDateInput(new Date(Date.now() - 30 * dayMs)));
  const [toDate, setToDate] = useState(() => toDateInput(new Date()));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date>(() => new Date());
  const [draftTo, setDraftTo] = useState<Date>(() => new Date());

  const applyPeriod = (from: string, to: string, days: number | null) => {
    setQuickDays(days);
    setFromDate(from);
    setToDate(to);
    if (!from || !to) return;
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return;
    setRange({ from: start.toISOString(), to: end.toISOString() });
  };

  const applyQuick = (days: number) => {
    const to = toDateInput(new Date());
    const from = toDateInput(new Date(Date.now() - days * dayMs));
    applyPeriod(from, to, days);
  };

  const openRange = (next: boolean) => {
    setRangeOpen(next);
    if (next) {
      setDraftFrom(fromDate ? new Date(`${fromDate}T12:00:00`) : new Date());
      setDraftTo(toDate ? new Date(`${toDate}T12:00:00`) : new Date());
    }
  };

  const applyRangeDraft = () => {
    const start = draftFrom <= draftTo ? draftFrom : draftTo;
    const end = draftFrom <= draftTo ? draftTo : draftFrom;
    applyPeriod(toDateInput(start), toDateInput(end), null);
    setRangeOpen(false);
  };

  const periodLabel = fromDate && toDate
    ? `${format(new Date(`${fromDate}T12:00:00`), "dd MMM yyyy", { locale: ptBR })} — ${format(new Date(`${toDate}T12:00:00`), "dd MMM yyyy", { locale: ptBR })}`
    : "Período";

  // Período padrão: últimos 30 dias.
  useEffect(() => { applyQuick(30); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredForms = useMemo(
    () => forms.filter((f) => !search || `${f.name} ${f.title}`.toLowerCase().includes(search.toLowerCase())),
    [forms, search],
  );
  const filteredLinks = useMemo(
    () => links.filter((l) => !search || `${l.name} ${l.destination_url}`.toLowerCase().includes(search.toLowerCase())),
    [links, search],
  );

  const totalClicks = Object.values(clicksByLink).reduce((a, c) => a + c.clicks, 0);
  const totalUniqueClicks = Object.values(clicksByLink).reduce((a, c) => a + c.unique, 0);
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
  const metricValues: Record<string, string | number> = {
    forms: `${forms.length}/${limits.forms}`,
    views: totals.views,
    submissions: totals.submissions,
    conversion: `${conversion.toFixed(1)}%`,
    links: `${links.length}/${limits.links}`,
    clicks: totalClicks,
    unique: totalUniqueClicks,
  };

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
                  onClick={() => navigate("/forms/novo")}
                  disabled={formsAtLimit}
                  className="gap-2 shadow-none disabled:border-transparent disabled:bg-primary/55 disabled:text-primary-foreground disabled:opacity-100 disabled:shadow-none disabled:[filter:none] disabled:before:hidden disabled:after:hidden"
                >
                  {formsAtLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {formsAtLimit ? "Limite atingido" : "Novo formulário"}
                </Button>
              ) : (
                <Button
                  onClick={() => setLinkDialog({ open: true, link: null })}
                  disabled={linksAtLimit}
                  className="gap-2 shadow-none disabled:border-transparent disabled:bg-primary/55 disabled:text-primary-foreground disabled:opacity-100 disabled:shadow-none disabled:[filter:none] disabled:before:hidden disabled:after:hidden"
                >
                  {linksAtLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {linksAtLimit ? "Limite atingido" : "Novo link"}
                </Button>
              )}

            </div>
          </div>

          {/* Abas + busca */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-10 border border-border/60 bg-muted/40 p-1">
                <TabsTrigger value="forms" className="gap-2 px-4">
                  <FileText className="h-4 w-4" /> Formulários
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-2 px-4">
                  <Link2 className="h-4 w-4" /> Links rastreados
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
            </div>
          </div>

          {/* Filtro de período */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Popover open={rangeOpen} onOpenChange={openRange}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border/60 text-xs">
                  <CalendarClock size={13} />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden rounded-2xl border-border/70 bg-popover p-0 shadow-xl"
                align="start"
              >
                <div className="p-3">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    locale={ptBR}
                    defaultMonth={draftFrom}
                    selected={{ from: draftFrom, to: draftTo } as any}
                    onSelect={(r: any) => {
                      setDraftFrom(r?.from || r?.to || new Date());
                      setDraftTo(r?.to || r?.from || new Date());
                    }}
                    initialFocus
                    className={cn("pointer-events-auto p-0")}
                    classNames={rangeCalendarClassNames}
                  />
                </div>
                <div className="border-t border-border/70 bg-secondary/35 p-3">
                  <Button size="sm" className="h-9 w-full rounded-lg text-xs" onClick={applyRangeDraft}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="mx-1 h-6 w-px bg-border" />

            {QUICK_PERIODS.map((d) => (
              <Button
                key={d}
                variant={quickDays === d ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 text-xs",
                  quickDays === d && "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={() => applyQuick(d)}
              >
                {d} dias
              </Button>
            ))}
          </div>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards[tab].map((kpi, index) => (
              <Card key={kpi.label} className="min-h-[138px] border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <kpi.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums">{metricValues[kpi.key]}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {index === 0
                    ? `${tab === "forms" ? forms.length : links.length} de ${tab === "forms" ? limits.forms : limits.links} utilizados`
                    : quickDays
                      ? `Últimos ${quickDays} dias`
                      : `${fmtDate(fromDate ? new Date(`${fromDate}T12:00:00`).toISOString() : null)} – ${fmtDate(toDate ? new Date(`${toDate}T12:00:00`).toISOString() : null)}`}
                </div>
              </Card>
            ))}
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
                    <Card key={f.id} className="flex min-h-[330px] flex-col overflow-hidden border-border/60 bg-card shadow-sm">
                      <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold" title={f.name}>{f.name}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={f.title}>{f.title}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={f.status === "active"
                            ? "bg-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground"}
                        >
                          {f.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <div className="mt-5 grid grid-cols-3 divide-x divide-border/70 border-y border-border/60 py-4 text-center">
                        <div><p className="text-lg font-semibold tabular-nums">{s.views}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Visualizações</p></div>
                        <div><p className="text-lg font-semibold tabular-nums">{s.submissions}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Leads</p></div>
                        <div><p className="text-lg font-semibold tabular-nums">{conv}%</p><p className="mt-0.5 text-[11px] text-muted-foreground">Conversão</p></div>
                      </div>

                      <div className="my-5 space-y-3 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5" /><span className="truncate">/form/{f.slug}</span></p>
                        <p className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Último lead {fmtDate(s.lastSubmission)} · criado em {fmtDate(f.created_at)}</span></p>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/forms/${f.id}/editar`)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/forms/${f.id}/analytics`)}>
                          <BarChart3 className="h-3.5 w-3.5" /> Analytics
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/forms/${f.id}/respostas`)}>
                          <FileText className="h-3.5 w-3.5" /> Respostas
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(url)}>
                          <Copy className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEmbedForm({ name: f.name, slug: f.slug })}>
                          <Code2 className="h-3.5 w-3.5" /> Incorporar
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
                          disabled={formsAtLimit || busy === `dup-${f.id}`}
                          title={formsAtLimit ? "Limite de formulários atingido" : "Duplicar formulário"}
                          onClick={() => run(`dup-${f.id}`, () => callAdmin({ action: "duplicate_form", id: f.id }).then(() => { toast.success("Formulário duplicado."); }))}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 text-destructive"
                           onClick={() => { setDeleteConfirmation(""); setConfirm({ kind: "form", id: f.id, name: f.name }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                const url = `${PUBLIC_BASE}/r/${l.slug}`;
                return (
                  <Card key={l.id} className="flex min-h-[330px] flex-col overflow-hidden border-border/60 bg-card shadow-sm">
                    <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Link2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold" title={l.name}>{l.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={`/r/${l.slug}`}>/r/{l.slug}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={l.status === "active"
                          ? "bg-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"}
                      >
                        {l.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                      <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2 break-all" title={l.destination_url}>{l.destination_url}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 divide-x divide-border/70 border-y border-border/60 py-4 text-center">
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{stats.clicks}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Cliques</p>
                      </div>
                      <div title="Pessoas diferentes que abriram o link (sem contar repetições)">
                        <p className="text-lg font-semibold tabular-nums">{stats.unique}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Pessoas únicas</p>
                      </div>
                    </div>

                    {(l.utm_source || l.utm_campaign) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).map((u, index) => (
                          <Badge key={`${index}-${u}`} variant="secondary" className="max-w-full truncate text-[11px]" title={u as string}>{u}</Badge>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" />Último clique: {fmtDate(stats.last)}</p>

                    <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(url)}>
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog({ open: true, link: l })}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => { setDeleteConfirmation(""); setConfirm({ kind: "link", id: l.id, name: l.name }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
      <FormEmbedDialog open={Boolean(embedForm)} onOpenChange={(open) => { if (!open) setEmbedForm(null); }} formName={embedForm?.name || "Formulário"} slug={embedForm?.slug || ""} />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirm?.kind === "form" ? "formulário" : "link"}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirm?.name}” será removido permanentemente, junto com suas estatísticas. Os leads já enviados ao CRM permanecem.
            </AlertDialogDescription>
            <div className="space-y-2 pt-2">
              <label htmlFor="delete-confirmation" className="text-sm font-medium text-foreground">
                Digite <strong>EXCLUIR</strong> para confirmar
              </label>
              <Input
                id="delete-confirmation"
                autoFocus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                className="uppercase"
                autoComplete="off"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmation !== "EXCLUIR"}
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
