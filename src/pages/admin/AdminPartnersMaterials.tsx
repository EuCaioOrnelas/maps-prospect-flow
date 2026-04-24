import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, MessageSquare, Share2, Mail, FileImage, Video, FileText,
  Lightbulb, Search, ExternalLink, GripVertical, Eye, EyeOff
} from "lucide-react";

interface Material {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  content_text: string | null;
  asset_url: string | null;
  preview_url: string | null;
  format: string | null;
  dimensions: string | null;
  is_active: boolean;
  display_order: number;
  tags: string[] | null;
  meta: any;
}

const CATEGORIES: Record<string, { label: string; icon: any; description: string; suggestedSubs: string[] }> = {
  copy: {
    label: "Mensagens / Copy",
    icon: MessageSquare,
    description: "Textos prontos para WhatsApp, DM e mensagens diretas",
    suggestedSubs: ["WhatsApp", "Direct Message", "Cold Outreach", "Follow-up"],
  },
  social: {
    label: "Redes sociais",
    icon: Share2,
    description: "Posts, stories, reels e legendas para Instagram, LinkedIn, TikTok",
    suggestedSubs: ["Instagram Post", "Instagram Story", "Reels", "LinkedIn", "TikTok", "X/Twitter"],
  },
  email: {
    label: "E-mails",
    icon: Mail,
    description: "Templates de e-mail para prospecção e nutrição",
    suggestedSubs: ["Cold Email", "Follow-up", "Newsletter", "Convite"],
  },
  banner: {
    label: "Banners e imagens",
    icon: FileImage,
    description: "Criativos visuais para anúncios e divulgação",
    suggestedSubs: ["Feed", "Story", "Anúncio Meta Ads", "Anúncio Google Ads", "Print Vendas"],
  },
  video: {
    label: "Vídeos",
    icon: Video,
    description: "Vídeos do Drive, demonstrações e cases (link público do Drive)",
    suggestedSubs: ["Demonstração", "Case de cliente", "Tutorial", "Pitch curto", "Reels prontos"],
  },
  document: {
    label: "Documentos completos",
    icon: FileText,
    description: "PDFs, scripts, apresentações e material de venda",
    suggestedSubs: ["Apresentação comercial", "Script de venda", "Roteiro de ligação", "Estudo de caso", "FAQ"],
  },
  ideas: {
    label: "Ideias de temas que vendem",
    icon: Lightbulb,
    description: "Sugestões de pautas, ângulos e abordagens validadas",
    suggestedSubs: ["Dor do mercado", "Tendência", "Antes/Depois", "Prova social", "Bastidores"],
  },
};

const emptyForm = {
  category: "copy",
  subcategory: "",
  title: "",
  description: "",
  content_text: "",
  asset_url: "",
  preview_url: "",
  format: "text",
  dimensions: "",
  is_active: true,
  display_order: 0,
  tags: "",
  meta_drive_id: "",
};

