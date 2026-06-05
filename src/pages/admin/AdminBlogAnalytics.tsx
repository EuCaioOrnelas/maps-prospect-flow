import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Clock, TrendingUp, ArrowLeft, ExternalLink } from "lucide-react";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  view_count: number;
  published_at: string | null;
  scheduled_for: string | null;
  reading_time_minutes: number | null;
};

export default function AdminBlogAnalytics() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,slug,title,status,view_count,published_at,scheduled_for,reading_time_minutes")
        .order("view_count", { ascending: false })
        .limit(200);
      setPosts((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const totals = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    draft: posts.filter((p) => p.status === "draft").length,
    views: posts.reduce((s, p) => s + (p.view_count || 0), 0),
  };

  const topPosts = posts.filter((p) => p.status === "published").slice(0, 10);
  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduled_for)
    .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1))
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar para posts
          </Link>
          <h1 className="text-2xl font-semibold">Blog Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance de visualizações e agendamentos.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={FileText} label="Total" value={totals.total} />
        <StatCard icon={TrendingUp} label="Publicados" value={totals.published} />
        <StatCard icon={Clock} label="Agendados" value={totals.scheduled} />
        <StatCard icon={FileText} label="Rascunhos" value={totals.draft} />
        <StatCard icon={Eye} label="Views totais" value={totals.views} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 mais lidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum post publicado ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {topPosts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 py-3">
                  <span className="text-sm font-mono text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/blog/${p.id}`} className="font-medium hover:underline truncate block">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium tabular-nums">{p.view_count}</span>
                  </div>
                  <Button asChild variant="ghost" size="icon">
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas publicações agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum post agendado.</p>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-3">
                  <Badge variant="secondary">Agendado</Badge>
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/blog/${p.id}`} className="font-medium hover:underline truncate block">
                      {p.title}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {new Date(p.scheduled_for!).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
