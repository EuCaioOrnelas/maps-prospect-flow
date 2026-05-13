import { useEffect, useMemo, useState } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FolderPlus, Pencil, Trash2, Tag, Loader2, MessageSquare, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Category { id: string; name: string; color: string; }
interface Template {
  id: string; name: string; body: string; language: string;
  category_id: string | null; archived: boolean; updated_at: string;
}

const COLOR_PALETTE = [
  "#7C3AED", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#6366F1", "#14B8A6", "#64748B",
];

export default function MetaTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all"); // 'all' | 'uncategorized' | catId
  const [search, setSearch] = useState("");

  // Dialog states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [pendingDeleteTpl, setPendingDeleteTpl] = useState<Template | null>(null);
  const [pendingDeleteCat, setPendingDeleteCat] = useState<Category | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: cats }, { data: tpls }] = await Promise.all([
      supabase.from("wiize_template_categories").select("*").eq("user_id", user.id).order("name"),
      supabase.from("wiize_message_templates").select("*").eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false }),
    ]);
    setCategories((cats as Category[]) || []);
    setTemplates((tpls as Template[]) || []);
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

  const handleSaveTemplate = async (data: { name: string; body: string; language: string; category_id: string | null; }) => {
    if (!user) return;
    if (editing) {
      const { error } = await supabase.from("wiize_message_templates")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) return toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      toast({ title: "Template atualizado" });
    } else {
      const { error } = await supabase.from("wiize_message_templates")
        .insert({ ...data, user_id: user.id });
      if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      toast({ title: "Template criado" });
    }
    setEditorOpen(false);
    setEditing(null);
    load();
  };

  const handleDeleteTemplate = async () => {
    if (!pendingDeleteTpl) return;
    const { error } = await supabase.from("wiize_message_templates").delete().eq("id", pendingDeleteTpl.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Template excluído" });
    setPendingDeleteTpl(null);
    load();
  };

  const handleSaveCategory = async (data: { name: string; color: string; }) => {
    if (!user) return;
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

  return (
    <MetaLayout title="Templates" description="Biblioteca de mensagens reutilizáveis com categorias internas Wiize.">
      <MetaPageHeader
        title="Templates"
        description="Crie, organize e reutilize mensagens em suas campanhas Meta. Use categorias internas para manter tudo organizado."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setEditingCat(null); setCatDialogOpen(true); }}>
              <FolderPlus size={14} className="mr-1.5" /> Nova categoria
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>
              <Plus size={14} className="mr-1.5" /> Novo template
            </Button>
          </>
        }
      />

      {/* Filtros: chips de categoria + busca */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip active={filter === "all"} onClick={() => setFilter("all")}>
            Todos <span className="ml-1.5 text-[10px] opacity-60">{templates.length}</span>
          </CategoryChip>
          <CategoryChip active={filter === "uncategorized"} onClick={() => setFilter("uncategorized")}>
            Sem categoria
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              active={filter === c.id}
              color={c.color}
              onClick={() => setFilter(c.id)}
              onEdit={() => { setEditingCat(c); setCatDialogOpen(true); }}
              onDelete={() => setPendingDeleteCat(c)}
            >
              {c.name}
            </CategoryChip>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates…" className="pl-8 h-9"
          />
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
            {templates.length === 0 ? "Crie seu primeiro template para começar." : "Ajuste o filtro ou a busca."}
          </p>
          {templates.length === 0 && (
            <Button className="mt-4" size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>
              <Plus size={14} className="mr-1.5" /> Novo template
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
                  {cat ? (
                    <Badge
                      className="border-0 shrink-0"
                      style={{ background: `${cat.color}22`, color: cat.color }}
                    >
                      <Tag size={10} className="mr-1" /> {cat.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-[10px]">Sem categoria</Badge>
                  )}
                </div>

                <div className="rounded-lg bg-muted/40 p-3 mb-3 border border-border/40">
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {t.body}
                  </p>
                </div>

                <div className="flex items-center gap-1 border-t border-border/60 pt-3">
                  <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-auto"
                    onClick={() => { setEditing(t); setEditorOpen(true); }}>
                    <Pencil size={12} className="mr-1" /> Editar
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

      {/* Editor de template */}
      <Sheet open={editorOpen} onOpenChange={(o) => { setEditorOpen(o); if (!o) setEditing(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar template" : "Novo template"}</SheetTitle></SheetHeader>
          <TemplateEditor
            initial={editing}
            categories={categories}
            onCancel={() => { setEditorOpen(false); setEditing(null); }}
            onSave={handleSaveTemplate}
          />
        </SheetContent>
      </Sheet>

      {/* Dialog categoria */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => { setCatDialogOpen(o); if (!o) setEditingCat(null); }}>
        <DialogContent>
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
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDeleteTpl?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-rose-600 hover:bg-rose-700">
              Excluir
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
    </MetaLayout>
  );
}

function CategoryChip({
  active, children, onClick, color, onEdit, onDelete,
}: {
  active: boolean; children: React.ReactNode; onClick: () => void;
  color?: string; onEdit?: () => void; onDelete?: () => void;
}) {
  return (
    <div className="group relative inline-flex">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-all ${
          active
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-border hover:border-foreground/40"
        }`}
      >
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {children}
      </button>
      {onEdit && onDelete && (
        <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
          <button onClick={onEdit} className="h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent">
            <Pencil size={8} />
          </button>
          <button onClick={onDelete} className="h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center hover:bg-rose-500/20 text-rose-500">
            <Trash2 size={8} />
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  initial, categories, onSave, onCancel,
}: {
  initial: Template | null;
  categories: Category[];
  onSave: (d: { name: string; body: string; language: string; category_id: string | null; }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "pt_BR");
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? "__none__");

  const canSave = name.trim().length > 1 && body.trim().length > 5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome interno</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: abertura_frio_v3" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Categoria Wiize</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt_BR">Português (BR)</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Corpo da mensagem</Label>
          <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Olá {nome}, identifiquei oportunidades..." />
          <p className="text-[10px] text-muted-foreground">
            Use <code className="px-1 rounded bg-muted">{"{nome}"}</code> ou{" "}
            <code className="px-1 rounded bg-muted">{"{{1}}"}</code> para variáveis.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" disabled={!canSave}
            onClick={() => onSave({ name: name.trim(), body: body.trim(), language, category_id: categoryId === "__none__" ? null : categoryId })}>
            {initial ? "Salvar alterações" : "Criar template"}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="mt-2 rounded-2xl border border-border/60 bg-[hsl(150_20%_96%)] dark:bg-zinc-900 p-4 min-h-[400px]">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[hsl(120_60%_72%)] dark:bg-emerald-700 px-3 py-2 shadow-sm">
              <p className="text-[13px] text-foreground/90 dark:text-white leading-relaxed whitespace-pre-wrap">
                {body || "Comece a escrever para ver o preview…"}
              </p>
              <p className="text-[10px] text-foreground/50 dark:text-white/70 text-right mt-1">10:24 ✓✓</p>
            </div>
          </div>
        </div>
      </div>
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
  const canSave = name.trim().length > 1;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Abertura fria" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
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