export default function AdminPartnersMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_materials")
      .select("*")
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });
    setMaterials((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = (preCategory?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, category: preCategory || "copy" });
    setOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      category: m.category,
      subcategory: m.subcategory || "",
      title: m.title,
      description: m.description || "",
      content_text: m.content_text || "",
      asset_url: m.asset_url || "",
      preview_url: m.preview_url || "",
      format: m.format || "text",
      dimensions: m.dimensions || "",
      is_active: m.is_active,
      display_order: m.display_order,
      tags: (m.tags || []).join(", "),
      meta_drive_id: m.meta?.drive_id || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title) { toast({ title: "Título é obrigatório", variant: "destructive" }); return; }

    const tagsArr = form.tags
      ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const meta: any = {};
    if (form.category === "video" && form.meta_drive_id) meta.drive_id = form.meta_drive_id.trim();

    const payload = {
      category: form.category,
      subcategory: form.subcategory?.trim() || null,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      content_text: form.content_text?.trim() || null,
      asset_url: form.asset_url?.trim() || null,
      preview_url: form.preview_url?.trim() || null,
      format: form.format?.trim() || null,
      dimensions: form.dimensions?.trim() || null,
      is_active: form.is_active,
      display_order: Number(form.display_order) || 0,
      tags: tagsArr.length ? tagsArr : null,
      meta: Object.keys(meta).length ? meta : null,
    };

    const { error } = editing
      ? await supabase.from("partner_materials").update(payload).eq("id", editing.id)
      : await supabase.from("partner_materials").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Material atualizado" : "Material criado" });
    setOpen(false); load();
  };

  const remove = async (m: Material) => {
    if (!confirm(`Excluir "${m.title}"?`)) return;
    const { error } = await supabase.from("partner_materials").delete().eq("id", m.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Material excluído" });
    load();
  };

  const toggleActive = async (m: Material) => {
    const { error } = await supabase
      .from("partner_materials")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  // Filtros + busca
  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (tab !== "all" && m.category !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          m.title, m.description, m.subcategory,
          ...(m.tags || []),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [materials, tab, search]);

  // Métricas
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: materials.length };
    Object.keys(CATEGORIES).forEach((k) => { c[k] = 0; });
    materials.forEach((m) => { c[m.category] = (c[m.category] || 0) + 1; });
    return c;
  }, [materials]);

  const activeCount = materials.filter((m) => m.is_active).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Materiais de divulgação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banners, copies, vídeos do Drive, documentos e ideias — visíveis para parceiros ativos.
          </p>
        </div>
        <Button onClick={() => openNew()} className="gap-2">
          <Plus size={16} /> Novo material
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={materials.length} />
        <KpiCard label="Ativos (visíveis)" value={activeCount} accent />
        <KpiCard label="Categorias usadas" value={Object.keys(CATEGORIES).filter((k) => (counts[k] || 0) > 0).length} />
        <KpiCard label="Vídeos disponíveis" value={counts.video || 0} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, descrição ou tags..."
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Limpar</Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-1.5">
            Todos <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts.all || 0}</Badge>
          </TabsTrigger>
          {Object.entries(CATEGORIES).map(([k, meta]) => (
            <TabsTrigger key={k} value={k} className="gap-1.5">
              <meta.icon size={13} />
              {meta.label}
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts[k] || 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-5">
          {/* Category description */}
          {tab !== "all" && CATEGORIES[tab] && (
            <Card className="mb-4 bg-muted/30 border-dashed">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {(() => { const Icon = CATEGORIES[tab].icon; return <Icon size={14} className="text-primary" />; })()}
                  <span className="text-muted-foreground">{CATEGORIES[tab].description}</span>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openNew(tab)}>
                  <Plus size={13} /> Adicionar em {CATEGORIES[tab].label.toLowerCase()}
                </Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                {search ? "Nenhum material encontrado para sua busca." : "Nenhum material cadastrado nesta categoria."}
              </CardContent>
            </Card>
          ) : (
            <MaterialList
              materials={filtered}
              onEdit={openEdit}
              onRemove={remove}
              onToggleActive={toggleActive}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, meta]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <meta.icon size={13} /> {meta.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Input
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  list="subcategory-suggestions"
                  placeholder="Ex: Instagram Story"
                  className="mt-1.5"
                />
                <datalist id="subcategory-suggestions">
                  {(CATEGORIES[form.category]?.suggestedSubs || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
            </div>

            <div>
              <Label>Descrição curta</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Quando e como usar este material"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="ex: vendas, ia, follow-up"
                className="mt-1.5"
              />
            </div>

            {/* Conteúdo de texto - mostrar para copy, social, email, ideas */}
            {["copy", "social", "email", "ideas"].includes(form.category) && (
              <div>
                <Label>
                  Conteúdo de texto {form.category === "ideas" ? "(roteiro/ideia completa)" : ""}
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    Use {"{{LINK}}"}, {"{{NOME}}"}, {"{{SEU_NOME}}"}
                  </span>
                </Label>
                <Textarea
                  rows={6}
                  value={form.content_text}
                  onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
            )}

            {/* Vídeos do Drive */}
            {form.category === "video" && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 space-y-3">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <Video size={13} className="text-primary" /> Vídeo do Google Drive
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Cole o link de compartilhamento do Drive (deve estar como "qualquer pessoa com link pode ver"). Extraímos o ID automaticamente.
                  </p>
                  <div>
                    <Label className="text-xs">Link do Drive ou ID do arquivo</Label>
                    <Input
                      value={form.meta_drive_id}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Extrai ID se for URL completa
                        const m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                        const id = m ? m[1] : raw;
                        setForm({ ...form, meta_drive_id: id });
                      }}
                      placeholder="https://drive.google.com/file/d/ABC123.../view"
                      className="mt-1.5 font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Banner / preview / asset */}
            {["banner", "video", "document", "social"].includes(form.category) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>URL do arquivo (download)</Label>
                  <Input
                    value={form.asset_url}
                    onChange={(e) => setForm({ ...form, asset_url: e.target.value })}
                    className="mt-1.5"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>URL da prévia (imagem)</Label>
                  <Input
                    value={form.preview_url}
                    onChange={(e) => setForm({ ...form, preview_url: e.target.value })}
                    className="mt-1.5"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* Formato e dimensões */}
            {["banner", "video", "social"].includes(form.category) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Formato</Label>
                  <Input
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    placeholder="ex: PNG, MP4, PDF"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Dimensões</Label>
                  <Input
                    value={form.dimensions}
                    onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                    placeholder="ex: 1080x1920"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="cursor-pointer">Ativo (visível aos parceiros)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function MaterialList({
  materials, onEdit, onRemove, onToggleActive,
}: {
  materials: Material[];
  onEdit: (m: Material) => void;
  onRemove: (m: Material) => void;
  onToggleActive: (m: Material) => void;
}) {
  // Agrupa por subcategoria dentro do filtro atual
  const groups = useMemo(() => {
    const g: Record<string, Material[]> = {};
    materials.forEach((m) => {
      const key = m.subcategory || "Sem subcategoria";
      (g[key] = g[key] || []).push(m);
    });
    return g;
  }, [materials]);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([subcat, items]) => (
        <div key={subcat}>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {subcat} <span className="text-muted-foreground/60">· {items.length}</span>
          </div>
          <div className="grid gap-2">
            {items.map((m) => (
              <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
                <CardContent className="p-3 flex items-center gap-3">
                  <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                  {m.preview_url ? (
                    <img src={m.preview_url} alt="" className="h-12 w-12 rounded object-cover border border-border/40 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      {(() => { const Icon = CATEGORIES[m.category]?.icon || FileText; return <Icon size={16} />; })()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.title}</div>
                    {m.description && (
                      <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {m.tags?.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] h-4 px-1.5">{t}</Badge>
                      ))}
                      {m.format && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{m.format}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">#{m.display_order}</div>
                  <Button size="sm" variant="ghost" onClick={() => onToggleActive(m)} title={m.is_active ? "Desativar" : "Ativar"}>
                    {m.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </Button>
                  {m.asset_url && (
                    <a href={m.asset_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" title="Abrir asset"><ExternalLink size={14} /></Button>
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onEdit(m)}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onRemove(m)}>
                    <Trash2 size={14} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
