import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Clock, Calendar, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";

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

  const pageTitle = categorySlug
    ? `Blog Wiize — ${categories.find((c) => c.slug === categorySlug)?.name || "Categoria"}`
    : "Blog Wiize — Inteligência comercial, vendas B2B e IA";
  const pageDescription =
    "Conteúdo prático sobre prospecção, CRM, WhatsApp, IA comercial e automação para times B2B de alta performance.";

  return (
    <div className="min-h-screen bg-background">
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

      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        {/* Hero */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Blog Wiize
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Estratégias práticas de prospecção, CRM, WhatsApp e IA para acelerar
            o comercial B2B.
          </p>

          <form onSubmit={onSearch} className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título, conteúdo, categoria..."
              className="pl-9 h-12"
            />
          </form>
        </header>

        {/* Categorias */}
        <nav aria-label="Categorias do blog" className="flex flex-wrap gap-2 justify-center mb-12">
          <Button asChild variant={!categorySlug ? "default" : "outline"} size="sm">
            <Link to="/blog">Todas</Link>
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              asChild
              variant={categorySlug === c.slug ? "default" : "outline"}
              size="sm"
            >
              <Link to={`/blog/categoria/${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
        </nav>

        {/* Destaques */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Em destaque</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* Lista */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">
            {q ? `Resultados para "${q}"` : "Últimas publicações"}
          </h2>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <nav aria-label="Paginação" className="flex justify-center items-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
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

function PostCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
    >
      {post.cover_image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/30" />
      )}
      <div className="p-5">
        {post.category && (
          <Badge variant="secondary" className="mb-3">
            {post.category.name}
          </Badge>
        )}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{post.author_name}</span>
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.published_at).toLocaleDateString("pt-BR")}
            </span>
          )}
          {post.reading_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.reading_time_minutes} min
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Ler artigo <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </Link>
  );
}
