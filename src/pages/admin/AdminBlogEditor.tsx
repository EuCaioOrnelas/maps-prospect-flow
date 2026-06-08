import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { TipTapEditor } from "@/components/admin/blog/TipTapEditor";
import { ArrowLeft, Save, Eye, Trash2, Plus, BarChart3, FileText, Search, Sparkles, HelpCircle, Image as ImageIcon, Settings2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

const readingTime = (html: string) => {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

type Category = { id: string; name: string };
type FAQItem = { question: string; answer: string };

const empty = {
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  cover_image_alt: "",
  author_name: "Wian",
  category_id: "",
  status: "draft" as "draft" | "scheduled" | "published" | "archived",
  featured: false,
  published_at: "",
  scheduled_for: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  canonical_url: "",
  robots_index: true,
  robots_follow: true,
  og_image_url: "",
  ai_short_answer: "",
  ai_entities: "",
  faq: [] as FAQItem[],
  reading_time_override: "" as string,
};

export default function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "novo";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [autoSlug, setAutoSlug] = useState(isNew);

  const generateGeo = async () => {
    if (!form.content) return toast.error("Adicione conteúdo antes de gerar");
    setGeoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-geo", {
        body: {
          title: form.title,
          subtitle: form.subtitle,
          excerpt: form.excerpt,
          content: form.content,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForm((f) => ({
        ...f,
        ai_short_answer: (data as any).ai_short_answer || f.ai_short_answer,
        ai_entities: Array.isArray((data as any).ai_entities) && (data as any).ai_entities.length
          ? (data as any).ai_entities.join(", ")
          : f.ai_entities,
        faq: Array.isArray((data as any).faq) && (data as any).faq.length
          ? (data as any).faq
          : f.faq,
      }));
      toast.success("Conteúdo GEO gerado com IA");
    } catch (e: any) {
      toast.error("Falha ao gerar: " + (e?.message || "erro"));
    } finally {
      setGeoLoading(false);
    }
  };


  useEffect(() => {
    supabase.from("blog_categories").select("id,name").order("name")
      .then(({ data }) => setCategories((data as Category[]) || []));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id!).single();
      if (error || !data) {
        toast.error("Post não encontrado");
        navigate("/admin/blog");
        return;
      }
      // Sanitize: DB returns null for empty text fields, but our form expects strings.
      const safeStr = (v: any) => (typeof v === "string" ? v : "");
      const safeBool = (v: any, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
      setForm({
        ...empty,
        slug: safeStr(data.slug),
        title: safeStr(data.title),
        subtitle: safeStr(data.subtitle),
        excerpt: safeStr(data.excerpt),
        content: safeStr(data.content),
        cover_image_url: safeStr(data.cover_image_url),
        cover_image_alt: safeStr(data.cover_image_alt),
        author_name: safeStr(data.author_name) || "Wian",
        status: (data.status as any) || "draft",
        featured: safeBool(data.featured, false),
        seo_title: safeStr(data.seo_title),
        seo_description: safeStr(data.seo_description),
        canonical_url: safeStr(data.canonical_url),
        og_image_url: safeStr(data.og_image_url),
        ai_short_answer: safeStr(data.ai_short_answer),
        robots_index: safeBool(data.robots_index, true),
        robots_follow: safeBool(data.robots_follow, true),
        category_id: data.category_id || "",
        published_at: data.published_at ? data.published_at.slice(0, 16) : "",
        scheduled_for: data.scheduled_for ? data.scheduled_for.slice(0, 16) : "",
        seo_keywords: Array.isArray(data.seo_keywords) ? data.seo_keywords.join(", ") : "",
        ai_entities: Array.isArray(data.ai_entities) ? data.ai_entities.join(", ") : "",
        faq: Array.isArray(data.faq) ? (data.faq as any) : [],
        reading_time_override: data.reading_time_minutes ? String(data.reading_time_minutes) : "",
      } as any);
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  useEffect(() => {
    if (autoSlug) setForm((f) => ({ ...f, slug: slugify(f.title) }));
  }, [form.title, autoSlug]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const computedReading = useMemo(() => readingTime(form.content), [form.content]);

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim()) return toast.error("Título obrigatório");
    if (!form.slug.trim()) return toast.error("Slug obrigatório");

    setSaving(true);
    const status = publishNow ? "published" : form.status;
    const payload: any = {
      slug: form.slug,
      title: form.title,
      subtitle: form.subtitle || null,
      excerpt: form.excerpt || null,
      content: form.content,
      cover_image_url: form.cover_image_url || null,
      cover_image_alt: form.cover_image_alt || null,
      author_name: form.author_name,
      category_id: form.category_id || null,
      status,
      featured: form.featured,
      reading_time_minutes: form.reading_time_override
        ? Math.max(1, parseInt(form.reading_time_override, 10) || computedReading)
        : computedReading,
      published_at:
        status === "published"
          ? form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString()
          : form.published_at ? new Date(form.published_at).toISOString() : null,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      seo_keywords: form.seo_keywords
        ? form.seo_keywords.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      canonical_url: form.canonical_url || null,
      robots_index: form.robots_index,
      robots_follow: form.robots_follow,
      og_image_url: form.og_image_url || null,
      ai_short_answer: form.ai_short_answer || null,
      ai_entities: form.ai_entities
        ? form.ai_entities.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      faq: form.faq.filter((f) => f.question && f.answer),
    };

    if (isNew) {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id;
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
      setSaving(false);
      if (error) return toast.error("Erro: " + error.message);
      toast.success("Post criado");
      navigate(`/admin/blog/${data.id}`);
    } else {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", id!);
      setSaving(false);
      if (error) return toast.error("Erro: " + error.message);
      toast.success(publishNow ? "Publicado!" : "Alterações salvas");
      if (publishNow) set("status", "published");
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  const STATUS_LABEL: Record<string, string> = {
    draft: "Rascunho", scheduled: "Agendado", published: "Publicado", archived: "Arquivado",
  };
  const STATUS_TONE: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    archived: "bg-destructive/15 text-destructive border-destructive/30",
  };

  // Live quality hints
  const titleLen = (form.title || "").length;
  const seoTitleLen = (form.seo_title || form.title || "").length;
  const descLen = (form.seo_description || form.excerpt || "").length;
  const wordCount = (form.content || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  const hints: Array<{ ok: boolean; msg: string }> = [
    { ok: titleLen > 10 && titleLen <= 70, msg: `Título com ${titleLen} caracteres (ideal 30-70)` },
    { ok: seoTitleLen > 0 && seoTitleLen <= 60, msg: `SEO title ${seoTitleLen}/60` },
    { ok: descLen >= 80 && descLen <= 160, msg: `Meta description ${descLen}/160 (ideal 80-160)` },
    { ok: !!form.cover_image_url, msg: form.cover_image_url ? "Imagem de capa definida" : "Adicione uma imagem de capa" },
    { ok: !!form.ai_short_answer, msg: form.ai_short_answer ? "Resposta curta (GEO) preenchida" : "Adicione a resposta curta para IA" },
    { ok: (form.ai_entities ? form.ai_entities.split(",").filter(Boolean).length : 0) >= 3, msg: "Pelo menos 3 entidades para GEO" },
    { ok: form.faq.length >= 1, msg: form.faq.length >= 1 ? `${form.faq.length} pergunta(s) no FAQ` : "Adicione perguntas frequentes (FAQ)" },
    { ok: wordCount >= 600, msg: `${wordCount} palavras (ideal 600+)` },
  ];
  const passingHints = hints.filter((h) => h.ok).length;
  const qualityScore = Math.round((passingHints / hints.length) * 100);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold truncate max-w-[50vw]">
                  {form.title || (isNew ? "Novo post" : "Editar post")}
                </h1>
                <Badge variant="outline" className={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge>
                {form.featured && <Badge variant="outline">⭐ destaque</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{computedReading} min · {wordCount} palavras</span>
                <span>·</span>
                <span className="truncate max-w-[40vw]">/{form.slug || "sem-slug"}</span>
                <span>·</span>
                <span className={qualityScore >= 80 ? "text-emerald-500" : qualityScore >= 50 ? "text-amber-500" : "text-destructive"}>
                  Qualidade {qualityScore}%
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isNew && form.status === "published" && (
              <Button variant="outline" asChild>
                <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4 mr-2" /> Ver
                </a>
              </Button>
            )}
            {!isNew && (
              <Button variant="outline" asChild>
                <a href={`/admin/blog/analytics/${id}`}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Desempenho
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
            {form.status !== "published" && (
              <Button onClick={() => handleSave(true)} disabled={saving}>
                Publicar
              </Button>
            )}
          </div>
        </div>

        {/* Quality bar */}
        <div className="px-6 pb-3">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${qualityScore >= 80 ? "bg-emerald-500" : qualityScore >= 50 ? "bg-amber-500" : "bg-destructive"}`}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quality hints */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Checklist de qualidade</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {hints.map((h, i) => (
              <div key={i} className={`text-xs flex items-start gap-2 ${h.ok ? "text-muted-foreground" : "text-foreground"}`}>
                <span className={`mt-0.5 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${h.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span>{h.msg}</span>
              </div>
            ))}
          </div>
        </Card>


      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Como dobrar seu pipeline B2B..." className="text-lg" />
            </div>
            <div>
              <Label>Slug</Label>
              <div className="flex gap-2">
                <Input value={form.slug} onChange={(e) => { setAutoSlug(false); set("slug", slugify(e.target.value)); }} />
                <Button variant="outline" size="sm" onClick={() => { setAutoSlug(true); set("slug", slugify(form.title)); }}>Auto</Button>
              </div>
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div>
              <Label>Excerpt (resumo)</Label>
              <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} maxLength={300} />
              <p className="text-xs text-muted-foreground mt-1">{(form.excerpt || "").length}/300</p>
            </div>
          </Card>

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <TipTapEditor value={form.content} onChange={(v) => set("content", v)} />
          </div>

          <Tabs defaultValue="seo">
            <TabsList>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="geo">IA / GEO</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="seo">
              <Card className="p-5 space-y-4">
                <div>
                  <Label>SEO Title (60 chars)</Label>
                  <Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} maxLength={70} />
                  <p className="text-xs text-muted-foreground mt-1">{(form.seo_title || "").length}/60</p>
                </div>
                <div>
                  <Label>Meta Description (160 chars)</Label>
                  <Textarea value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={2} maxLength={170} />
                  <p className="text-xs text-muted-foreground mt-1">{(form.seo_description || "").length}/160</p>
                </div>
                <div>
                  <Label>Keywords (separadas por vírgula)</Label>
                  <Input value={form.seo_keywords} onChange={(e) => set("seo_keywords", e.target.value)} />
                </div>
                <div>
                  <Label>Canonical URL</Label>
                  <Input value={form.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://wiize.com.br/blog/..." />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input value={form.og_image_url} onChange={(e) => set("og_image_url", e.target.value)} />
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.robots_index} onCheckedChange={(v) => set("robots_index", v)} />
                    <Label>Indexar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.robots_follow} onCheckedChange={(v) => set("robots_follow", v)} />
                    <Label>Follow links</Label>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="geo">
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Otimização para IA (GEO)
                    </h3>
                    <p className="text-xs text-muted-foreground">Gere resposta curta, entidades e FAQ com base no conteúdo do artigo.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={geoLoading || !form.content} onClick={generateGeo}>
                    {geoLoading ? "Gerando..." : (<><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar com IA</>)}
                  </Button>
                </div>
                <div>
                  <Label>Resposta curta (para AI Overviews / Perplexity)</Label>
                  <Textarea value={form.ai_short_answer} onChange={(e) => set("ai_short_answer", e.target.value)} rows={3} placeholder="Resposta direta de 2-3 frases para a principal pergunta do artigo." />
                </div>
                <div>
                  <Label>Entidades / tópicos (separados por vírgula)</Label>
                  <Input value={form.ai_entities} onChange={(e) => set("ai_entities", e.target.value)} placeholder="prospecção B2B, CRM, WhatsApp Cloud API" />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="faq">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap pb-2">
                  <p className="text-xs text-muted-foreground">FAQ aumenta chances de citação por IA + gera schema FAQPage.</p>
                  <Button type="button" size="sm" variant="outline" disabled={geoLoading || !form.content} onClick={generateGeo}>
                    {geoLoading ? "Gerando..." : (<><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar FAQ com IA</>)}
                  </Button>
                </div>
                {form.faq.map((item, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Pergunta"
                        value={item.question}
                        onChange={(e) => set("faq", form.faq.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f))}
                      />
                      <Button variant="ghost" size="icon" onClick={() => set("faq", form.faq.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Resposta"
                      value={item.answer}
                      rows={2}
                      onChange={(e) => set("faq", form.faq.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f))}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("faq", [...form.faq, { question: "", answer: "" }])}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar FAQ
                </Button>
              </Card>
            </TabsContent>
          </Tabs>

        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Publicação</h3>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de publicação</Label>
              <Input type="datetime-local" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} />
            </div>
            {form.status === "scheduled" && (
              <div>
                <Label>Agendar para</Label>
                <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => set("scheduled_for", e.target.value)} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
              <Label>Destacar na home do blog</Label>
            </div>
            <div>
              <Label>Tempo de leitura (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.reading_time_override}
                onChange={(e) => set("reading_time_override", e.target.value)}
                placeholder={`Auto: ${computedReading} min`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para calcular automaticamente (~220 palavras/min).
              </p>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Organização</h3>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id || "_none"} onValueChange={(v) => set("category_id", v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={form.author_name} onChange={(e) => set("author_name", e.target.value)} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Capa</h3>
            <div>
              <Label>URL da imagem</Label>
              <Input value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Recomendado: 1200 × 675 px (proporção 16:9)</p>
            </div>
            <div>
              <Label>Alt text</Label>
              <Input value={form.cover_image_alt} onChange={(e) => set("cover_image_alt", e.target.value)} />
            </div>
            {form.cover_image_url && (
              <img src={form.cover_image_url} alt="" className="rounded-lg w-full aspect-video object-cover" />
            )}
          </Card>

        </div>
      </div>
      </div>
    </div>
  );
}

