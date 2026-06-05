import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Eye, FileText, Clock, TrendingUp, ArrowLeft, ExternalLink, BarChart3,
  Search, Sparkles, Target, Users, Zap, Award, Info, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  view_count: number;
  published_at: string | null;
  scheduled_for: string | null;
  reading_time_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  cover_image_url: string | null;
  excerpt: string | null;
  subtitle: string | null;
  ai_short_answer: string | null;
  ai_entities: string[] | null;
  faq: any;
  content: string | null;
  featured: boolean;
  category: { name: string } | null;
};

export type WiizeScore = {
  total: number;
  seo: number;
  geo: number;
  engajamento: number;
  conversao: number;
};

export function computeWiizeScore(p: PostRow): WiizeScore {
  // SEO (0-25)
  let seo = 0;
  if (p.seo_title) seo += 5;
  if (p.seo_description && p.seo_description.length >= 80 && p.seo_description.length <= 160) seo += 6;
  else if (p.seo_description) seo += 3;
  if (p.seo_keywords && p.seo_keywords.length >= 3) seo += 5;
  if (p.cover_image_url) seo += 5;
  if (p.excerpt) seo += 4;

  // GEO (0-25)
  let geo = 0;
  if (p.ai_short_answer) geo += 9;
  const ents = (p.ai_entities || []).length;
  if (ents >= 5) geo += 9;
  else if (ents >= 3) geo += 6;
  else if (ents >= 1) geo += 3;
  const faqLen = Array.isArray(p.faq) ? p.faq.length : 0;
  if (faqLen >= 3) geo += 7;
  else if (faqLen >= 1) geo += 4;

  // Engajamento (0-25) — proxies until scroll/dwell tracking is wired
  let eng = 0;
  if (p.reading_time_minutes && p.reading_time_minutes >= 4) eng += 5;
  else if (p.reading_time_minutes) eng += 3;
  if (p.subtitle) eng += 4;
  const words = (p.content || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  if (words >= 1200) eng += 8;
  else if (words >= 600) eng += 5;
  else if (words >= 300) eng += 3;
  const v = p.view_count || 0;
  if (v >= 1000) eng += 8;
  else if (v >= 100) eng += 5;
  else if (v >= 10) eng += 3;

  // Conversão (0-25) — placeholder using views as proxy until trial attribution lands
  let conv = 0;
  if (v >= 5000) conv = 25;
  else if (v >= 1000) conv = 18;
  else if (v >= 200) conv = 12;
  else if (v >= 50) conv = 7;
  else if (v > 0) conv = 3;

  const total = Math.min(100, seo + geo + eng + conv);
  return { total, seo, geo, engajamento: eng, conversao: conv };
}

export default function AdminBlogAnalytics() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"views" | "score" | "recent">("score");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select(`id,slug,title,status,view_count,published_at,scheduled_for,
                 reading_time_minutes,seo_title,seo_description,seo_keywords,
                 cover_image_url,excerpt,subtitle,ai_short_answer,ai_entities,
                 faq,content,featured,category:blog_categories(name)`)
        .order("updated_at", { ascending: false })
        .limit(500);
      setPosts((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(
    () => posts.map((p) => ({ ...p, score: computeWiizeScore(p) })),
    [posts]
  );

  const published = enriched.filter((p) => p.status === "published");
  const totals = {
    total: enriched.length,
    published: published.length,
    scheduled: enriched.filter((p) => p.status === "scheduled").length,
    draft: enriched.filter((p) => p.status === "draft").length,
    views: enriched.reduce((s, p) => s + (p.view_count || 0), 0),
    avgScore: published.length
      ? Math.round(published.reduce((s, p) => s + p.score.total, 0) / published.length)
      : 0,
    avgReading: published.length
      ? Math.round(published.reduce((s, p) => s + (p.reading_time_minutes || 0), 0) / published.length)
      : 0,
  };

  // Last 30 / 7 days proxy from published_at
  const now = Date.now();
  const within = (days: number) =>
    published.filter((p) => p.published_at && now - new Date(p.published_at).getTime() < days * 86400000);
  const last7Views = within(7).reduce((s, p) => s + (p.view_count || 0), 0);
  const last30Views = within(30).reduce((s, p) => s + (p.view_count || 0), 0);
  const prev30Views = published
    .filter((p) => {
      if (!p.published_at) return false;
      const ago = now - new Date(p.published_at).getTime();
      return ago >= 30 * 86400000 && ago < 60 * 86400000;
    })
    .reduce((s, p) => s + (p.view_count || 0), 0);
  const growth = prev30Views > 0 ? Math.round(((last30Views - prev30Views) / prev30Views) * 100) : null;

  let list = enriched.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );
  if (sort === "views") list = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  else if (sort === "score") list = [...list].sort((a, b) => b.score.total - a.score.total);
  else list = [...list].sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return db - da;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar para posts
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Blog Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Tráfego, SEO, GEO, engajamento e conversão.</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="geo">GEO / IA</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon={Eye} label="Views totais" value={totals.views.toLocaleString("pt-BR")} />
            <Kpi
              icon={TrendingUp}
              label="Últimos 30 dias"
              value={last30Views.toLocaleString("pt-BR")}
              trend={growth}
            />
            <Kpi icon={Zap} label="Últimos 7 dias" value={last7Views.toLocaleString("pt-BR")} />
            <Kpi icon={Award} label="Wiize Score médio" value={`${totals.avgScore}/100`} />
            <Kpi icon={FileText} label="Publicados" value={totals.published} />
            <Kpi icon={Clock} label="Agendados" value={totals.scheduled} />
            <Kpi icon={FileText} label="Rascunhos" value={totals.draft} />
            <Kpi icon={Clock} label="Leitura média" value={`${totals.avgReading} min`} />
          </div>

          <InfraNotice />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Desempenho por publicação
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em uma linha para abrir o relatório completo.
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-56"
                  />
                </div>
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  {(["score", "views", "recent"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setSort(k)}
                      className={`px-3 py-1.5 ${sort === k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    >
                      {k === "score" ? "Score" : k === "views" ? "Views" : "Recente"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum post encontrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Wiize Score</TableHead>
                      <TableHead className="text-right">SEO</TableHead>
                      <TableHead className="text-right">GEO</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Leitura</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link to={`/admin/blog/analytics/${p.id}`} className="font-medium hover:underline block truncate max-w-[28ch]">
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate max-w-[28ch]">
                            /{p.slug}{p.category?.name ? ` · ${p.category.name}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <ScorePill value={p.score.total} />
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {Math.round((p.score.seo / 25) * 100)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {Math.round((p.score.geo / 25) * 100)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {(p.view_count || 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {p.reading_time_minutes ? `${p.reading_time_minutes} min` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/admin/blog/analytics/${p.id}`}><ArrowUpRight className="w-4 h-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="pt-4 space-y-4">
          <ChannelPlaceholder
            icon={Target}
            title="Google Search Console"
            description="Conecte o GSC para ver impressões, cliques, CTR, posição média e palavras-chave por publicação."
          />
          <BestWorst
            posts={enriched}
            metric={(p) => p.score.seo}
            label="SEO (estrutural)"
            help="Score baseado em SEO title, meta description, keywords, capa e excerpt."
          />
        </TabsContent>

        <TabsContent value="geo" className="pt-4 space-y-4">
          <ChannelPlaceholder
            icon={Sparkles}
            title="Citações em IA (ChatGPT, Perplexity, Gemini)"
            description="A medição automática de citações em LLMs entra em breve. Por enquanto, otimize com resposta curta, entidades e FAQ — esses são os sinais que as IAs leem."
          />
          <BestWorst
            posts={enriched}
            metric={(p) => p.score.geo}
            label="GEO (otimização para IA)"
            help="Pondera resposta curta, entidades reconhecidas e FAQ estruturado."
          />
        </TabsContent>

        <TabsContent value="engagement" className="pt-4 space-y-4">
          <ChannelPlaceholder
            icon={Users}
            title="Tracking de profundidade & sessões"
            description="Scroll depth (25%/50%/75%/100%), tempo médio real, bounce rate e cliques internos exigem instrumentação de eventos no front. Estimativa atual usa tamanho do artigo e views."
          />
          <BestWorst
            posts={enriched}
            metric={(p) => p.score.engajamento}
            label="Engajamento estimado"
            help="Combina volume de conteúdo, subtítulo, tempo de leitura e views acumuladas."
          />
        </TabsContent>

        <TabsContent value="conversion" className="pt-4 space-y-4">
          <ChannelPlaceholder
            icon={TrendingUp}
            title="Atribuição de leads e trials"
            description="A atribuição de leads, trials, clientes e receita por artigo requer instrumentar UTM/source no signup. Quando ligada, esta aba mostrará leads, trials, clientes e R$ gerado por publicação."
          />
          <BestWorst
            posts={enriched}
            metric={(p) => p.score.conversao}
            label="Potencial de conversão (proxy)"
            help="Usa views como proxy até a atribuição de trials estar ativa."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, trend }: { icon: any; label: string; value: any; trend?: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-md bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          {trend !== undefined && trend !== null && (
            <span className={`text-xs flex items-center gap-0.5 font-medium ${trend >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{label}</p>
        <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    scheduled: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}

export function ScorePill({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : value >= 50 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold tabular-nums ${color}`}>
      <Award className="w-3 h-3" />{value}
    </span>
  );
}

function ChannelPlaceholder({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-5 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">em breve</Badge>
      </CardContent>
    </Card>
  );
}

function InfraNotice() {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="p-4 flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Métricas marcadas como <span className="font-semibold">"em breve"</span> dependem de integrações externas
          (Google Search Console, tracking de scroll/sessão e atribuição de leads). O <span className="font-semibold">Wiize Content Score</span> já roda
          com sinais on-page (estrutura, SEO, GEO, tamanho e views).
        </p>
      </CardContent>
    </Card>
  );
}

function BestWorst({
  posts, metric, label, help,
}: {
  posts: Array<PostRow & { score: WiizeScore }>;
  metric: (p: PostRow & { score: WiizeScore }) => number;
  label: string;
  help: string;
}) {
  const pub = posts.filter((p) => p.status === "published");
  const sorted = [...pub].sort((a, b) => metric(b) - metric(a));
  const top = sorted.slice(0, 5);
  const worst = [...pub].sort((a, b) => metric(a) - metric(b)).slice(0, 5);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <RankList title={`Top — ${label}`} items={top} metric={metric} help={help} />
      <RankList title="Precisam de atenção" items={worst} metric={metric} help="Aja primeiro nestes para subir a média geral." />
    </div>
  );
}

function RankList({ title, items, metric, help }: { title: string; items: any[]; metric: (p: any) => number; help: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{help}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((p) => {
              const v = metric(p);
              const pct = Math.round((v / 25) * 100);
              return (
                <Link to={`/admin/blog/analytics/${p.id}`} key={p.id} className="flex items-center gap-3 py-2.5 hover:bg-muted/40 rounded px-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                  </div>
                  <ScorePill value={pct} />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
