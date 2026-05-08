import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Edit, Trash2, Brain, Sparkles, RefreshCw } from "lucide-react";

type KB = {
  id: string;
  title: string;
  category: string | null;
  subtopic: string | null;
  tags: string[] | null;
  priority: string | null;
  pains: string | null;
  solution: string | null;
  guided_flow: any;
  severity: string | null;
  auto_escalate: boolean | null;
  min_confidence: number | null;
  active: boolean | null;
  embedding: any;
  video_url: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY: Partial<KB> = {
  title: "",
  category: "",
  subtopic: "",
  tags: [],
  priority: "medium",
  pains: "",
  solution: "",
  severity: "media",
  auto_escalate: false,
  min_confidence: 0.7,
  active: true,
};

export default function AdminSupportMindIA() {
  const { toast } = useToast();
  const [items, setItems] = useState<KB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<KB> | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      let q = supabase.from("knowledge_base").select("*").order("updated_at", { ascending: false });
      if (filterActive === "active") q = q.eq("active", true);
      if (filterActive === "inactive") q = q.eq("active", false);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`title.ilike.${s},category.ilike.${s},subtopic.ilike.${s},pains.ilike.${s}`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      setItems((data as KB[]) || []);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive]);

  const openNew = () => {
    setEditing({ ...EMPTY });
    setTagsInput("");
  };

  const openEdit = (item: KB) => {
    setEditing({ ...item });
    setTagsInput((item.tags || []).join(", "));
  };

  const generateEmbedding = async (id: string, text: string) => {
    try {
      const { error } = await supabase.functions.invoke("support-embed", {
        body: { table: "knowledge_base", id, text },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: "Embedding falhou",
        description: e.message + " — registro salvo, mas IA não consegue achar via busca semântica até reprocessar.",
        variant: "destructive",
      });
    }
  };

  const reembedAll = async () => {
    toast({ title: "Reprocessando embeddings...", description: "Pode levar alguns segundos" });
    let ok = 0, fail = 0;
    for (const item of items) {
      const text = `${item.title}\n${item.category || ""} > ${item.subtopic || ""}\n${item.pains || ""}\n${item.solution || ""}`;
      try {
        const { error } = await supabase.functions.invoke("support-embed", {
          body: { table: "knowledge_base", id: item.id, text },
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
    }
    toast({ title: `Reprocessamento concluído`, description: `${ok} sucesso, ${fail} falhas` });
    fetchItems();
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const payload: any = {
        title: editing.title?.trim(),
        category: editing.category?.trim() || null,
        subtopic: editing.subtopic?.trim() || null,
        tags,
        priority: editing.priority || "medium",
        pains: editing.pains || null,
        solution: editing.solution || null,
        severity: editing.severity || "media",
        auto_escalate: !!editing.auto_escalate,
        min_confidence: editing.min_confidence ?? 0.7,
        active: editing.active ?? true,
        video_url: editing.video_url?.trim() || null,
      };

      let id = editing.id;
      if (id) {
        const { error } = await supabase.from("knowledge_base").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("knowledge_base").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // gerar embedding em background
      if (id) {
        const text = `${payload.title}\n${payload.category || ""} > ${payload.subtopic || ""}\n${payload.pains || ""}\n${payload.solution || ""}`;
        await generateEmbedding(id, text);
      }

      toast({ title: "Conhecimento salvo!" });
      setEditing(null);
      fetchItems();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: KB) => {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Excluído" });
    fetchItems();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> Mind IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Cérebro do Wian — cadastre conhecimentos, dores e soluções. A IA usa busca semântica para responder.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reembedAll} disabled={loading || items.length === 0}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reprocessar embeddings
          </Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo conhecimento</Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, categoria, subtópico ou dor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fetchItems(); }}
              className="pl-9"
            />
          </div>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchItems}>Buscar</Button>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum conhecimento cadastrado ainda.</p>
            <Button className="mt-4" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Criar o primeiro</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((item) => (
              <Card key={item.id} className="p-4 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                  {item.active === false && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                </div>
                {(item.category || item.subtopic) && (
                  <p className="text-xs text-muted-foreground">{item.category}{item.subtopic ? ` › ${item.subtopic}` : ""}</p>
                )}
                {item.pains && <p className="text-xs line-clamp-2 text-muted-foreground italic">"{item.pains}"</p>}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 5).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className={item.embedding ? "text-emerald-500" : "text-amber-500"}>
                      ● {item.embedding ? "Embedding OK" : "Sem embedding"}
                    </span>
                    {item.auto_escalate && <span className="text-rose-500">● Auto-escalar</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(item)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar conhecimento" : "Novo conhecimento"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Título *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Como conectar WhatsApp Business"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={editing.category || ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="Ex: WhatsApp"
                  />
                </div>
                <div>
                  <Label>Subtópico</Label>
                  <Input
                    value={editing.subtopic || ""}
                    onChange={(e) => setEditing({ ...editing, subtopic: e.target.value })}
                    placeholder="Ex: Conexão Meta"
                  />
                </div>
              </div>

              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="conectar, meta, whatsapp business, número"
                />
              </div>

              <div>
                <Label>Dores / Sintomas do usuário</Label>
                <Textarea
                  rows={3}
                  value={editing.pains || ""}
                  onChange={(e) => setEditing({ ...editing, pains: e.target.value })}
                  placeholder="Como o usuário descreve esse problema? Ex: 'não consigo conectar', 'meu número não aparece', etc."
                />
                <p className="text-xs text-muted-foreground mt-1">Quanto mais variações da dor, melhor a IA encontra.</p>
              </div>

              <div>
                <Label>Solução *</Label>
                <Textarea
                  rows={6}
                  value={editing.solution || ""}
                  onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
                  placeholder="Resposta que a IA deve dar. Pode usar markdown, listas e instruções passo a passo."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={editing.priority || "medium"} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severidade</Label>
                  <Select value={editing.severity || "media"} onValueChange={(v) => setEditing({ ...editing, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Confiança mín.</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editing.min_confidence ?? 0.7}
                    onChange={(e) => setEditing({ ...editing, min_confidence: parseFloat(e.target.value) || 0.7 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Escalar automaticamente para humano</p>
                  <p className="text-xs text-muted-foreground">Quando esse tópico for detectado, sempre abrir chamado.</p>
                </div>
                <Switch
                  checked={!!editing.auto_escalate}
                  onCheckedChange={(c) => setEditing({ ...editing, auto_escalate: c })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Ativo</p>
                  <p className="text-xs text-muted-foreground">Se desativar, a IA não usa esse conhecimento.</p>
                </div>
                <Switch
                  checked={editing.active ?? true}
                  onCheckedChange={(c) => setEditing({ ...editing, active: c })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
