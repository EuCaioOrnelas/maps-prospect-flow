import { useEffect, useMemo, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, RefreshCw, Search, MessageSquare, AlertCircle, ArrowUpDown, Link2, Loader2,
  LayoutGrid, CheckCircle2, Clock, XCircle, PauseCircle, Smartphone, Languages,
  ChevronLeft, ChevronRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useMetaWhatsAppTemplates } from "@/hooks/useMetaWhatsAppTemplates";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { TemplateStatusBadge } from "@/components/meta/templates/TemplateStatusBadge";
import { TemplateBuilderDialog } from "@/components/meta/templates/TemplateBuilderDialog";
import { TemplateDetailsSheet } from "@/components/meta/templates/TemplateDetailsSheet";
import {
  categoryLabel, languageLabel, languageShortLabel, rowToDraft, TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES,
  type DraftTemplate, type MetaTemplateRow,
} from "@/lib/metaTemplates";

type SortKey = "updated" | "name" | "status";
const PAGE_SIZE = 6;

const SUMMARY = [
  {
    key: "all", label: "Todos", hint: "Modelos da sua conta",
    icon: LayoutGrid, tint: "bg-primary/10 text-primary", bar: "bg-primary",
  },
  {
    key: "APPROVED", label: "Aprovados", hint: "Prontos para envio",
    icon: CheckCircle2, tint: "bg-emerald-500/10 text-emerald-600", bar: "bg-emerald-500",
  },
  {
    key: "PENDING", label: "Em análise", hint: "Aguardando a Meta",
    icon: Clock, tint: "bg-amber-500/10 text-amber-600", bar: "bg-amber-500",
  },
  {
    key: "REJECTED", label: "Rejeitados", hint: "Precisam de ajuste",
    icon: XCircle, tint: "bg-destructive/10 text-destructive", bar: "bg-destructive",
  },
  {
    key: "PAUSED", label: "Pausados", hint: "Com restrição de uso",
    icon: PauseCircle, tint: "bg-orange-500/10 text-orange-600", bar: "bg-orange-500",
  },
] as const;

const problemStatuses = ["PAUSED", "DISABLED", "LIMIT_EXCEEDED"];

/** Short preview of the message body, as it will reach the contact. */
function bodyPreview(t: MetaTemplateRow): string {
  const body = (t.components || []).find((c: any) => c?.type === "BODY");
  return String((body as any)?.text || "").replace(/\s+/g, " ").trim();
}

