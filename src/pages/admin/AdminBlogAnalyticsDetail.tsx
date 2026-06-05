import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ExternalLink, Eye, Clock, Award, Sparkles, Target,
  TrendingUp, Users, AlertTriangle, CheckCircle2, Lightbulb, Pencil, Search,
} from "lucide-react";
import { computeWiizeScore, ScorePill } from "./AdminBlogAnalytics";

export default function AdminBlogAnalyticsDetail() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select(`id,slug,title,subtitle,excerpt,content,cover_image_url,status,view_count,
                 published_at,reading_time_minutes,seo_title,seo_description,seo_keywords,
                 canonical_url,robots_index,ai_short_answer,ai_entities,faq,featured,
                 author_name,category:blog_categories(name)`)
        .eq("id", id)
        .maybeSingle();
      setPost(data);
      setLoading(false);
    })();
  }, [id]);

  const score = useMemo(() => (post ? computeWiizeScore(post) : null), [post]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!post) return <div className="p-8 text-muted-foreground">Publicação não encontrada.</div>;

  const wordCount = (post.content || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

  // Recomendações IA (heurísticas)
  const recs: Array<{ icon: any; title: string; suggestion: string; tone: "warn" | "info" | "ok" }> = [];
  if (!post.seo_title || (post.seo_title || "").length > 70) {
    recs.push({ icon: Search, title: "SEO Title fraco", suggestion: "Defina um SEO Title entre 30 e 60 caracteres com a palavra-chave principal no início.", tone: "warn" });
  }
  const dlen = (post.seo_description || "").length;
  if (dlen < 80 || dlen > 160) {
    recs.push({ icon: Search, title: "Meta description fora do ideal", suggestion: "Reescreva entre 80 e 160 caracteres, incluindo um gancho de valor + CTA implícito.", tone: "warn" });
  }
  if (!post.ai_short_answer) {
    recs.push({ icon: Sparkles, title: "Sem resposta curta (GEO)", suggestion: "Adicione uma resposta direta de 2-3 frases no topo do artigo — é o que LLMs citam em AI Overviews.", tone: "warn" });
  }
  const ents = (post.ai_entities || []).length;
  if (ents < 3) {
    recs.push({ icon: Sparkles, title: "Poucas entidades reconhecidas", suggestion: "Liste pelo menos 5 entidades (ex.: SDR IA, CRM, prospecção, WhatsApp Cloud API, automação comercial).", tone: "warn" });
  }
  const faqLen = Array.isArray(post.faq) ? post.faq.length : 0;
  if (faqLen < 3) {
    recs.push({ icon: Lightbulb, title: "FAQ curto", suggestion: "Inclua 3+ perguntas frequentes — gera schema FAQ + amplia chances de citação por IA.", tone: "info" });
  }
  if (wordCount < 600) {
    recs.push({ icon: Lightbulb, title: "Conteúdo curto", suggestion: `Artigo com ${wordCount} palavras. Ideal mínimo de 600 para SEO; 1200+ para autoridade.`, tone: "info" });
  }
  if (!post.cover_image_url) {
    recs.push({ icon: AlertTriangle, title: "Sem imagem de capa", suggestion: "Capa aumenta CTR em buscadores e redes sociais. Use 1200×630px.", tone: "warn" });
  }
  if (recs.length === 0) {
    recs.push({ icon: CheckCircle2, title: "Tudo certo no on-page", suggestion: "Próximo passo: monitorar impressões no Google Search Console (em breve) e citações em IA.", tone: "ok" });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link to="/admin/blog/analytics" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Voltar para Analytics
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline">{post.status}</Badge>
            {post.category?.name && <Badge variant="outline">{post.category.name}</Badge>}
            {post.featured && <Badge variant="outline">⭐ destaque</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">/{post.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Ver
            </a>
          </Button>
          <Button asChild>
            <Link to={`/admin/blog/${post.id}`}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Wiize Score breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Wiize Content Score
            </CardTitle>
            <ScorePill value={score!.total} />
          </div>
          <p className="text-xs text-muted-foreground">
            Indicador proprietário 0-100 ponderado em SEO, GEO, Engajamento e Conversão.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ScoreSection icon={Target} label="SEO" value={score!.seo} max={25} tone="primary" />
          <ScoreSection icon={Sparkles} label="GEO (IA)" value={score!.geo} max={25} tone="primary" />
          <ScoreSection icon={Users} label="Engajamento" value={score!.engajamento} max={25} tone="primary" />
          <ScoreSection icon={TrendingUp} label="Conversão" value={score!.conversao} max={25} tone="primary" />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Eye} label="Views totais" value={(post.view_count || 0).toLocaleString("pt-BR")} />
        <Kpi icon={Clock} label="Leitura" value={post.reading_time_minutes ? `${post.reading_time_minutes} min` : "—"} />
        <Kpi icon={Sparkles} label="Entidades GEO" value={(post.ai_entities || []).length} />
        <Kpi icon={Lightbulb} label="Perguntas FAQ" value={Array.isArray(post.faq) ? post.faq.length : 0} />
      </div>

      {/* Recomendações IA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Recomendações IA
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ações priorizadas para subir o Wiize Score deste artigo.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {recs.map((r, i) => {
            const Icon = r.icon;
            const tone =
              r.tone === "warn" ? "border-amber-500/40 bg-amber-500/5"
              : r.tone === "ok" ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-border";
            const iconColor =
              r.tone === "warn" ? "text-amber-500"
              : r.tone === "ok" ? "text-emerald-500"
              : "text-primary";
            return (
              <div key={i} className={`flex gap-3 p-3 rounded-lg border ${tone}`}>
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.suggestion}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dados externos */}
      <div className="grid md:grid-cols-2 gap-4">
        <ExternalCard icon={Target} title="Google Search Console" desc="Conecte o GSC para ver impressões, cliques, CTR, posição média e keywords ranqueadas deste artigo." />
        <ExternalCard icon={Sparkles} title="Citações em IA" desc="Tracking de aparições em ChatGPT, Perplexity e Gemini em breve." />
        <ExternalCard icon={Users} title="Profundidade de leitura" desc="Scroll depth (25/50/75/100%), tempo médio real, bounce rate e cliques internos." />
        <ExternalCard icon={TrendingUp} title="Atribuição de conversão" desc="Leads gerados, trials iniciados, clientes pagantes e receita atribuídos a este artigo." />
      </div>

      {/* On-page snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot on-page</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Row label="SEO Title" value={post.seo_title || "—"} />
          <Row label="Meta description" value={`${(post.seo_description || "").length} caracteres`} />
          <Row label="Keywords" value={(post.seo_keywords || []).join(", ") || "—"} />
          <Row label="Canonical" value={post.canonical_url || "—"} />
          <Row label="Resposta curta (GEO)" value={post.ai_short_answer ? "definida" : "—"} />
          <Row label="Entidades" value={(post.ai_entities || []).join(", ") || "—"} />
          <Row label="FAQ" value={`${Array.isArray(post.faq) ? post.faq.length : 0} item(ns)`} />
          <Row label="Palavras" value={wordCount.toLocaleString("pt-BR")} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="p-2 rounded-md bg-muted w-fit">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">{label}</p>
        <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function ScoreSection({ icon: Icon, label, value, max, tone }: { icon: any; label: string; value: number; max: number; tone: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Icon className={`w-4 h-4 text-${tone}`} /> {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{pct}/100</span>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground mt-2">{value}/{max} pontos</p>
    </div>
  );
}

function ExternalCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge variant="outline" className="text-xs flex-shrink-0">em breve</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]" title={value}>{value}</span>
    </div>
  );
}
