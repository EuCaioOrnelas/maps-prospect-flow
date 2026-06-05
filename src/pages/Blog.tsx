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
import { Search, Filter, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArticleCard } from "@/components/ui/blog-post-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

const SITE_URL = "https://wiize.com.br";
const PAGE_SIZE = 6;

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

      {/* Background — clean: soft gradient + subtle dots + very gentle glow behind title */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            maskImage:
              "linear-gradient(180deg, black 0%, black 40%, transparent 80%)",
            WebkitMaskImage:
              "linear-gradient(180deg, black 0%, black 40%, transparent 80%)",
          }}
        />
        {/* Very soft glow behind the title only */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[140px] w-[600px] h-[300px]"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(158 65% 50% / 0.06) 0%, hsl(158 65% 50% / 0.02) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10">
      <Navbar />

      {/* Hero — clean */}
      <section className="pt-[110px] sm:pt-[130px] pb-8 sm:pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display font-semibold tracking-tight text-foreground text-4xl sm:text-5xl leading-[1.1]">
            Blog <span className="text-primary">Wiize</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Estratégias e playbooks de IA comercial assistida para vendas B2B.
          </p>


          {/* Search + Filter */}
          <form
            onSubmit={onSearch}
            className="mt-8 max-w-2xl mx-auto flex items-center gap-2 p-1.5 rounded-full bg-card border border-border/70 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all"
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título, conteúdo, autor..."
              className="flex-1 h-11 px-4 rounded-full border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />

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

            <Button
              type="submit"
              size="icon"
              aria-label="Buscar"
              className="rounded-full h-11 w-11 shrink-0"
            >
              <Search className="h-4 w-4" />
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
        {/* Lista única — apenas as publicações */}
        <section>
          {(q || activeCategory) && (
            <h2 className="text-xl font-medium tracking-tight mb-6 text-muted-foreground">
              {q ? `Resultados para "${q}"` : activeCategory?.name}
            </h2>
          )}

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

      <Footer />
      </div>
    </div>
  );
}
