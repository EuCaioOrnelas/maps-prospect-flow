import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Check } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { ArticleCard } from "@/components/ui/blog-post-card";

const SITE_URL = "https://wiize.com.br";
const PAGE_SIZE = 9;

type Category = { id: string; name: string; slug: string; color: string | null };
type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string;
  category: Category | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  featured: boolean;
};

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const routeParams = useParams<{ categorySlug?: string }>();
  const navigate = useNavigate();
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const q = params.get("q") || "";
  const categorySlug = routeParams.categorySlug || params.get("categoria") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [featured, setFeatured] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    supabase
      .from("blog_categories")
      .select("id,name,slug,color")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setCategories((data as Category[]) || []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("blog_posts")
        .select(
          "id,slug,title,excerpt,cover_image_url,author_name,published_at,reading_time_minutes,featured,category:blog_categories(id,name,slug,color)",
          { count: "exact" }
        )
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (categorySlug) {
        const cat = categories.find((c) => c.slug === categorySlug);
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (q) {
        query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
      }

      const { data, count } = await query.range(from, to);
      setPosts((data as any) || []);
      setTotal(count || 0);
      setLoading(false);

      if (page === 1 && !q && !categorySlug) {
        const { data: fdata } = await supabase
          .from("blog_posts")
          .select(
            "id,slug,title,excerpt,cover_image_url,author_name,published_at,reading_time_minutes,featured,category:blog_categories(id,name,slug,color)"
          )
          .eq("status", "published")
          .eq("featured", true)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .limit(3);
        setFeatured((fdata as any) || []);
      } else {
        setFeatured([]);
      }
    })();
  }, [page, q, categorySlug, categories]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = (next: Record<string, string | null>) => {
    const np = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === "") np.delete(k);
      else np.set(k, v);
    });
    setParams(np);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput || null, page: null });
  };

  const canonicalPath = useMemo(() => {
    const sp = new URLSearchParams();
    if (categorySlug) sp.set("categoria", categorySlug);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }, [categorySlug, page]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const pageTitle = activeCategory
    ? `Blog Wiize — ${activeCategory.name}`
    : "Blog Wiize — IA comercial assistida para vendas B2B";
  const pageDescription =
    "Insights, estratégias e bastidores da Wiize: IA comercial assistida que prospecta, qualifica e acelera vendas B2B sem inflar o time.";

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}${canonicalPath}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog Wiize",
          url: `${SITE_URL}/blog`,
          description: pageDescription,
        })}</script>
      </Helmet>

      {/* Full-page ambient background (dots + soft green glow) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(158 35% 98%) 0%, hsl(210 30% 99%) 40%, hsl(var(--background)) 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "18px 18px",
            maskImage:
              "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
          }}
        />
        {/* Soft green glow — wide, centered, covering the page */}
        <div
          className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[1400px] h-[1100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(158 60% 55% / 0.08) 0%, hsl(158 60% 55% / 0.03) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, hsl(158 60% 55% / 0.05) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-[40%] -left-32 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, hsl(158 60% 55% / 0.04) 0%, transparent 65%)" }}
        />
      </div>

      <div className="relative z-10">
      <Navbar />

      {/* Hero (no background here — uses page-level glow) */}
      <section className="pt-[120px] sm:pt-[140px] pb-10 sm:pb-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display font-bold tracking-tight text-foreground text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
            Vender com IA <span className="text-shimmer-highlight font-extrabold">deixou de ser opcional</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Bastidores, estratégias e playbooks de quem usa{" "}
            <strong className="text-foreground">IA comercial assistida</strong> para prospectar,
            qualificar e fechar mais oportunidades B2B sem inflar o time.
          </p>


          {/* Search + Filter */}
          <form
            onSubmit={onSearch}
            className="mt-8 max-w-2xl mx-auto flex items-center gap-2 p-1.5 rounded-full bg-card border border-border/70 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por título, conteúdo, autor..."
                className="pl-11 h-11 rounded-full border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full h-11 px-4 gap-2 border-border/70 bg-background/50"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {activeCategory ? activeCategory.name : "Categorias"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuLabel>Filtrar por categoria</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/blog")} className="gap-2">
                  {!categorySlug && <Check className="h-3.5 w-3.5" />}
                  <span className={!categorySlug ? "font-medium" : ""}>Todas as categorias</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => navigate(`/blog/categoria/${c.slug}`)}
                    className="gap-2"
                  >
                    {categorySlug === c.slug && <Check className="h-3.5 w-3.5" />}
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.color || "hsl(var(--primary))" }}
                    />
                    <span className={categorySlug === c.slug ? "font-medium" : ""}>{c.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="submit" className="rounded-full h-11 px-5">
              Buscar
            </Button>
          </form>

          {/* Active filter pill */}
          {(activeCategory || q) && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Filtrando por:</span>
              {activeCategory && (
                <button
                  onClick={() => navigate("/blog")}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium hover:bg-primary/20"
                >
                  {activeCategory.name} ✕
                </button>
              )}
              {q && (
                <button
                  onClick={() => updateParams({ q: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
                >
                  "{q}" ✕
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Destaques */}
        {featured.length > 0 && (
          <section className="mb-14">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Em destaque</h2>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Selecionados pela equipe
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((p) => (
                <ArticleCard
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  cover={p.cover_image_url || undefined}
                  tag={p.category?.name}
                  tagColor={p.category?.color}
                  readingTime={p.reading_time_minutes || undefined}
                  headline={p.title}
                  excerpt={p.excerpt || ""}
                  writer={p.author_name}
                  publishedAt={p.published_at || undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* Lista */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            {q ? `Resultados para "${q}"` : activeCategory ? activeCategory.name : "Últimas publicações"}
          </h2>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse">
                  <div className="aspect-[16/9] bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-5 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-5/6 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/blog")}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <ArticleCard
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  cover={p.cover_image_url || undefined}
                  tag={p.category?.name}
                  tagColor={p.category?.color}
                  readingTime={p.reading_time_minutes || undefined}
                  headline={p.title}
                  excerpt={p.excerpt || ""}
                  writer={p.author_name}
                  publishedAt={p.published_at || undefined}
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <nav aria-label="Paginação" className="flex justify-center items-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Próxima
              </Button>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}
