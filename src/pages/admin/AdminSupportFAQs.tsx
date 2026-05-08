import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Search,
  Edit,
  Trash2,
  HelpCircle,
  Video,
  RefreshCw,
  FolderOpen,
  Sparkles,
} from "lucide-react";

type Topic = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number | null;
  active: boolean | null;
};

type FAQ = {
  id: string;
  topic_id: string | null;
  title: string;
  content: string | null;
  video_url: string | null;
  tags: string[] | null;
  sort_order: number | null;
  active: boolean | null;
  embedding: any;
  created_at: string;
  updated_at: string;
};

const EMPTY_FAQ: Partial<FAQ> = {
  title: "",
  content: "",
  video_url: "",
  tags: [],
  sort_order: 0,
  active: true,
  topic_id: null,
};

const EMPTY_TOPIC: Partial<Topic> = {
  name: "",
  slug: "",
  icon: "HelpCircle",
  sort_order: 0,
  active: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminSupportFAQs() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTopic, setFilterTopic] = useState<string>("all");

  // FAQ dialog
  const [faqOpen, setFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQ> | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [savingFaq, setSavingFaq] = useState(false);

  // Topic dialog
  const [topicOpen, setTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<Topic> | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);

  // Delete confirm
  const [deleteFaq, setDeleteFaq] = useState<FAQ | null>(null);
  const [deleteTopic, setDeleteTopicState] = useState<Topic | null>(null);

  // Reembed all
  const [reembedding, setReembedding] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: f }] = await Promise.all([
      supabase.from("faq_topics").select("*").order("sort_order", { ascending: true }),
      supabase.from("faqs").select("*").order("sort_order", { ascending: true }),
    ]);
    setTopics((t as Topic[]) || []);
    setFaqs((f as FAQ[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredFaqs = faqs.filter((f) => {
    if (filterTopic !== "all" && f.topic_id !== filterTopic) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        f.title.toLowerCase().includes(s) ||
        (f.content || "").toLowerCase().includes(s) ||
        (f.tags || []).some((t) => t.toLowerCase().includes(s))
      );
    }
    return true;
  });

  function openNewFaq() {
    setEditingFaq({ ...EMPTY_FAQ, topic_id: filterTopic !== "all" ? filterTopic : topics[0]?.id ?? null });
    setTagsInput("");
    setFaqOpen(true);
  }
  function openEditFaq(f: FAQ) {
    setEditingFaq(f);
    setTagsInput((f.tags || []).join(", "));
    setFaqOpen(true);
  }

  async function generateEmbedding(table: "faqs", id: string, text: string) {
    try {
      await supabase.functions.invoke("support-embed", {
        body: { table, id, text },
      });
    } catch (e) {
      console.error("embed error", e);
    }
  }

  async function saveFaq() {
    if (!editingFaq?.title?.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (!editingFaq.topic_id) {
      toast({ title: "Selecione um tópico", variant: "destructive" });
      return;
    }
    setSavingFaq(true);
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      topic_id: editingFaq.topic_id,
      title: editingFaq.title,
      content: editingFaq.content || null,
      video_url: editingFaq.video_url || null,
      tags,
      sort_order: editingFaq.sort_order ?? 0,
      active: editingFaq.active ?? true,
    };

    let id = editingFaq.id;
    if (id) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSavingFaq(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("faqs").insert(payload).select("id").single();
      if (error || !data) {
        toast({ title: "Erro ao criar", description: error?.message, variant: "destructive" });
        setSavingFaq(false);
        return;
      }
      id = data.id;
    }

    // Auto-embedding
    const text = `${payload.title}\n\n${payload.content || ""}\n\nTags: ${tags.join(", ")}`;
    await generateEmbedding("faqs", id!, text);

    toast({ title: "FAQ salvo", description: "Embedding gerado automaticamente." });
    setFaqOpen(false);
    setEditingFaq(null);
    setSavingFaq(false);
    load();
  }

  async function confirmDeleteFaq() {
    if (!deleteFaq) return;
    const { error } = await supabase.from("faqs").delete().eq("id", deleteFaq.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "FAQ excluído" });
      load();
    }
    setDeleteFaq(null);
  }

  function openNewTopic() {
    setEditingTopic(EMPTY_TOPIC);
    setTopicOpen(true);
  }
  function openEditTopic(t: Topic) {
    setEditingTopic(t);
    setTopicOpen(true);
  }

  async function saveTopic() {
    if (!editingTopic?.name?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSavingTopic(true);
    const slug = editingTopic.slug?.trim() || slugify(editingTopic.name);
    const payload = {
      name: editingTopic.name,
      slug,
      icon: editingTopic.icon || "HelpCircle",
      sort_order: editingTopic.sort_order ?? 0,
      active: editingTopic.active ?? true,
    };

    if (editingTopic.id) {
      const { error } = await supabase.from("faq_topics").update(payload).eq("id", editingTopic.id);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSavingTopic(false);
        return;
      }
    } else {
      const { error } = await supabase.from("faq_topics").insert(payload);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSavingTopic(false);
        return;
      }
    }
    toast({ title: "Tópico salvo" });
    setTopicOpen(false);
    setEditingTopic(null);
    setSavingTopic(false);
    load();
  }

  async function confirmDeleteTopic() {
    if (!deleteTopic) return;
    const { error } = await supabase.from("faq_topics").delete().eq("id", deleteTopic.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tópico excluído" });
      load();
    }
    setDeleteTopicState(null);
  }

  async function reembedAll() {
    setReembedding(true);
    let ok = 0;
    let fail = 0;
    for (const f of faqs) {
      const text = `${f.title}\n\n${f.content || ""}\n\nTags: ${(f.tags || []).join(", ")}`;
      try {
        const { error } = await supabase.functions.invoke("support-embed", {
          body: { table: "faqs", id: f.id, text },
        });
        if (error) fail++;
        else ok++;
      } catch {
        fail++;
      }
    }
    toast({
      title: "Reprocessamento concluído",
      description: `${ok} sucesso, ${fail} falhas.`,
    });
    setReembedding(false);
    load();
  }

  const stats = {
    total: faqs.length,
    active: faqs.filter((f) => f.active).length,
    withVideo: faqs.filter((f) => f.video_url).length,
    withEmbedding: faqs.filter((f) => f.embedding).length,
    topics: topics.length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-primary" />
            FAQs
          </h1>
          <p className="text-muted-foreground mt-1">
            Perguntas frequentes com vídeo e auto-embedding para o Wian.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reembedAll} disabled={reembedding || faqs.length === 0}>
            {reembedding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reprocessar embeddings
          </Button>
          <Button variant="outline" onClick={openNewTopic}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Novo tópico
          </Button>
          <Button onClick={openNewFaq} disabled={topics.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Novo FAQ
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Tópicos</div>
          <div className="text-2xl font-bold">{stats.topics}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total FAQs</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ativos</div>
          <div className="text-2xl font-bold text-green-500">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Com vídeo</div>
          <div className="text-2xl font-bold text-blue-500">{stats.withVideo}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Com embedding</div>
          <div className="text-2xl font-bold text-primary">{stats.withEmbedding}</div>
        </Card>
      </div>

      {/* Tópicos */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Tópicos ({topics.length})
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => {
            const count = faqs.filter((f) => f.topic_id === t.id).length;
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-muted/30"
              >
                <span className="text-sm font-medium">{t.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
                {!t.active && <Badge variant="outline" className="text-xs">inativo</Badge>}
                <button
                  onClick={() => openEditTopic(t)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTopicState(t)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {topics.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum tópico criado.</p>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título, conteúdo ou tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTopic} onValueChange={setFilterTopic}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tópico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tópicos</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FAQ List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum FAQ encontrado.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredFaqs.map((f) => {
              const topic = topics.find((t) => t.id === f.topic_id);
              return (
                <div key={f.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{f.title}</h3>
                        {topic && (
                          <Badge variant="secondary" className="text-xs">
                            {topic.name}
                          </Badge>
                        )}
                        {f.video_url && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Video className="h-3 w-3" /> vídeo
                          </Badge>
                        )}
                        {f.embedding && (
                          <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                            <Sparkles className="h-3 w-3" /> embedding
                          </Badge>
                        )}
                        {!f.active && (
                          <Badge variant="outline" className="text-xs">inativo</Badge>
                        )}
                      </div>
                      {f.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {f.content}
                        </p>
                      )}
                      {(f.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(f.tags || []).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEditFaq(f)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteFaq(f)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* FAQ Dialog */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaq?.id ? "Editar FAQ" : "Novo FAQ"}</DialogTitle>
          </DialogHeader>
          {editingFaq && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Tópico *</Label>
                <Select
                  value={editingFaq.topic_id || ""}
                  onValueChange={(v) => setEditingFaq({ ...editingFaq, topic_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tópico" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input
                  value={editingFaq.title || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, title: e.target.value })}
                  placeholder="Como posso..."
                />
              </div>
              <div>
                <Label>Conteúdo / Resposta (Markdown)</Label>
                <Textarea
                  rows={8}
                  value={editingFaq.content || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, content: e.target.value })}
                  placeholder="Resposta detalhada..."
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" /> URL do vídeo (YouTube, Loom, etc.)
                </Label>
                <Input
                  value={editingFaq.video_url || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="whatsapp, conexão, qrcode"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editingFaq.sort_order ?? 0}
                    onChange={(e) =>
                      setEditingFaq({ ...editingFaq, sort_order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch
                    checked={editingFaq.active ?? true}
                    onCheckedChange={(v) => setEditingFaq({ ...editingFaq, active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Ao salvar, um <strong>embedding vetorial</strong> será gerado automaticamente para que o Wian use este FAQ na busca semântica.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaqOpen(false)} disabled={savingFaq}>
              Cancelar
            </Button>
            <Button onClick={saveFaq} disabled={savingFaq}>
              {savingFaq && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topic Dialog */}
      <Dialog open={topicOpen} onOpenChange={setTopicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic?.id ? "Editar tópico" : "Novo tópico"}</DialogTitle>
          </DialogHeader>
          {editingTopic && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={editingTopic.name || ""}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      name: e.target.value,
                      slug: editingTopic.id ? editingTopic.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editingTopic.slug || ""}
                  onChange={(e) => setEditingTopic({ ...editingTopic, slug: e.target.value })}
                  placeholder="auto-gerado a partir do nome"
                />
              </div>
              <div>
                <Label>Ícone (nome do lucide-react)</Label>
                <Input
                  value={editingTopic.icon || ""}
                  onChange={(e) => setEditingTopic({ ...editingTopic, icon: e.target.value })}
                  placeholder="HelpCircle"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editingTopic.sort_order ?? 0}
                    onChange={(e) =>
                      setEditingTopic({
                        ...editingTopic,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch
                    checked={editingTopic.active ?? true}
                    onCheckedChange={(v) => setEditingTopic({ ...editingTopic, active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicOpen(false)} disabled={savingTopic}>
              Cancelar
            </Button>
            <Button onClick={saveTopic} disabled={savingTopic}>
              {savingTopic && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteFaq} onOpenChange={(o) => !o && setDeleteFaq(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteFaq?.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFaq}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTopic} onOpenChange={(o) => !o && setDeleteTopicState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tópico?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTopic?.name}" e <strong>todos os FAQs</strong> deste tópico serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTopic}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