/** Turns the technical template name into a readable title. */
function prettyName(name: string): string {
  const clean = name.replace(/[_-]+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : name;
}


export default function MetaWhatsAppTemplates() {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const {
    templates, loading, syncing, loadError, connection, connections,
    selectedConnectionId, setSelectedConnectionId,
    sync, create, update, remove, uploadMedia, saveDraft,
  } = useMetaWhatsAppTemplates();

  const numberLabel = useMemo(() => {
    const map = new Map<string, string>();
    connections.forEach((c) => map.set(c.waba_id, c.label));
    return (wabaId: string) => map.get(wabaId) ?? "Número não vinculado";
  }, [connections]);

  const [search, setSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [currentPage, setCurrentPage] = useState(1);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MetaTemplateRow | null>(null);
  const [initialDraft, setInitialDraft] = useState<DraftTemplate | null>(null);
  const [selected, setSelected] = useState<MetaTemplateRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MetaTemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(() => ({
    all: templates.length,
    APPROVED: templates.filter((t) => t.status === "APPROVED").length,
    PENDING: templates.filter((t) => t.status === "PENDING" || t.status === "IN_APPEAL").length,
    REJECTED: templates.filter((t) => t.status === "REJECTED").length,
    PAUSED: templates.filter((t) => problemStatuses.includes(t.status)).length,
  }), [templates]);

  const filtered = useMemo(() => {
    let list = [...templates];
    const s = search.trim().toLowerCase();
    if (s) list = list.filter((t) => t.name.toLowerCase().includes(s));
    if (statusFilter !== "all") {
      list = statusFilter === "PAUSED"
        ? list.filter((t) => problemStatuses.includes(t.status))
        : statusFilter === "PENDING"
          ? list.filter((t) => t.status === "PENDING" || t.status === "IN_APPEAL")
          : list.filter((t) => t.status === statusFilter);
    }
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (languageFilter !== "all") list = list.filter((t) => t.language === languageFilter);
    if (numberFilter !== "all") list = list.filter((t) => t.waba_id === numberFilter);

    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [templates, search, statusFilter, categoryFilter, languageFilter, numberFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter, languageFilter, numberFilter, sortKey]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const openCreate = () => {
    setEditingRow(null);
    setInitialDraft(null);
    setBuilderOpen(true);
  };

  const openEdit = (row: MetaTemplateRow) => {
    setEditingRow(row);
    setInitialDraft(rowToDraft(row));
    setDetailsOpen(false);
    setBuilderOpen(true);
  };

  const isDraftRow = editingRow?.status === "DRAFT";

  const handleSubmit = async (draft: DraftTemplate) =>
    editingRow && !isDraftRow ? update(editingRow.id, draft) : create(draft, isDraftRow ? editingRow?.id : undefined);

  const handleSaveDraft = async (draft: DraftTemplate) =>
    saveDraft(draft, isDraftRow ? editingRow?.id : undefined);


  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await remove(pendingDelete.id);
    setDeleting(false);
    if (ok) { setPendingDelete(null); setDetailsOpen(false); }
  };

  /* ------------------------------------------------------------------ states */
  const renderBody = () => {
    if (loading) {
      return (
        <Card className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </Card>
      );
    }
    if (loadError) {
      return (
        <Card className="p-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" aria-hidden />
          <p className="text-sm text-foreground">{loadError}</p>
        </Card>
      );
    }
    if (!templates.length) {
      return (
        <Card className="p-12 text-center">
          <MessageSquare className="h-9 w-9 text-muted-foreground mx-auto mb-3" aria-hidden />
          <p className="text-base font-medium text-foreground">Você ainda não possui templates</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Crie seu primeiro modelo de mensagem para começar a utilizar mensagens aprovadas pelo WhatsApp.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Criar primeiro template</Button>
            <Button variant="outline" onClick={() => sync()} disabled={syncing} className="gap-1.5">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar
            </Button>
          </div>
        </Card>
      );
    }
    if (!filtered.length) {
      return (
        <Card className="p-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden />
          <p className="text-sm text-foreground">Nenhum template encontrado com esses filtros.</p>
        </Card>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginated.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate leading-tight">
                  {prettyName(t.name)}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground truncate mt-1">{t.name}</p>
              </div>
              <TemplateStatusBadge status={t.status} />
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mensagem
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 min-h-[3.75rem] mt-1.5">
                {bodyPreview(t) || "Sem corpo de mensagem"}
              </p>
            </div>

            <div className="flex flex-wrap items-center text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 pr-3">
                <Smartphone className="h-3.5 w-3.5" aria-hidden />
                {numberLabel(t.waba_id)}
              </span>
              <span className="inline-flex items-center gap-1.5 border-l border-border px-3">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                {categoryLabel(t.category)}
              </span>
              <span
                className="inline-flex items-center gap-1.5 whitespace-nowrap border-l border-border pl-3"
                title={languageLabel(t.language)}
              >
                <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {languageShortLabel(t.language)}
              </span>
            </div>

            <div className="mt-auto pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setSelected(t); setDetailsOpen(true); }}
              >
                Ver detalhes
              </Button>
              <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
                Atualizado em {new Date(t.updated_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            {filtered.length.toLocaleString("pt-BR")} template(s) — Página {currentPage.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="h-8 px-2" aria-label="Primeira página">
              <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
            </Button>
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="h-8 px-2" aria-label="Página anterior">
              <ChevronLeft size={16} />
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Button key={page} size="sm" variant={page === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(page)} className="h-8 min-w-8 px-2 text-xs">
                {page.toLocaleString("pt-BR")}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} className="h-8 px-2" aria-label="Próxima página">
              <ChevronRight size={16} />
            </Button>
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 px-2" aria-label="Última página">
              <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );

  };

  return (
    <MetaLayout
      title="Templates do WhatsApp"
      description="Crie e gerencie modelos de mensagens aprovados pela Meta."
    >
      <MetaPageHeader
        title="Templates do WhatsApp"
        description="Crie e gerencie modelos de mensagens aprovados pela Meta para suas conversas comerciais."
        actions={
          <>
            {connections.length > 1 && (
              <Select
                value={selectedConnectionId ?? undefined}
                onValueChange={(v) => setSelectedConnectionId(v)}
              >
                <SelectTrigger className="w-[220px]" aria-label="Número usado nas ações">
                  <Smartphone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder="Número" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => sync()} disabled={syncing || !connection} className="gap-1.5">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </Button>
            <Button onClick={openCreate} disabled={!connection} className="gap-1.5">
              <Plus className="h-4 w-4" /> Criar template
            </Button>
          </>
        }
      />

      {!connection && !loading && (
        <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              Nenhum número do WhatsApp conectado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte um número oficial da Meta para criar e sincronizar templates desta conta.
            </p>
          </div>
          <Button onClick={() => navigate("/meta/numeros")}>Conectar número</Button>
        </Card>
      )}

      {/* resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {SUMMARY.map((s) => {
          const active = statusFilter === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              aria-pressed={active}
              className="rounded-2xl border border-border bg-card p-4 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums mt-3">
                {counts[s.key as keyof typeof counts] ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.hint}</p>
            </button>
          );
        })}
      </div>

      {/* filtros */}
      <Card className="p-3 flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do template"
            className="pl-9"
            aria-label="Buscar template"
          />
        </div>
        {connections.length > 1 && (
          <Select value={numberFilter} onValueChange={setNumberFilter}>
            <SelectTrigger className="lg:w-52"><SelectValue placeholder="Número" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os números</SelectItem>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.waba_id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="lg:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="lg:w-48"><SelectValue placeholder="Idioma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os idiomas</SelectItem>
            {TEMPLATE_LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="lg:w-52">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Última atualização</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {renderBody()}

      <TemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialDraft={initialDraft}
        editing={!!editingRow && !isDraftRow}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onUploadMedia={uploadMedia}
      />




      <TemplateDetailsSheet
        template={selected}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onDelete={(t) => setPendingDelete(t)}
        onSync={() => sync()}
        numberLabel={numberLabel}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá o template da sua conta do WhatsApp Business quando permitida pela Meta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MetaLayout>
  );
}
