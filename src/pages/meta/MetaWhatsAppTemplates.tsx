import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMetaWhatsAppTemplates } from "@/hooks/useMetaWhatsAppTemplates";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { TemplateStatusBadge } from "@/components/meta/templates/TemplateStatusBadge";
import { TemplateBuilderDialog } from "@/components/meta/templates/TemplateBuilderDialog";
import { TemplateDetailsSheet } from "@/components/meta/templates/TemplateDetailsSheet";
import {
  categoryLabel, languageLabel, rowToDraft, TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES,
  type DraftTemplate, type MetaTemplateRow,
} from "@/lib/metaTemplates";

type SortKey = "updated" | "name" | "status";

const SUMMARY = [
  { key: "all", label: "Todos" },
  { key: "APPROVED", label: "Aprovados" },
  { key: "PENDING", label: "Em análise" },
  { key: "REJECTED", label: "Rejeitados" },
  { key: "PAUSED", label: "Pausados / Problemas" },
] as const;

const problemStatuses = ["PAUSED", "DISABLED", "LIMIT_EXCEEDED"];

export default function MetaWhatsAppTemplates() {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const {
    templates, loading, syncing, loadError, connection, sync, create, update, remove, uploadMedia,
  } = useMetaWhatsAppTemplates();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");

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

    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [templates, search, statusFilter, categoryFilter, languageFilter, sortKey]);

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

  const handleSubmit = async (draft: DraftTemplate) =>
    editingRow ? update(editingRow.id, draft) : create(draft);

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
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="p-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" aria-hidden />
          <p className="text-sm text-foreground">{loadError}</p>
        </div>
      );
    }
    if (!templates.length) {
      return (
        <div className="p-12 text-center">
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
        </div>
      );
    }
    if (!filtered.length) {
      return (
        <div className="p-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden />
          <p className="text-sm text-foreground">Nenhum template encontrado com esses filtros.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Categoria</th>
              <th className="px-4 py-2.5 font-medium">Idioma</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Última atualização</th>
              <th className="px-4 py-2.5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => { setSelected(t); setDetailsOpen(true); }}
              >
                <td className="px-4 py-3 font-mono text-[13px] text-foreground max-w-[260px] truncate">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{categoryLabel(t.category)}</td>
                <td className="px-4 py-3 text-muted-foreground">{languageLabel(t.language)}</td>
                <td className="px-4 py-3"><TemplateStatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelected(t); setDetailsOpen(true); }}>
                    Ver detalhes
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              aria-pressed={active}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
                {counts[s.key as keyof typeof counts] ?? 0}
              </p>
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

      <Card className="overflow-hidden">{renderBody()}</Card>

      <TemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialDraft={initialDraft}
        editing={!!editingRow}
        onSubmit={handleSubmit}
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
