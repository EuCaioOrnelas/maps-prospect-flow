import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";

const SITE_URL = "https://wiize.com.br";

type Post = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author_name: string;
  author_bio: string | null;
  author_avatar_url: string | null;
  category: { id: string; name: string; slug: string } | null;
  category_id: string | null;
  published_at: string | null;
  updated_at: string;
  reading_time_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_image_url: string | null;
  ai_summary: string | null;
  ai_short_answer: string | null;
  ai_entities: string[] | null;
  ai_related_topics: string[] | null;
  faq: Array<{ question: string; answer: string }> | null;
  tags: Array<{ tag: { name: string; slug: string } }>;
};

type Related = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id,slug,title,subtitle,excerpt,content,cover_image_url,cover_image_alt,
           author_name,author_bio,author_avatar_url,category_id,published_at,updated_at,
           reading_time_minutes,seo_title,seo_description,seo_keywords,canonical_url,
           robots_index,robots_follow,og_image_url,ai_summary,ai_short_answer,
           ai_entities,ai_related_topics,faq,
           category:blog_categories(id,name,slug),
           tags:blog_post_tags(tag:blog_tags(name,slug))`
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data as any);
      setLoading(false);

      // Related
      if ((data as any).category_id) {
        const { data: rel } = await supabase
          .from("blog_posts")
          .select("id,slug,title,excerpt,cover_image_url")
          .eq("status", "published")
          .eq("category_id", (data as any).category_id)
          .neq("id", (data as any).id)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .limit(3);
        setRelated((rel as any) || []);
      }
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/blog" replace />;
  if (loading || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-32 pb-16 text-muted-foreground">
          Carregando artigo...
        </div>
      </div>
    );
  }

  const url = post.canonical_url || `${SITE_URL}/blog/${post.slug}`;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || post.ai_summary || "";
  const ogImage = post.og_image_url || post.cover_image_url || undefined;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: ogImage ? [ogImage] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: "Wiize",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: (post.seo_keywords || []).join(", "),
    articleSection: post.category?.name,
    about: (post.ai_entities || []).map((e) => ({ "@type": "Thing", name: e })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      ...(post.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: post.category.name,
              item: `${SITE_URL}/blog/categoria/${post.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: post.category ? 4 : 3,
        name: post.title,
        item: url,
      },
    ],
  };

  const faqSchema =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const robots = `${post.robots_index ? "index" : "noindex"}, ${
    post.robots_follow ? "follow" : "nofollow"
  }`;

  const onShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={robots} />
        {post.seo_keywords && post.seo_keywords.length > 0 && (
          <meta name="keywords" content={post.seo_keywords.join(", ")} />
        )}
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {post.published_at && (
          <meta property="article:published_time" content={post.published_at} />
        )}
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:author" content={post.author_name} />
        {post.category && (
          <meta property="article:section" content={post.category.name} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}

        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      <Navbar />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <nav className="mb-8 text-sm">
          <Link to="/blog" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar ao blog
          </Link>
        </nav>

        <header className="mb-8">
          {post.category && (
            <Link to={`/blog/categoria/${post.category.slug}`}>
              <Badge variant="secondary" className="mb-4">{post.category.name}</Badge>
            </Link>
          )}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="mt-4 text-xl text-muted-foreground">{post.subtitle}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {post.author_avatar_url && (
                <img
                  src={post.author_avatar_url}
                  alt={post.author_name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="font-medium text-foreground">{post.author_name}</span>
            </div>
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </span>
            )}
            {post.reading_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.reading_time_minutes} min de leitura
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onShare} className="gap-1 ml-auto">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          </div>
        </header>

        {post.cover_image_url && (
          <figure className="mb-10 -mx-4 sm:mx-0">
            <img
              src={post.cover_image_url}
              alt={post.cover_image_alt || post.title}
              className="w-full aspect-[16/9] object-cover sm:rounded-xl"
            />
          </figure>
        )}

        {/* Resposta curta (GEO) */}
        {post.ai_short_answer && (
          <aside className="mb-8 p-5 rounded-xl border-l-4 border-primary bg-primary/5">
            <p className="text-sm font-semibold text-primary mb-1">Resposta rápida</p>
            <p className="text-base text-foreground">{post.ai_short_answer}</p>
          </aside>
        )}

        <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* FAQ */}
        {post.faq && post.faq.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">Perguntas frequentes</h2>
            <div className="space-y-4">
              {post.faq.map((f, i) => (
                <details key={i} className="group rounded-lg border border-border p-4 open:bg-muted/30">
                  <summary className="font-semibold cursor-pointer text-foreground">
                    {f.question}
                  </summary>
                  <p className="mt-3 text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map(({ tag }) => (
              <Badge key={tag.slug} variant="outline">#{tag.name}</Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-center">
          <h3 className="text-2xl font-bold">Acelere seu comercial B2B com a Wiize</h3>
          <p className="mt-2 opacity-90">
            Prospecção, CRM, WhatsApp e IA em uma plataforma só.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-5">
            <Link to="/signup">Testar grátis</Link>
          </Button>
        </div>

        {/* Relacionados */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">Artigos relacionados</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/blog/${r.slug}`}
                  className="group block rounded-lg border border-border overflow-hidden hover:shadow-md transition"
                >
                  {r.cover_image_url ? (
                    <img src={r.cover_image_url} alt={r.title} loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/30" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
