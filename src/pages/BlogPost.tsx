import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trackBlogCtaClick } from "@/lib/blogAttribution";

import { supabase } from "@/integrations/supabase/client";
import { blogPublic as blogSupabase } from "@/integrations/blog/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, ShieldCheck, Headphones, CreditCard, Zap, Link2, Twitter, Linkedin, Home, ThumbsUp } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { ArticleCard } from "@/components/ui/blog-post-card";
import { Sparkles, ArrowRight } from "lucide-react";
import wianAvatar from "@/assets/wian-avatar.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  author_name: string;
  published_at: string | null;
  reading_time_minutes: number | null;
  category: { name: string; slug: string; color: string | null } | null;
};

const LIKED_KEY = "wiize_blog_liked_posts";
const getLikedSet = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveLikedSet = (s: Set<string>) => {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(s))); } catch {}
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await blogSupabase
        .from("blog_posts")
        .select(
          `id,slug,title,subtitle,excerpt,content,cover_image_url,cover_image_alt,
           author_name,author_bio,author_avatar_url,category_id,published_at,updated_at,
           reading_time_minutes,seo_title,seo_description,seo_keywords,canonical_url,
           robots_index,robots_follow,og_image_url,ai_summary,ai_short_answer,
           ai_entities,ai_related_topics,faq,like_count,
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
      setLikeCount((data as any).like_count || 0);
      setLiked(getLikedSet().has((data as any).id));
      setLoading(false);

      // Increment view count (fire-and-forget)
      blogSupabase.rpc("increment_blog_post_view" as any, { _post_id: (data as any).id });

      // Related
      if ((data as any).category_id) {
        const { data: rel } = await blogSupabase
          .from("blog_posts")
          .select("id,slug,title,excerpt,cover_image_url,author_name,published_at,reading_time_minutes,category:blog_categories(name,slug,color)")
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20 animate-pulse">
          <div className="h-3 w-40 bg-muted rounded mb-8" />
          <div className="h-10 w-3/4 bg-muted rounded mb-4" />
          <div className="h-6 w-2/3 bg-muted rounded mb-8" />
          <div className="aspect-[16/9] w-full bg-muted rounded-xl mb-10" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-11/12 bg-muted rounded" />
            <div className="h-4 w-10/12 bg-muted rounded" />
          </div>
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!", { description: "Compartilhe com quem precisa." });
    } catch {
      // Fallback for non-https / older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast.success("Link copiado!"); }
      catch { toast.error("Não foi possível copiar o link."); }
      document.body.removeChild(ta);
    }
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: post.title, text: description || post.title, url });
        return true;
      } catch { /* user cancelled or failed — fall through */ }
    }
    return false;
  };

  const shareTo = (target: "whatsapp" | "twitter" | "linkedin") => {
    const t = encodeURIComponent(post.title);
    const u = encodeURIComponent(url);
    const map = {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    } as const;
    window.open(map[target], "_blank", "noopener,noreferrer");
  };

  const toggleLike = async () => {
    if (!post) return;
    const set = getLikedSet();
    if (liked) {
      set.delete(post.id);
      saveLikedSet(set);
      setLiked(false);
      setLikeCount((c) => Math.max(c - 1, 0));
      await blogSupabase.rpc("decrement_blog_post_like" as any, { _post_id: post.id });
    } else {
      set.add(post.id);
      saveLikedSet(set);
      setLiked(true);
      setLikeCount((c) => c + 1);
      await blogSupabase.rpc("increment_blog_post_like" as any, { _post_id: post.id });
    }
  };

  const isWian = post.author_name?.toLowerCase() === "wian";
  const avatarSrc = post.author_avatar_url || (isWian ? wianAvatar : null);

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

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/blog" aria-label="Blog" className="inline-flex items-center">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {post.category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/blog/categoria/${post.category.slug}`}>{post.category.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[260px] sm:max-w-md">{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt={post.author_name}
                  width={24}
                  height={24}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-border/60"
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

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={liked}
                aria-label={liked ? "Remover curtida" : "Curtir artigo"}
                title={liked ? "Você curtiu" : "Gostei"}
                className={`group inline-flex h-10 items-center gap-2 rounded-full border bg-background pl-2.5 pr-3.5 text-sm font-medium transition-all ${liked ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "border-border text-foreground hover:border-foreground/30 hover:bg-muted"}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-[3px] ${liked ? "bg-emerald-500/15" : "bg-muted"}`}>
                  <ThumbsUp className={`h-3.5 w-3.5 transition-transform ${liked ? "fill-emerald-600 text-emerald-600 scale-110" : "text-foreground"}`} />
                </span>
                <span className="tabular-nums">{likeCount}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Compartilhar"
                    title="Compartilhar"
                    onClick={async (e) => {
                      const used = await shareNative();
                      if (used) e.preventDefault();
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-background text-foreground transition-all hover:border-foreground/30 hover:bg-muted"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  <DropdownMenuItem onClick={() => shareTo("whatsapp")}>
                    <Share2 className="h-4 w-4 mr-2 text-emerald-500" /> WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareTo("twitter")}>
                    <Twitter className="h-4 w-4 mr-2" /> X / Twitter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareTo("linkedin")}>
                    <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyLink}>
                    <Link2 className="h-4 w-4 mr-2" /> Copiar link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

        <div className="blog-content max-w-none">
          {/^\s*</.test(post.content) ? (
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          )}
        </div>

        {/* Escrito por */}
        <section className="mt-12 pt-8 border-t border-border">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Escrito por</p>
          <div className="flex items-start gap-4">
            {avatarSrc && (
              <img
                src={avatarSrc}
                alt={post.author_name}
                className="h-12 w-12 rounded-full object-cover ring-1 ring-border/60 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">{post.author_name}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed italic">
                {post.author_bio
                  ? `"${post.author_bio}"`
                  : "Especialista em mercado B2B, prospecção e gestão comercial. Minha missão é ajudar empresas a crescer com prospecção inteligente e previsível."}
              </p>
            </div>
          </div>
        </section>

        {/* Nota de atualização */}
        {post.published_at && (
          <aside className="mt-10 pl-4 border-l-2 border-primary">
            <p className="text-sm font-semibold text-foreground mb-1">Nota</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              É importante lembrar que este artigo foi escrito em{" "}
              {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              . Dependendo da época em que for lido, as informações podem estar desatualizadas.
            </p>
          </aside>
        )}


        {/* FAQ */}
        {post.faq && post.faq.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">Perguntas frequentes</h2>
            <div className="divide-y divide-border">
              {post.faq.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground hover:text-primary transition-colors">
                    <span>{f.question}</span>
                    <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{f.answer}</p>
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

        {/* CTA — centralizado, estilo hero da Wiize com shimmer */}
        <div className="mt-14 relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 sm:p-12 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(var(--primary) / 0.14), transparent 65%)",
            }}
          />
          <div className="relative flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> IA comercial assistida
            </span>
            <h3 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-tight max-w-3xl">
              <span className="text-shimmer-highlight whitespace-nowrap">Wiize trabalhando com IA</span>{" "}
              pelo crescimento da sua empresa.
            </h3>
            <p className="mt-5 text-muted-foreground max-w-2xl">
              Prospecção inteligente, análise de engajamento e identificação de oportunidades em uma única plataforma criada para ajudar empresas a crescer mais rápido.
            </p>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Experimente a Wiize gratuitamente por 7 dias.
            </p>
            <Button asChild size="lg" className="mt-7 rounded-full gap-2 btn-shine">
              <Link to="/signup/escolher-plano" onClick={() => trackBlogCtaClick(post.id, post.slug)}>
                Iniciar teste grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Garantia de 7 dias</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                <Headphones className="h-4 w-4 text-primary" />
                <span>Suporte 24 horas</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Cancele quando quiser</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                <span>Ativação imediata</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Relacionados — largura igual ao blog principal */}
      {related.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <div className="pt-10 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">Artigos relacionados</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => (
                <ArticleCard
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  cover={r.cover_image_url || undefined}
                  tag={r.category?.name}
                  tagColor={r.category?.color}
                  readingTime={r.reading_time_minutes || undefined}
                  headline={r.title}
                  excerpt={r.excerpt || ""}
                  writer={r.author_name}
                  publishedAt={r.published_at || undefined}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
