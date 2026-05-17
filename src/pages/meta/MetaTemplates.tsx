import { useEffect, useMemo, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FolderPlus, Pencil, Trash2, Tag, Loader2, MessageSquare, Search,
  ExternalLink, Check, ChevronDown, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { HexColorPicker } from "react-colorful";

interface Category { id: string; name: string; color: string; }
interface Template {
  id: string; name: string; body: string; language: string;
  category_id: string | null; archived: boolean; updated_at: string;
}

const COLOR_PALETTE = [
  "#7C3AED", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#6366F1", "#14B8A6", "#64748B",
];

const META_TEMPLATE_MANAGER_URL = "https://business.facebook.com/wa/manage/message-templates/";

function openMetaTemplateManager(wabaId?: string | null) {
  const url = wabaId
    ? `${META_TEMPLATE_MANAGER_URL}?waba_id=${encodeURIComponent(wabaId)}`
    : META_TEMPLATE_MANAGER_URL;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MetaTemplates({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all"); // 'all' | 'uncategorized' | catId
  const [search, setSearch] = useState("");
  const [wabaId, setWabaId] = useState<string | null>(null);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [pendingDeleteTpl, setPendingDeleteTpl] = useState<Template | null>(null);
  const [pendingDeleteCat, setPendingDeleteCat] = useState<Category | null>(null);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState("");

  // Edição rápida de categoria por template
  const [editingTplCat, setEditingTplCat] = useState<Template | null>(null);
  const [tplCatPickerSearch, setTplCatPickerSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: cats }, { data: tpls }, { data: conn }] = await Promise.all([
      supabase.from("wiize_template_categories").select("*").eq("user_id", user.id).order("name"),
      supabase.from("wiize_message_templates").select("*").eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false }),
      supabase.from("user_waba_connections").select("waba_id").eq("user_id", user.id).limit(1).maybeSingle(),
    ]);
    setCategories((cats as Category[]) || []);
    setTemplates((tpls as Template[]) || []);
    setWabaId((conn as any)?.waba_id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filter === "uncategorized") list = list.filter((t) => !t.category_id);
    else if (filter !== "all") list = list.filter((t) => t.category_id === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(s) || t.body.toLowerCase().includes(s));
    }
    return list;
  }, [templates, filter, search]);

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredCatOptions = useMemo(() => {
    const s = categoryFilterSearch.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(s));
  }, [categories, categoryFilterSearch]);

  const activeFilterLabel = useMemo(() => {
    if (filter === "all") return "Todas as categorias";
    if (filter === "uncategorized") return "Sem categoria";
    return catById.get(filter)?.name ?? "Categoria";
  }, [filter, catById]);

  const activeFilterColor = filter !== "all" && filter !== "uncategorized" ? catById.get(filter)?.color : undefined;

  const handleDeleteTemplate = async () => {
    if (!pendingDeleteTpl) return;
    const { error } = await supabase.from("wiize_message_templates").delete().eq("id", pendingDeleteTpl.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Template excluído" });
    setPendingDeleteTpl(null);
    load();
  };

  const handleAssignCategory = async (tpl: Template, categoryId: string | null) => {
    const { error } = await supabase.from("wiize_message_templates")
      .update({ category_id: categoryId, updated_at: new Date().toISOString() })
      .eq("id", tpl.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Categoria atualizada" });
    setEditingTplCat(null);
    setTplCatPickerSearch("");
    load();
  };

  const handleSaveCategory = async (data: { name: string; color: string; }) => {
    if (!user) return;
    const normalizedName = data.name.trim().toLowerCase();
    const duplicate = categories.some(
      (c) => c.name.trim().toLowerCase() === normalizedName && c.id !== editingCat?.id
    );
    if (duplicate) {
      toast({ title: "Categoria duplicada", description: "Já existe uma categoria com esse nome.", variant: "destructive" });
      return;
    }
    if (editingCat) {
      const { error } = await supabase.from("wiize_template_categories").update(data).eq("id", editingCat.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("wiize_template_categories").insert({ ...data, user_id: user.id });
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setCatDialogOpen(false);
    setEditingCat(null);
    load();
  };

  const handleDeleteCategory = async () => {
    if (!pendingDeleteCat) return;
    const { error } = await supabase.from("wiize_template_categories").delete().eq("id", pendingDeleteCat.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Categoria excluída", description: "Os templates foram desvinculados." });
    setPendingDeleteCat(null);
    if (filter === pendingDeleteCat.id) setFilter("all");
    load();
  };

  const headerActions = (
    <Button size="sm" onClick={() => openMetaTemplateManager(wabaId)}>
      <ExternalLink size={14} className="mr-1.5" /> Novo template na Meta
    </Button>
  );

  const body = (
    <>
      {!embedded && (
        <MetaPageHeader
          title="Templates"
          description="Os templates são criados e aprovados diretamente no gerenciador da Meta. Aqui você organiza por categorias internas Wiize."
          actions={headerActions}
        />
      )}

      {/* Filtros: dropdown de categoria + busca */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={categoryFilterOpen} onOpenChange={(o) => { setCategoryFilterOpen(o); if (!o) setCategoryFilterSearch(""); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-2 ${filter !== "all" ? "border-primary/40" : ""}`}
              >
                {activeFilterColor && (
                  <span className="h-2 w-2 rounded-full" style={{ background: activeFilterColor }} />
                )}
                <Tag size={13} className="text-muted-foreground" />
                <span className="text-xs font-medium">{activeFilterLabel}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {filter === "all"
                    ? templates.length
                    : filter === "uncategorized"
                      ? templates.filter((t) => !t.category_id).length
                      : templates.filter((t) => t.category_id === filter).length}
                </Badge>
                <ChevronDown size={13} className="text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="p-2 border-b border-border/60">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={categoryFilterSearch}
                    onChange={(e) => setCategoryFilterSearch(e.target.value)}
                    placeholder="Buscar categoria…"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                <CategoryRow
                  active={filter === "all"}
                  onClick={() => { setFilter("all"); setCategoryFilterOpen(false); }}
                  label="Todas as categorias"
                  count={templates.length}
                />
                <CategoryRow
                  active={filter === "uncategorized"}
                  onClick={() => { setFilter("uncategorized"); setCategoryFilterOpen(false); }}
                  label="Sem categoria"
                  count={templates.filter((t) => !t.category_id).length}
                />
                {filteredCatOptions.length > 0 && <div className="h-px bg-border/60 my-1" />}
                {filteredCatOptions.map((c) => (
                  <CategoryRow
                    key={c.id}
                    active={filter === c.id}
                    onClick={() => { setFilter(c.id); setCategoryFilterOpen(false); }}
                    label={c.name}
                    color={c.color}
                    count={templates.filter((t) => t.category_id === c.id).length}
                    onEdit={() => { setCategoryFilterOpen(false); setEditingCat(c); setCatDialogOpen(true); }}
                    onDelete={() => { setCategoryFilterOpen(false); setPendingDeleteCat(c); }}
                  />
                ))}
                {categories.length > 0 && filteredCatOptions.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Nenhuma categoria encontrada.</p>
                )}
              </div>
              <div className="p-2 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => { setCategoryFilterOpen(false); setEditingCat(null); setCatDialogOpen(true); }}
                >
                  <FolderPlus size={13} className="mr-2" /> Nova categoria
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {filter !== "all" && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground" onClick={() => setFilter("all")}>
              <X size={12} className="mr-1" /> Limpar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar templates…" className="pl-8 h-9"
            />
          </div>
          {embedded && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 border-dashed text-center">
          <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={28} />
          <p className="font-medium">Nenhum template encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {templates.length === 0
              ? "Os templates aprovados na Meta aparecerão aqui automaticamente."
              : "Ajuste o filtro ou a busca."}
          </p>
          {templates.length === 0 && (
            <Button className="mt-4" size="sm" onClick={() => openMetaTemplateManager(wabaId)}>
              <ExternalLink size={14} className="mr-1.5" /> Criar template na Meta
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const cat = t.category_id ? catById.get(t.category_id) : null;
            return (
              <Card key={t.id} className="p-5 border-border/60 hover:border-border transition-colors">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Atualizado {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditingTplCat(t); setTplCatPickerSearch(""); }}
                    title="Alterar categoria"
                    className="shrink-0"
                  >
                    {cat ? (
                      <Badge
                        className="border-0 hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: `${cat.color}22`, color: cat.color }}
                      >
                        <Tag size={10} className="mr-1" /> {cat.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] hover:border-primary/40 cursor-pointer">
                        <Plus size={10} className="mr-1" /> Categoria
                      </Badge>
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 mb-3 border border-border/40">
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {t.body}
                  </p>
                </div>

                <div className="flex items-center gap-1 border-t border-border/60 pt-3">
                  <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-auto"
                    onClick={() => { setEditingTplCat(t); setTplCatPickerSearch(""); }}>
                    <Tag size={12} className="mr-1" /> Categoria
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => openMetaTemplateManager(wabaId)}>
                    <ExternalLink size={12} className="mr-1" /> Editar na Meta
                  </Button>
                  <Button variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                    onClick={() => setPendingDeleteTpl(t)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog atribuir/alterar categoria de template */}
      <Dialog open={!!editingTplCat} onOpenChange={(o) => { if (!o) { setEditingTplCat(null); setTplCatPickerSearch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categoria do template</DialogTitle>
          </DialogHeader>
          {editingTplCat && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Organize <span className="font-medium text-foreground">{editingTplCat.name}</span> com uma categoria interna Wiize.
              </p>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tplCatPickerSearch}
                  onChange={(e) => setTplCatPickerSearch(e.target.value)}
                  placeholder="Buscar categoria…"
                  className="h-9 pl-7 text-xs"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
                <CategoryRow
                  active={!editingTplCat.category_id}
                  onClick={() => handleAssignCategory(editingTplCat, null)}
                  label="Sem categoria"
                />
                {categories
                  .filter((c) => !tplCatPickerSearch.trim() || c.name.toLowerCase().includes(tplCatPickerSearch.trim().toLowerCase()))
                  .map((c) => (
                    <CategoryRow
                      key={c.id}
                      active={editingTplCat.category_id === c.id}
                      onClick={() => handleAssignCategory(editingTplCat, c.id)}
                      label={c.name}
                      color={c.color}
                    />
                  ))}
                {categories.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Você ainda não tem categorias.</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setEditingTplCat(null); setEditingCat(null); setCatDialogOpen(true); }}
              >
                <FolderPlus size={13} className="mr-1.5" /> Criar nova categoria
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog categoria */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => { setCatDialogOpen(o); if (!o) setEditingCat(null); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCat ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          <CategoryForm
            initial={editingCat}
            onCancel={() => { setCatDialogOpen(false); setEditingCat(null); }}
            onSave={handleSaveCategory}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão template */}
      <AlertDialog open={!!pendingDeleteTpl} onOpenChange={(o) => !o && setPendingDeleteTpl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template do Wiize?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDeleteTpl?.name}" será removido apenas do Wiize. O template aprovado na Meta não será afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-rose-600 hover:bg-rose-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão categoria */}
      <AlertDialog open={!!pendingDeleteCat} onOpenChange={(o) => !o && setPendingDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os templates dessa categoria não serão excluídos, apenas ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-rose-600 hover:bg-rose-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) return body;
  return (
    <MetaLayout title="Templates" description="Biblioteca de templates aprovados na Meta, organizados por categorias internas Wiize.">
      {body}
    </MetaLayout>
  );
}

function CategoryRow({
  active, onClick, label, color, count, onEdit, onDelete,
}: {
  active: boolean; onClick: () => void; label: string;
  color?: string; count?: number; onEdit?: () => void; onDelete?: () => void;
}) {
  return (
    <div className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${active ? "bg-primary/10" : "hover:bg-muted/60"}`}>
      <button onClick={onClick} className="flex-1 flex items-center gap-2 min-w-0 text-left">
        {color ? (
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-border" />
        )}
        <span className={`text-xs truncate flex-1 ${active ? "font-semibold text-primary" : "text-foreground"}`}>{label}</span>
        {typeof count === "number" && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
        )}
        {active && <Check size={12} className="text-primary shrink-0" />}
      </button>
      {onEdit && onDelete && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="h-6 w-6 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} className="h-6 w-6 rounded-md hover:bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryForm({
  initial, onSave, onCancel,
}: {
  initial: Category | null;
  onSave: (d: { name: string; color: string; }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_PALETTE[0]);
  const [customOpen, setCustomOpen] = useState(false);
  const isPaletteColor = COLOR_PALETTE.some((c) => c.toLowerCase() === color.toLowerCase());
  const canSave = name.trim().length > 1 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Abertura fria" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Cor</Label>
        <div className="flex flex-wrap gap-2 items-center">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setCustomOpen(false); }}
              className={`h-8 w-8 rounded-full border-2 transition-all ${color.toLowerCase() === c.toLowerCase() ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
              style={{ background: c }}
            />
          ))}

          {/* Botão de cor personalizada (alterna painel inline) */}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            title="Cor personalizada"
            aria-label="Cor personalizada"
            className={`h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${!isPaletteColor ? "border-primary text-primary scale-110" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            style={!isPaletteColor ? { background: `${color}22` } : undefined}
          >
            {!isPaletteColor ? (
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
            ) : (
              <Plus size={14} />
            )}
          </button>
        </div>

        {(customOpen || !isPaletteColor) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-primary">Cor personalizada</p>
              <span
                className="h-5 w-5 rounded-full border border-border shadow-sm"
                style={{ background: color }}
              />
            </div>
            <div className="flex justify-center rounded-lg bg-background p-3 border border-border/60">
              <HexColorPicker
                color={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
                onChange={setColor}
                style={{ width: "100%", maxWidth: 220, height: 150 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-md border border-border shadow-inner"
                style={{ background: color }}
              />
              <Input
                value={color}
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (v && !v.startsWith("#")) v = "#" + v;
                  setColor(v);
                }}
                placeholder="#7C3AED"
                className="h-9 font-mono text-xs uppercase bg-background"
                maxLength={7}
              />
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" disabled={!canSave} onClick={() => onSave({ name: name.trim(), color })}>
          {initial ? "Salvar" : "Criar categoria"}
        </Button>
      </DialogFooter>
    </div>
  );
}
